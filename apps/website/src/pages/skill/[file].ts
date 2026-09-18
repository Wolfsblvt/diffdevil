// SPDX-License-Identifier: AGPL-3.0-only
// /skill/SKILL.md serves the repository-owned Agent Skill byte-identically; /skill/version
// returns its front-matter version as text/plain. Both exist only when the source does;
// the site never fabricates a skill or a version.
import type { APIRoute, GetStaticPaths } from 'astro';
import { skillSource, skillVersion } from '../../lib/sources';

export const getStaticPaths: GetStaticPaths = () => {
  const source = skillSource();
  if (!source) return [];
  return [{ params: { file: 'SKILL.md' } }, ...(skillVersion(source) ? [{ params: { file: 'version' } }] : [])];
};

export const GET: APIRoute = ({ params }) => {
  const source = skillSource()!;
  if (params.file === 'version') return new Response(`${skillVersion(source)}\n`, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=300' } });
  return new Response(source.text, { headers: { 'content-type': 'text/markdown; charset=utf-8' } });
};
