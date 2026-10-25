// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * D067's current effective policy, acquired through the same trusted default-branch resolver
 * as preview/execution. One promise per repository per request or queue invocation; no policy
 * or provider effects. Failed reads preserve base facts with an explicit unavailable reason.
 */
export function createPolicyReader(appStore, { repositoryIdentity, resolvePolicy }) {
  const cache = new Map();
  return {
    /** Current compiled policy and provenance, or an unavailable interpretation with a safe reason. */
    async current({ repositoryId }) {
      if (cache.has(repositoryId)) return cache.get(repositoryId);
      const promise = (async () => {
        let configuration, identity;
        try { configuration = await appStore.repositoryConfiguration(repositoryId); }
        catch { return unavailable('stored-configuration-unavailable'); }
        try { identity = await repositoryIdentity(repositoryId); }
        catch { return unavailable('installation-unavailable'); }
        if (!Number.isSafeInteger(identity?.installation_id) || identity.installation_id < 1) return unavailable('installation-unavailable');
        try {
          const effective = await resolvePolicy({ repositoryId, installationId: identity.installation_id, configuration: configuration?.value });
          return { id: effective.policy.id, compiled: effective.policy, basis: 'current-policy',
            origin: effective.source, sourceIdentity: effective.sourceIdentity, trustedHead: effective.expectedPolicyBase,
            provenance: effective.provenance, document: effective.document };
        } catch (error) {
          const code = error?.diagnostic?.code ?? error?.code;
          return unavailable('trusted-policy-unavailable', typeof code === 'string' && /^[A-Z0-9_]{1,80}$/u.test(code) ? code : null);
        }
      })();
      cache.set(repositoryId, promise);
      return promise;
    }
  };
}

function unavailable(reason, code = null) { return { id: null, compiled: null, basis: 'unavailable', reason, code }; }
