// SPDX-License-Identifier: AGPL-3.0-only
/** The website reads the docs-owned catalogue; snapshots are normalized engine output. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Report } from '@wolfsblvt/diffdevil/core';
import { repositoryRoot } from './engine-node';

export interface CuratedSnapshot {
  readonly kind: 'diffdevil.curated-snapshot'; readonly schemaVersion: '1.0';
  readonly id: string; readonly repository: string; readonly pullRequest: number; readonly title: string; readonly url: string;
  readonly reason: string; readonly teaches: string; readonly note?: string; readonly head: string; readonly base: string; readonly analyzedAt: string;
  readonly engine: { readonly package: string; readonly reportSchema: string; readonly replacementLines: string; readonly policy: string };
  readonly evidence: 'exact' | 'bounded' | 'unknown' | 'unmeasurable'; readonly report: Report;
  readonly variants: readonly { id: string; label: string; source: string; policy: string }[];
}

const ROOT = 'docs/examples/catalogue';
const SNAPSHOTS = join(repositoryRoot, ROOT, 'snapshots');
let cache: CuratedSnapshot[] | undefined;

export function curated(): CuratedSnapshot[] {
  if (cache) return cache;
  if (!existsSync(SNAPSHOTS)) return (cache = []);
  const catalogue = JSON.parse(readFileSync(join(repositoryRoot, ROOT, 'catalogue.json'), 'utf8'));
  cache = readdirSync(SNAPSHOTS).filter(name => name.endsWith('.json')).sort().map(name => {
    const snapshot = JSON.parse(readFileSync(join(SNAPSHOTS, name), 'utf8'));
    const entry = catalogue.entries.find((item: { variants: { source: string }[] }) => item.variants.some(variant => variant.source === snapshot.id));
    if (!entry || snapshot.kind !== 'diffdevil.example-snapshot') throw new Error(`${name} is not an admitted catalogue snapshot.`);
    return {
      kind: 'diffdevil.curated-snapshot', schemaVersion: '1.0', id: snapshot.id,
      repository: snapshot.repository, pullRequest: snapshot.pullRequest, title: snapshot.title, url: snapshot.url,
      reason: entry.summary, teaches: entry.guide.join(' '), head: snapshot.provenance.head, base: snapshot.provenance.mergeBase,
      analyzedAt: snapshot.capturedAt, engine: { ...snapshot.engine, policy: 'catalogue policy' }, evidence: snapshot.report.measurement.status, report: snapshot.report, variants: entry.variants,
    };
  });
  return cache;
}
