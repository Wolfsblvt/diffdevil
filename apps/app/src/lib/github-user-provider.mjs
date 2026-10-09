// SPDX-License-Identifier: AGPL-3.0-only
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

export function createGitHubUserProvider({ clientId, clientSecret, callbackUrl, apiBase = DEFAULT_API_BASE, oauthBase = DEFAULT_OAUTH_BASE, fetch: fetchImpl = globalThis.fetch, now = () => Date.now(), userAgent = 'diffdevil-app' }) {
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
    return response.json();
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
  async function tokenRequest(body) {
    const response = await send(`${oauth}/login/oauth/access_token`, { method: 'POST', body: { client_id: clientId, client_secret: clientSecret, ...body }, accept: 'application/json' });
    if (!response.ok) throw providerError('E_PROVIDER_TOKEN', response.status);
    const payload = await response.json();
    if (payload.error) throw providerError('E_PROVIDER_TOKEN');
    return grantFrom(payload);
  }
  const pull = value => ({
    number: value.number, title: typeof value.title === 'string' ? value.title : '', state: value.merged_at ? 'merged' : value.state === 'open' ? (value.draft ? 'draft' : 'open') : 'closed',
    draft: value.draft === true, openedAt: value.created_at, mergedAt: value.merged_at ?? null, closedAt: value.closed_at ?? null, updatedAt: value.updated_at,
    headSha: value.head?.sha, baseSha: value.base?.sha, mergeCommitSha: value.merge_commit_sha ?? null, url: value.html_url,
    changedFiles: Number.isSafeInteger(value.changed_files) ? value.changed_files : undefined
  });

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
    /** Refresh an expiring token when possible, otherwise ask GitHub whether the grant still stands. */
    async verifyUserAuthorization({ userId, material }) {
      if (material.refreshToken && material.accessExpiresAt && Date.parse(material.accessExpiresAt) - 60_000 <= now()) {
        try {
          const rotated = await tokenRequest({ grant_type: 'refresh_token', refresh_token: material.refreshToken });
          return { valid: true, material: rotated.material, expiresAt: rotated.expiresAt };
        } catch { return { valid: false }; }
      }
      const response = await send(`${api}/applications/${encodeURIComponent(clientId)}/token`, { method: 'POST', basic: true, body: { access_token: material.accessToken } });
      if (!response.ok) return { valid: false };
      const checked = await response.json();
      return { valid: checked?.user?.id === userId };
    },
    async checkRepositoryAccess({ material, installationId, repositoryId }) {
      let repositories;
      try { repositories = await pages(`${api}/user/installations/${installationId}/repositories`, material.accessToken, value => value.repositories ?? []); }
      catch (error) { if (error.code === 'E_PROVIDER_NOT_FOUND') return { installation: 'unavailable', repository: 'unavailable', canAdminister: false }; throw error; }
      const repository = repositories.find(value => value.id === repositoryId);
      if (!repository) return { installation: 'active', repository: 'unavailable', canAdminister: false };
      return { installation: 'active', repository: 'available', canAdminister: repository.permissions?.admin === true, fullName: repository.full_name };
    },

    // Reads for the signed-in experience. Each result is display context for this request only.
    async profile({ material }) {
      const user = await json(`${api}/user`, { token: material.accessToken });
      return { id: user.id, login: user.login, avatarUrl: user.avatar_url, type: user.type };
    },
    async installations({ material }) {
      return pages(`${api}/user/installations`, material.accessToken, value => value.installations ?? []).then(list => list.map(value => ({ id: value.id, account: { login: value.account?.login, type: value.account?.type } })));
    },
    async installationRepositories({ material, installationId }) {
      const list = await pages(`${api}/user/installations/${installationId}/repositories`, material.accessToken, value => value.repositories ?? []);
      return list.map(value => ({ repositoryId: value.id, installationId, fullName: value.full_name, owner: value.owner?.login, name: value.name, private: value.private === true, canAdminister: value.permissions?.admin === true }));
    },
    async organizationRole({ material, organization }) {
      try { const membership = await json(`${api}/user/memberships/orgs/${encodeURIComponent(organization)}`, { token: material.accessToken }); return membership.role === 'admin' ? 'admin' : 'member'; }
      catch (error) { if (error.code === 'E_PROVIDER_NOT_FOUND') return 'none'; throw error; }
    },
    /** GitHub's 100 most recently updated pull requests of one repository: lifecycle facts, transiently. */
    async recentPullRequests({ material, fullName }) {
      const list = await json(`${api}/repos/${fullName}/pulls?state=all&sort=updated&direction=desc&per_page=${PAGE}`, { token: material.accessToken });
      return { pullRequests: (Array.isArray(list) ? list : []).map(pull), complete: !Array.isArray(list) || list.length < PAGE };
    },
    async pullRequest({ material, fullName, number }) {
      return pull(await json(`${api}/repos/${fullName}/pulls/${number}`, { token: material.accessToken }));
    }
  };
}
