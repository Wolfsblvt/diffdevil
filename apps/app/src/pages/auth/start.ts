// SPDX-License-Identifier: AGPL-3.0-only
import type { APIRoute } from 'astro';
import { authStart } from '../../lib/routes.mjs';
export const GET: APIRoute = ({ request, locals }) => authStart(request, locals.app);
