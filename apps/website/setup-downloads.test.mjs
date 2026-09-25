// SPDX-License-Identifier: AGPL-3.0-only
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderSetup } from './setup-render.mjs';
import { publishedRelease, validatePublishedRelease, downloadKinds } from './download-source.mjs';

const read = name => readFileSync(new URL('../../docs/setup/' + name + '.md', import.meta.url), 'utf8');
const bindings = { PUBLIC_ORIGIN: 'https://diffdevil.dev', APP_INSTALL_URL: 'https://github.com/apps/test-fixture/installations/new', APP_DASHBOARD_URL: 'https://app.diffdevil.dev' };

test('all five canonical setup payloads bind without rewriting GitHub expressions', () => {
  for (const name of ['skill', 'cli', 'actions', 'app', 'everything']) {
    const source = read(name);
    const result = renderSetup(source, bindings);
    assert.equal(result.available, true);
    assert.doesNotMatch(result.text, /\{\{[A-Z_]+\}\}/u);
    assert.deepEqual([...result.text.matchAll(/\$\{\{[^}]+\}\}/gu)].map(m => m[0]), [...source.matchAll(/\$\{\{[^}]+\}\}/gu)].map(m => m[0]));
    if (name === 'skill') assert.equal(result.text, source);
  }
});
test('missing App destinations are unavailable rather than placeholders or guessed accounts', () => {
  const result = renderSetup(read('app'));
  assert.equal(result.available, false);
  assert.deepEqual(result.missing, ['APP_INSTALL_URL', 'APP_DASHBOARD_URL']);
  assert.doesNotMatch(result.text, /\{\{|github\.com\/apps\//u);
  assert.match(result.text, /https:\/\/docs\.diffdevil\.dev\/use\/managed-app\/service\//u);
  assert.equal(renderSetup(read('actions')).available, true);
});
test('unexpected template inputs and malformed public bindings refuse explicitly', () => {
  assert.throws(() => renderSetup('{{SECRET}}'), /Unknown setup binding/u);
  for (const value of ['javascript:alert(1)', 'https://user:pass@example.org', 'https://example.org/ bad']) {
    assert.throws(() => renderSetup('{{APP_INSTALL_URL}}', { APP_INSTALL_URL: value }), /URL binding/u);
  }
});
function releaseFixture() {
  return { kind: 'diffdevil.release-manifest', schemaVersion: '1.0', source: {repository: 'Wolfsblvt/diffdevil', commit: 'a'.repeat(40)}, productVersion: '1.0.0', skills: { diffdevil: { version: '0.2.0', sourcePath: 'skills/diffdevil', sourceCommit: 'a'.repeat(40), treeSha256: 'b'.repeat(64) } }, assets: Object.fromEntries(downloadKinds.map(kind => [kind, { name: kind + '.zip', url: 'https://github.com/Wolfsblvt/diffdevil/releases/download/v1.0.0/' + kind + '.zip', sha256: 'c'.repeat(64), size: 123 }])) };
}
test('downloads consume existing release identities and never infer publication from source', () => {
  assert.equal(publishedRelease(''), undefined);
  const release = releaseFixture();
  assert.equal(validatePublishedRelease(release), release);
  assert.notEqual(release.productVersion, release.skills.diffdevil.version);
  release.assets.skill.url = 'https://example.org/fake.zip';
  assert.throws(() => validatePublishedRelease(release), /exact release destination/u);
  const incomplete = releaseFixture(); delete incomplete.assets.bundled;
  assert.throws(() => validatePublishedRelease(incomplete), /Invalid published release asset/u);
});
