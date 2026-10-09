// SPDX-License-Identifier: AGPL-3.0-only
import type { APIRoute } from 'astro';
import { authLogout } from '../../lib/routes.mjs';
export const POST: APIRoute = ({ request, locals }) => authLogout(request, locals.app);
