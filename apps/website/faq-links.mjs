// SPDX-License-Identifier: AGPL-3.0-only
import { posix } from 'node:path';
import { entries, productPages } from './docs-manifest.mjs';
import { FAQ_SOURCE } from './faq-content.mjs';

/** FAQ Markdown keeps GitHub-readable source links; the site uses manifest-owned routes. */
export default function faqLinks() {
  return (tree, file) => {
    if (!String(file.path ?? '').replaceAll('\\', '/').endsWith(`/${FAQ_SOURCE}`)) return;
    const bySource = new Map([...entries, ...productPages].map(entry => [entry.source, entry]));
    const visit = node => {
      if (node.type === 'link' && !/^(?:[a-z]+:|#|\/)/iu.test(node.url)) {
        const [path, hash = ''] = node.url.split('#');
        const source = posix.normalize(posix.join(posix.dirname(FAQ_SOURCE), path));
        const entry = bySource.get(source);
        if (!entry) throw new Error(`FAQ link has no selected website destination: ${source}`);
        node.url = (entry.route ?? (entry.slug ? `/docs/${entry.slug}/` : '/docs/')) + (hash ? `#${hash}` : '');
      }
      for (const child of node.children ?? []) visit(child);
    };
    visit(tree);
  };
}
