// SPDX-License-Identifier: AGPL-3.0-only
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { faqRecords } from './faq-content.mjs';

// Use the Pagefind version owned by the pinned Starlight toolchain, not an assumed
// hoisted package or a second independently versioned search implementation.
const starlightRequire = createRequire(import.meta.resolve('@astrojs/starlight'));
const pagefind = await import(/* @vite-ignore */ pathToFileURL(starlightRequire.resolve('pagefind')).href);
function checked(result, operation) {
  if (result.errors?.length) throw new Error(`${operation}: ${result.errors.join('; ')}`);
  return result;
}
/** One search index for selected site/manual bodies and independently linked FAQ answers. */
export default function searchIndex() {
  return { name: 'diffdevil-search', hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      const directory = fileURLToPath(dir);
      // A page without this marker (legal pages or the complete FAQ) must not be
      // indexed through header/footer text. FAQ entries supply their own body.
      const { index } = checked(await pagefind.createIndex({ rootSelector: '[data-pagefind-body]' }), 'Create search index');
      if (!index) throw new Error('Pagefind returned no index.');
      try {
        checked(await index.addDirectory({ path: directory }), 'Index site and manual');
        const questions = faqRecords(await readFile(join(directory, 'faq/index.html'), 'utf8'));
        for (const question of questions) {
          checked(await index.addHTMLFile({ url: question.url, content: question.html }), `Index FAQ ${question.id}`);
        }
        checked(await index.writeFiles({ outputPath: join(directory, 'pagefind') }), 'Write search index');
        logger.info(`Indexed ${questions.length} individual FAQ answers with site and manual pages.`);
      } finally { await pagefind.close(); }
    },
  } };
}
