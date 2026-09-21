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

test('the complete FAQ preserves 38 unique question routes in its six ordered categories', () => {
  const records = faqRecords(source);
  assert.equal(records.length, 38);
  assert.equal(new Set(records.map(record => record.id)).size, records.length);
  assert.deepEqual(records.slice(0, 2).map(record => record.id), ['why-diffdevil', 'changed-vs-churn']);
  const counts = new Map();
  for (const record of records) {
    counts.set(record.category, (counts.get(record.category) ?? 0) + 1);
    assert.equal(record.url, `${FAQ_ROUTE}#${record.id}`);
    assert.equal(record.canonical, `${FAQ_CANONICAL}#${record.id}`);
    assert.ok(record.title.endsWith('?'));
  }
  assert.deepEqual([...counts.values()], [8, 5, 6, 6, 6, 7]);
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

test('the development note follows each affected question into search, but not the Playground', () => {
  const records = new Map(faqRecords(source).map(record => [record.id, record]));
  assert.equal(records.get('extension-data').standing, 'In development');
  assert.ok(records.get('extension-data').html.includes('Chrome Web Store'));
  assert.equal(records.get('app-history').standing, 'In development');
  assert.equal(records.get('playground').standing, '');
  assert.equal(records.get('changed-vs-churn').standing, '');
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
