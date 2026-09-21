// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The website reads the shared real-PR catalogue directly. It does not own a
 * second list, an approximation of a policy, or a page-specific snapshot.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Report } from '@wolfsblvt/diffdevil/core';
import { repositoryRoot } from './engine-node';

const CATALOGUE_DIR = 'docs/examples/catalogue';

interface SourceVariant {
  readonly id: string;
  readonly label: string;
  readonly source: string;
  readonly policy: string;
}

interface SourceEntry {
  readonly id: string;
  readonly title: string;
  readonly lessons: readonly string[];
  readonly summary: string;
  readonly inspect: readonly string[];
  readonly guide: readonly string[];
  readonly variants: readonly SourceVariant[];
}

interface SourceCatalogue {
  readonly defaultExample: string;
  readonly heading: string;
  readonly description: string;
  readonly entries: readonly SourceEntry[];
}

interface SourceRecord {
  readonly repository: string;
  readonly pullRequest: number;
  readonly url: string;
}

interface SourceList {
  readonly sources: Readonly<Record<string, SourceRecord>>;
}

interface Snapshot {
  readonly kind: 'diffdevil.example-snapshot';
  readonly id: string;
  readonly edition: string;
  readonly repository: string;
  readonly pullRequest: number;
  readonly url: string;
  readonly title: string;
  readonly capturedAt: string;
  readonly provenance: { readonly baseTip: string; readonly mergeBase: string; readonly head: string };
  readonly engine: { readonly package: string; readonly reportSchema: string; readonly replacementLines: string };
  readonly capabilities: { readonly policyReplay: boolean; readonly remeasurement: boolean; readonly remeasurementReason?: string };
  readonly report: Report;
}

interface PolicyList {
  readonly policies: Readonly<Record<string, unknown>>;
}

export interface CatalogueVariant {
  readonly entryId: string;
  readonly id: string;
  readonly key: string;
  readonly label: string;
  readonly sourceId: string;
  readonly policyId: string;
  readonly policyText: string;
  readonly repository: string;
  readonly pullRequest: number;
  readonly url: string;
  readonly title: string;
  readonly capturedAt: string;
  readonly edition: string;
  readonly baseTip: string;
  readonly mergeBase: string;
  readonly head: string;
  readonly engine: Snapshot['engine'];
  readonly capabilities: Snapshot['capabilities'];
  readonly report: Report;
}

export interface CatalogueEntry {
  readonly id: string;
  readonly title: string;
  readonly lessons: readonly string[];
  readonly summary: string;
  readonly inspect: readonly string[];
  readonly guide: readonly string[];
  readonly variants: readonly CatalogueVariant[];
}

export interface ExampleCatalogue {
  readonly defaultExample: string;
  readonly heading: string;
  readonly description: string;
  readonly entries: readonly CatalogueEntry[];
  readonly variants: readonly CatalogueVariant[];
  findVariant(entryId: string, variantId?: string): CatalogueVariant | undefined;
  findVariantByKey(key: string): CatalogueVariant | undefined;
}

export function exampleKey(entryId: string, variantId: string): string {
  return `${entryId}--${variantId}`;
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(join(repositoryRoot, path), 'utf8')) as T;

let cache: ExampleCatalogue | undefined;

export function catalogue(): ExampleCatalogue {
  if (cache) return cache;
  const source = readJson<SourceCatalogue>(`${CATALOGUE_DIR}/catalogue.json`);
  const policies = readJson<PolicyList>(`${CATALOGUE_DIR}/policies.json`).policies;
  const sources = readJson<SourceList>(`${CATALOGUE_DIR}/sources.json`).sources;
  const snapshots = new Map<string, Snapshot>();

  const snapshotFor = (id: string): Snapshot => {
    const cached = snapshots.get(id);
    if (cached) return cached;
    const snapshot = readJson<Snapshot>(`${CATALOGUE_DIR}/snapshots/${id}.json`);
    if (snapshot.kind !== 'diffdevil.example-snapshot') throw new Error(`${id} is not an example snapshot.`);
    snapshots.set(id, snapshot);
    return snapshot;
  };

  const entries = source.entries.map(entry => ({
    ...entry,
    variants: entry.variants.map(variant => {
      const sourceRecord = sources[variant.source];
      const policy = policies[variant.policy];
      if (!sourceRecord) throw new Error(`${entry.id}/${variant.id} names an unknown source ${variant.source}.`);
      if (!policy) throw new Error(`${entry.id}/${variant.id} names an unknown policy ${variant.policy}.`);
      const snapshot = snapshotFor(variant.source);
      if (snapshot.repository !== sourceRecord.repository || snapshot.pullRequest !== sourceRecord.pullRequest) {
        throw new Error(`${entry.id}/${variant.id} source identity does not match ${variant.source}.`);
      }
      return {
        entryId: entry.id,
        id: variant.id,
        key: exampleKey(entry.id, variant.id),
        label: variant.label,
        sourceId: variant.source,
        policyId: variant.policy,
        policyText: `${JSON.stringify(policy, null, 2)}\n`,
        repository: snapshot.repository,
        pullRequest: snapshot.pullRequest,
        url: snapshot.url,
        title: snapshot.title,
        capturedAt: snapshot.capturedAt,
        edition: snapshot.edition,
        baseTip: snapshot.provenance.baseTip,
        mergeBase: snapshot.provenance.mergeBase,
        head: snapshot.provenance.head,
        engine: snapshot.engine,
        capabilities: snapshot.capabilities,
        report: snapshot.report,
      } satisfies CatalogueVariant;
    }),
  })) satisfies CatalogueEntry[];
  const variants = entries.flatMap(entry => entry.variants);

  cache = {
    defaultExample: source.defaultExample,
    heading: source.heading,
    description: source.description,
    entries,
    variants,
    findVariant(entryId, variantId) {
      const entry = entries.find(candidate => candidate.id === entryId);
      return entry?.variants.find(candidate => candidate.id === (variantId ?? entry.variants[0]?.id));
    },
    findVariantByKey(key) { return variants.find(candidate => candidate.key === key); },
  };
  return cache;
}
