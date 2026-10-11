// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import type { APIRoute } from 'astro';
export const GET: APIRoute = () => new Response(JSON.stringify({ status: 'ok', service: 'diffdevil-app' }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
