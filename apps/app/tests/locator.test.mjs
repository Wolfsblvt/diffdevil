// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { test } from 'node:test';
import { createLocator } from '../src/lib/locator.mjs';

test('projecting and resolving a file reuse its signature within the request without changing its opaque address', async t => {
  const secret = 'synthetic-request-local-locator';
  const sign = t.mock.method(crypto.subtle, 'sign');
  const locator = createLocator({ secret });
  const rows = [{ repositoryId: 17, path: 'src/other.ts' }, { repositoryId: 17, path: 'package-lock.json' }, { repositoryId: 18, path: 'package-lock.json' }];
  const values = await Promise.all(rows.map(row => locator.of(row.repositoryId, row.path)));
  const expected = createHmac('sha256', `diffdevil-app-file-locator:${secret}`).update('17\npackage-lock.json').digest('base64url').slice(0, 22);
  assert.equal(values[1], expected);
  assert.notEqual(values[1], values[2]);
  assert.equal(await locator.resolve(expected, rows), rows[1]);
  assert.equal(await locator.resolve('invalid', rows), undefined);
  assert.equal(sign.mock.callCount(), 3, 'resolving rows already projected for this view needs no more crypto work');
  assert.equal(await createLocator({ secret }).of(17, 'package-lock.json'), expected);
  assert.equal(sign.mock.callCount(), 4, 'a new request owns its own signatures');
});
