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
