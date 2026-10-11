// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The current policy the App interprets retained measurements with (D067): the repository's
 * stored App configuration over the bundled size preset, compiled once per repository per
 * request. The repository's trusted `.diffdevil.yml` takes precedence at execution time and
 * is read from GitHub then; it is not read here, so each analysis also keeps the policy that
 * actually ran as its recorded original. A repository without stored configuration reads with
 * the bundled default; a configuration that no longer compiles reads with unfiltered base facts.
 */
import { DEFAULT_SIZE_POLICY, resolveEffectivePolicy } from '../../../github-app/configuration.mjs';

export function createPolicyReader(appStore) {
  const cache = new Map();
  return {
    /** `{ id, compiled, basis }` for one repository, or null when no policy can be compiled. */
    async current({ repositoryId }) {
      if (cache.has(repositoryId)) return cache.get(repositoryId);
      const promise = (async () => {
        let configuration;
        try { configuration = await appStore.repositoryConfiguration(repositoryId); } catch { configuration = undefined; }
        try {
          const stored = configuration?.value ?? {};
          const effective = resolveEffectivePolicy({ preset: DEFAULT_SIZE_POLICY, ...(stored.repository ? { repository: stored.repository } : {}) });
          return { id: effective.policy.id, compiled: effective.policy, basis: configuration ? 'stored-app-configuration' : 'bundled-default', origin: configuration?.origin ?? 'default' };
        } catch { return null; }
      })();
      cache.set(repositoryId, promise);
      return promise;
    }
  };
}
