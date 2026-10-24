// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizePackResult } from '../../tools/manual-package.mjs';

test('normalizes npm pack array and workspace-object results', () => {
  const metadata = { name: '@wolfsblvt/starlight-works', version: '0.1.0', filename: 'starlight-works.tgz' };

  assert.deepEqual(normalizePackResult(JSON.stringify([metadata])), metadata);
  assert.deepEqual(normalizePackResult(JSON.stringify({ [metadata.name]: metadata })), metadata);
});

test('rejects npm pack output that does not identify exactly one package', () => {
  assert.throws(() => normalizePackResult('[]'), /exactly one package/);
  assert.throws(() => normalizePackResult(JSON.stringify({ first: {}, second: {} })), /exactly one package/);
});
