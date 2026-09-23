// SPDX-License-Identifier: AGPL-3.0-only

const encoder = new TextEncoder();
const STATE_MS = 10 * 60_000;
const ARTIFACT_MS = 2 * 60_000;
const SESSION_MS = 12 * 60 * 60_000;
const COOKIE_NAME = '__Host-diffdevil-session';
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
function cookie(value, maxAge) {
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

/** These headers belong on every protected result, including its refusal response. */
export function protectedHeaders() { return { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' }; }

/** Route-neutral GitHub-user authorization; the router chooses paths and visible language later. */
export function createAuthorizationService({ store, admission, provider, protector, returnContexts, allowedOrigins, allowedCallbackUrls, now = () => new Date().toISOString() }) {
  if (!store || !admission || !provider || !protector || !returnContexts || !allowedOrigins || !allowedCallbackUrls) throw new TypeError('Authorization adapters and allowlists are required.');
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
        if (!await store.refreshAuthorization(userId, row.protected_material, expectedProtectedMaterial, result.expiresAt)) throw refusal('E_AUTHORIZATION_UNAVAILABLE');
        material = result.material;
      }
    } catch { throw refusal('E_AUTHORIZATION_UNAVAILABLE'); }
    const current = await store.authorization(userId);
    if (!current || current.revoked_at || current.expires_at <= now() || current.protected_material !== expectedProtectedMaterial) throw refusal('E_AUTHORIZATION_UNAVAILABLE');
    return material;
  }

  async function principal(sessionValue) {
    const row = await store.session(await digest(sessionValue));
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
      await store.createAttempt(await digest(state), returnContext, expiresAt(now, STATE_MS));
      let authorizationUrl;
      try {
        authorizationUrl = new URL(await provider.authorizationUrl({ state }));
        if (authorizationUrl.origin !== 'https://github.com' || authorizationUrl.pathname !== '/login/oauth/authorize'
          || authorizationUrl.searchParams.getAll('state').length !== 1 || authorizationUrl.searchParams.get('state') !== state
          || !callbacks.has(authorizationUrl.searchParams.get('redirect_uri'))) throw new TypeError('Invalid authorization destination.');
      } catch { throw refusal('E_AUTH_DESTINATION'); }
      return { authorizationUrl: authorizationUrl.toString(), state, returnContext };
    },

    async complete({ state, code, returnContext }) {
      requireContext(returnContext);
      if (typeof code !== 'string' || code.length === 0) throw refusal('E_AUTH_CODE');
      if (!await store.consumeAttempt(await digest(state), returnContext)) throw refusal('E_AUTH_STATE');
      let authorization;
      try {
        const exchanged = await provider.exchangeCode({ code });
        const userId = await provider.userForAuthorization(exchanged?.material);
        if (!Number.isSafeInteger(userId) || userId <= 0 || !validExpiry(exchanged?.expiresAt, now)) throw new TypeError('Invalid provider authorization.');
        authorization = { userId, protectedMaterial: await protector.seal(exchanged.material), expiresAt: exchanged.expiresAt };
      } catch { throw refusal('E_AUTH_PROVIDER'); }
      await store.saveAuthorization(authorization.userId, authorization.protectedMaterial, authorization.expiresAt);
      const artifact = opaqueValue();
      await store.createArtifact(await digest(artifact), authorization.userId, returnContext, expiresAt(now, ARTIFACT_MS));
      return { artifact, returnContext };
    },

    async exchange({ artifact, returnContext, method, origin, previousSession }) {
      validOrigin(origin, origins, method);
      requireContext(returnContext);
      const userId = await store.consumeArtifact(await digest(artifact), returnContext);
      if (!userId) throw refusal('E_AUTH_ARTIFACT');
      await currentAuthorization(userId);
      const session = opaqueValue();
      if (previousSession) await store.revokeSession(await digest(previousSession));
      await store.createSession(await digest(session), userId, returnContext, expiresAt(now, SESSION_MS));
      return { userId, returnContext, headers: { ...protectedHeaders(), 'Set-Cookie': cookie(session, SESSION_MS / 1000) } };
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
      if (!await store.rotateSession(await digest(session), await digest(next), actor.userId, actor.returnContext, expiresAt(now, SESSION_MS))) throw refusal('E_SESSION_UNAVAILABLE');
      return { ...actor, headers: { ...protectedHeaders(), 'Set-Cookie': cookie(next, SESSION_MS / 1000) } };
    },

    async logout({ session, method, origin }) {
      validOrigin(origin, origins, method);
      await store.revokeSession(await digest(session));
      return { headers: { ...protectedHeaders(), 'Set-Cookie': cookie('', 0) } };
    },

    async readAdmission({ session, repositoryId }) {
      const actor = await authorizedAdmission(session, repositoryId, 'read');
      return { body: await admissionCall(() => admission.read(repositoryId, actor)), headers: protectedHeaders() };
    },

    async updateAdmission({ session, repositoryId, method, origin, settings }) {
      validOrigin(origin, origins, method);
      const actor = await authorizedAdmission(session, repositoryId, 'update');
      return { body: await admissionCall(() => admission.update(repositoryId, { ...settings, actor })), headers: protectedHeaders() };
    }
  };
}
