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

test('the FAQ preserves established public question routes as its inventory evolves', () => {
  const records = faqRecords(source);
  const ids = new Set(records.map(record => record.id));
  assert.equal(ids.size, records.length);
  for (const id of [
    'changed-vs-churn', 'beyond-size-labels', 'code-review', 'changed-makes-sense',
    'files-and-exclusions', 'measurement-evidence', 'playground-or-extension',
    'extension-without-repo-setup', 'different-results', 'non-javascript-projects',
    'no-language-required', 'automation-overlap', 'trusted-policy', 'why-managed',
    'leaving-managed-service', 'code-data', 'app-history', 'coding-agents',
    'semantic-versioning', 'licensing',
  ]) assert.ok(ids.has(id), `Established FAQ destination is missing: ${id}`);
  assert.deepEqual(records.slice(0, 2).map(record => record.id), ['changed-vs-churn', 'beyond-size-labels']);
  for (const record of records) {
    assert.equal(record.url, `${FAQ_ROUTE}#${record.id}`);
    assert.equal(record.canonical, `${FAQ_CANONICAL}#${record.id}`);
    assert.ok(record.title.length > 0);
  }
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
  const note = /<aside\b[^>]*\bid="product-status"[^>]*>([\s\S]*?)<\/aside>/u.exec(source)[1];
  for (const id of ['extension-without-repo-setup', 'extension-private-prs', 'extension-local-data',
    'extension-policy', 'why-managed', 'app-plans', 'app-sharing', 'app-history']) {
    assert.equal(records.get(id).standing, 'In development', id);
    assert.ok(records.get(id).html.includes(note), id);
  }
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
