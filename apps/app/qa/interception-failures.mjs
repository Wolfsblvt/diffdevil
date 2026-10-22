// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Reconcile failed CDP replies after the browser's network events have arrived, in either order. */
export function reconcileInterceptionFailures(interceptions, networkFailures) {
  let abortedResources = 0;
  const errors = [];
  for (const { error, resourceType, networkId } of interceptions) {
    if (resourceType !== 'Document' && String(error).includes('Invalid InterceptionId')
      && networkFailures.get(networkId) === 'net::ERR_ABORTED') abortedResources++;
    else errors.push(String(error));
  }
  return { abortedResources, errors };
}
