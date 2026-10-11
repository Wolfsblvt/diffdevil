// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import type { APIRoute } from 'astro';
import { handleManageAction } from '../../lib/manage/actions.mjs';
export const POST: APIRoute = ({ request, locals }) => handleManageAction(request, { runtime: locals.app, session: locals.session, viewer: locals.viewer });
export const GET: APIRoute = () => new Response(null, { status: 303, headers: { location: '/manage' } });
