// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Curated real-PR snapshots: captured by `tools/snapshot-prs.mjs` through the real
 * engine, kept under apps/website/catalogue/curated/. The site renders only what a
 * snapshot file states; it never invents a measurement or a head.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Report } from '@wolfsblvt/diffdevil/core';
import { repositoryRoot } from './engine-node';

export interface CuratedSnapshot {
  readonly kind: 'diffdevil.curated-snapshot'; readonly schemaVersion: '1.0';
  readonly id: string; readonly repository: string; readonly pullRequest: number; readonly title: string; readonly url: string;
  readonly reason: string; readonly teaches: string; readonly note?: string | undefined;
  readonly head: string; readonly base: string; readonly analyzedAt: string;
  readonly engine: { readonly package: string; readonly reportSchema: string; readonly replacementLines: string; readonly policy: string };
  readonly evidence: 'exact' | 'bounded' | 'unknown' | 'unmeasurable';
  readonly report: Report;
}

export const CURATED_DIR = 'apps/website/catalogue/curated';

let cache: CuratedSnapshot[] | undefined;
export function curated(): CuratedSnapshot[] {
  if (cache) return cache;
  const dir = join(repositoryRoot, CURATED_DIR);
  if (!existsSync(dir)) return (cache = []);
  cache = readdirSync(dir).filter(name => name.endsWith('.json')).sort().map(name => {
    const value = JSON.parse(readFileSync(join(dir, name), 'utf8')) as CuratedSnapshot;
    if (value.kind !== 'diffdevil.curated-snapshot') throw new Error(`${name} is not a curated snapshot.`);
    return value;
  });
  return cache;
}
