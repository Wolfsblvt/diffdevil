// SPDX-License-Identifier: AGPL-3.0-only
import type { APIRoute } from 'astro';
import { authSession } from '../../lib/routes.mjs';
export const POST: APIRoute = ({ request, locals }) => authSession(request, locals.app);
