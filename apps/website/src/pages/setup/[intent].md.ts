// SPDX-License-Identifier: AGPL-3.0-only
// Raw setup instructions at /setup/<intent>.md, served unchanged from docs/setup/.
import type { APIRoute, GetStaticPaths } from 'astro';
import { SETUP_SOURCES, setupSource, type SetupIntent } from '../../lib/sources';
export const getStaticPaths: GetStaticPaths = () => (Object.keys(SETUP_SOURCES) as SetupIntent[]).filter(intent => setupSource(intent)).map(intent => ({ params: { intent } }));
export const GET: APIRoute = ({ params }) => new Response(setupSource(params.intent as SetupIntent)!.text, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
