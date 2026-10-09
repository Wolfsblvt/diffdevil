// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Which plan a namespace has. No subscription source is connected to this App yet, so the
 * real answer is Free for every namespace, with that absence named. A fixture map exists so
 * the Pro presentation can be exercised locally; it is honoured only on a loopback origin,
 * never in a deployed service.
 */

const PLANS = new Set(['Free', 'Pro', 'Business']);

export function createEntitlement({ fixture, loopback = false } = {}) {
  let table = new Map();
  let source = 'none-connected';
  if (fixture && loopback) {
    try {
      const parsed = typeof fixture === 'string' ? JSON.parse(fixture) : fixture;
      table = new Map(Object.entries(parsed).filter(([, plan]) => PLANS.has(plan)));
      source = 'local-fixture';
    } catch { table = new Map(); }
  }
  return {
    source,
    planOf(namespace) { return table.get(namespace) ?? 'Free'; },
    /** Entitlement is evaluated at the namespace; a viewer's own namespaces follow the viewer's plan. */
    describe() { return source === 'none-connected' ? 'No subscription source is connected; every namespace reads as Free.' : 'Plans come from a local fixture.'; }
  };
}
