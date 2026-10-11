// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import type { APIRoute } from 'astro';
import { authCallback } from '../../lib/routes.mjs';
export const GET: APIRoute = ({ request, locals }) => authCallback(request, locals.app);
