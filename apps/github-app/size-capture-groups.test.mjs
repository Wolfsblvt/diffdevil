// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sizeCaptureGroups, CAPTURE_CHUNK } from './size-capture-groups.mjs';

test('ordinary added paths change nearby groups and leave distant immutable facts shareable', () => {
  const paths = Array.from({ length: 2800 }, (_, index) => `src/${String(index).padStart(5, '0')}.ts`);
  const before = sizeCaptureGroups(paths), beforeKeys = new Set(before.map(group => JSON.stringify(group)));
  const after = sizeCaptureGroups([...paths, 'src/00000-added.ts']);
  const unchanged = after.filter(group => beforeKeys.has(JSON.stringify(group))).length;
  assert.deepEqual(after.flat(), [...paths, 'src/00000-added.ts'].sort());
  assert.ok(after.every(group => group.length <= CAPTURE_CHUNK));
  assert.ok(unchanged >= before.length - 3, `${before.length} groups, ${unchanged} remain identical`);
});
