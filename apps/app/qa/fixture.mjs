// SPDX-License-Identifier: AGPL-3.0-only
/**
 * One deterministic fixture for tests and local qualification: a GitHub account with four
 * installations, seven repositories in three standings, pull requests with lifecycle facts,
 * and analyses produced by the real engine from generated diffs, projected through the
 * managed App's own history projection. Nothing here is a real repository, person or token.
 */
import { analyzeDiff, compilePolicy, evaluatePolicy, unwrap } from '../../../dist/lib/index.js';
import { historyProjection } from '../../github-app/contracts.mjs';

export const NOW = '2026-10-09T14:00:00.000Z';
const DAY = 86_400_000;
const at = (daysAgo, hours = 0) => new Date(Date.parse(NOW) - daysAgo * DAY - hours * 3_600_000).toISOString();

export const USER = { id: 123, login: 'ada-sample', type: 'User', avatar_url: 'https://avatars.githubusercontent.com/u/123?v=4' };
export const TOKEN = 'fixture-user-token-private';
export const CODE = 'fixture-code';

export const INSTALLATIONS = [
  { id: 9, account: { login: 'ada-sample', type: 'User' } },
  { id: 10, account: { login: 'parser-guild', type: 'Organization' } },
  { id: 11, account: { login: 'northwind-tools', type: 'Organization' } },
  { id: 12, account: { login: 'kai-sample', type: 'User' } }
];
export const ROLES = { 'parser-guild': 'admin', 'northwind-tools': 'member' };

export const REPOSITORIES = [
  { repositoryId: 1001, installationId: 10, fullName: 'parser-guild/parser-lab', private: true, admin: true, history: true, execution: true, weight: 9 },
  { repositoryId: 1002, installationId: 10, fullName: 'parser-guild/lexer-kit', private: false, admin: true, history: true, execution: true, weight: 3 },
  { repositoryId: 1003, installationId: 10, fullName: 'parser-guild/grammar-fuzz', private: true, admin: true, history: false, execution: false, weight: 0 },
  { repositoryId: 1004, installationId: 9, fullName: 'ada-sample/dotfiles', private: true, admin: true, history: true, execution: true, weight: 1 },
  { repositoryId: 1005, installationId: 9, fullName: 'ada-sample/notes-site', private: false, admin: true, history: false, execution: true, weight: 0 },
  { repositoryId: 1006, installationId: 11, fullName: 'northwind-tools/ci-recipes', private: true, admin: false, history: true, execution: true, weight: 4 },
  { repositoryId: 1007, installationId: 12, fullName: 'kai-sample/tree-sitter-dd', private: false, admin: false, history: true, execution: true, weight: 1 }
];

const TITLES = ['Parse trailing commas in policy lists', 'Split tokenizer into lexer module', 'Report bounded ranges in JSON output', 'Handle CRLF in fixture diffs', 'Teach bands about open upper bounds', 'Drop legacy AST walker', 'Add size band docs', 'Cache scope globs per run', 'Explain unknown evidence in human output', 'Tighten rename detection threshold', 'Move policy evaluation into its own module', 'Fix off-by-one in hunk header parsing', 'Accept YAML anchors in policy files', 'Keep raw churn visible in CLI summary', 'Upgrade test runner', 'Refuse binary files with clear status', 'Support excluded paths in report', 'Document query arithmetic', 'Normalise path separators on Windows', 'Pin Node 24 in release workflow'];
const PATHS = ['src/parser.ts', 'tests/parser.test.ts', 'src/ast.ts', 'docs/policy.md', 'src/index.ts', 'src/policy/bands.ts', 'README.md', 'package.json', 'src/report/format.ts', 'src/cli/main.ts'];

let seed = 90210;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const sha = n => (n * 2654435761 >>> 0).toString(16).padStart(8, '0').repeat(5);

/** A unified diff with the requested replacement-aware shape: pairs of -/+ lines are modified; extra +/- are added/deleted. */
export function syntheticDiff(files) {
  return files.map(({ path, modified, added, deleted }) => {
    const oldCount = modified + deleted + 2, newCount = modified + added + 2;
    const lines = ['context before'];
    for (let i = 0; i < modified; i++) lines.push(`-old line ${i}`);
    for (let i = 0; i < deleted; i++) lines.push(`-removed line ${i}`);
    for (let i = 0; i < modified; i++) lines.push(`+new line ${i}`);
    for (let i = 0; i < added; i++) lines.push(`+added line ${i}`);
    lines.push('context after');
    return `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1,${oldCount} +1,${newCount} @@\n${lines.map(line => line.startsWith('-') || line.startsWith('+') ? line : ' ' + line).join('\n')}\n`;
  }).join('');
}

let policy;
/** The shipped size@1 preset, compiled the way the managed App compiles its default. */
function sizePolicy() {
  policy ??= unwrap(compilePolicy({ version: 1, presets: ['size@1'] }));
  return policy;
}

/** Analyse a generated diff with the real engine and the size-v1 policy; the evaluated report carries metrics, bands and rules. */
export function analysedReport(files, { base, head }) {
  const report = unwrap(analyzeDiff(syntheticDiff(files)));
  const evaluated = unwrap(evaluatePolicy(sizePolicy(), report));
  return { ...evaluated.report, rules: evaluated.rules ?? evaluated.report.rules, bands: evaluated.bands ?? evaluated.report.bands, source: { ...report.source, base, head, comparisonId: `cmp-${head.slice(0, 12)}` } };
}

const labelFor = report => ({ xs: 'size/XS', s: 'size/S', m: 'size/M', l: 'size/L', xl: 'size/XL' })[report.bands?.size?.id] ?? 'size/Unknown';
const observed = report => [{ kind: 'label.add', subject: labelFor(report), outcome: 'changed', request: 'acknowledged', readback: 'verified' }];

/** Pull requests with lifecycle facts and, for most, one or more analysed heads. */
export function pullRequests() {
  seed = 90210; // deterministic on every call, so D1 and the GitHub double describe the same pull requests
  const out = [];
  let number = 452;
  for (const repository of REPOSITORIES) {
    for (let i = 0; i < repository.weight * 4; i++) {
      const ageDays = i * 2.3 + rnd() * 1.5;
      const openedAt = at(ageDays + 1 + rnd() * 3);
      const roll = rnd();
      const state = i === 0 ? 'open' : i === 1 ? 'draft' : roll < 0.08 ? 'closed' : roll < 0.16 ? 'open' : 'merged';
      const mergedAt = state === 'merged' ? at(ageDays) : null;
      const closedAt = state === 'closed' ? at(ageDays) : mergedAt;
      const scale = [8, 14, 36, 60, 90, 140, 210, 320, 480, 640, 900, 1300][Math.floor(rnd() ** 1.5 * 12)];
      const heads = 1 + Math.floor(rnd() * 3);
      const fileCount = Math.max(1, Math.min(4, Math.round(scale / 120) + 1));
      const revisions = [];
      for (let h = 0; h < heads; h++) {
        const growth = 0.55 + (h / Math.max(1, heads - 1)) * 0.45;
        const files = Array.from({ length: fileCount }, (_, f) => ({ path: PATHS[(i + f) % PATHS.length], modified: Math.round(scale * growth * 0.4 / fileCount), added: Math.round(scale * growth * 0.4 / fileCount), deleted: Math.round(scale * growth * 0.2 / fileCount) }));
        revisions.push({ head: sha(number * 10 + h), observedAt: at(ageDays + (heads - 1 - h) * 0.6, 1), files });
      }
      const analysed = !(repository.repositoryId === 1006 && i % 5 === 4) && repository.history;
      out.push({ repository, number: number--, title: `${TITLES[out.length % TITLES.length]}${out.length >= TITLES.length ? ` (${Math.floor(out.length / TITLES.length) + 1})` : ''}`, state, draft: state === 'draft', openedAt, mergedAt, closedAt, updatedAt: closedAt ?? at(rnd() * 2), base: sha(number * 7), headSha: revisions.at(-1).head, revisions, analysed, bounded: analysed && i % 7 === 3, recordedBands: repository.repositoryId !== 1001 || i % 2 === 0 });
    }
  }
  return out;
}

/** Projections for the retained analyses: schema-3 shaped (metrics only) and schema-4 shaped (recorded bands), plus a few bounded specimens. */
export function projectionsFor(pull) {
  return pull.revisions.map((revision, index) => {
    const report = analysedReport(revision.files, { base: pull.base, head: revision.head });
    const projection = historyProjection(report, observed(report));
    if (pull.recordedBands) {
      projection.configuredResults = { metrics: projection.configuredResults, scopes: [], bands: [{ ref: 'size', status: report.bands?.size?.status === 'resolved' ? 'resolved' : 'unknown', id: report.bands?.size?.id }], rules: [{ ref: 'size', disposition: report.rules?.size?.disposition ?? 'held', band: report.bands?.size?.id }] };
      projection.schemaVersion = 4;
    }
    if (pull.bounded && index === pull.revisions.length - 1) {
      const changed = projection.totals.lines.changed.value ?? 0;
      projection.evidence = 'bounded';
      projection.totals.lines.changed = { status: 'bounded', minimum: Math.max(0, changed - 12), maximum: changed + 40 };
      projection.gaps = [...projection.gaps, 'measurement-not-exact'];
    }
    return { identity: { repositoryId: pull.repository.repositoryId, pullRequest: pull.number, comparisonId: report.source.comparisonId, policyId: 'size-v1-fixture' }, projection, observedAt: revision.observedAt, report };
  });
}

/** Write the fixture through the managed App's own write paths into a D1 store. */
export async function seedStore(appStore, clock) {
  for (const installation of INSTALLATIONS) {
    clock.value = at(200);
    await appStore.recordLifecycle({ installationId: installation.id, action: 'created', addedRepositories: REPOSITORIES.filter(repository => repository.installationId === installation.id).map(repository => repository.repositoryId), removedRepositories: [] });
  }
  for (const repository of REPOSITORIES) {
    if (repository.execution) await appStore.setRepositoryExecution(repository.repositoryId, { enabled: true, origin: 'fixture' });
    if (repository.history) await appStore.setRepositoryConsent(repository.repositoryId, { enabled: true, retentionDays: 3660, origin: 'fixture' });
  }
  let written = 0;
  for (const pull of pullRequests()) {
    if (!pull.analysed) continue;
    for (const { identity, projection, observedAt } of projectionsFor(pull)) {
      clock.value = observedAt;
      const result = await appStore.recordHistory(identity, projection);
      if (result.status !== 'published') throw new Error(`Fixture analysis for #${pull.number} was not published: ${result.status}`);
      written++;
    }
  }
  clock.value = NOW;
  return written;
}

/** The provider's view of the fixture, served over fetch: GitHub's wire shapes, nothing more. */
export function createFakeGitHub({ user = USER, token = TOKEN, code = CODE, clientId = 'fixture-client' } = {}) {
  const pulls = pullRequests();
  const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
  const wire = pull => ({ number: pull.number, title: pull.title, state: pull.state === 'open' || pull.state === 'draft' ? 'open' : 'closed', draft: pull.draft, created_at: pull.openedAt, merged_at: pull.mergedAt, closed_at: pull.closedAt, updated_at: pull.updatedAt, head: { sha: pull.headSha }, base: { sha: pull.base }, merge_commit_sha: pull.mergedAt ? sha(pull.number * 13) : null, html_url: `https://github.com/${pull.repository.fullName}/pull/${pull.number}` });
  const calls = [];
  const state = { rateLimited: false, tokenValid: true };
  async function fetch(input, init = {}) {
    const url = new URL(String(input)), method = init.method ?? 'GET', path = url.pathname;
    const authorization = new Headers(init.headers).get('authorization') ?? '';
    calls.push({ method, path, authorization: authorization.split(' ')[0] });
    if (state.rateLimited) return json({ message: 'rate limited' }, 403, { 'x-ratelimit-remaining': '0' });
    if (method === 'POST' && path === '/login/oauth/access_token') {
      const body = JSON.parse(String(init.body));
      if (body.code === code || body.grant_type === 'refresh_token') return json({ access_token: token, token_type: 'bearer', scope: '' });
      return json({ error: 'bad_verification_code' });
    }
    if (method === 'POST' && path === `/applications/${clientId}/token`) return state.tokenValid && JSON.parse(String(init.body)).access_token === token ? json({ user: { id: user.id } }) : json({ message: 'invalid' }, 404);
    if (authorization !== `Bearer ${token}`) return json({ message: 'Requires authentication' }, 401);
    if (path === '/user') return json({ id: user.id, login: user.login, type: user.type, avatar_url: user.avatar_url });
    if (path === '/user/installations') return json({ total_count: INSTALLATIONS.length, installations: INSTALLATIONS });
    let match = /^\/user\/installations\/(\d+)\/repositories$/u.exec(path);
    if (match) { const list = REPOSITORIES.filter(repository => repository.installationId === Number(match[1])).map(repository => ({ id: repository.repositoryId, full_name: repository.fullName, name: repository.fullName.split('/')[1], owner: { login: repository.fullName.split('/')[0] }, private: repository.private, permissions: { admin: repository.admin, push: true, pull: true } })); return json({ total_count: list.length, repositories: list }); }
    match = /^\/user\/memberships\/orgs\/([^/]+)$/u.exec(path);
    if (match) return ROLES[match[1]] ? json({ role: ROLES[match[1]], state: 'active' }) : json({ message: 'Not Found' }, 404);
    match = /^\/repos\/([^/]+\/[^/]+)\/pulls$/u.exec(path);
    if (match) return json(pulls.filter(pull => pull.repository.fullName === match[1]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 100).map(wire));
    match = /^\/repos\/([^/]+\/[^/]+)\/pulls\/(\d+)$/u.exec(path);
    if (match) { const pull = pulls.find(candidate => candidate.repository.fullName === match[1] && candidate.number === Number(match[2])); return pull ? json({ ...wire(pull), changed_files: pull.revisions.at(-1).files.length }) : json({ message: 'Not Found' }, 404); }
    return json({ message: 'Not Found' }, 404);
  }
  return { fetch, calls, state, pulls };
}
