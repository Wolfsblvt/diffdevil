// SPDX-License-Identifier: AGPL-3.0-only

const encoder = new TextEncoder();
const STATE_MS = 10 * 60_000;
const ARTIFACT_MS = 2 * 60_000;
const SESSION_COOKIE_NAME = '__Host-diffdevil-session';
const OAUTH_COOKIE_NAME = '__Host-diffdevil-oauth';
const opaquePattern = /^[A-Za-z0-9_-]{43}$/u;

function refusal(code) { return Object.assign(new Error(code), { code, headers: protectedHeaders() }); }
function expiresAt(now, duration) { return new Date(Date.parse(now()) + duration).toISOString(); }
function validExpiry(value, now) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value && value > now();
}
function opaqueValue() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}
async function digest(value) {
  if (typeof value !== 'string' || !opaquePattern.test(value)) throw refusal('E_AUTH_INVALID_VALUE');
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)))].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function validOrigin(origin, allowedOrigins, method) {
  if (typeof method !== 'string' || !['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase())) throw refusal('E_AUTH_METHOD');
  if (typeof origin !== 'string' || !allowedOrigins.has(origin)) throw refusal('E_AUTH_ORIGIN');
}
function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

/** These headers belong on every protected result, including its refusal response. */
export function protectedHeaders() { return { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' }; }

/** Route-neutral GitHub-user authorization; the router chooses paths and visible language later. */
export function createAuthorizationService({ store, admission, history, provider, protector, returnContexts, allowedOrigins, allowedCallbackUrls, sessionLifetimeMs, now = () => new Date().toISOString() }) {
  if (!store || !admission || !provider || !protector || !returnContexts || !allowedOrigins || !allowedCallbackUrls) throw new TypeError('Authorization adapters and allowlists are required.');
  if (!Number.isSafeInteger(sessionLifetimeMs) || sessionLifetimeMs <= 0 || sessionLifetimeMs % 1000 !== 0
    || !Number.isFinite(new Date(Date.parse(now()) + sessionLifetimeMs).getTime())) throw new TypeError('A selected session lifetime is required.');
  const contexts = new Set(returnContexts);
  const origins = new Set(allowedOrigins);
  const callbacks = new Set(allowedCallbackUrls);
  if (contexts.size === 0 || origins.size === 0 || callbacks.size === 0 || [...origins].some(origin => {
    try { const url = new URL(origin); return url.origin !== origin || url.protocol !== 'https:'; } catch { return true; }
  }) || [...callbacks].some(callback => {
    try { const url = new URL(callback); return url.protocol !== 'https:' || url.toString() !== callback || url.search !== '' || url.hash !== ''; } catch { return true; }
  })) throw new TypeError('Authorization requires finite return contexts and HTTPS origins/callbacks.');

  function requireContext(value) {
    if (typeof value !== 'string' || !contexts.has(value) || value.includes('://') || value.startsWith('/')) throw refusal('E_AUTH_RETURN_CONTEXT');
    return value;
  }

  async function currentAuthorization(userId) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const row = await store.authorization(userId);
      if (!row || row.revoked_at || row.expires_at <= now()) throw refusal('E_AUTHORIZATION_UNAVAILABLE');
      let material;
      let expectedProtectedMaterial = row.protected_material;
      try {
        material = await protector.open(row.protected_material);
        if (!material) throw refusal('E_AUTHORIZATION_UNAVAILABLE');
        const result = await provider.verifyUserAuthorization({ userId, material });
        if (!result?.valid) throw refusal('E_AUTHORIZATION_UNAVAILABLE');
        if (result.material) {
          if (!validExpiry(result.expiresAt, now)) throw refusal('E_AUTHORIZATION_UNAVAILABLE');
          expectedProtectedMaterial = await protector.seal(result.material);
          if (!await store.refreshAuthorization(userId, row.protected_material, expectedProtectedMaterial, result.expiresAt)) {
            if (attempt === 0) continue;
            throw refusal('E_AUTHORIZATION_UNAVAILABLE');
          }
          material = result.material;
        }
      } catch { throw refusal('E_AUTHORIZATION_UNAVAILABLE'); }
      const current = await store.authorization(userId);
      if (!current || current.revoked_at || current.expires_at <= now()) throw refusal('E_AUTHORIZATION_UNAVAILABLE');
      if (current.protected_material === expectedProtectedMaterial) return material;
      if (attempt === 1) throw refusal('E_AUTHORIZATION_UNAVAILABLE');
    }
    throw refusal('E_AUTHORIZATION_UNAVAILABLE');
  }

  async function principal(sessionValue) {
    let hash;
    try { hash = await digest(sessionValue); } catch { throw refusal('E_SESSION_UNAVAILABLE'); }
    const row = await store.session(hash);
    if (!row || row.revoked_at || row.expires_at <= now()) throw refusal('E_SESSION_UNAVAILABLE');
    return { userId: row.user_id, returnContext: row.return_context };
  }

  async function authorizedAdmission(sessionValue, repositoryId, kind) {
    const actor = await principal(sessionValue);
    const material = await currentAuthorization(actor.userId);
    const repository = await store.repositoryIdentity(repositoryId);
    if (!repository) throw refusal('E_ADMISSION_UNAUTHORIZED');
    let access;
    try {
      access = await provider.checkRepositoryAccess({ material, userId: actor.userId, installationId: repository.installation_id, repositoryId, kind });
    } catch { throw refusal('E_ADMISSION_UNAUTHORIZED'); }
    if (access?.installation !== 'active' || access?.repository !== 'available' || access?.canAdminister !== true) throw refusal('E_ADMISSION_UNAUTHORIZED');
    return { ...actor, role: 'repository-admin' };
  }

  async function admissionCall(call) {
    try { return await call(); }
    catch (error) { throw refusal(typeof error?.code === 'string' && error.code.startsWith('E_ADMISSION_') ? error.code : 'E_ADMISSION_UNAVAILABLE'); }
  }

  return {
    async begin(returnContext) {
      requireContext(returnContext);
      const state = opaqueValue();
      const browserBinding = opaqueValue();
      let authorizationUrl;
      try {
        authorizationUrl = new URL(await provider.authorizationUrl({ state }));
        if (authorizationUrl.origin !== 'https://github.com' || authorizationUrl.pathname !== '/login/oauth/authorize'
          || authorizationUrl.searchParams.getAll('state').length !== 1 || authorizationUrl.searchParams.get('state') !== state
          || !callbacks.has(authorizationUrl.searchParams.get('redirect_uri'))) throw new TypeError('Invalid authorization destination.');
      } catch { throw refusal('E_AUTH_DESTINATION'); }
      await store.createAttempt(await digest(state), await digest(browserBinding), returnContext, expiresAt(now, STATE_MS));
      return { authorizationUrl: authorizationUrl.toString(), state, headers: { ...protectedHeaders(), 'Set-Cookie': cookie(OAUTH_COOKIE_NAME, browserBinding, STATE_MS / 1000) } };
    },

    async complete({ state, code, browserBinding }) {
      if (typeof code !== 'string' || code.length === 0) throw refusal('E_AUTH_CODE');
      let stateHash, browserHash;
      try { [stateHash, browserHash] = await Promise.all([digest(state), digest(browserBinding)]); }
      catch { throw refusal('E_AUTH_STATE'); }
      const returnContext = await store.consumeAttempt(stateHash, browserHash);
      if (!returnContext) throw refusal('E_AUTH_STATE');
      let authorization;
      try {
        const exchanged = await provider.exchangeCode({ code });
        const userId = await provider.userForAuthorization(exchanged?.material);
        if (!Number.isSafeInteger(userId) || userId <= 0 || !validExpiry(exchanged?.expiresAt, now)) throw new TypeError('Invalid provider authorization.');
        authorization = { userId, protectedMaterial: await protector.seal(exchanged.material), expiresAt: exchanged.expiresAt };
      } catch { throw refusal('E_AUTH_PROVIDER'); }
      const artifact = opaqueValue();
      await store.saveAuthorizationWithArtifact(authorization.userId, authorization.protectedMaterial, authorization.expiresAt,
        await digest(artifact), returnContext, expiresAt(now, ARTIFACT_MS));
      return { artifact, returnContext, headers: { ...protectedHeaders(), 'Set-Cookie': cookie(OAUTH_COOKIE_NAME, '', 0) } };
    },

    async exchange({ artifact, returnContext, method, origin, previousSession }) {
      validOrigin(origin, origins, method);
      requireContext(returnContext);
      let previousHash;
      if (previousSession) {
        try { previousHash = await digest(previousSession); } catch { /* An unusable old cookie cannot consume this artifact. */ }
      }
      let artifactHash;
      try { artifactHash = await digest(artifact); } catch { throw refusal('E_AUTH_ARTIFACT'); }
      const userId = await store.artifactUser(artifactHash, returnContext);
      if (!userId) throw refusal('E_AUTH_ARTIFACT');
      await currentAuthorization(userId);
      const session = opaqueValue();
      if (!await store.exchangeArtifact(artifactHash, returnContext, await digest(session), expiresAt(now, sessionLifetimeMs), previousHash)) throw refusal('E_AUTH_ARTIFACT');
      return { userId, returnContext, headers: { ...protectedHeaders(), 'Set-Cookie': cookie(SESSION_COOKIE_NAME, session, sessionLifetimeMs / 1000) } };
    },

    async authenticate(session) {
      const actor = await principal(session);
      await currentAuthorization(actor.userId);
      return actor;
    },

    async rotate({ session, method, origin }) {
      validOrigin(origin, origins, method);
      const actor = await principal(session);
      await currentAuthorization(actor.userId);
      const next = opaqueValue();
      if (!await store.rotateSession(await digest(session), await digest(next), actor.userId, actor.returnContext, expiresAt(now, sessionLifetimeMs))) throw refusal('E_SESSION_UNAVAILABLE');
      return { ...actor, headers: { ...protectedHeaders(), 'Set-Cookie': cookie(SESSION_COOKIE_NAME, next, sessionLifetimeMs / 1000) } };
    },

    async logout({ session, method, origin }) {
      validOrigin(origin, origins, method);
      let sessionHash;
      try { sessionHash = await digest(session); } catch { /* Clearing a malformed cookie still succeeds. */ }
      if (sessionHash) await store.revokeSession(sessionHash);
      return { headers: { ...protectedHeaders(), 'Set-Cookie': cookie(SESSION_COOKIE_NAME, '', 0) } };
    },

    async readAdmission({ session, repositoryId }) {
      const actor = await authorizedAdmission(session, repositoryId, 'read');
      return { body: await admissionCall(() => admission.read(repositoryId, actor)), headers: protectedHeaders() };
    },

    async updateAdmission({ session, repositoryId, method, origin, settings }) {
      validOrigin(origin, origins, method);
      const actor = await authorizedAdmission(session, repositoryId, 'update');
      return { body: await admissionCall(() => admission.update(repositoryId, { ...settings, origin: 'dashboard', actor })), headers: protectedHeaders() };
    },

    async readHistory({ session, query }) {
      if (!history) throw refusal('E_HISTORY_UNAVAILABLE');
      const actor = { ...await authorizedAdmission(session, query?.repositoryId, 'read'), authorizedRepositoryIds: [query.repositoryId] };
      return { body: await history.query(query, actor), headers: protectedHeaders() };
    },
    async compareHistory({ session, left, right }) {
      if (!history) throw refusal('E_HISTORY_UNAVAILABLE');
      const actor = await principal(session);
      const authorizedRepositoryIds = [];
      for (const repositoryId of new Set([left?.repositoryId, right?.repositoryId])) {
        if (!Number.isSafeInteger(repositoryId) || repositoryId < 1) throw refusal('E_ADMISSION_UNAUTHORIZED');
        try { await authorizedAdmission(session, repositoryId, 'read'); authorizedRepositoryIds.push(repositoryId); }
        catch (error) { if (error?.code !== 'E_ADMISSION_UNAUTHORIZED') throw error; }
      }
      return { body: await history.compare(left, right, { ...actor, authorizedRepositoryIds }), headers: protectedHeaders() };
    },
    async historyBaseline({ session, query }) {
      if (!history) throw refusal('E_HISTORY_UNAVAILABLE');
      const actor = { ...await authorizedAdmission(session, query?.repositoryId, 'read'), authorizedRepositoryIds: [query.repositoryId] };
      return { body: await history.baseline(query, actor), headers: protectedHeaders() };
    },
    async historyPolicyLab({ session, query, proposal }) {
      if (!history) throw refusal('E_HISTORY_UNAVAILABLE');
      const actor = { ...await authorizedAdmission(session, query?.repositoryId, 'read'), authorizedRepositoryIds: [query.repositoryId] };
      return { body: await history.policyLab(query, proposal, actor), headers: protectedHeaders() };
    },
    async exportNumericHistory({ session, repositoryId }) {
      if (!history) throw refusal('E_HISTORY_UNAVAILABLE');
      const actor = { ...await authorizedAdmission(session, repositoryId, 'read'), authorizedRepositoryIds: [repositoryId] };
      return { body: await history.exportNumeric(repositoryId, actor), headers: protectedHeaders() };
    },
    async saveHistoryLens({ session, repositoryId, lens, method, origin }) {
      if (!history) throw refusal('E_HISTORY_UNAVAILABLE');
      validOrigin(origin, origins, method);
      const actor = { ...await authorizedAdmission(session, repositoryId, 'update'), authorizedRepositoryIds: [repositoryId] };
      return { body: await history.saveLens(repositoryId, lens, actor), headers: protectedHeaders() };
    },
    async historyLenses({ session, repositoryId }) {
      if (!history) throw refusal('E_HISTORY_UNAVAILABLE');
      const actor = { ...await authorizedAdmission(session, repositoryId, 'read'), authorizedRepositoryIds: [repositoryId] };
      return { body: await history.lenses(repositoryId, actor), headers: protectedHeaders() };
    },
    async readHistoryLens({ session, query }) {
      if (!history) throw refusal('E_HISTORY_UNAVAILABLE');
      const actor = { ...await authorizedAdmission(session, query?.repositoryId, 'read'), authorizedRepositoryIds: [query.repositoryId] };
      return { body: await history.lens(query, actor), headers: protectedHeaders() };
    },
    async removeHistoryLens({ session, repositoryId, lensId, method, origin }) {
      if (!history) throw refusal('E_HISTORY_UNAVAILABLE');
      validOrigin(origin, origins, method);
      const actor = { ...await authorizedAdmission(session, repositoryId, 'update'), authorizedRepositoryIds: [repositoryId] };
      await history.removeLens(repositoryId, lensId, actor);
      return { body: { removed: true }, headers: protectedHeaders() };
    }
  };
}
