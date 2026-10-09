// SPDX-License-Identifier: AGPL-3.0-only
import type { APIRoute } from 'astro';
import { authCallback } from '../../lib/routes.mjs';
export const GET: APIRoute = ({ request, locals }) => authCallback(request, locals.app);
