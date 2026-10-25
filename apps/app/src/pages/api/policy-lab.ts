// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import type { APIRoute } from 'astro';
import { readPolicyLab } from '../../lib/policy-lab-request.mjs';

const read: APIRoute = async ({ request, locals, url }) => {
  if (request.method === 'POST' && request.headers.get('origin') !== url.origin) return new Response(null, { status: 403 });
  try {
    const input = request.method === 'POST' ? await request.json() : null;
    const result = await readPolicyLab({ locals, url, input });
    return Response.json(result);
  } catch (error) {
    const code = (error as any)?.code ?? (error as any)?.diagnostic?.code;
    const access = code === 'E_POLICY_LAB_ACCESS';
    const invalid = typeof code === 'string' && (code.startsWith('E_POLICY_LAB_') || code.startsWith('E_BAND_'));
    return Response.json({ code: access ? code : invalid ? code : 'E_POLICY_LAB_UNAVAILABLE' }, { status: access ? 403 : invalid ? 400 : 503 });
  }
};
export const GET = read;
export const POST = read;
