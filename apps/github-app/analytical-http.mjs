// SPDX-License-Identifier: AGPL-3.0-only
import { protectedHeaders } from './authorization.mjs';

/** The existing opaque session is the only principal source. Path-bearing queries stay in same-origin bodies. */
export async function analyticalHttp(request, authorization) {
  const headers = { ...protectedHeaders(), 'Content-Type': 'application/json; charset=utf-8' };
  if (!['GET', 'POST'].includes(request.method)) return new Response(JSON.stringify({ code: 'E_APP_DATA_METHOD' }), { status: 405, headers });
  try {
    const cookies = (request.headers.get('cookie') ?? '').split(';').map(value => value.trim());
    const matches = cookies.filter(value => value.startsWith('__Host-diffdevil-session='));
    if (matches.length !== 1) throw Object.assign(new Error('E_SESSION_UNAVAILABLE'), { code: 'E_SESSION_UNAVAILABLE' });
    const session = matches[0].slice('__Host-diffdevil-session='.length);
    const url = new URL(request.url);
    let query;
    if (request.method === 'POST') {
      if (request.headers.get('origin') !== url.origin) throw Object.assign(new Error('E_APP_DATA_ORIGIN'), { code: 'E_APP_DATA_ORIGIN' });
      if (!request.headers.get('content-type')?.startsWith('application/json')) throw Object.assign(new Error('E_APP_DATA_QUERY'), { code: 'E_APP_DATA_QUERY' });
      query = await request.json();
    } else {
      query = JSON.parse(url.searchParams.get('query') ?? 'null');
      if (query?.path !== undefined || query?.surface === 'file') throw Object.assign(new Error('E_APP_DATA_QUERY'), { code: 'E_APP_DATA_QUERY' });
    }
    const result = await authorization.analyticalQuery({ session, query });
    return new Response(JSON.stringify(result.body), { headers: { ...headers, ...result.headers } });
  } catch (error) {
    const known = new Set(['E_APP_DATA_QUERY', 'E_APP_DATA_TIME', 'E_APP_DATA_ORIGIN', 'E_APP_DATA_UNAUTHORIZED', 'E_APP_DATA_NOT_FOUND', 'E_SESSION_UNAVAILABLE', 'E_AUTHORIZATION_UNAVAILABLE']);
    const code = error instanceof SyntaxError ? 'E_APP_DATA_QUERY' : known.has(error?.code) ? error.code : 'E_APP_DATA_UNAVAILABLE';
    const status = code === 'E_APP_DATA_NOT_FOUND' ? 404 : ['E_SESSION_UNAVAILABLE', 'E_AUTHORIZATION_UNAVAILABLE'].includes(code) ? 401
      : ['E_APP_DATA_UNAUTHORIZED', 'E_APP_DATA_ORIGIN'].includes(code) ? 403 : ['E_APP_DATA_QUERY', 'E_APP_DATA_TIME'].includes(code) ? 400 : 503;
    return new Response(JSON.stringify({ code }), { status, headers });
  }
}
