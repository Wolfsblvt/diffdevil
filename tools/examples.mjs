// SPDX-License-Identifier: MIT
/**
 * Deliberately capture, audit, and verify the public example catalogue.
 *
 * Every selected teaching source is a real public pull request. Captures retain
 * normalized diffdevil reports, provider inventory facts, pinned notice
 * identities, and per-file material dispositions. Raw patches, binary bytes,
 * discussion, credentials, and whole provider responses are never committed.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  analyzeChanges,
  analyzeDiff,
  parsePatch,
  readReport,
  unwrap,
} from '../dist/lib/index.js';
import { compilePolicy, evaluatePolicy } from '../dist/lib/policy/index.js';

const ROOT = 'docs/examples/catalogue';
const SNAPSHOTS = join(ROOT, 'snapshots');
const OBSERVATIONS = join(ROOT, 'observations.json');
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
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

function githubHeaders(accept) {
  const token = process.env.GITHUB_TOKEN?.trim();
  return {
    accept,
    'x-github-api-version': '2026-03-10',
    'user-agent': 'diffdevil-example-capture',
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

async function github(route, accept = 'application/vnd.github+json') {
  const response = await fetch(endpoint(route), { headers: githubHeaders(accept) });
  if (!response.ok) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    throw new Error(
      `GitHub GET ${route} returned HTTP ${response.status}`
      + (remaining === null ? '.' : ` with ${remaining} requests remaining.`),
    );
  }
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
  if (source.kind !== 'curated-pr') {
    throw new Error(`Catalogue source "${sourceId}" is not a real public pull request.`);
  }
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

function providerEntry(file) {
  return {
    path: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    patchAvailable: typeof file.patch === 'string',
  };
}

function providerFileSet(files, reportedCount, complete) {
  if (!Number.isSafeInteger(reportedCount) || reportedCount < files.length) {
    throw new Error(`Provider file total ${reportedCount} contradicts ${files.length} observed rows.`);
  }
  if (complete && files.length !== reportedCount) {
    throw new Error(`Complete provider route returned ${files.length} of ${reportedCount} files.`);
  }
  return {
    complete,
    observedCount: files.length,
    reportedCount,
    entries: files.map(providerEntry),
  };
}

const STATUSES = {
  added: 'added',
  removed: 'deleted',
  modified: 'modified',
  renamed: 'renamed',
  copied: 'copied',
  changed: 'type-changed',
  unchanged: 'modified',
};

function providerChange(file, usePatch) {
  const changeType = STATUSES[file.status];
  if (!changeType) throw new Error(`Unsupported GitHub file status "${file.status}".`);
  if (typeof file.filename !== 'string' || file.filename.length === 0) {
    throw new Error('GitHub returned a changed file without a filename.');
  }
  if (!Number.isSafeInteger(file.additions) || !Number.isSafeInteger(file.deletions)
      || file.additions < 0 || file.deletions < 0
      || file.changes !== file.additions + file.deletions) {
    throw new Error(`GitHub raw counters disagree for ${file.filename}.`);
  }
  const common = {
    path: file.filename,
    changeType,
    additions: file.additions,
    deletions: file.deletions,
    ...(file.previous_filename ? { oldPath: file.previous_filename } : {}),
  };
  if (file.patch !== undefined && typeof file.patch !== 'string') {
    throw new Error(`GitHub patch is not text for ${file.filename}.`);
  }
  const ambiguousGitlink = typeof file.patch === 'string'
    && /^[+-]Subproject commit [0-9a-f]+(?:-dirty)?$/mu.test(file.patch);
  if (usePatch && typeof file.patch === 'string' && file.patch !== '' && !ambiguousGitlink) {
    try {
      const patch = parsePatch(file.patch);
      if (patch.additions === file.additions && patch.deletions === file.deletions) {
        return { ...common, kind: 'text', patch };
      }
    } catch {
      // Raw counters still bound a text patch whose edit blocks are incomplete.
    }
  }
  if (!ambiguousGitlink && typeof file.patch === 'string') {
    return {
      ...common,
      kind: 'text',
      incompleteReason: usePatch ? 'PATCH_INCOMPLETE' : 'PATCH_OMITTED',
    };
  }
  if (ambiguousGitlink || file.additions + file.deletions === 0) {
    return { ...common, kind: 'unknown', incompleteReason: 'MATERIAL_KIND_UNKNOWN' };
  }
  return {
    ...common,
    kind: 'text',
    incompleteReason: file.patch === undefined ? 'PATCH_OMITTED' : 'PATCH_INCOMPLETE',
  };
}

function sourceIdentity(source, mergeBase) {
  return {
    kind: 'github-api',
    comparison: 'three-dot',
    repository: source.repository,
    pullRequest: source.pullRequest,
    base: mergeBase,
    baseTip: source.baseTip,
    head: source.head,
    comparisonId: `github-compare-${sha256(`${source.repository}:${mergeBase}:${source.head}`)}`,
  };
}

async function pullFiles(source, reportedCount) {
  const files = [];
  for (let page = 1; page <= 30; page += 1) {
    const batch = await githubJson(
      `/repos/${source.repository}/pulls/${source.pullRequest}/files?per_page=100&page=${page}`,
    );
    if (!Array.isArray(batch)) throw new Error(`${source.repository}#${source.pullRequest} returned a non-array file page.`);
    files.push(...batch);
    if (batch.length < 100) break;
  }
  if (files.length !== reportedCount) {
    throw new Error(
      `${source.repository}#${source.pullRequest} PR-files returned ${files.length} of ${reportedCount} files.`,
    );
  }
  return files;
}

function resolveNoticeRef(value, source, mergeBase) {
  if (value === 'merge-base') return mergeBase;
  if (value === 'base-tip') return source.baseTip;
  if (value === 'head') return source.head;
  if (isSha(value)) return value;
  throw new Error(`Unsupported notice ref "${value}".`);
}

function noticeSpecifications(source, mergeBase) {
  if (Array.isArray(source.notices)) {
    return source.notices.flatMap((notice) => notice.refs.map((item) => ({
      label: notice.label,
      repository: notice.repository ?? source.repository,
      path: notice.path,
      role: item.role,
      ref: resolveNoticeRef(item.ref, source, mergeBase),
      expectedSha: item.sha,
    })));
  }
  return [
    {
      label: source.notice,
      repository: source.repository,
      path: source.noticePath,
      role: 'base',
      ref: mergeBase,
    },
    {
      label: source.notice,
      repository: source.repository,
      path: source.noticePath,
      role: 'head',
      ref: source.head,
      expectedSha: source.noticeSha,
    },
  ];
}

function encodePath(path) {
  return path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

async function captureNotices(source, mergeBase) {
  const records = [];
  for (const spec of noticeSpecifications(source, mergeBase)) {
    const notice = await githubJson(
      `/repos/${spec.repository}/contents/${encodePath(spec.path)}?ref=${spec.ref}`,
    );
    if (!isSha(notice.sha)) throw new Error(`${spec.label} did not return a blob SHA.`);
    if (spec.expectedSha && notice.sha !== spec.expectedSha) {
      throw new Error(
        `${spec.label} at ${spec.repository}:${spec.path}@${spec.ref} is ${notice.sha}, not ${spec.expectedSha}.`,
      );
    }
    records.push({
      label: spec.label,
      repository: spec.repository,
      path: spec.path,
      role: spec.role,
      ref: spec.ref,
      sha: notice.sha,
    });
  }
  return records;
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
  if (source.expectedChangedFiles !== undefined && pull.changed_files !== source.expectedChangedFiles) {
    throw new Error(`${id} now reports ${pull.changed_files} files, not ${source.expectedChangedFiles}.`);
  }
  return mergeBase;
}

function validateProviderExpectation(id, source, provider) {
  if (source.expectedFileSetComplete !== undefined
      && provider.complete !== source.expectedFileSetComplete) {
    throw new Error(`${id} file-set completeness changed to ${provider.complete}.`);
  }
  if (source.expectedObservedFiles !== undefined
      && provider.observedCount !== source.expectedObservedFiles) {
    throw new Error(`${id} exposed ${provider.observedCount} rows, not ${source.expectedObservedFiles}.`);
  }
}

async function acquiredReport(id, source, mergeBase, comparison, pull) {
  const reportedCount = pull.changed_files;
  if (!Number.isSafeInteger(reportedCount) || reportedCount < 0) {
    throw new Error(`${id} returned an invalid pull-request file total.`);
  }
  const mode = source.capture ?? 'comparison-diff';
  if (mode === 'comparison-diff') {
    const files = Array.isArray(comparison.files) ? comparison.files : [];
    const provider = providerFileSet(files, reportedCount, files.length === reportedCount);
    if (!provider.complete) {
      throw new Error(`${id} selected exact comparison capture but exposed only ${files.length} of ${reportedCount} files.`);
    }
    const response = await github(
      `/repos/${source.repository}/compare/${mergeBase}...${source.head}`,
      'application/vnd.github.diff',
    );
    const report = unwrap(analyzeDiff(await response.text(), {
      source: {
        ...sourceIdentity(source, mergeBase),
        kind: 'unified-diff',
      },
    }));
    if (report.files.length !== files.length) {
      throw new Error(`${id} raw comparison produced ${report.files.length} files, not ${files.length}.`);
    }
    return {
      report,
      provider,
      acquisition: {
        route: 'github-rest-compare-three-dot',
        comparisonEndpoint: `/repos/${source.repository}/compare/${mergeBase}...${source.head}`,
        identityEndpoint: `/repos/${source.repository}/compare/${source.baseTip}...${source.head}`,
        pullEndpoint: `/repos/${source.repository}/pulls/${source.pullRequest}`,
      },
    };
  }

  const files = mode === 'pull-files'
    ? await pullFiles(source, reportedCount)
    : (Array.isArray(comparison.files) ? comparison.files : []);
  const complete = mode === 'pull-files' || files.length === reportedCount;
  const provider = providerFileSet(files, reportedCount, complete);
  const report = unwrap(analyzeChanges(
    files.map((file) => providerChange(file, source.patches !== 'counters-only')),
    {
      source: sourceIdentity(source, mergeBase),
      fileSet: { complete, total: { status: 'exact', value: reportedCount } },
    },
  ));
  return {
    report,
    provider,
    acquisition: {
      route: mode === 'pull-files' ? 'github-rest-pull-files' : 'github-rest-compare-files',
      comparisonEndpoint: `/repos/${source.repository}/compare/${mergeBase}...${source.head}`,
      identityEndpoint: `/repos/${source.repository}/compare/${source.baseTip}...${source.head}`,
      pullEndpoint: `/repos/${source.repository}/pulls/${source.pullRequest}`,
      filesEndpoint: mode === 'pull-files'
        ? `/repos/${source.repository}/pulls/${source.pullRequest}/files`
        : `/repos/${source.repository}/compare/${mergeBase}...${source.head}`,
    },
  };
}

export function auditFindings(source, snapshot, current, packageVersion) {
  const findings = [];
  if (!snapshot) return ['not captured'];
  if (snapshot.engine?.package !== packageVersion) findings.push(`engine ${snapshot.engine?.package} -> ${packageVersion}`);
  if (snapshot.engine?.replacementLines !== 'replacement-lines-v1') findings.push('replacement measurement identity changed');
  if (snapshot.provenance?.baseTip !== source.baseTip || snapshot.provenance?.head !== source.head) findings.push('catalogue identity changed');
  if (snapshot.provenance?.mergeBase !== source.mergeBase) findings.push('catalogue merge-base identity changed');
  if (snapshot.edition !== (source.edition ?? 'teaching-snapshot')) findings.push('catalogue evidence edition changed');
  if (current.baseTip !== source.baseTip || current.head !== source.head) findings.push('provider PR reference moved');
  if (current.mergeBase !== source.mergeBase) findings.push('provider merge base moved');
  return findings;
}

function assertSnapshot(sourceId, snapshot, source) {
  if (snapshot.kind !== 'diffdevil.example-snapshot') throw new Error(`${sourceId} has an unknown snapshot kind.`);
  if (snapshot.provenance?.baseTip !== source.baseTip
      || snapshot.provenance?.head !== source.head
      || snapshot.provenance?.mergeBase !== source.mergeBase) {
    throw new Error(`${sourceId} snapshot provenance does not match its selected source identity.`);
  }
  if (snapshot.edition !== (source.edition ?? 'teaching-snapshot')) {
    throw new Error(`${sourceId} snapshot evidence edition does not match its selected source.`);
  }
  if (snapshot.rights?.retainedMaterial !== 'normalized-report-only') {
    throw new Error(`${sourceId} does not declare the normalized-report-only retention boundary.`);
  }
  if (!Array.isArray(snapshot.notices?.records) || snapshot.notices.records.length === 0
      || snapshot.notices.records.some((record) => !isSha(record.sha))) {
    throw new Error(`${sourceId} is missing pinned notice identities.`);
  }
  if (snapshot.payload?.normalizedReportSha256 !== sha256(stableJson(snapshot.report))) {
    throw new Error(`${sourceId} normalized report digest does not match the retained report.`);
  }
  if (snapshot.payload?.providerFileSetSha256 !== sha256(stableJson(snapshot.provider))) {
    throw new Error(`${sourceId} provider file-set digest does not match the retained inventory.`);
  }
  if (!Array.isArray(snapshot.material) || snapshot.material.length !== snapshot.report.files.length) {
    throw new Error(`${sourceId} is missing per-file retained-material dispositions.`);
  }
  if (snapshot.provider?.observedCount !== snapshot.report.files.length) {
    throw new Error(`${sourceId} provider and normalized observed-file counts disagree.`);
  }
  validateProviderExpectation(sourceId, source, snapshot.provider);
}

function writeObservations() {
  write(OBSERVATIONS, generatedObservations());
}

export async function capture(id, options = {}) {
  const source = sourceFor(id);
  if (source.kind !== 'curated-pr') throw new Error(`${id} is not a real public pull request.`);
  const [comparison, pull] = await Promise.all([
    githubJson(`/repos/${source.repository}/compare/${source.baseTip}...${source.head}`),
    githubJson(`/repos/${source.repository}/pulls/${source.pullRequest}`),
  ]);
  const mergeBase = validateCaptureTarget(id, source, comparison, pull);
  const [{ report, provider, acquisition }, noticeRecords] = await Promise.all([
    acquiredReport(id, source, mergeBase, comparison, pull),
    captureNotices(source, mergeBase),
  ]);
  validateProviderExpectation(id, source, provider);
  const entry = entryForSource(id);
  const snapshot = {
    kind: 'diffdevil.example-snapshot',
    schemaVersion: '1.2',
    id,
    edition: source.edition ?? 'teaching-snapshot',
    repository: source.repository,
    pullRequest: source.pullRequest,
    url: source.url,
    title: pull.title ?? id,
    capturedAt: new Date().toISOString(),
    provenance: { baseTip: source.baseTip, mergeBase, head: source.head },
    acquisition,
    notices: {
      declared: source.notice,
      records: noticeRecords,
    },
    rights: {
      retainedMaterial: 'normalized-report-only',
      rawComparison: 'analyzed-in-memory-not-committed',
      binaryBytes: 'not-retained',
      review: 'Pinned notices and every retained normalized file record were inspected; raw source lines, patch text, discussion, and provider responses are not retained.',
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
  if (options.writeObservations !== false) writeObservations();
  console.log(
    `captured ${id}: ${source.repository}#${source.pullRequest}`
    + ` ${mergeBase.slice(0, 7)}...${source.head.slice(0, 7)}`
    + ` · ${report.files.length}/${pull.changed_files} files`
    + ` · ${report.measurement.status}`,
  );
}

export async function captureAll() {
  const ids = Object.entries(sourcesDocument().sources)
    .filter(([, source]) => source.kind === 'curated-pr')
    .map(([id]) => id);
  for (const id of ids) await capture(id, { writeObservations: false });
  writeObservations();
  console.log(`captured ${ids.length} real-PR evidence editions and regenerated observations.`);
}

export async function audit() {
  let failed = false;
  for (const [id, source] of Object.entries(sourcesDocument().sources)) {
    if (source.kind !== 'curated-pr') {
      failed = true;
      console.error(`${id}: non-public catalogue source is not allowed`);
      continue;
    }
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
  const document = catalogue();
  const entries = document.entries;
  const ids = new Set(entries.map((entry) => entry.id));
  if (ids.size !== entries.length) throw new Error('Catalogue example IDs must be unique.');

  const sources = sourcesDocument().sources;
  if (Object.values(sources).some((source) => source.kind !== 'curated-pr')) {
    throw new Error('Every catalogue source must be a real public pull request.');
  }

  const referenced = new Set();
  for (const entry of entries) {
    if (entry.sourceKind !== 'real-pr') throw new Error(`${entry.id} is not a real-PR lesson.`);
    if (!Array.isArray(entry.guide) || entry.guide.length < 3) throw new Error(`${entry.id} needs its short guide.`);
    for (const variant of entry.variants) {
      referenced.add(variant.source);
      const source = sourceFor(variant.source);
      const snapshot = json(snapshotPath(variant.source));
      assertSnapshot(variant.source, snapshot, source);
      const result = unwrap(evaluatePolicy(policyFor(variant.policy), reportFor(variant.source)));
      if (!result.report.measurement.status) throw new Error(`${entry.id}/${variant.id} did not produce a measurement standing.`);
    }
  }

  for (const sourceId of Object.keys(sources)) {
    if (!referenced.has(sourceId)) throw new Error(`Catalogue source "${sourceId}" is not used by any teaching variant.`);
  }

  const generated = generatedObservations();
  if (stableJson(json(OBSERVATIONS)) !== stableJson(generated)) {
    throw new Error('Generated catalogue observations drift from the retained observations.json record.');
  }
  return { examples: entries.length, variants: generated.observations.length, sources: referenced.size };
}

async function main() {
  const [command, id] = process.argv.slice(2);
  if (command === 'capture' && id) await capture(id);
  else if (command === 'capture-all') await captureAll();
  else if (command === 'audit') await audit();
  else if (command === 'verify') {
    const result = verifyCatalogue();
    console.log(
      `verified ${result.examples} examples, ${result.variants} variants,`
      + ` and ${result.sources} real-PR evidence editions offline.`,
    );
  } else {
    throw new Error(
      'Usage: node tools/examples.mjs capture <source-id> | capture-all | audit | verify',
    );
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
