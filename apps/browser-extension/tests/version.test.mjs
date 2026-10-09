// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { extensionIdentity } from '../../../tools/browser-extension-version.mjs';

test('extension identity preserves a lower independent version and names the included engine', () => {
  const manifest = Object.freeze({ version: '1.3.0', version_name: '1.3.0 preview' });
  assert.deepEqual(extensionIdentity(manifest, { version: '1.7.4' }), {
    version: '1.3.0', engineVersion: '1.7.4',
  });
  assert.equal(manifest.version_name, '1.3.0 preview');
});

test('extension identity enforces numeric browser update constraints without coercion', () => {
  for (const version of ['0.0.1', '65535.65535.65535']) {
    assert.equal(extensionIdentity({ version }, { version: '1.0.0' }).version, version);
  }
  for (const version of ['0.0.0', '1.65536.0', '01.2.3', '1.2', '1.2.3.4', '1.2.3-rc.1', '1.2.3+build', '', null]) {
    assert.throws(() => extensionIdentity({ version }, { version: '1.0.0' }), /Extension version/u);
  }
});

test('an engine prerelease remains explicit and never becomes the browser update number', () => {
  assert.deepEqual(extensionIdentity({ version: '2.0.1' }, { version: '3.0.0-rc.1' }), {
    version: '2.0.1', engineVersion: '3.0.0-rc.1',
  });
  assert.throws(() => extensionIdentity({ version: '2.0.1' }, {}), /engine/u);
});
