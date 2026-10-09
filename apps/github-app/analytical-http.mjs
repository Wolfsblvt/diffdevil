// SPDX-License-Identifier: AGPL-3.0-only
import { protectedHeaders } from './authorization.mjs';

/** The existing opaque session is the only principal source. GET queries never alter policy or provider state. */
export async function analyticalHttp(request, authorization) {
  const headers = { ...protectedHeaders(), 'Content-Type': 'application/json; charset=utf-8' };
  if (request.method !== 'GET') return new Response(JSON.stringify({ code: 'E_APP_DATA_METHOD' }), { status: 405, headers });
  try {
    const cookies = (request.headers.get('cookie') ?? '').split(';').map(value => value.trim());
    const matches = cookies.filter(value => value.startsWith('__Host-diffdevil-session='));
    if (matches.length !== 1) throw Object.assign(new Error('E_SESSION_UNAVAILABLE'), { code: 'E_SESSION_UNAVAILABLE' });
    const session = matches[0].slice('__Host-diffdevil-session='.length);
    const query = JSON.parse(new URL(request.url).searchParams.get('query') ?? 'null');
    const result = await authorization.analyticalQuery({ session, query });
    return new Response(JSON.stringify(result.body), { headers: { ...headers, ...result.headers } });
  } catch (error) {
    const known = new Set(['E_APP_DATA_QUERY', 'E_APP_DATA_TIME', 'E_APP_DATA_UNAUTHORIZED', 'E_APP_DATA_NOT_FOUND', 'E_SESSION_UNAVAILABLE', 'E_AUTHORIZATION_UNAVAILABLE']);
    const code = known.has(error?.code) ? error.code : 'E_APP_DATA_UNAVAILABLE';
    const status = code === 'E_APP_DATA_NOT_FOUND' ? 404 : ['E_SESSION_UNAVAILABLE', 'E_AUTHORIZATION_UNAVAILABLE'].includes(code) ? 401
      : code === 'E_APP_DATA_UNAUTHORIZED' ? 403 : ['E_APP_DATA_QUERY', 'E_APP_DATA_TIME'].includes(code) ? 400 : 503;
    return new Response(JSON.stringify({ code }), { status, headers });
  }
}
