// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { sourceAliases, repositorySources, sourceTargets, resolveSource } from './source-resolver.mjs';
const ref = '1'.repeat(40);

test('stable source IDs resolve to the exact renamed Git path on either filesystem', () => {
 const paths = new Set(Object.values(sourceAliases));
 const targets = sourceTargets({ref,state:{},exists:path=>paths.has(path)});
 for (const [old,current] of Object.entries(sourceAliases)) {
  const expected = `https://github.com/Wolfsblvt/diffdevil/blob/${ref}/${current}#section`;
  for (const id of [old,current]) assert.equal(resolveSource('/source/?f='+encodeURIComponent(id)+'#section',targets),expected);
 }
 assert.equal(resolveSource('/source/?f=docs/Qualification.md',targets),null);
 assert.equal(resolveSource('/source/?f=docs/../../secret',targets),null);
});
test('maintained resolver destinations exist at their selected repository paths', () => {
 for (const source of new Set([...repositorySources,...Object.values(sourceAliases)])) {
  assert.ok(existsSync(new URL('../../'+source,import.meta.url)),`Missing maintained resolver destination: ${source}`);
 }
});

import { bindSourceSelection } from '../website/src/lib/source-resolution.mjs';
test('source links follow fragments and history, and refusal removes a previous destination', () => {
 const view = new EventTarget();
 view.location = {href: 'https://diffdevil.dev/source/?f=old#first'};
 const attributes = new Map();
 const link = {hidden: true, setAttribute: (key,value) => attributes.set(key,value), removeAttribute: key => attributes.delete(key), focus() {this.focused = true;}};
 const status = {textContent: ''};
 const first = 'https://github.com/example/repo/blob/ref/start.md#first';
 const second = 'https://github.com/example/repo/blob/ref/use.md#second';
 const targets = {old: {url: first, fragments: {first, second}}};
 const dispose = bindSourceSelection({view, targets, link, status});
 assert.equal(attributes.get('href'), first); assert.equal(link.hidden, false); assert.equal(link.focused, true);
 view.location.href = 'https://diffdevil.dev/source/?f=old#second';
 view.dispatchEvent(new Event('hashchange'));
 assert.equal(attributes.get('href'), second);
 view.location.href = 'https://diffdevil.dev/source/?f=old#first';
 view.dispatchEvent(new Event('popstate'));
 assert.equal(attributes.get('href'), first);
 for (const url of ['https://diffdevil.dev/source/?f=old#%E0%A4%A', 'https://diffdevil.dev/source/?f=old&f=another']) {
  view.location.href = url; view.dispatchEvent(new Event('popstate'));
  assert.equal(link.hidden, true); assert.equal(attributes.has('href'), false);
  assert.equal(status.textContent, 'No recognized source was selected.');
 }
 view.location.href = 'https://diffdevil.dev/source/?f=old#second';
 view.dispatchEvent(new Event('popstate'));
 assert.equal(attributes.get('href'), second); assert.equal(link.hidden, false);
 dispose(); view.location.href = 'https://diffdevil.dev/source/?f=old#first';
 view.dispatchEvent(new Event('hashchange')); view.dispatchEvent(new Event('popstate'));
 assert.equal(attributes.get('href'), second);
});
