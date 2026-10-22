// SPDX-License-Identifier: AGPL-3.0-only
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { renderWorksSponsor, worksSponsorSource } from './works-sponsor.mjs';

const vendored = path => readFileSync(new URL(`../../vendor/brand/works/${path}`, import.meta.url));
const template = vendored('components/works-sponsor.html').toString('utf8');

test('the vendored Works sponsor files and compact lockup are the pinned bundle bytes', () => {
  assert.deepEqual(Object.keys(worksSponsorSource.files).filter(path => path.startsWith('assets/lockup-compact/')), ['assets/lockup-compact/on-dark.svg', 'assets/lockup-compact/on-light.svg']);
  for (const [path, sha256] of Object.entries(worksSponsorSource.files)) {
    assert.equal(createHash('sha256').update(vendored(path)).digest('hex'), sha256, path);
  }
});

test('the website footer binds the vendored lockup for each appearance from vendor/, not from a second copy', () => {
  const css = readFileSync(new URL('./src/styles/global.css', import.meta.url), 'utf8');
  const bindings = [...css.matchAll(/--logo-works: url\("([^"]+)"\)/gu)].map(match => match[1]);
  assert.deepEqual([...new Set(bindings)].sort(), ['on-dark', 'on-light'].map(appearance => `../../../../vendor/brand/works/assets/lockup-compact/${appearance}.svg`));
  for (const binding of bindings) assert.ok(existsSync(new URL(binding, new URL('./src/styles/global.css', import.meta.url))), binding);
});

test('the binding fills every placeholder with escaped host facts and keeps Works copy', () => {
  const html = renderWorksSponsor(template, { id: 'support-dd', links: [{ label: 'GitHub Sponsors', href: 'https://github.com/sponsors/Wolfsblvt' }] });
  assert.doesNotMatch(html, /\{\{\w+\}\}/u);
  assert.match(html, /<h2 id="support-dd-title">Support the work\.<\/h2>/u);
  assert.match(html, /Help fund development, maintenance, and the ideas behind Wolfsblvt Works\./u);
  assert.match(html, /<a class="primary" href="https:\/\/github\.com\/sponsors\/Wolfsblvt" rel="noopener">GitHub Sponsors<\/a>/u);
  assert.doesNotMatch(html, /\{\{id\}\}|id="-/u);
  const twice = renderWorksSponsor(template, { id: 'second', links: [] });
  const ids = html.match(/id="([^"]+)"/gu), other = twice.match(/id="([^"]+)"/gu);
  assert.equal(ids.filter(value => other.includes(value)).length, 0, 'two instances share no SVG ids');
});

test('the binding refuses routes and inputs the component does not admit', () => {
  assert.throws(() => renderWorksSponsor(template, { id: 'x', links: [{ label: 'Patreon', href: 'https://example.com' }] }), /Unknown sponsor route/u);
  assert.throws(() => renderWorksSponsor(template, { id: 'x', links: [{ label: 'Ko-fi', href: 'http://ko-fi.com/x' }] }), /https/u);
  assert.throws(() => renderWorksSponsor(template, { id: 'Bad Id', links: [] }), /id prefix/u);
  assert.throws(() => renderWorksSponsor(template, { id: 'x', heading: 1, links: [] }), /heading level/u);
});
