// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { faqRecords, textOf, FAQ_CANONICAL, FAQ_SOURCE, FAQ_ROUTE } from './faq-content.mjs';
import { entries, groups, productPages } from './docs-manifest.mjs';

const source = readFileSync(new URL('../../docs/manual/faq.md', import.meta.url), 'utf8');
function specimen({ id = 'sample-question', title = 'A question?', extra = '', body = '<p>The answer.</p>' } = {}) {
  return `<h2>Useful questions</h2><article class="faq-question" data-faq-id="${id}" ${extra}>
    <a class="faq-id" href="#${id}">#${id}</a><details><summary><h3>${title}</h3></summary>
    <div id="${id}" class="faq-answer">${body}</div></details></article>`;
}

test('the focused FAQ preserves 20 unique question routes in its eight ordered categories', () => {
  const records = faqRecords(source);
  assert.equal(records.length, 20);
  assert.equal(new Set(records.map(record => record.id)).size, records.length);
  assert.deepEqual(records.slice(0, 2).map(record => record.id), ['changed-vs-churn', 'beyond-size-labels']);
  const counts = new Map();
  for (const record of records) {
    counts.set(record.category, (counts.get(record.category) ?? 0) + 1);
    assert.equal(record.url, `${FAQ_ROUTE}#${record.id}`);
    assert.equal(record.canonical, `${FAQ_CANONICAL}#${record.id}`);
    assert.ok(record.title.length > 0);
  }
  assert.deepEqual([...counts.values()], [3, 3, 3, 2, 2, 2, 2, 3]);
});

test('question search records carry the actual answer HTML, title, identifier and category', () => {
  const [record] = faqRecords(specimen({ title: 'Who reads A &amp; B?', body: '<p>A <code>report</code>, not a plan.</p>' }));
  assert.equal(record.title, 'Who reads A & B?');
  assert.equal(record.category, 'Useful questions');
  assert.ok(record.html.includes('<p>A <code>report</code>, not a plan.</p>'));
  assert.ok(record.html.includes('data-pagefind-meta="kind"'));
  assert.ok(record.html.includes('data-pagefind-meta="identifier"'));
  assert.ok(record.html.includes('Who reads A &amp; B?'));
});

test('the subtle development note follows only affected answers into search', () => {
  const records = new Map(faqRecords(source).map(record => [record.id, record]));
  assert.equal(records.get('extension-without-repo-setup').standing, 'In development');
  assert.ok(records.get('extension-without-repo-setup').html.includes('managed-service experience'));
  assert.equal(records.get('why-managed').standing, 'In development');
  assert.equal(records.get('changed-vs-churn').standing, '');
  assert.equal(records.get('no-language-required').standing, '');
});

test('a linked development note cannot disappear silently', () => {
  assert.throws(() => faqRecords(specimen({ extra: 'data-faq-note="not-present"' })), /development note is missing/u);
});

test('duplicate public question identifiers refuse indexing', () => {
  assert.throws(() => faqRecords(specimen() + specimen()), /unique semantic identifier/u);
});

test('missing destinations and unsafe identifier syntax refuse indexing', () => {
  assert.throws(() => faqRecords(specimen().replace('id="sample-question" class=', 'class=')), /fragment is missing/u);
  assert.throws(() => faqRecords(specimen({ id: 'question with spaces' })), /unique semantic identifier/u);
  assert.throws(() => faqRecords('<h2>Empty category</h2>'), /no question records/u);
});

test('metadata decodes authored entities without turning them into HTML', () => {
  assert.equal(textOf('<h3>A &amp; B &#x3f; &#39;quoted&#39; &lt;tag&gt;</h3>'), "A & B ? 'quoted' <tag>");
  const [record] = faqRecords(specimen({ title: '&lt;img src=x&gt;' }));
  assert.equal(record.title, '<img src=x>');
  assert.ok(record.html.includes('<title>&lt;img src=x&gt;</title>'));
});

test('the FAQ is a product route and Help link, never a duplicate docs entry', () => {
  assert.deepEqual(productPages.filter(page => page.source === FAQ_SOURCE), [{ source: FAQ_SOURCE, route: FAQ_ROUTE }]);
  assert.equal(entries.some(entry => entry.source === FAQ_SOURCE), false);
  assert.ok(groups.find(group => group.label === 'Help')?.entries.some(entry => entry.link === FAQ_ROUTE));
});

test('contextual documentation links select real question identifiers, not copied titles', () => {
  const ids = new Set(faqRecords(source).map(record => record.id));
  const linked = entries.filter(entry => entry.faq?.length);
  assert.ok(linked.length > 0);
  for (const entry of linked) {
    assert.equal(new Set(entry.faq).size, entry.faq.length, entry.source);
    for (const id of entry.faq) assert.ok(ids.has(id), `${entry.source}: ${id}`);
  }
});
