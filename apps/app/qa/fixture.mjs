// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * One deterministic fixture for tests and local qualification: a GitHub account with four
 * installations (each with its numeric account), seven repositories in three standings, pull
 * requests with lifecycle facts, the older pathless analyses projected through the managed
 * App's history projection, and the named analytical records the analytical data contract
 * retains: development revisions, one final merged comparison per merged PR with observed
 * sizes, default-branch size observations, and a few merged PRs whose final comparison was
 * deliberately not recovered. Everything is produced by the real engine from generated diffs.
 * Nothing here is a real repository, person or token.
 */
import { analyzeDiff, compilePolicy, evaluatePolicy, unwrap } from '../../../dist/lib/index.js';
import { historyProjection } from '../../github-app/contracts.mjs';

export const NOW = '2026-10-09T14:00:00.000Z';
const DAY = 86_400_000;
const at = (daysAgo, hours = 0) => new Date(Date.parse(NOW) - daysAgo * DAY - hours * 3_600_000).toISOString();

export const USER = { id: 123, login: 'ada-sample', type: 'User', avatar_url: 'https://avatars.githubusercontent.com/u/123?v=4' };
export const TOKEN = 'fixture-user-token-private';
export const CODE = 'fixture-code';

/** Numeric GitHub accounts: a user's namespace is their user ID; an organisation has its own. */
export const ACCOUNTS = Object.freeze({ 'ada-sample': 123, 'parser-guild': 7001, 'northwind-tools': 7002, 'kai-sample': 456 });
export const INSTALLATIONS = [
  { id: 9, account: { login: 'ada-sample', type: 'User', id: 123 } },
  { id: 10, account: { login: 'parser-guild', type: 'Organization', id: 7001 } },
  { id: 11, account: { login: 'northwind-tools', type: 'Organization', id: 7002 } },
  { id: 12, account: { login: 'kai-sample', type: 'User', id: 456 } }
];
export const ROLES = { 'parser-guild': 'admin', 'northwind-tools': 'member' };
/** The local entitlement fixture keyed by numeric account: the viewer and parser-guild are Pro, northwind-tools is Business. */
export const ENTITLEMENT_FIXTURE = Object.freeze({ 123: 'Pro', 7001: 'Pro', 7002: 'Business' });

export const REPOSITORIES = [
  { repositoryId: 1001, installationId: 10, fullName: 'parser-guild/parser-lab', private: true, admin: true, history: true, execution: true, weight: 9, named: true, observeNow: true },
  // Every merge of this repository is recovered and observed, so its spine file's Turnover can be exact; parser-lab keeps discontinuities.
  { repositoryId: 1002, installationId: 10, fullName: 'parser-guild/lexer-kit', private: false, admin: true, history: true, execution: true, weight: 3, named: true, observeNow: true },
  { repositoryId: 1003, installationId: 10, fullName: 'parser-guild/grammar-fuzz', private: true, admin: true, history: false, execution: false, weight: 0 },
  { repositoryId: 1004, installationId: 9, fullName: 'ada-sample/dotfiles', private: true, admin: true, history: true, execution: true, weight: 1, named: true },
  { repositoryId: 1005, installationId: 9, fullName: 'ada-sample/notes-site', private: false, admin: true, history: false, execution: true, weight: 0 },
  { repositoryId: 1006, installationId: 11, fullName: 'northwind-tools/ci-recipes', private: true, admin: false, history: true, execution: true, weight: 4, named: true },
  // Pathless history only: this repository has analyses but no retained named records yet.
  { repositoryId: 1007, installationId: 12, fullName: 'kai-sample/tree-sitter-dd', private: false, admin: false, history: true, execution: true, weight: 1, named: false }
];

const TITLES = ['Parse trailing commas in policy lists', 'Split tokenizer into lexer module', 'Report bounded ranges in JSON output', 'Handle CRLF in fixture diffs', 'Teach bands about open upper bounds', 'Drop legacy AST walker', 'Add size band docs', 'Cache scope globs per run', 'Explain unknown evidence in human output', 'Tighten rename detection threshold', 'Move policy evaluation into its own module', 'Fix off-by-one in hunk header parsing', 'Accept YAML anchors in policy files', 'Keep raw churn visible in CLI summary', 'Upgrade test runner', 'Refuse binary files with clear status', 'Support excluded paths in report', 'Document query arithmetic', 'Normalise path separators on Windows', 'Pin Node 24 in release workflow'];
const BASE_PATHS = ['src/parser.ts', 'tests/parser.test.ts', 'src/ast.ts', 'docs/policy.md', 'src/index.ts', 'src/policy/bands.ts', 'README.md', 'package.json', 'src/report/format.ts', 'src/cli/main.ts'];
/** A denser population for performance qualification: more pull requests per repository and more files (`setScale`). */
let SCALE = 1;
let PATHS = BASE_PATHS;
export function setScale(scale) {
  SCALE = Math.max(1, Math.round(scale));
  const folders = ['src/lexer', 'src/policy', 'src/report', 'src/github', 'tests/unit', 'tests/golden', 'docs/manual', 'tools'];
  PATHS = SCALE === 1 ? BASE_PATHS : [...BASE_PATHS, ...Array.from({ length: (SCALE - 1) * 10 }, (_, index) => `${folders[index % folders.length]}/${['scan', 'walk', 'bind', 'emit', 'check', 'merge', 'fold', 'trace', 'parse', 'route'][index % 10]}-${Math.floor(index / 10) + 1}.ts`)];
}
export const currentScale = () => SCALE;
/** The recurring file in generated examples, keeping its size and Turnover path continuous. */
const SPINE = 'src/index.ts';
// A recent parser-lab merge carries this file without another changed file, so
// Pro Files can qualify the real no-partner state alongside a positive pair.
const PRO_FILE_WITHOUT_PARTNERS = 'src/independent-parser.ts';
const others = () => PATHS.filter(path => path !== SPINE);

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

/** The engine's plain report for a comparison between two immutable references, as the analytical collector retains it. */
export function comparisonReport(files, { base, head, comparisonId }) {
  return unwrap(analyzeDiff(syntheticDiff(files), { source: { kind: 'github-api', comparison: 'direct', comparisonId: comparisonId ?? `final:${base}:${head}`, base, head } }));
}

const labelFor = report => ({ xs: 'size/XS', s: 'size/S', m: 'size/M', l: 'size/L', xl: 'size/XL' })[report.bands?.size?.id] ?? 'size/Unknown';
const observed = report => [{ kind: 'label.add', subject: labelFor(report), outcome: 'changed', request: 'acknowledged', readback: 'verified' }];

/** Pull requests with lifecycle facts and, for most, one or more analysed heads. */
export function pullRequests() {
  seed = 90210; // deterministic on every call, so D1 and the GitHub double describe the same pull requests
  const out = [];
  let number = 452;
  for (const repository of REPOSITORIES) {
    const OTHERS = others();
    for (let i = 0; i < repository.weight * 4 * SCALE; i++) {
      const ageDays = i * 2.3 + rnd() * 1.5;
      const openedAt = at(ageDays + 1 + rnd() * 3);
      const roll = rnd();
      const state = i === 0 ? 'open' : i === 1 ? 'draft' : roll < 0.08 ? 'closed' : roll < 0.16 ? 'open' : 'merged';
      const mergedAt = state === 'merged' ? at(ageDays) : null;
      const closedAt = state === 'closed' ? at(ageDays) : mergedAt;
      const scale = [8, 14, 36, 60, 90, 140, 210, 320, 480, 640, 900, 1300][Math.floor(rnd() ** 1.5 * 12)];
      const heads = 1 + Math.floor(rnd() * 3);
      const fileCount = Math.max(1, Math.min(SCALE === 1 ? 4 : 6, Math.round(scale / 120) + 1));
      const revisions = [];
      for (let h = 0; h < heads; h++) {
        const growth = 0.55 + (h / Math.max(1, heads - 1)) * 0.45;
        const files = Array.from({ length: fileCount }, (_, f) => ({ path: f === 0 ? SPINE : OTHERS[(i * 7 + f * 3) % OTHERS.length], modified: Math.round(scale * growth * 0.4 / fileCount), added: Math.round(scale * growth * 0.4 / fileCount), deleted: Math.round(scale * growth * 0.2 / fileCount) }));
        revisions.push({ head: sha(number * 10 + h), observedAt: at(ageDays + (heads - 1 - h) * 0.6, 1), files });
      }
      const analysed = !(repository.repositoryId === 1006 && i % 5 === 4) && repository.history;
      // A few merged PRs keep their lifecycle but no recovered final comparison (squash boundary not established).
      const finalRecovered = !(repository.repositoryId === 1001 && i % 9 === 5);
      out.push({ repository, number: number--, title: `${TITLES[out.length % TITLES.length]}${out.length >= TITLES.length ? ` (${Math.floor(out.length / TITLES.length) + 1})` : ''}`, state, draft: state === 'draft', openedAt, readyAt: state === 'draft' ? null : i % 3 === 0 ? at(ageDays + 0.4) : null, mergedAt, closedAt, updatedAt: closedAt ?? at(rnd() * 2), base: sha(number * 7), headSha: revisions.at(-1).head, mergeCommitSha: mergedAt ? sha(number * 13) : null, revisions, analysed, finalRecovered, bounded: analysed && i % 7 === 3, recordedBands: repository.repositoryId === 1007 ? i % 2 === 0 : repository.repositoryId !== 1001 || i % 2 === 0 });
    }
    if (repository.repositoryId === 1001) {
      // A recent one-file merge makes a real zero-partner specimen in Pro Files
      // without changing the spine or its continuous size/Turnover history.
      const soloNumber = number--;
      const soloHead = sha(soloNumber * 10);
      const mergedAt = at(6.5);
      out.push({ repository, number: soloNumber, title: 'Add an independent parser file', state: 'merged', draft: false, openedAt: at(9), readyAt: at(8), mergedAt, closedAt: mergedAt, updatedAt: mergedAt, base: sha(soloNumber * 7), headSha: soloHead, mergeCommitSha: sha(soloNumber * 13), revisions: [{ head: soloHead, observedAt: at(7), files: [{ path: PRO_FILE_WITHOUT_PARTNERS, modified: 1, added: 1, deleted: 0 }] }], analysed: true, finalRecovered: true, bounded: false, recordedBands: true });
    }
  }
  return out;
}

/** Projections for the older pathless analyses: schema-3 shaped (metrics only) and schema-4 shaped (recorded bands), plus a few bounded specimens. */
export function projectionsFor(pull) {
  return pull.revisions.map((revision, index) => {
    const report = analysedReport(revision.files, { base: pull.base, head: revision.head });
    const projection = historyProjection(report, observed(report));
    if (!pull.recordedBands) {
      // An older (schema-3) analysis that recorded metrics only: the App derives its band from exact Changed and says so.
      projection.bands = [];
      projection.rules = [];
      projection.schemaVersion = 3;
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

/**
 * The named analytical records the data contract retains for repositories with named history:
 * one record per pull request with its development revisions and, when merged, its final merged
 * comparison and observed sizes. Sizes follow one chain per repository so a spine file's
 * Turnover can be exact while other files meet discontinuities. Returns records in merge order
 * together with the default-branch size observations taken after each merge.
 */
export function analyticalRecords() {
  const pulls = pullRequests().filter(pull => pull.repository.named);
  const byRepository = new Map();
  for (const pull of pulls) { if (!byRepository.has(pull.repository.repositoryId)) byRepository.set(pull.repository.repositoryId, []); byRepository.get(pull.repository.repositoryId).push(pull); }
  const records = [], observations = [];
  for (const [repositoryId, list] of byRepository) {
    const filePaths = repositoryId === 1001 ? [...PATHS, PRO_FILE_WITHOUT_PARTNERS] : PATHS;
    const sizes = new Map(filePaths.map(path => [path, 120 + (path.length * 17) % 300]));
    let branchHead = sha(repositoryId * 31);
    const merged = list.filter(pull => pull.mergedAt).sort((a, b) => a.mergedAt.localeCompare(b.mergedAt));
    const others = list.filter(pull => !pull.mergedAt);
    // Default-branch sizes observed before the first merge: the earliest size observation of each file.
    const firstObservedAt = at(120);
    for (const path of filePaths) observations.push({ repositoryId, path, observedAt: firstObservedAt, revision: branchHead, size: sizes.get(path) });
    const record = (pull, final) => ({ version: 1, repositoryId, pullRequest: pull.number, state: pull.state, openedAt: pull.openedAt, readyAt: pull.readyAt, mergedAt: pull.mergedAt, closedAt: pull.closedAt, updatedAt: pull.updatedAt, observedAt: pull.mergedAt ? new Date(Date.parse(pull.mergedAt) + 3_600_000).toISOString() : pull.updatedAt, currentHead: pull.headSha,
      revisions: pull.revisions.map((revision, index) => { const report = comparisonReport(revision.files, { base: pull.base, head: revision.head, comparisonId: `pr:${pull.base}:${revision.head}` }); const band = unwrap(evaluatePolicy(sizePolicy(), report)).report.bands?.size; return { base: pull.base, head: revision.head, observedAt: revision.observedAt, report, originalPolicyId: 'size-v1-fixture', originalBand: band?.status === 'resolved' ? band.id : null, desiredLabel: labelFor({ bands: { size: band } }), observedLabel: index === pull.revisions.length - 1 && pull.recordedBands ? labelFor({ bands: { size: band } }) : null }; }),
      final });
    for (const pull of merged) {
      const files = pull.revisions.at(-1).files;
      const base = branchHead, head = pull.mergeCommitSha;
      const sizeRows = files.map(file => { const before = sizes.get(file.path) ?? 0; const after = Math.max(0, before + file.added - file.deleted); sizes.set(file.path, after); return { path: file.path, before, after }; });
      branchHead = head;
      const final = pull.finalRecovered ? { base, head, observedAt: new Date(Date.parse(pull.mergedAt) + 3_600_000).toISOString(), report: comparisonReport(files, { base, head }), sizes: sizeRows, basis: 'final-merged-comparison' } : null;
      records.push(record(pull, final));
      // The collector observes default-branch sizes after each publish; the fixture keeps that cadence for the repository whose
      // Turnover should close, and one closing observation elsewhere, so both continuous and discontinuous chains appear.
      const repository = REPOSITORIES.find(candidate => candidate.repositoryId === repositoryId);
      if (pull.finalRecovered && (repository.observeNow || pull === merged.at(-1))) for (const path of files.map(file => file.path)) observations.push({ repositoryId, path, observedAt: new Date(Date.parse(pull.mergedAt) + 7_200_000).toISOString(), revision: head, size: sizes.get(path) });
    }
    for (const pull of others) records.push(record(pull, null));
    // One repository has a size observation at the fixture's "now", as if a capture had just run; its spine Turnover can close.
    if (REPOSITORIES.find(repository => repository.repositoryId === repositoryId)?.observeNow) for (const path of filePaths) observations.push({ repositoryId, path, observedAt: NOW, revision: branchHead, size: sizes.get(path) });
  }
  return { records, observations };
}

/** Write the fixture through the managed App's own write paths into a D1 store: lifecycle, consent, pathless history, named analytical records and sizes. */
export async function seedStore(appStore, clock) {
  for (const installation of INSTALLATIONS) {
    clock.value = at(200);
    await appStore.recordLifecycle({ installationId: installation.id, action: 'created', addedRepositories: REPOSITORIES.filter(repository => repository.installationId === installation.id).map(repository => repository.repositoryId), removedRepositories: [] });
    // What the installation's webhooks record: its numeric account and whether that is a person or an organisation.
    await appStore.recordInstallationAccount(installation.id, installation.account.id, installation.account.type === 'Organization' ? 'organization' : 'user');
  }
  for (const repository of REPOSITORIES) {
    await appStore.recordRepositoryVisibility(repository.repositoryId, repository.private);
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
  const { records, observations } = analyticalRecords();
  let retained = 0;
  for (const record of records) {
    clock.value = record.observedAt;
    const result = await appStore.recordAnalytical(record);
    if (result.status !== 'published') throw new Error(`Fixture analytical record for #${record.pullRequest} was not published: ${result.status}`);
    retained++;
  }
  for (const observation of observations) {
    clock.value = observation.observedAt;
    const result = await appStore.recordAnalyticalSize(observation);
    if (result.status !== 'published') throw new Error(`Fixture size observation for ${observation.path} was not published: ${result.status}`);
  }
  clock.value = NOW;
  return { written, retained, observations: observations.length };
}

/** The provider's view of the fixture, served over fetch: GitHub's wire shapes, nothing more. */
export function createFakeGitHub({ user = USER, token = TOKEN, code = CODE, clientId = 'fixture-client' } = {}) {
  const pulls = pullRequests();
  const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', ...headers } });
  const wire = pull => ({ number: pull.number, title: pull.title, state: pull.state === 'open' || pull.state === 'draft' ? 'open' : 'closed', draft: pull.draft, created_at: pull.openedAt, merged_at: pull.mergedAt, closed_at: pull.closedAt, updated_at: pull.updatedAt, head: { sha: pull.headSha }, base: { sha: pull.base }, merge_commit_sha: pull.mergeCommitSha, html_url: `https://github.com/${pull.repository.fullName}/pull/${pull.number}` });
  const calls = [];
  // Narrow the signed-in person's GitHub access for a case: `push` and `admin` per repository (repositoryId → boolean,
  // default write and the fixture's admin flag), `roles` per organisation login (default ROLES).
  const state = { rateLimited: false, tokenValid: true, tokenCheckResponse: null, refreshResponse: null, membershipStatus: 200, omittedMemberships: new Set(), push: new Map(), admin: new Map(), roles: new Map(), membershipStates: new Map(), collaborators: new Map(), installationTokens: [], extraRepositories: [], logins: new Map() };
  async function fetch(input, init = {}) {
    const url = new URL(String(input)), method = init.method ?? 'GET', path = url.pathname;
    const authorization = new Headers(init.headers).get('authorization') ?? '';
    calls.push({ method, path, authorization: authorization.split(' ')[0] });
    if (state.rateLimited) return json({ message: 'rate limited' }, 403, { 'x-ratelimit-remaining': '0' });
    if (method === 'POST' && path === '/login/oauth/access_token') {
      const body = JSON.parse(String(init.body));
      if (body.grant_type === 'refresh_token') return state.refreshResponse ? state.refreshResponse() : json({ access_token: token, refresh_token: 'fixture-next-refresh', expires_in: 28800, refresh_token_expires_in: 15897600 });
      if (body.code === code) return json({ access_token: token, token_type: 'bearer', scope: '' });
      return json({ error: 'bad_verification_code' });
    }
    if (method === 'POST' && path === `/applications/${clientId}/token`) return state.tokenCheckResponse ? state.tokenCheckResponse() : state.tokenValid && JSON.parse(String(init.body)).access_token === token ? json({ user: { id: user.id } }) : json({ message: 'invalid' }, 404);
    // The App's own installation route: an App JWT mints a token scoped to the requested repositories, and that token
    // reads an account by id, the installation's repositories (with `extraRepositories` a case grants later) and a
    // user's calculated repository permission (`collaborators`, keyed `repositoryId:login`; a missing entry is GitHub's
    // 404, `{ status }` another HTTP answer).
    let installation = /^\/app\/installations\/(\d+)\/access_tokens$/u.exec(path);
    if (method === 'POST' && installation && /^Bearer [^.\s]+\.[^.\s]+\.[^.\s]+$/u.test(authorization)) {
      const scope = JSON.parse(String(init.body ?? '{}')).repository_ids ?? [];
      state.installationTokens.push({ installationId: Number(installation[1]), repositoryIds: scope, permissions: JSON.parse(String(init.body ?? '{}')).permissions ?? null });
      return json({ token: `ghs-fixture-${installation[1]}-${scope.join('_')}`, expires_at: '2099-01-01T00:00:00Z' }, 201);
    }
    installation = /^Bearer ghs-fixture-(\d+)-([\d_]*)$/u.exec(authorization);
    if (installation) {
      const scope = installation[2] ? installation[2].split('_').map(Number) : null;
      const reachable = [...REPOSITORIES, ...state.extraRepositories].filter(repository => repository.installationId === Number(installation[1]) && (!scope || scope.includes(repository.repositoryId)));
      const account = /^\/user\/(\d+)$/u.exec(path);
      if (account) {
        // `logins` renames (id → login) or deletes (id → null) an account; otherwise the fixture's own login answers.
        const id = Number(account[1]);
        const login = state.logins.has(id) ? state.logins.get(id) : Object.keys(ACCOUNTS).find(name => ACCOUNTS[name] === id);
        return login ? json({ login, id, type: ['ada-sample', 'kai-sample'].includes(login) || state.logins.has(id) ? 'User' : 'Organization' }) : json({ message: 'Not Found' }, 404);
      }
      if (path === '/installation/repositories') return json({ total_count: reachable.length, repositories: reachable.map(repository => ({ id: repository.repositoryId, full_name: repository.fullName, name: repository.fullName.split('/')[1], private: repository.private })) });
      const permission = /^\/repos\/([^/]+)\/([^/]+)\/collaborators\/([^/]+)\/permission$/u.exec(path);
      const repository = permission && reachable.find(candidate => candidate.fullName === `${decodeURIComponent(permission[1])}/${decodeURIComponent(permission[2])}`);
      const login = permission && decodeURIComponent(permission[3]);
      const answer = repository && state.collaborators.get(`${repository.repositoryId}:${login}`);
      if (answer?.status) return json({ message: 'unavailable' }, answer.status);
      if (answer) return json({ permission: answer.permission, role_name: answer.role ?? answer.permission, user: { login: answer.login ?? login, id: answer.id ?? [...state.logins].find(([, renamed]) => renamed === login)?.[0] ?? ACCOUNTS[login], type: 'User' } });
      return json({ message: 'Not Found' }, 404);
    }
    if (authorization !== `Bearer ${token}`) return json({ message: 'Requires authentication' }, 401);
    if (path === '/user') return json({ id: user.id, login: user.login, type: user.type, avatar_url: user.avatar_url });
    if (path === '/user/installations') return json({ total_count: INSTALLATIONS.length, installations: INSTALLATIONS });
    if (path === '/user/memberships/orgs') {
      if (state.membershipStatus !== 200) return json({ message: 'membership read unavailable' }, state.membershipStatus);
      const memberships = INSTALLATIONS.filter(installation => installation.account.type === 'Organization').flatMap(installation => {
        const organization = installation.account, role = state.roles.get(organization.login) ?? ROLES[organization.login];
        return role && !state.omittedMemberships.has(organization.id) ? [{ organization: { id: organization.id, login: organization.login }, role, state: state.membershipStates.get(organization.login) ?? 'active' }] : [];
      });
      const page = Number(url.searchParams.get('page') ?? 1), perPage = Number(url.searchParams.get('per_page') ?? 30);
      return json(memberships.slice((page - 1) * perPage, page * perPage));
    }
    let match = /^\/user\/installations\/(\d+)\/repositories$/u.exec(path);
    if (match) { const list = REPOSITORIES.filter(repository => repository.installationId === Number(match[1])).map(repository => ({ id: repository.repositoryId, full_name: repository.fullName, name: repository.fullName.split('/')[1], owner: { login: repository.fullName.split('/')[0], id: ACCOUNTS[repository.fullName.split('/')[0]] }, private: repository.private, permissions: { admin: state.admin.get(repository.repositoryId) ?? repository.admin, push: state.push.get(repository.repositoryId) ?? true, pull: true } })); return json({ total_count: list.length, repositories: list }); }
    match = /^\/users\/([^/]+)$/u.exec(path);
    if (match) { const login = decodeURIComponent(match[1]); const id = ACCOUNTS[login]; return Number.isSafeInteger(id) ? json({ id, login, type: ['ada-sample', 'kai-sample'].includes(login) ? 'User' : 'Organization' }) : json({ message: 'Not Found' }, 404); }
    match = /^\/user\/memberships\/orgs\/([^/]+)$/u.exec(path);
    // The maintained registration has no Members-read permission; qualify the same refusal in local App journeys.
    if (match) return json({ message: 'Resource not accessible by integration' }, 403);
    match = /^\/repos\/([^/]+\/[^/]+)\/pulls$/u.exec(path);
    if (match) return json(pulls.filter(pull => pull.repository.fullName === match[1]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 100).map(wire));
    match = /^\/repos\/([^/]+\/[^/]+)\/pulls\/(\d+)$/u.exec(path);
    if (match) { const pull = pulls.find(candidate => candidate.repository.fullName === match[1] && candidate.number === Number(match[2])); return pull ? json({ ...wire(pull), changed_files: pull.revisions.at(-1).files.length }) : json({ message: 'Not Found' }, 404); }
    return json({ message: 'Not Found' }, 404);
  }
  return { fetch, calls, state, pulls };
}
