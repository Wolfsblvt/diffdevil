// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import test from 'node:test';
import { isExtensionConsoleError } from '../qa/console.mjs';

test('a GitHub CORS error containing the repository name is retained as host evidence', () => {
  assert.equal(isExtensionConsoleError('https://github.com/Wolfsblvt/diffdevil/pull/48/files', "Access to fetch at 'https://patch-diff.githubusercontent.com/raw/Wolfsblvt/diffdevil/pull/48.diff' has been blocked by CORS policy"), false);
});

test('extension console errors are detected by source or a production diagnostic prefix', () => {
  assert.equal(isExtensionConsoleError('chrome-extension://example/content.js', 'Unexpected failure'), true);
  for (const prefix of ['[diffdevil] acquisition failed', '[diffdevil] pause failed', 'diffdevil content request failed', 'diffdevil extension operation failed']) {
    assert.equal(isExtensionConsoleError('', `${prefix} details`), true, prefix);
  }
  assert.equal(isExtensionConsoleError('', 'A host error mentions diffdevil'), false);
});
