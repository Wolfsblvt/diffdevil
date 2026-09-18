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

const catalogue = JSON.parse(readRepositoryFile('docs/examples/catalogue/catalogue.json'));
const sources = JSON.parse(readRepositoryFile('docs/examples/catalogue/sources.json')).sources;
const policies = JSON.parse(readRepositoryFile('docs/examples/catalogue/policies.json')).policies;
function variantPayload(variant: { id: string; label: string; source: string; policy: string }) {
  const source = sources[variant.source];
  const report = source.kind === 'unified-diff'
    ? reportFromDiff(readRepositoryFile(source.path))
    : source.kind === 'report'
      ? reportFromSaved(readRepositoryFile(source.path))
      : JSON.parse(readRepositoryFile(`docs/examples/catalogue/snapshots/${variant.source}.json`)).report;
  return { id: variant.id, label: variant.label, source: variant.source, policy: { name: variant.policy, text: JSON.stringify(policies[variant.policy]) }, report };
}

export const getStaticPaths: GetStaticPaths = () => [
  ...fixtures.map((fixture: { id: string }) => ({ params: { id: fixture.id } })),
  ...curated().map(entry => ({ params: { id: entry.id } })),
];

export const GET: APIRoute = ({ params }) => {
  const fixture = fixtures.find((entry: { id: string }) => entry.id === params.id);
  let payload: unknown;
  const catalogueEntry = catalogue.entries.find((entry: { id: string }) => entry.id === params.id);
  if (fixture) {
    const text = readRepositoryFile(fixture.source.path);
    const report = fixture.source.kind === 'diff' ? reportFromDiff(text) : reportFromSaved(text);
    payload = {
      kind: 'diffdevil.playground-example', schemaVersion: '1.0', group: 'fixture',
      id: fixture.id, glyph: fixture.glyph, title: fixture.title, hook: fixture.hook, teaches: fixture.teaches, focus: fixture.focus,
      source: fixture.source,
      policy: fixture.policy.kind === 'inline'
        ? { kind: 'file', name: fixture.policy.name, text: JSON.stringify(fixture.policy.document) }
        : fixture.policy.kind === 'file'
          ? { kind: 'file', path: fixture.policy.path!, name: fixture.policy.path!.split('/').pop(), text: readRepositoryFile(fixture.policy.path!) }
          : { kind: 'preset', name: 'size@1', text: 'version: 1\npresets: [size@1]\n' },
      commentPolicy: fixture.commentPolicy ? { path: fixture.commentPolicy.path, name: fixture.commentPolicy.path.split('/').pop(), text: readRepositoryFile(fixture.commentPolicy.path) } : undefined,
      report,
      variants: catalogueEntry ? catalogueEntry.variants.map(variantPayload) : undefined,
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
      variants: catalogueEntry ? catalogueEntry.variants.map(variantPayload) : undefined,
    };
  }
  return new Response(JSON.stringify(payload), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};
