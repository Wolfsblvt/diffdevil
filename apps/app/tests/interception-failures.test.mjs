// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { reconcileInterceptionFailures } from '../qa/interception-failures.mjs';

test('a discarded XHR is acknowledged only after the matching browser abort arrives, in either event order', () => {
  const error = 'Protocol error (Fetch.fulfillRequest): Invalid InterceptionId.';
  for (const abortFirst of [true, false]) {
    const failures = new Map();
    if (abortFirst) failures.set('xhr-7', 'net::ERR_ABORTED');
    const interceptions = [{ error, resourceType: 'XHR', networkId: 'xhr-7' }];
    if (!abortFirst) {
      assert.deepEqual(reconcileInterceptionFailures(interceptions, failures), { abortedResources: 0, errors: [error] });
      failures.set('xhr-7', 'net::ERR_ABORTED');
    }
    assert.deepEqual(reconcileInterceptionFailures(interceptions, failures), { abortedResources: 1, errors: [] });
  }
});

test('document failures, other protocol errors and uncorroborated or differently failed requests remain transport failures', () => {
  const invalid = 'Protocol error: Invalid InterceptionId.';
  const other = 'Protocol error: Session closed.';
  const failures = new Map([['aborted', 'net::ERR_ABORTED'], ['failed', 'net::ERR_FAILED']]);
  const interceptions = [
    { error: invalid, resourceType: 'Document', networkId: 'aborted' },
    { error: other, resourceType: 'XHR', networkId: 'aborted' },
    { error: invalid, resourceType: 'XHR', networkId: 'missing' },
    { error: invalid, resourceType: 'XHR', networkId: 'failed' }
  ];
  assert.deepEqual(reconcileInterceptionFailures(interceptions, failures), { abortedResources: 0, errors: [invalid, other, invalid, invalid] });
});
