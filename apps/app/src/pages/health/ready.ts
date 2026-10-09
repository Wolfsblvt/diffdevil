// SPDX-License-Identifier: AGPL-3.0-only
// Readiness: is the Worker configured and can it reach its database? Names the missing
// configuration without echoing any value.
import type { APIRoute } from 'astro';
export const GET: APIRoute = async ({ locals }) => {
  const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' };
  if (locals.configurationProblem) return new Response(JSON.stringify({ status: 'not-configured', service: 'diffdevil-app', reason: locals.configurationProblem }), { status: 503, headers });
  try { await locals.app.store.database.prepare('SELECT 1 AS ready').first(); }
  catch { return new Response(JSON.stringify({ status: 'database-unavailable', service: 'diffdevil-app' }), { status: 503, headers }); }
  return new Response(JSON.stringify({ status: 'ready', service: 'diffdevil-app' }), { status: 200, headers });
};
