// SPDX-License-Identifier: MIT
/**
 * Deliberately capture, audit, and verify the single public example catalogue.
 * Captures use GitHub reads and the shared diffdevil parser only. They retain the
 * normalized report needed for offline policy replay, never a raw third-party patch.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { analyzeDiff, readReport, unwrap } from '../dist/lib/index.js';
import { compilePolicy, evaluatePolicy } from '../dist/lib/policy/index.js';

const ROOT = 'docs/examples/catalogue';
const SNAPSHOTS = join(ROOT, 'snapshots');
const json = (path) => JSON.parse(readFileSync(path, 'utf8'));
const read = (path) => readFileSync(path, 'utf8');
const write = (path, value) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`); };
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const sources = () => json(join(ROOT, 'sources.json')).sources;
const catalogue = () => json(join(ROOT, 'catalogue.json'));
const policies = () => json(join(ROOT, 'policies.json')).policies;

function endpoint(route) { return `https://api.github.com${route}`; }
async function github(route, accept = 'application/vnd.github+json') {
  const response = await fetch(endpoint(route), { headers: { accept, 'x-github-api-version': '2026-03-10', 'user-agent': 'diffdevil-example-capture' } });
  if (!response.ok) throw new Error(`GitHub GET ${route} returned HTTP ${response.status}.`);
  return response;
}
async function githubJson(route) { return (await github(route)).json(); }
function snapshotPath(id) { return join(SNAPSHOTS, `${id}.json`); }
function sourceFor(id) {
  const source = sources()[id];
  if (!source) throw new Error(`Unknown catalogue source "${id}".`);
  return source;
}
function policyFor(id) {
  const policy = policies()[id];
  if (!policy) throw new Error(`Unknown catalogue policy "${id}".`);
  return unwrap(compilePolicy(policy));
}
function reportFor(sourceId) {
  const source = sourceFor(sourceId);
  if (source.kind === 'unified-diff') return unwrap(analyzeDiff(read(source.path)));
  if (source.kind === 'report') return unwrap(readReport(json(source.path)));
  const path = snapshotPath(sourceId);
  if (!existsSync(path)) throw new Error(`Missing captured snapshot ${path}; run capture ${sourceId}.`);
  return unwrap(readReport(json(path).report));
}

async function capture(id) {
  const source = sourceFor(id);
  if (source.kind !== 'curated-pr') throw new Error(`${id} is a controlled source; it has no upstream capture.`);
  const [comparison, pull] = await Promise.all([
    githubJson(`/repos/${source.repository}/compare/${source.baseTip}...${source.head}`),
    githubJson(`/repos/${source.repository}/pulls/${source.pullRequest}`),
  ]);
  const mergeBase = comparison.merge_base_commit?.sha;
  if (!/^[0-9a-f]{40}$/u.test(mergeBase ?? '')) throw new Error(`${id} did not return a full merge-base revision.`);
  if (pull.base?.sha !== source.baseTip || pull.head?.sha !== source.head) throw new Error(`${id} no longer resolves to its selected base tip and head.`);
  const [baseNotice, headNotice, diffResponse] = await Promise.all([
    githubJson(`/repos/${source.repository}/contents/${source.noticePath}?ref=${mergeBase}`),
    githubJson(`/repos/${source.repository}/contents/${source.noticePath}?ref=${source.head}`),
    github(`/repos/${source.repository}/compare/${mergeBase}...${source.head}`, 'application/vnd.github.diff'),
  ]);
  if (headNotice.sha !== source.noticeSha) throw new Error(`${id} head notice differs from the selected provenance.`);
  const diff = await diffResponse.text();
  const report = unwrap(analyzeDiff(diff, {
    source: {
      kind: 'unified-diff', comparison: 'three-dot', repository: source.repository, pullRequest: source.pullRequest,
      base: mergeBase, baseTip: source.baseTip, head: source.head,
      comparisonId: `github-compare-${sha256(`${source.repository}:${mergeBase}:${source.head}`)}`,
    },
  }));
  const entry = catalogue().entries.find((item) => item.variants.some((variant) => variant.source === id));
  const snapshot = {
    kind: 'diffdevil.example-snapshot', schemaVersion: '1.0', id,
    repository: source.repository, pullRequest: source.pullRequest, url: source.url,
    title: comparison.commit?.commit?.message?.split('\n')[0] ?? id,
    capturedAt: new Date().toISOString(),
    provenance: {
      baseTip: source.baseTip, mergeBase, head: source.head,
      rights: {
        retainedMaterial: 'normalized-report-only',
        rootNotice: source.notice,
        baseNoticeSha: baseNotice.sha,
        headNoticeSha: headNotice.sha,
        review: 'Captured diff bytes were analyzed in memory and not committed; the snapshot retains only normalized file and measurement facts.',
      },
    },
    engine: { package: json('package.json').version, reportSchema: report.schemaVersion, replacementLines: report.semantics.replacementLines },
    lesson: entry ? { id: entry.id, title: entry.title } : undefined,
    report,
  };
  write(snapshotPath(id), snapshot);
  console.log(`captured ${id}: ${source.repository}#${source.pullRequest} ${mergeBase.slice(0, 7)}...${source.head.slice(0, 7)} · ${report.files.length} files · ${report.measurement.status}`);
}

async function audit() {
  for (const [id, source] of Object.entries(sources())) {
    if (source.kind !== 'curated-pr') continue;
    const snapshot = existsSync(snapshotPath(id)) ? json(snapshotPath(id)) : undefined;
    const pull = await githubJson(`/repos/${source.repository}/pulls/${source.pullRequest}`);
    const findings = [];
    if (!snapshot) findings.push('not captured');
    else {
      if (snapshot.engine.package !== json('package.json').version) findings.push(`engine ${snapshot.engine.package} -> ${json('package.json').version}`);
      if (snapshot.engine.replacementLines !== 'replacement-lines-v1') findings.push('replacement measurement identity changed');
      if (snapshot.provenance.baseTip !== source.baseTip || snapshot.provenance.head !== source.head) findings.push('catalogue identity changed');
    }
    if (pull.base?.sha !== source.baseTip || pull.head?.sha !== source.head) findings.push('provider PR reference moved');
    console.log(`${id}: ${findings.length ? findings.join('; ') : 'accepted current snapshot'}`);
  }
}

function verify() {
  const entries = catalogue().entries;
  const ids = new Set(entries.map((entry) => entry.id));
  if (ids.size !== entries.length) throw new Error('Catalogue example IDs must be unique.');
  for (const entry of entries) {
    if (!Array.isArray(entry.guide) || entry.guide.length < 3) throw new Error(`${entry.id} needs its short guide.`);
    for (const variant of entry.variants) {
      const report = reportFor(variant.source);
      const result = unwrap(evaluatePolicy(policyFor(variant.policy), report));
      if (!result.report.measurement.status) throw new Error(`${entry.id}/${variant.id} did not produce a measurement standing.`);
    }
  }
  console.log(`verified ${entries.length} examples and ${entries.reduce((sum, entry) => sum + entry.variants.length, 0)} variants offline.`);
}

const [command, id] = process.argv.slice(2);
try {
  if (command === 'capture' && id) await capture(id);
  else if (command === 'audit') await audit();
  else if (command === 'verify') verify();
  else throw new Error('Usage: node tools/examples.mjs capture <source-id> | audit | verify');
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
