// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Which plan funds a namespace. The production source is the Wirt commercial consumer in the
 * managed App (`apps/github-app/commercial.mjs`): a repository resolves to its installation's
 * numeric GitHub account and that account's active funding link; a viewer resolves to their
 * own account. Without a configured commercial consumer every namespace reads as Free, and
 * the App says so. A fixture map keyed by numeric account exists so the Pro and Business
 * presentation can be exercised locally; it is honoured only on a loopback origin.
 */

const PLANS = new Set(['free', 'pro', 'business']);
const LABELS = Object.freeze({ free: 'Free', pro: 'Pro', business: 'Business', unknown: 'Free' });

/** Presentation label for a server-selected plan; an unknown namespace presents as Free. */
export function planLabel(plan) { return LABELS[plan] ?? 'Free'; }
export const premium = plan => plan === 'pro' || plan === 'business';

export function createEntitlement({ commercial, namespaceOf, fixture, loopback = false } = {}) {
  let table = new Map();
  let source = commercial ? (commercial.source === 'fixture' ? 'local-commercial-fixture' : 'commercial') : 'none-connected';
  if (!commercial && fixture && loopback) {
    try {
      const parsed = typeof fixture === 'string' ? JSON.parse(fixture) : fixture;
      table = new Map(Object.entries(parsed).filter(([, plan]) => PLANS.has(String(plan).toLowerCase())).map(([account, plan]) => [Number(account), String(plan).toLowerCase()]));
      source = 'local-fixture';
    } catch { table = new Map(); }
  }
  const fromFixture = account => (Number.isSafeInteger(account) ? table.get(account) ?? 'free' : 'unknown');
  return {
    source,
    /** The plan funding one repository's namespace: `free`, `pro`, `business`, or `unknown` while the namespace is unestablished. */
    async planOfRepository(repositoryId, actor) {
      if (commercial) return commercial.entitlement({ repositoryId, actor });
      if (source !== 'local-fixture') return 'free';
      const account = namespaceOf ? await namespaceOf({ repositoryId }) : undefined;
      return fromFixture(account);
    },
    /** The viewer's own plan, for All-repositories premium aggregates. */
    async planOfViewer(actor) {
      if (commercial) return commercial.entitlement({ repositoryId: null, actor });
      if (source !== 'local-fixture') return 'free';
      return fromFixture(actor?.userId);
    },
    describe() {
      return source === 'commercial' ? 'Plans come from the Works commercial link.'
        : source === 'local-commercial-fixture' ? 'Plans come from a local stand-in for Works.'
        : source === 'local-fixture' ? 'Plans come from a local fixture.'
        : 'No subscription source is connected; every namespace reads as Free.';
    }
  };
}
