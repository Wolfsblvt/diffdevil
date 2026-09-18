// SPDX-License-Identifier: MIT
/**
 * Deliberately capture, audit, and verify the public example catalogue.
 *
 * Captures acquire public GitHub comparison data and analyze it through the
 * shared diffdevil engine. They retain the normalized report and compact
 * provenance needed for offline policy replay, never raw third-party patches
 * or executable bytes.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeDiff, readReport, unwrap } from '../dist/lib/index.js';
import { compilePolicy, evaluatePolicy } from '../dist/lib/policy/index.js';

const ROOT = 'docs/examples/catalogue';
const SNAPSHOTS = join(ROOT, 'snapshots');
const OBSERVATIONS = join(ROOT, 'observations.json');
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const read = (path) => readFileSync(path, 'utf8');
const write = (path, value) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const stableJson = (value) => JSON.stringify(value);
const isSha = (value) => /^[0-9a-f]{40}$/u.test(value ?? '');

function endpoint(route) {
  return `https://api.github.com${route}`;
}

async function github(route, accept = 'application/vnd.github+json') {
  const response = await fetch(endpoint(route), {
    headers: {
      accept,
      'x-github-api-version': '2026-03-10',
      'user-agent': 'diffdevil-example-capture',
    },
  });
  if (!response.ok) throw new Error(`GitHub GET ${route} returned HTTP ${response.status}.`);
  return response;
}

async function githubJson(route) {
  return (await github(route)).json();
}

function snapshotPath(id) {
  return join(SNAPSHOTS, `${id}.json`);
}

function sourcesDocument() {
  return json(join(ROOT, 'sources.json'));
}

function catalogue() {
  return json(join(ROOT, 'catalogue.json'));
}

function policiesDocument() {
  return json(join(ROOT, 'policies.json'));
}

export function sourceFor(id) {
  const source = sourcesDocument().sources[id];
  if (!source) throw new Error(`Unknown catalogue source "${id}".`);
  return source;
}

function policyFor(id) {
  const policy = policiesDocument().policies[id];
  if (!policy) throw new Error(`Unknown catalogue policy "${id}".`);
  return unwrap(compilePolicy(policy));
}

export function reportFor(sourceId) {
  const source = sourceFor(sourceId);
  if (source.kind === 'unified-diff') return unwrap(analyzeDiff(read(source.path)));
  if (source.kind === 'report') return unwrap(readReport(json(source.path)));
  const path = snapshotPath(sourceId);
  if (!existsSync(path)) throw new Error(`Missing captured snapshot ${path}; run capture ${sourceId}.`);
  return unwrap(readReport(json(path).report));
}

function entryForSource(sourceId) {
  return catalogue().entries.find((entry) => entry.variants.some((variant) => variant.source === sourceId));
}

function compactObservation(entry, variant, result) {
  const { report } = result;
  return {
    entry: entry.id,
    variant: variant.id,
    source: variant.source,
    policy: variant.policy,
    reportId: report.reportId,
    policyId: result.policyId,
    measurement: report.measurement,
    fileSet: report.fileSet,
    totals: report.totals,
    scopes: report.scopes,
    metrics: report.metrics,
    bands: report.bands,
    rules: result.rules,
    evidence: result.evidence,
  };
}

export function generatedObservations() {
  const entries = catalogue().entries;
  return {
    kind: 'diffdevil.example-observations',
    schemaVersion: '1.0',
    generatedFrom: {
      catalogueSha256: sha256(stableJson(catalogue())),
      policiesSha256: sha256(stableJson(policiesDocument())),
    },
    observations: entries.flatMap((entry) => entry.variants.map((variant) => compactObservation(
      entry,
      variant,
      unwrap(evaluatePolicy(policyFor(variant.policy), reportFor(variant.source))),
    ))),
  };
}

function materialDisposition(file) {
  return {
    path: file.path,
    kind: file.kind,
    normalizedFactsRetained: true,
    rawMaterialRetained: false,
    standing: file.kind === 'binary'
      ? 'binary-coordinate-and-normalized-facts-only'
      : 'normalized-facts-only',
  };
}

function providerFileSet(comparison, report) {
  const files = Array.isArray(comparison.files) ? comparison.files : [];
  if (files.length !== report.files.length) {
    throw new Error(`Provider reported ${files.length} files but the normalized report has ${report.files.length}.`);
  }
  return {
    complete: true,
    reportedCount: files.length,
    entries: files.map((file) => ({
      path: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patchAvailable: typeof file.patch === 'string',
    })),
  };
}

export function validateCaptureTarget(id, source, comparison, pull) {
  const mergeBase = comparison.merge_base_commit?.sha;
  if (!isSha(mergeBase)) throw new Error(`${id} did not return a full merge-base revision.`);
  if (source.mergeBase && source.mergeBase !== mergeBase) {
    throw new Error(`${id} resolved merge base ${mergeBase}, not selected merge base ${source.mergeBase}.`);
  }
  if (pull.base?.sha !== source.baseTip || pull.head?.sha !== source.head) {
    throw new Error(`${id} no longer resolves to its selected base tip and head.`);
  }
  return mergeBase;
}

export function auditFindings(source, snapshot, current, packageVersion) {
  const findings = [];
  if (!snapshot) return ['not captured'];
  if (snapshot.engine?.package !== packageVersion) findings.push(`engine ${snapshot.engine?.package} -> ${packageVersion}`);
  if (snapshot.engine?.replacementLines !== 'replacement-lines-v1') findings.push('replacement measurement identity changed');
  if (snapshot.provenance?.baseTip !== source.baseTip || snapshot.provenance?.head !== source.head) findings.push('catalogue identity changed');
  if (snapshot.provenance?.mergeBase !== source.mergeBase) findings.push('catalogue merge-base identity changed');
  if (current.baseTip !== source.baseTip || current.head !== source.head) findings.push('provider PR reference moved');
  if (current.mergeBase !== source.mergeBase) findings.push('provider merge base moved');
  return findings;
}

function assertSnapshot(sourceId, snapshot, source) {
  if (snapshot.kind !== 'diffdevil.example-snapshot') throw new Error(`${sourceId} has an unknown snapshot kind.`);
  if (snapshot.provenance?.baseTip !== source.baseTip || snapshot.provenance?.head !== source.head || snapshot.provenance?.mergeBase !== source.mergeBase) {
    throw new Error(`${sourceId} snapshot provenance does not match its selected source identity.`);
  }
  if (snapshot.rights?.retainedMaterial !== 'normalized-report-only') {
    throw new Error(`${sourceId} does not declare the normalized-report-only retention boundary.`);
  }
  if (!snapshot.notices?.base?.sha || !snapshot.notices?.head?.sha) {
    throw new Error(`${sourceId} is missing inspected notice identities.`);
  }
  if (snapshot.payload?.normalizedReportSha256 !== sha256(stableJson(snapshot.report))) {
    throw new Error(`${sourceId} normalized report digest does not match the retained report.`);
  }
  if (!Array.isArray(snapshot.material) || snapshot.material.length !== snapshot.report.files.length) {
    throw new Error(`${sourceId} is missing per-file retained-material dispositions.`);
  }
}

function writeObservations() {
  write(OBSERVATIONS, generatedObservations());
}

export async function capture(id) {
  const source = sourceFor(id);
  if (source.kind !== 'curated-pr') throw new Error(`${id} is a controlled source; it has no upstream capture.`);
  const [comparison, pull] = await Promise.all([
    githubJson(`/repos/${source.repository}/compare/${source.baseTip}...${source.head}`),
    githubJson(`/repos/${source.repository}/pulls/${source.pullRequest}`),
  ]);
  const mergeBase = validateCaptureTarget(id, source, comparison, pull);
  const [baseNotice, headNotice, diffResponse] = await Promise.all([
    githubJson(`/repos/${source.repository}/contents/${source.noticePath}?ref=${mergeBase}`),
    githubJson(`/repos/${source.repository}/contents/${source.noticePath}?ref=${source.head}`),
    github(`/repos/${source.repository}/compare/${mergeBase}...${source.head}`, 'application/vnd.github.diff'),
  ]);
  if (headNotice.sha !== source.noticeSha) throw new Error(`${id} head notice differs from the selected provenance.`);
  const diff = await diffResponse.text();
  const report = unwrap(analyzeDiff(diff, {
    source: {
      kind: 'unified-diff',
      comparison: 'three-dot',
      repository: source.repository,
      pullRequest: source.pullRequest,
      base: mergeBase,
      baseTip: source.baseTip,
      head: source.head,
      comparisonId: `github-compare-${sha256(`${source.repository}:${mergeBase}:${source.head}`)}`,
    },
  }));
  const entry = entryForSource(id);
  const provider = providerFileSet(comparison, report);
  const snapshot = {
    kind: 'diffdevil.example-snapshot',
    schemaVersion: '1.1',
    id,
    repository: source.repository,
    pullRequest: source.pullRequest,
    url: source.url,
    title: comparison.commit?.commit?.message?.split('\n')[0] ?? id,
    capturedAt: new Date().toISOString(),
    provenance: { baseTip: source.baseTip, mergeBase, head: source.head },
    acquisition: {
      route: 'github-rest-compare-three-dot',
      comparisonEndpoint: `/repos/${source.repository}/compare/${mergeBase}...${source.head}`,
      identityEndpoint: `/repos/${source.repository}/compare/${source.baseTip}...${source.head}`,
      pullEndpoint: `/repos/${source.repository}/pulls/${source.pullRequest}`,
    },
    notices: {
      declared: source.notice,
      base: { path: source.noticePath, sha: baseNotice.sha, ref: mergeBase },
      head: { path: source.noticePath, sha: headNotice.sha, ref: source.head },
    },
    rights: {
      retainedMaterial: 'normalized-report-only',
      rawComparison: 'analyzed-in-memory-not-committed',
      binaryBytes: 'not-retained',
      review: 'Root notices and every retained normalized file record were inspected; raw source lines, patch text, discussion, and provider responses are not retained.',
    },
    engine: {
      package: json('package.json').version,
      reportSchema: report.schemaVersion,
      replacementLines: report.semantics.replacementLines,
    },
    payload: {
      sourceSha256: sha256(stableJson(source)),
      normalizedReportSha256: sha256(stableJson(report)),
      providerFileSetSha256: sha256(stableJson(provider)),
    },
    capabilities: {
      policyReplay: true,
      remeasurement: false,
      remeasurementReason: 'No raw comparison material is retained in this teaching snapshot.',
    },
    lesson: entry ? { id: entry.id, title: entry.title } : undefined,
    provider,
    material: report.files.map(materialDisposition),
    report,
  };
  write(snapshotPath(id), snapshot);
  writeObservations();
  console.log(`captured ${id}: ${source.repository}#${source.pullRequest} ${mergeBase.slice(0, 7)}...${source.head.slice(0, 7)} · ${report.files.length} files · ${report.measurement.status}`);
}

export async function audit() {
  let failed = false;
  for (const [id, source] of Object.entries(sourcesDocument().sources)) {
    if (source.kind !== 'curated-pr') continue;
    try {
      const [pull, comparison] = await Promise.all([
        githubJson(`/repos/${source.repository}/pulls/${source.pullRequest}`),
        githubJson(`/repos/${source.repository}/compare/${source.baseTip}...${source.head}`),
      ]);
      const snapshot = existsSync(snapshotPath(id)) ? json(snapshotPath(id)) : undefined;
      const findings = auditFindings(source, snapshot, {
        baseTip: pull.base?.sha,
        head: pull.head?.sha,
        mergeBase: comparison.merge_base_commit?.sha,
      }, json('package.json').version);
      if (snapshot) assertSnapshot(id, snapshot, source);
      console.log(`${id}: ${findings.length ? findings.join('; ') : 'accepted current snapshot'}`);
    } catch (error) {
      failed = true;
      console.error(`${id}: source acquisition or retained-material hold: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failed) process.exitCode = 1;
}

export function verifyCatalogue() {
  const entries = catalogue().entries;
  const ids = new Set(entries.map((entry) => entry.id));
  if (ids.size !== entries.length) throw new Error('Catalogue example IDs must be unique.');
  for (const entry of entries) {
    if (!Array.isArray(entry.guide) || entry.guide.length < 3) throw new Error(`${entry.id} needs its short guide.`);
    for (const variant of entry.variants) {
      const source = sourceFor(variant.source);
      if (source.kind === 'curated-pr') assertSnapshot(variant.source, json(snapshotPath(variant.source)), source);
      const result = unwrap(evaluatePolicy(policyFor(variant.policy), reportFor(variant.source)));
      if (!result.report.measurement.status) throw new Error(`${entry.id}/${variant.id} did not produce a measurement standing.`);
    }
  }
  const generated = generatedObservations();
  if (stableJson(json(OBSERVATIONS)) !== stableJson(generated)) {
    throw new Error('Generated catalogue observations drift from the retained observations.json record.');
  }
  return { examples: entries.length, variants: generated.observations.length };
}

async function main() {
  const [command, id] = process.argv.slice(2);
  if (command === 'capture' && id) await capture(id);
  else if (command === 'audit') await audit();
  else if (command === 'verify') {
    const result = verifyCatalogue();
    console.log(`verified ${result.examples} examples and ${result.variants} variants offline.`);
  } else throw new Error('Usage: node tools/examples.mjs capture <source-id> | audit | verify');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
