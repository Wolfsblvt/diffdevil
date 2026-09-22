// SPDX-License-Identifier: AGPL-3.0-only
import { readFile } from 'node:fs/promises';
import * as pagefind from 'pagefind';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { faqRecords } from './faq-content.mjs';

function checked(result, operation) {
  if (result.errors?.length) throw new Error(`${operation}: ${result.errors.join('; ')}`);
  return result;
}
/** Standalone website builds retain their admitted FAQ index. The compound build
 * writes one joined index after both outputs exist, instead of indexing twice. */
export default function searchIndex() {
  return { name: 'diffdevil-search', hooks: {
    'astro:build:done': async ({ dir, logger }) => {
      if (process.env.DIFFDEVIL_JOINED_SEARCH === '1') return;
      const directory = fileURLToPath(dir);
      const { index } = checked(await pagefind.createIndex({ rootSelector: '[data-pagefind-body]' }), 'Create search index');
      if (!index) throw new Error('Pagefind returned no index.');
      try {
        checked(await index.addDirectory({ path: directory }), 'Index site and manual');
        const questions = faqRecords(await readFile(join(directory, 'faq/index.html'), 'utf8'));
        for (const question of questions) checked(await index.addHTMLFile({ url: question.url, content: question.html }), `Index FAQ ${question.id}`);
        checked(await index.writeFiles({ outputPath: join(directory, 'pagefind') }), 'Write search index');
        logger.info(`Indexed ${questions.length} individual FAQ answers with site and manual pages.`);
      } finally { await pagefind.close(); }
    },
  } };
}
