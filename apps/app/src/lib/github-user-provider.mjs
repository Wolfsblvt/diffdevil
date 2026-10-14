// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * GitHub App user authorization (user-to-server OAuth) for the signed-in App. It is the
 * provider adapter the route-neutral authorization service injects: begin at GitHub,
 * exchange the callback code, verify or refresh a stored grant, and read what the person
 * may currently see. Everything read here is transient display context; nothing from a
 * provider response is retained in history, logs or errors.
 *
 * The authorization destination is always github.com (the service refuses anything else).
 * The token and API bases are configurable so a loopback double can exercise the complete
 * journey without a GitHub account; production leaves them at their defaults.
 */

const DEFAULT_API_BASE = 'https://api.github.com';
const DEFAULT_OAUTH_BASE = 'https://github.com';
const NON_EXPIRING_GRANT_MS = 365 * 86_400_000;
const PAGE = 100;

function providerError(code, status) { return Object.assign(new Error(code), { code, status }); }
function iso(ms) { return new Date(ms).toISOString(); }

export function createGitHubUserProvider({ clientId, clientSecret, callbackUrl, apiBase = DEFAULT_API_BASE, oauthBase = DEFAULT_OAUTH_BASE, fetch: fetchImpl = globalThis.fetch, now = () => Date.now(), userAgent = 'diffdevil-app', installationAccounts = null, installationAdmitted = async () => true }) {
  if (!clientId || !clientSecret || !callbackUrl) throw new TypeError('GitHub user authorization needs a client ID, client secret and callback URL.');
  const api = apiBase.replace(/\/$/u, ''), oauth = oauthBase.replace(/\/$/u, '');

  async function send(url, { method = 'GET', token, basic, body, accept = 'application/vnd.github+json' } = {}) {
    const headers = { accept, 'user-agent': userAgent, 'x-github-api-version': '2022-11-28' };
    if (token) headers.authorization = `Bearer ${token}`;
    if (basic) headers.authorization = `Basic ${btoa(`${clientId}:${clientSecret}`)}`;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const response = await fetchImpl(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    if (response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')) throw providerError('E_GITHUB_RATE_LIMIT', response.status);
    return response;
  }
  async function json(url, options) {
    const response = await send(url, options);
    if (!response.ok) throw providerError(response.status === 404 ? 'E_PROVIDER_NOT_FOUND' : response.status === 401 ? 'E_PROVIDER_UNAUTHORIZED' : 'E_PROVIDER_REQUEST', response.status);
    try { return await response.json(); }
    catch { throw providerError('E_PROVIDER_RESPONSE', response.status); }
  }
  async function pages(url, token, select) {
    const out = [];
    for (let page = 1; page <= 20; page++) {
      const value = await json(`${url}${url.includes('?') ? '&' : '?'}per_page=${PAGE}&page=${page}`, { token });
      const items = select(value);
      out.push(...items);
      if (items.length < PAGE) break;
    }
    return out;
  }
  // The current-user list needs no Members-read permission. A per-organisation membership read does.
  // A completed list is still the App user token's view, not proof of nonmembership.
  async function organisationMembership(token, matches) {
    for (let page = 1; ; page++) {
      const memberships = await json(`${api}/user/memberships/orgs?per_page=${PAGE}&page=${page}`, { token });
      if (!Array.isArray(memberships) || memberships.some(value => !Number.isSafeInteger(value?.organization?.id)
        || value.organization.id <= 0 || typeof value.organization.login !== 'string' || !value.organization.login
        || !['active', 'pending'].includes(value.state))) throw providerError('E_PROVIDER_RESPONSE');
      const membership = memberships.find(matches);
      if (membership) return membership;
      if (memberships.length < PAGE) throw providerError('E_GITHUB_MEMBERSHIP_UNCONFIRMED');
    }
  }
  // Project only the requested membership. Its role/state explain authority; unrelated organisations,
  // provider prose and the user token must never become display or diagnostic context.
  function membershipAuthority(membership) {
    if (!['admin', 'member', 'billing_manager'].includes(membership.role)) throw providerError('E_PROVIDER_RESPONSE');
    return {
      role: membership.state !== 'active' ? 'none' : membership.role === 'admin' ? 'admin' : 'member',
      membership: { organizationId: membership.organization.id, role: membership.role, state: membership.state }
    };
  }
  async function organizationAuthority({ material, organization }) {
    return membershipAuthority(await organisationMembership(material.accessToken,
      value => value.organization.login.toLowerCase() === organization.toLowerCase()));
  }
  function grantFrom(payload) {
    if (!payload || typeof payload.access_token !== 'string' || payload.access_token.length === 0) throw providerError('E_PROVIDER_TOKEN');
    const at = now();
    const material = { accessToken: payload.access_token };
    if (typeof payload.refresh_token === 'string') material.refreshToken = payload.refresh_token;
    if (Number.isFinite(payload.expires_in)) material.accessExpiresAt = iso(at + payload.expires_in * 1000);
    const expiresAt = Number.isFinite(payload.refresh_token_expires_in) ? iso(at + payload.refresh_token_expires_in * 1000)
      : Number.isFinite(payload.expires_in) && !material.refreshToken ? material.accessExpiresAt : iso(at + NON_EXPIRING_GRANT_MS);
    return { material, expiresAt };
  }
  async function tokenPayload(response) {
    try { return await response.json(); }
    catch { throw providerError('E_PROVIDER_RESPONSE', response.status); }
  }
  async function tokenRequest(body) {
    const response = await send(`${oauth}/login/oauth/access_token`, { method: 'POST', body: { client_id: clientId, client_secret: clientSecret, ...body }, accept: 'application/json' });
    if (!response.ok && response.status !== 400) throw providerError('E_PROVIDER_TOKEN', response.status);
    const payload = await tokenPayload(response);
    // Only GitHub's explicit invalid/expired refresh-token answer establishes unusable stored material.
    if (body.grant_type === 'refresh_token' && payload?.error === 'bad_refresh_token') throw providerError('E_PROVIDER_REFRESH_INVALID');
    if (!response.ok || payload?.error) throw providerError('E_PROVIDER_TOKEN', response.status);
    // A rotation must supply both new tokens and their lifetimes; an incomplete answer cannot replace the old seal.
    if (body.grant_type === 'refresh_token' && (typeof payload?.refresh_token !== 'string' || !payload.refresh_token
      || !Number.isSafeInteger(payload.expires_in) || payload.expires_in <= 0
      || !Number.isSafeInteger(payload.refresh_token_expires_in) || payload.refresh_token_expires_in <= 0)) throw providerError('E_PROVIDER_TOKEN');
    return grantFrom(payload);
  }
  const pull = value => ({
    number: value.number, title: typeof value.title === 'string' ? value.title : '', state: value.merged_at ? 'merged' : value.state === 'open' ? (value.draft ? 'draft' : 'open') : 'closed',
    draft: value.draft === true, openedAt: value.created_at, mergedAt: value.merged_at ?? null, closedAt: value.closed_at ?? null, updatedAt: value.updated_at,
    headSha: value.head?.sha, baseSha: value.base?.sha, mergeCommitSha: value.merge_commit_sha ?? null, url: value.html_url,
    changedFiles: Number.isSafeInteger(value.changed_files) ? value.changed_files : undefined
  });

  // The person's own write (push) access to a repository, as GitHub reports it; an administrator always has it.
  const canWrite = repository => repository.permissions?.push === true || repository.permissions?.admin === true;

  return {
    async authorizationUrl({ state }) {
      const url = new URL('https://github.com/login/oauth/authorize');
      url.searchParams.set('client_id', clientId);
      url.searchParams.set('redirect_uri', callbackUrl);
      url.searchParams.set('state', state);
      return url.toString();
    },
    async exchangeCode({ code }) { return tokenRequest({ code, redirect_uri: callbackUrl }); },
    async userForAuthorization(material) {
      const user = await json(`${api}/user`, { token: material.accessToken });
      return user.id;
    },
    /** Refresh or check a grant. Unavailable evidence throws; only definite invalidation returns false. */
    async verifyUserAuthorization({ userId, material }) {
      if (material.refreshToken && material.accessExpiresAt && Date.parse(material.accessExpiresAt) - 60_000 <= now()) {
        try {
          const rotated = await tokenRequest({ grant_type: 'refresh_token', refresh_token: material.refreshToken });
          return { valid: true, material: rotated.material, expiresAt: rotated.expiresAt };
        } catch (error) {
          if (error.code === 'E_PROVIDER_REFRESH_INVALID') return { valid: false };
          throw error;
        }
      }
      const response = await send(`${api}/applications/${encodeURIComponent(clientId)}/token`, { method: 'POST', basic: true, body: { access_token: material.accessToken } });
      // At this Basic-authenticated endpoint, 404 means an invalid user token; 401 concerns the App credentials.
      if (response.status === 404) return { valid: false };
      if (!response.ok) throw providerError('E_PROVIDER_REQUEST', response.status);
      const checked = await tokenPayload(response);
      if (!Number.isSafeInteger(checked?.user?.id) || checked.user.id <= 0) throw providerError('E_PROVIDER_RESPONSE');
      return { valid: checked.user.id === userId };
    },
    async checkRepositoryAccess({ material, installationId, repositoryId }) {
      if (!await installationAdmitted(installationId)) return { installation: 'unavailable', repository: 'unavailable', canAdminister: false };
      let repositories;
      try { repositories = await pages(`${api}/user/installations/${installationId}/repositories`, material.accessToken, value => value.repositories ?? []); }
      catch (error) { if (error.code === 'E_PROVIDER_NOT_FOUND') return { installation: 'unavailable', repository: 'unavailable', canAdminister: false }; throw error; }
      const repository = repositories.find(value => value.id === repositoryId);
      if (!repository) return { installation: 'active', repository: 'unavailable', canAdminister: false };
      return { installation: 'active', repository: 'available', canAdminister: repository.permissions?.admin === true, canWrite: canWrite(repository), fullName: repository.full_name };
    },

    // Reads for the signed-in experience. Each result is display context for this request only.
    async profile({ material }) {
      const user = await json(`${api}/user`, { token: material.accessToken });
      return { id: user.id, login: user.login, avatarUrl: user.avatar_url, type: user.type };
    },
    async installations({ material }) {
      return pages(`${api}/user/installations`, material.accessToken, value => value.installations ?? []).then(list => list.filter(value => installationAccounts === null || installationAccounts.has(value.account?.id)).map(value => ({ id: value.id, account: { login: value.account?.login, type: value.account?.type } })));
    },
    async installationRepositories({ material, installationId }) {
      if (!await installationAdmitted(installationId)) return [];
      const list = await pages(`${api}/user/installations/${installationId}/repositories`, material.accessToken, value => value.repositories ?? []);
      return list.map(value => ({ repositoryId: value.id, installationId, fullName: value.full_name, owner: value.owner?.login, name: value.name, private: value.private === true, canAdminister: value.permissions?.admin === true, canWrite: canWrite(value) }));
    },
    /**
     * Whether the person currently administers this numeric organisation: their own membership names its ID,
     * login, role and state together. Provider failure remains unknown to the authorization service.
     */
    async checkOrganisationAdministration({ material, organisationId }) {
      const membership = await organisationMembership(material.accessToken, value => value.organization.id === organisationId);
      return { administer: membershipAuthority(membership).role === 'admin', login: membership?.organization.login ?? null };
    },
    /** Current role with the target's safe membership evidence; an omitted target remains unknown. */
    organizationAuthority,
    /** Active admin or non-admin member for this login, or none. Provider roles never expand App administration. */
    async organizationRole({ material, organization }) {
      return (await organizationAuthority({ material, organization })).role;
    },
    /** GitHub's 100 most recently updated pull requests of one repository: lifecycle facts, transiently. */
    async recentPullRequests({ material, fullName }) {
      const list = await json(`${api}/repos/${fullName}/pulls?state=all&sort=updated&direction=desc&per_page=${PAGE}`, { token: material.accessToken });
      return { pullRequests: (Array.isArray(list) ? list : []).map(pull), complete: !Array.isArray(list) || list.length < PAGE };
    },
    async pullRequest({ material, fullName, number }) {
      return pull(await json(`${api}/repos/${fullName}/pulls/${number}`, { token: material.accessToken }));
    },
    /** The GitHub user behind a login, for naming a delegate: `{ id, login, type }`, or null when GitHub knows none. */
    async userByLogin({ material, login }) {
      try { const user = await json(`${api}/users/${encodeURIComponent(login)}`, { token: material.accessToken }); return Number.isSafeInteger(user?.id) && typeof user.login === 'string' ? { id: user.id, login: user.login, type: user.type ?? 'User' } : null; }
      catch (error) { if (error.code === 'E_PROVIDER_NOT_FOUND') return null; throw error; }
    }
  };
}
