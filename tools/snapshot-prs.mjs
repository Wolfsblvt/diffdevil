// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Curated real-PR snapshots for the public examples: capture and audit.
 *
 *   node tools/snapshot-prs.mjs capture <id> <https://github.com/owner/repo/pull/N> --reason "…" --teaches "…" [--title "…"] [--note "…"]
 *   node tools/snapshot-prs.mjs audit
 *
 * `capture` analyzes the public pull request through the real engine (unauthenticated
 * GitHub read, or GH_TOKEN when set) and writes one snapshot file with its provenance.
 * `audit` compares each snapshot's head with the current PR head and each snapshot's
 * engine/measurement identity with the current package, and lists what moved. It
 * changes nothing: refreshing a teaching snapshot is a deliberate maintainer action
 * (run `capture` again with the same id), and the previous file stays in Git history.
 *
 * No daemon, no scheduled job, no GitHub write.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { GitHubClient, analyzeGitHub, unwrap } from '../dist/lib/index.js';
import { readPullSnapshot } from '../dist/lib/github/index.js';

const DIR = 'apps/website/catalogue/curated';
const packageVersion = JSON.parse(readFileSync('package.json', 'utf8')).version;

function parseUrl(input) {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)\/pull\/([1-9]\d*)\/?$/u.exec(input ?? '');
  if (!match) throw new Error('Expected https://github.com/owner/repo/pull/N');
  return { repository: `${match[1]}/${match[2]}`, pullRequest: Number(match[3]), url: `https://github.com/${match[1]}/${match[2]}/pull/${match[3]}` };
}
function option(args, name) {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
}
function client() {
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  return new GitHubClient({ ...(token ? { token } : {}), readRetries: 1, timeoutMs: 20000 });
}
function evidenceOf(report) { return report.measurement.status; }

async function capture(args) {
  const [id, url] = args;
  if (!id || !/^[a-z0-9][a-z0-9-]*$/u.test(id)) throw new Error('Give a kebab-case snapshot id.');
  const target = parseUrl(url);
  const reason = option(args, 'reason'), teaches = option(args, 'teaches');
  if (!reason || !teaches) throw new Error('--reason and --teaches are required: a snapshot without its lesson is not curated.');
  const github = client();
  const pull = await github.json(`/repos/${target.repository}/pulls/${target.pullRequest}`);
  const title = option(args, 'title') ?? String(pull.title ?? '');
  const report = unwrap(await analyzeGitHub(github, target));
  const snapshot = {
    kind: 'diffdevil.curated-snapshot', schemaVersion: '1.0',
    id, repository: target.repository, pullRequest: target.pullRequest, title, url: target.url,
    reason, teaches, ...(option(args, 'note') ? { note: option(args, 'note') } : {}),
    head: report.source.head, base: report.source.base, analyzedAt: new Date().toISOString(),
    engine: { package: packageVersion, reportSchema: report.schemaVersion, replacementLines: report.semantics.replacementLines, policy: 'size@1' },
    evidence: evidenceOf(report),
    report,
  };
  mkdirSync(DIR, { recursive: true });
  const file = join(DIR, `${id}.json`);
  writeFileSync(file, JSON.stringify(snapshot, null, 2) + '\n');
  console.log(`captured ${file}: ${target.repository}#${target.pullRequest} head ${report.source.head.slice(0, 7)} · ${report.files.length} files · evidence ${snapshot.evidence}`);
}

async function audit() {
  if (!existsSync(DIR)) { console.log('No curated snapshots.'); return; }
  const github = client();
  let moved = 0;
  for (const name of readdirSync(DIR).filter(n => n.endsWith('.json')).sort()) {
    const snapshot = JSON.parse(readFileSync(join(DIR, name), 'utf8'));
    const findings = [];
    if (snapshot.engine.package !== packageVersion) findings.push(`engine package ${snapshot.engine.package} → ${packageVersion}`);
    if (snapshot.engine.replacementLines !== 'replacement-lines-v1') findings.push(`measurement ${snapshot.engine.replacementLines} → replacement-lines-v1`);
    try {
      const current = await readPullSnapshot(github, { repository: snapshot.repository, pullRequest: snapshot.pullRequest });
      if (current.head !== snapshot.head) findings.push(`head moved ${snapshot.head.slice(0, 7)} → ${current.head.slice(0, 7)} (${current.state})`);
      else findings.push(`head current (${current.state})`);
    } catch (error) {
      findings.push(`head unobserved: ${error instanceof Error ? error.message : String(error)}`);
    }
    if (findings.some(f => f.includes('→'))) moved++;
    console.log(`${snapshot.id}: ${snapshot.repository}#${snapshot.pullRequest} · analyzed ${snapshot.analyzedAt}\n  ${findings.join('\n  ')}`);
  }
  console.log(moved ? `${moved} snapshot(s) need a deliberate recapture.` : 'All snapshots current.');
}

const [command, ...rest] = process.argv.slice(2);
try {
  if (command === 'capture') await capture(rest);
  else if (command === 'audit') await audit();
  else { console.error('Usage: node tools/snapshot-prs.mjs capture <id> <pr-url> --reason … --teaches … | audit'); process.exitCode = 2; }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
