// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Who is looking, and at what. GitHub sign-in identifies the person; installation enumeration
 * and fresh explicit user-grant reads identify repositories; D1 says which of them the App actually
 * operates and retains history for; the entitlement reader says which plan funds each
 * namespace. The four are joined per request so a lost access, a withdrawn consent or an
 * ended subscription changes the page, not only the navigation.
 */
import { planLabel } from './entitlement.mjs';

const TTL_MS = 60_000;
const TITLE_SCOPE_LIMIT = 25;
const ROLE_ERRORS = new Set(['E_GITHUB_RATE_LIMIT', 'E_PROVIDER_NOT_FOUND', 'E_PROVIDER_UNAUTHORIZED', 'E_PROVIDER_REQUEST', 'E_PROVIDER_RESPONSE']);

/** A per-isolate, per-user TTL cache for transient provider context. Expiry is the only invalidation. */
export function createContextCache(now = () => Date.now()) {
  const entries = new Map();
  return {
    async get(key, load, ttl = TTL_MS) {
      const hit = entries.get(key);
      if (hit?.pending) return hit.pending;
      if (hit && hit.until > now()) return hit.value;
      const entry = {};
      entry.pending = Promise.resolve().then(load).then(value => {
        if (entries.get(key) === entry) entries.set(key, { value, until: now() + ttl });
        if (entries.size > 2000) for (const [stale, candidate] of entries) { if (candidate.until <= now()) entries.delete(stale); }
        return value;
      }, error => {
        if (entries.get(key) === entry) entries.delete(key);
        throw error;
      });
      entries.set(key, entry);
      return entry.pending;
    },
    clear() { entries.clear(); }
  };
}

/**
 * Resolve the viewer: profile, namespaces (yours / shared with you) with their server-selected
 * plans, and repositories with their App standing. Repositories GitHub grants but the App has
 * never recorded appear as `not-recorded`; they are visible, not counted.
 */
export async function resolveViewer({ reads, actor, store, entitlement, cache, explicitRepositories = [] }) {
  const userId = actor.userId;
  const profile = await cache.get(`profile:${userId}`, () => reads.profile());
  const installations = await cache.get(`installations:${userId}`, () => reads.installations());
  let granted = (await Promise.all(installations.map(installation => cache.get(`repositories:${userId}:${installation.id}`, () => reads.installationRepositories(installation.id))
    .then(list => list.map(repository => ({ ...repository, accountType: installation.account?.type ?? 'User' })))))).flat();
  // Explicit destinations re-authorise even a cached/listed identity. Do not cache this observation or discover siblings.
  for (const fullName of new Set(explicitRepositories)) {
    granted = granted.filter(repository => repository.fullName.toLowerCase() !== fullName.toLowerCase());
    const current = await reads.repository(fullName);
    if (!current) continue;
    granted = granted.filter(repository => repository.repositoryId !== current.repositoryId);
    granted.push(current);
  }
  const standings = await store.repositoryStandings(granted.map(repository => repository.repositoryId));
  const repositories = granted.map(repository => {
    const standing = standings.get(repository.repositoryId);
    return { ...repository, standing, status: standing?.status ?? 'not-recorded' };
  }).sort((a, b) => a.fullName.localeCompare(b.fullName));
  const owners = [...new Set(repositories.map(repository => repository.owner))];
  const roles = new Map(await Promise.all(owners.map(async owner => {
    const kind = repositories.find(repository => repository.owner === owner)?.accountType === 'Organization' ? 'org' : 'user';
    if (kind === 'user') return [owner, { role: owner === profile.login ? 'self' : 'other' }];
    let observation;
    try {
      observation = await cache.get(`role:${userId}:${owner}`, () => typeof reads.organizationAuthority === 'function'
        ? reads.organizationAuthority(owner) : reads.organizationRole(owner).then(role => ({ role })));
    } catch (error) {
      // Failed reads are not cached: an ordinary refresh can retry. Only fixed codes and HTTP
      // status are display evidence, never bodies, exception messages, credentials or siblings.
      observation = { role: 'unknown', authorityIssue: {
        code: ROLE_ERRORS.has(error?.code) ? error.code : 'E_PROVIDER_UNAVAILABLE',
        status: Number.isInteger(error?.status) && error.status >= 100 && error.status <= 599 ? error.status : null
      } };
    }
    return [owner, observation];
  })));
  // A namespace's plan is read through one of its repositories; the viewer's own plan through their account.
  const viewerPlan = await entitlement.planOfViewer({ userId });
  const namespaces = await Promise.all(owners.map(async owner => {
    const { role, membership, authorityIssue } = roles.get(owner);
    const kind = role === 'self' || role === 'other' ? 'user' : 'org';
    const members = repositories.filter(repository => repository.owner === owner);
    const plan = await entitlement.planOfRepository(members[0].repositoryId, { userId });
    return { login: owner, kind, yours: role === 'self' || role === 'admin', role, ...(membership !== undefined ? { membership } : {}), ...(authorityIssue ? { authorityIssue } : {}), plan: planLabel(plan), planStanding: plan, repositories: members };
  }));
  namespaces.sort((a, b) => Number(b.yours) - Number(a.yours) || (a.login === profile.login ? -1 : b.login === profile.login ? 1 : a.login.localeCompare(b.login)));
  return { userId, login: profile.login, avatarUrl: profile.avatarUrl, plan: planLabel(viewerPlan), planStanding: viewerPlan, namespaces, repositories, entitlementSource: entitlement.source, entitlementNote: entitlement.describe() };
}

/** The repositories a scope selector names, inside the viewer's authorised set. An unknown selector is empty, not everything. */
export function scopeRepositories(viewer, scope) {
  if (scope.kind === 'all') return viewer.repositories;
  if (scope.kind === 'namespace') return viewer.repositories.filter(repository => repository.owner === scope.namespace);
  return viewer.repositories.filter(repository => repository.fullName.toLowerCase() === scope.repository.toLowerCase());
}

/**
 * Display titles and GitHub links for the scoped repositories, transiently from the signed-in
 * person's own read of the 100 most recently updated pull requests per repository. Titles are
 * never retained; populations and lifecycle come from the retained store, never from here. A
 * scope too wide for live reads or a provider refusal simply leaves rows untitled.
 */
export async function loadTitles({ reads, repositories, cache, userId }) {
  const byRepository = new Map();
  if (repositories.length === 0 || repositories.length > TITLE_SCOPE_LIMIT) return { standing: repositories.length ? 'unavailable' : 'available', reason: repositories.length ? `display titles cover scopes of up to ${TITLE_SCOPE_LIMIT} repositories; this scope has ${repositories.length}` : undefined, byRepository };
  try {
    await Promise.all(repositories.map(async repository => {
      const listing = await cache.get(`pulls:${userId}:${repository.repositoryId}`, () => reads.recentPullRequests(repository.fullName));
      byRepository.set(repository.repositoryId, new Map(listing.pullRequests.map(pull => [pull.number, { title: pull.title, url: pull.url, headSha: pull.headSha, state: pull.state }])));
    }));
    return { standing: 'available', byRepository, source: 'github-recent-pull-requests' };
  } catch (error) {
    const reason = error?.code === 'E_GITHUB_RATE_LIMIT' ? 'GitHub rate limit reached; titles return when it resets' : 'GitHub did not answer the pull-request read';
    return { standing: 'unavailable', reason, byRepository };
  }
}
