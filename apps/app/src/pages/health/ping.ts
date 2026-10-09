// SPDX-License-Identifier: AGPL-3.0-only
import type { APIRoute } from 'astro';
export const GET: APIRoute = () => new Response(JSON.stringify({ status: 'ok', service: 'diffdevil-app' }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
