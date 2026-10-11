// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The App's one data contract: the analytical read service of the managed App
 * (`apps/github-app/analytical-data.mjs`), composed in-process over the same D1 state the
 * `/api/analytics` route serves. Pages call it with the surface they render and the selected
 * scope; the service decides populations, current-policy interpretation, coverage and
 * entitlement. Nothing here re-derives a measurement from rows.
 */
import { createAnalyticalDataService } from '../../../github-app/analytical-data.mjs';

export function createAnalytics({ appStore, entitlement, policies, namespaceOf, premium, now }) {
  const service = createAnalyticalDataService({
    store: appStore,
    // The premium file extension, when the build joined one; absent, the service is the Community service.
    ...(premium ? { premium } : {}),
    // The acting reader's authorised set was resolved from their current GitHub reach for this request.
    authorize: async ({ repositoryId, actor }) => Array.isArray(actor?.authorizedRepositoryIds) && actor.authorizedRepositoryIds.includes(repositoryId),
    entitlement: async ({ repositoryId, actor }) => repositoryId === null ? entitlement.planOfViewer(actor) : entitlement.planOfRepository(repositoryId, actor),
    // The namespace a subscription may fund is the installation's numeric GitHub account, recorded from webhook identities.
    namespace: async ({ repositoryId }) => namespaceOf({ repositoryId }),
    currentPolicy: ({ repositoryId }) => policies.current({ repositoryId }),
    now
  });
  return {
    service,
    /**
     * One surface read for one viewer. `scope` is the contract's explicit selection:
     * `{ kind: 'all' }`, `{ kind: 'namespace', namespaceId }` or `{ kind: 'repository', repositoryId }`.
     */
    async query({ surface, repositoryIds, from, to, scope, pullRequest, path, metric }, actor) {
      const query = { version: 1, surface, repositoryIds, from, to, ...(scope ? { scope } : {}), ...(pullRequest ? { pullRequest } : {}), ...(path !== undefined ? { path } : {}), ...(metric ? { metric } : {}) };
      return service.query(query, actor);
    }
  };
}
