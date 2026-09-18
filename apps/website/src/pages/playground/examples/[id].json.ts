// SPDX-License-Identifier: AGPL-3.0-only
/**
 * One static JSON document per curated example. The playground island loads it and
 * evaluates policy locally through the shared engine; nothing here is a precomputed
 * website number. Fixtures are analyzed from their repository asset at build time;
 * curated real-PR snapshots ship their captured engine report and provenance.
 */
import type { APIRoute, GetStaticPaths } from 'astro';
import { fixtures } from '../../../../catalogue/fixtures.mjs';
import { curated } from '../../../lib/catalogue';
import { readRepositoryFile, reportFromDiff, reportFromSaved } from '../../../lib/engine-node';

export const getStaticPaths: GetStaticPaths = () => [
  ...fixtures.map(fixture => ({ params: { id: fixture.id } })),
  ...curated().map(entry => ({ params: { id: entry.id } })),
];

export const GET: APIRoute = ({ params }) => {
  const fixture = fixtures.find(entry => entry.id === params.id);
  let payload: unknown;
  if (fixture) {
    const text = readRepositoryFile(fixture.source.path);
    const report = fixture.source.kind === 'diff' ? reportFromDiff(text) : reportFromSaved(text);
    payload = {
      kind: 'diffdevil.playground-example', schemaVersion: '1.0', group: 'fixture',
      id: fixture.id, glyph: fixture.glyph, title: fixture.title, hook: fixture.hook, teaches: fixture.teaches, focus: fixture.focus,
      source: fixture.source,
      policy: fixture.policy.kind === 'file'
        ? { kind: 'file', path: fixture.policy.path!, name: fixture.policy.path!.split('/').pop(), text: readRepositoryFile(fixture.policy.path!) }
        : { kind: 'preset', name: 'size@1', text: 'version: 1\npresets: [size@1]\n' },
      commentPolicy: fixture.commentPolicy ? { path: fixture.commentPolicy.path, name: fixture.commentPolicy.path.split('/').pop(), text: readRepositoryFile(fixture.commentPolicy.path) } : undefined,
      report,
    };
  } else {
    const entry = curated().find(item => item.id === params.id);
    if (!entry) return new Response(null, { status: 404 });
    payload = {
      kind: 'diffdevil.playground-example', schemaVersion: '1.0', group: 'curated',
      id: entry.id, repository: entry.repository, pullRequest: entry.pullRequest, title: entry.title, url: entry.url,
      reason: entry.reason, teaches: entry.teaches, focus: 'review',
      snapshot: { head: entry.head, base: entry.base, analyzedAt: entry.analyzedAt, engine: entry.engine, evidence: entry.evidence, note: entry.note },
      policy: { kind: 'preset', name: 'size@1', text: 'version: 1\npresets: [size@1]\n' },
      report: entry.report,
    };
  }
  return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
