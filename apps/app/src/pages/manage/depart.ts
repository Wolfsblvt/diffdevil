// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import type { APIRoute } from 'astro';
import { handleDeparture } from '../../lib/manage/actions.mjs';
export const GET: APIRoute = ({ request, locals }) => handleDeparture(request, { runtime: locals.app, session: locals.session, viewer: locals.viewer });
