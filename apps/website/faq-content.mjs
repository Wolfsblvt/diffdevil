// SPDX-License-Identifier: AGPL-3.0-only
/** Public coordinates and extraction from the real rendered FAQ, not another answer registry. */
export const FAQ_SOURCE = 'docs/manual/faq.md';
export const FAQ_ROUTE = '/faq/';
export const FAQ_CANONICAL = 'https://diffdevil.dev/faq/';

export function escapeHtml(text) {
  return String(text).replace(/[&<>"']/gu, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}
function attribute(attributes, name) {
  return new RegExp(`(?:^|\\s)${name}=["']([^"']*)["']`, 'u').exec(attributes)?.[1];
}
/** Decode the HTML entities that can occur in authored titles and metadata. */
export function textOf(html) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return html.replace(/<[^>]*>/gu, ' ').replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos|nbsp);/giu, (whole, entity) => {
    if (entity[0] !== '#') return named[entity.toLowerCase()] ?? whole;
    const point = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : whole;
  }).replace(/\s+/gu, ' ').trim();
}

/**
 * Read only the FAQ's authored h2/article structure from built HTML. Pagefind itself
 * parses each resulting HTML record, so Markdown rendering and search cannot disagree.
 */
export function faqRecords(html) {
  const records = [], seen = new Set();
  let category = '';
  const pieces = /<h2\b[^>]*>([\s\S]*?)<\/h2>|<article\b([^>]*)>([\s\S]*?)<\/article>/gu;
  for (const match of html.matchAll(pieces)) {
    if (match[1] !== undefined) { category = textOf(match[1]); continue; }
    const attributes = match[2], body = match[3];
    if (!attribute(attributes, 'class')?.split(/\s+/u).includes('faq-question')) continue;
    const id = attribute(attributes, 'data-faq-id');
    const title = textOf(/<summary\b[^>]*>([\s\S]*?)<\/summary>/u.exec(body)?.[1] ?? '');
    if (!id || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(id) || seen.has(id) || !title || !category) {
      throw new Error('FAQ questions need a unique semantic identifier, category and title.');
    }
    if (!new RegExp(`\\bid=["']${id}["']`, 'u').test(body)) throw new Error(`FAQ fragment is missing: ${id}`);
    seen.add(id);
    const noteId = attribute(attributes, 'data-faq-note');
    const note = noteId ? new RegExp(`<aside\\b[^>]*\\bid=["']${noteId}["'][^>]*>([\\s\\S]*?)<\\/aside>`, 'u').exec(html)?.[1] : undefined;
    if (noteId && !note) throw new Error(`FAQ development note is missing: ${noteId}`);
    const standing = note ? 'In development' : '';
    const canonical = `${FAQ_CANONICAL}#${id}`;
    const meta = { title, kind: 'FAQ', category, identifier: `#${id}`, canonical, standing };
    const metadata = Object.entries(meta).map(([name, value]) => `<span data-pagefind-meta="${name}" data-pagefind-ignore>${escapeHtml(value)}</span>`).join('');
    records.push({ id, title, category, standing, canonical, url: `${FAQ_ROUTE}#${id}`,
      html: `<!doctype html><html lang="en"><head><title>${escapeHtml(title)}</title></head><body><main data-pagefind-body>${metadata}${note ?? ''}${body}</main></body></html>` });
  }
  if (!records.length) throw new Error('The rendered FAQ has no question records.');
  return records;
}
