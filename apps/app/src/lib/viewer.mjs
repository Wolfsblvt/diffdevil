// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Who is looking, and at what. GitHub sign-in identifies the person; the App installations
 * the person can reach define the repositories; D1 says which of them the App actually
 * operates and retains history for. The three are joined per request so a lost access or a
 * withdrawn consent changes the page, not only the navigation.
 */

const TTL_MS = 60_000;
const LIFECYCLE_SCOPE_LIMIT = 25;

/** A per-isolate, per-user TTL cache for transient provider context. Expiry is the only invalidation. */
export function createContextCache(now = () => Date.now()) {
  const entries = new Map();
  return {
    async get(key, load, ttl = TTL_MS) {
      const hit = entries.get(key);
      if (hit && hit.until > now()) return hit.value;
      const value = await load();
      entries.set(key, { value, until: now() + ttl });
      if (entries.size > 2000) for (const [stale, entry] of entries) { if (entry.until <= now()) entries.delete(stale); }
      return value;
    },
    clear() { entries.clear(); }
  };
}

/**
 * Resolve the viewer: profile, namespaces (yours / shared with you) and repositories with
 * their App standing. Repositories GitHub grants but the App has never recorded appear as
 * `not-recorded`; they are visible, not counted.
 */
export async function resolveViewer({ reads, actor, store, entitlement, cache }) {
  const userId = actor.userId;
  const profile = await cache.get(`profile:${userId}`, () => reads.profile());
  const installations = await cache.get(`installations:${userId}`, () => reads.installations());
  const granted = (await Promise.all(installations.map(installation => cache.get(`repositories:${userId}:${installation.id}`, () => reads.installationRepositories(installation.id))
    .then(list => list.map(repository => ({ ...repository, accountType: installation.account?.type ?? 'User' })))))).flat();
  const standings = await store.repositoryStandings(granted.map(repository => repository.repositoryId));
  const repositories = granted.map(repository => {
    const standing = standings.get(repository.repositoryId);
    return { ...repository, standing, status: standing?.status ?? 'not-recorded' };
  }).sort((a, b) => a.fullName.localeCompare(b.fullName));
  const owners = [...new Set(repositories.map(repository => repository.owner))];
  const roles = new Map(await Promise.all(owners.map(async owner => {
    const kind = repositories.find(repository => repository.owner === owner)?.accountType === 'Organization' ? 'org' : 'user';
    if (kind === 'user') return [owner, owner === profile.login ? 'self' : 'other'];
    return [owner, await cache.get(`role:${userId}:${owner}`, () => reads.organizationRole(owner).catch(() => 'unknown'))];
  })));
  const namespaces = owners.map(owner => {
    const role = roles.get(owner);
    const kind = role === 'self' || role === 'other' ? 'user' : 'org';
    return { login: owner, kind, yours: role === 'self' || role === 'admin', role, plan: entitlement.planOf(owner), repositories: repositories.filter(repository => repository.owner === owner) };
  }).sort((a, b) => Number(b.yours) - Number(a.yours) || (a.login === profile.login ? -1 : b.login === profile.login ? 1 : a.login.localeCompare(b.login)));
  return { userId, login: profile.login, avatarUrl: profile.avatarUrl, plan: entitlement.planOf(profile.login), namespaces, repositories, entitlementSource: entitlement.source };
}

/** The repositories a scope selector names, inside the viewer's authorised set. An unknown selector is empty, not everything. */
export function scopeRepositories(viewer, scope) {
  if (scope.kind === 'all') return viewer.repositories;
  if (scope.kind === 'namespace') return viewer.repositories.filter(repository => repository.owner === scope.namespace);
  return viewer.repositories.filter(repository => repository.fullName === scope.repository);
}

/**
 * Lifecycle facts for the scoped repositories, transiently from GitHub: the 100 most recently
 * updated pull requests per repository. A scope too wide for live reads, or a provider refusal,
 * is an `unavailable` standing with its reason; it is never an empty population.
 */
export async function loadLifecycle({ reads, repositories, cache, userId }) {
  if (repositories.length === 0) return { standing: 'available', all: [], byRepository: new Map(), complete: true };
  if (repositories.length > LIFECYCLE_SCOPE_LIMIT) return { standing: 'unavailable', reason: `live pull-request facts cover scopes of up to ${LIFECYCLE_SCOPE_LIMIT} repositories; this scope has ${repositories.length}`, byRepository: new Map(), all: [] };
  try {
    const byRepository = new Map();
    const all = [];
    let complete = true;
    await Promise.all(repositories.map(async repository => {
      const listing = await cache.get(`pulls:${userId}:${repository.repositoryId}`, () => reads.recentPullRequests(repository.fullName));
      const pullRequests = new Map(listing.pullRequests.map(pull => [pull.number, { ...pull, repositoryId: repository.repositoryId, fullName: repository.fullName }]));
      byRepository.set(repository.repositoryId, { pullRequests, complete: listing.complete });
      complete &&= listing.complete;
      all.push(...pullRequests.values());
    }));
    return { standing: 'available', all, byRepository, complete, source: 'github-recent-pull-requests' };
  } catch (error) {
    const reason = error?.code === 'E_GITHUB_RATE_LIMIT' ? 'GitHub rate limit reached; pull-request facts return when it resets' : 'GitHub did not answer the pull-request read';
    return { standing: 'unavailable', reason, byRepository: new Map(), all: [] };
  }
}
