// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { analyticalRoute, openAnalyticalShell } from '../src/lib/analytical-request.mjs';
import { createContextCache } from '../src/lib/viewer.mjs';
import { createAnalyticalCache } from '../../github-app/analytical-cache.mjs';
import { loadView, loadSurface } from '../src/lib/view.mjs';
import { analyticalAcquisitionKey } from '../src/lib/scope.mjs';
import { compilePolicy, unwrap } from '@wolfsblvt/diffdevil';
import { createAnalyticalDataService } from '../../github-app/analytical-data.mjs';
import { transition, revisions } from '../../github-app/analytical-data.fixtures.mjs';
import { createLocator } from '../src/lib/locator.mjs';

test('only the six analytical routes enter the progressive document path', () => {
  for (const path of ['/', '/prs', '/history', '/files', '/pr/owner/repo/12', '/file/owner/repo/' + 'a'.repeat(22)]) assert.ok(analyticalRoute(path));
  for (const path of ['/manage', '/api/analytics', '/auth/session', '/render/analytical-shell', '/file/owner/repo/path.ts']) assert.equal(analyticalRoute(path), null);
});

test('only Files-local query/page edits preserve an acquisition; population and latest-navigation identities remain distinct', () => {
  const url = new URL('https://app.example/files?s=reader%2Frepo&per=7d&m=changed&sel=' + 'a'.repeat(22) + '&q=before&page=2');
  const edited = new URL(url);
  edited.searchParams.set('q', 'after'.repeat(60)); edited.searchParams.set('page', '8'); edited.hash = 'ranked';
  edited.searchParams.sort();
  assert.equal(analyticalAcquisitionKey(edited), analyticalAcquisitionKey(url));
  for (const [key, value] of [['s', 'reader/other'], ['per', '90d'], ['m', 'turnover'], ['sel', 'b'.repeat(22)], ['sort', 'changed']]) {
    const changed = new URL(edited); changed.searchParams.set(key, value);
    assert.notEqual(analyticalAcquisitionKey(changed), analyticalAcquisitionKey(url), key);
  }
  for (const pathname of ['/prs', '/history', '/file/reader/repo/' + 'a'.repeat(22)]) {
    const original = new URL(url), localEdit = new URL(edited);
    original.pathname = pathname; localEdit.pathname = pathname;
    assert.notEqual(analyticalAcquisitionKey(original), analyticalAcquisitionKey(localEdit), pathname);
  }
});

test('the generic protected shell needs a live local session, never provider or analytical reads', async () => {
  const runtime = { auth: { async serviceConnection({ session }) { assert.equal(session, 'fixture'); } }, provider: new Proxy({}, { get() { throw new Error('Provider data cannot gate the shell'); } }), store: new Proxy({}, { get() { throw new Error('Analytical D1 cannot gate the shell'); } }) };
  assert.equal(await openAnalyticalShell(new Request('https://app.example/'), runtime, () => 'fixture', 'session'), null);
  runtime.auth.serviceConnection = async () => { throw Object.assign(new Error('revoked'), { code: 'E_SESSION_UNAVAILABLE' }); };
  assert.equal(await openAnalyticalShell(new Request('https://app.example/'), runtime, () => 'fixture', 'session'), 'E_SESSION_UNAVAILABLE');
});

test('concurrent navigation and population share one pending provider read, and failures remain retryable', async () => {
  const cache = createContextCache();
  let release, calls = 0;
  const gate = new Promise(resolve => { release = resolve; });
  const load = async () => { calls++; await gate; return ['current-repository']; };
  const first = cache.get('repositories:123:9', load), second = cache.get('repositories:123:9', load);
  release();
  assert.deepEqual(await Promise.all([first, second]), [['current-repository'], ['current-repository']]);
  assert.equal(calls, 1);
  await assert.rejects(cache.get('profile:456', async () => { throw new Error('unavailable'); }));
  assert.equal(await cache.get('profile:456', async () => 'recovered'), 'recovered');
  assert.equal(await cache.get('repositories:456:9', async () => 'other-user'), 'other-user');
});

test('unchanged analytical facts are reused across fresh readers, with current data, policy, access and lifetime', async t => {
  let clock = 0, allowed = true, plan = 'free', reads = 0, validations = 0, denySecond = false, accessReads = 0;
  const cache = createAnalyticalCache({ now: () => clock });
  let rows = [transition(1, 'a.txt', revisions.slice(0, 2), '2026-09-20T00:00:00.000Z'),
    transition(2, 'b.txt', revisions.slice(0, 2), '2026-09-21T00:00:00.000Z')];
  let exclude = ['b.txt'];
  const descriptors = Object.getOwnPropertyDescriptors;
  t.mock.method(Object, 'getOwnPropertyDescriptors', value => {
    if (value?.kind === 'diffdevil.report') validations++;
    return descriptors(value);
  });
  const fresh = () => createAnalyticalDataService({ interpretationCache: cache,
    store: { analyticalRecords: async () => { reads++; return JSON.parse(JSON.stringify(rows)); } },
    authorize: async () => allowed && !(denySecond && ++accessReads > 1), entitlement: async () => plan, namespace: async () => 9,
    currentPolicy: async () => ({ id: 'friendly-name', compiled: unwrap(compilePolicy({ version: 1, defaults: { paths: { exclude } } })) }),
    now: () => '2026-10-01T00:00:00.000Z' });
  const query = { version: 1, surface: 'overview', repositoryIds: [17], from: '2026-09-01T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z' };
  const actor = { authorizedRepositoryIds: [17] };
  const first = await fresh().query(query, actor);
  const initialValidations = validations;
  assert.equal(initialValidations, 2);
  assert.deepEqual(await fresh().query(query, actor), first);
  assert.equal(reads, 2, 'the store is read again even when interpretations match');
  assert.equal(validations, initialValidations, 'newly parsed measurements and a newly compiled equivalent policy reuse the same deterministic work');

  plan = 'pro';
  assert.equal((await fresh().query(query, actor)).entitlements.aggregatePlan, 'pro');
  assert.equal(validations, initialValidations, 'entitlements are current rather than part of a cached answer');
  // A claimed report ID cannot hide changed facts under the same comparison identity.
  const replacement = transition(2, 'c.txt', revisions.slice(0, 2), '2026-09-21T00:00:00.000Z');
  replacement.final.report.reportId = rows[1].final.report.reportId;
  rows[1] = replacement;
  const beforeChangedRead = validations;
  assert.notDeepEqual((await fresh().query(query, actor)).result.overview.changed, first.result.overview.changed);
  assert.equal(validations, beforeChangedRead + 1);

  exclude = ['a.txt', 'c.txt'];
  assert.equal((await fresh().query(query, actor)).result.overview.changed.lower, 0);
  const afterPolicyChange = validations;
  assert.equal(afterPolicyChange, beforeChangedRead + 3, 'actual compiled policy identity invalidates a reused friendly name');
  clock = 60_001;
  await fresh().query(query, actor);
  assert.equal(validations, afterPolicyChange + 2, 'expiry is a safe recomputation, not an availability dependency');
  denySecond = true;
  await assert.rejects(fresh().query(query, actor), { code: 'E_APP_DATA_UNAUTHORIZED' }, 'a warm hit still checks access again before exposure');
  denySecond = false;
  const validRows = structuredClone(rows);
  rows[0].final.report.totals.lines.changed.value = 999;
  await assert.rejects(fresh().query(query, actor), error => error.diagnostic?.code === 'E_REPORT_INVALID');
  await assert.rejects(fresh().query(query, actor), error => error.diagnostic?.code === 'E_REPORT_INVALID', 'failed interpretations are retryable, never cached as an empty answer');
  rows = validRows;
  assert.equal((await fresh().query(query, actor)).coverage.merged, 2);
  rows = [];
  assert.equal((await fresh().query(query, actor)).coverage.merged, 0, 'withdrawn or expired rows cannot return through the cache');
  allowed = false;
  await assert.rejects(fresh().query(query, actor), { code: 'E_APP_DATA_UNAUTHORIZED' });
});

test('a failed analytical population cannot reach the chart renderer as an empty count', async () => {
  const repository = { repositoryId: 1, owner: 'reader', fullName: 'reader/repo', standing: { historyReadable: true } };
  const runtime = { now: () => '2026-10-21T00:00:00.000Z', store: {
    analyticalCoverage: async () => ({ counts: new Map([[1, 3]]) }), observationBounds: async () => ({}) },
    cache: createContextCache(), analytics: { query: async () => { throw new Error('D1 unavailable'); } } };
  const viewer = { userId: 123, plan: 'Free', namespaces: [], repositories: [repository] };
  await assert.rejects(loadView({ url: new URL('https://app.example/'), viewer, session: { reads: { recentPullRequests: async () => ({ pullRequests: [] }) } }, runtime }), { code: 'E_ANALYTICAL_UNAVAILABLE' });
});

test('file detail separates retained identity from selected-period rows while retaining broader navigation context', async () => {
  const repositories = [1, 2].map(repositoryId => ({ repositoryId, owner: 'reader', fullName: `reader/repo${repositoryId}`, standing: { historyReadable: true } }));
  let requested, hasSelectedPeriodActivity = false;
  const runtime = { now: () => '2026-10-21T00:00:00.000Z', store: {
    analyticalCoverage: async ids => { assert.deepEqual(ids, [2]); return { counts: new Map([[2, 3]]) }; }, observationBounds: async () => ({}) },
    cache: createContextCache(), premium: { provided: false }, locator: { plausible: () => true, resolve: async (_locator, rows) => rows[0] },
    analytics: { service: { resolveFileCandidate: async (_source, _repositoryId, resolve) => {
      const selected = await resolve([{ repositoryId: 2, path: 'src/selected.ts' }]);
      return selected && { ...selected, hasSelectedPeriodActivity };
    } }, query: async input => { requested = input; return { result: { files: [] } }; } } };
  const viewer = { userId: 123, plan: 'Pro', namespaces: [{ login: 'reader', yours: true }], repositories };
  const detail = { repositoryId: 2, fileLocator: 'a'.repeat(22) };
  const url = new URL('https://app.example/file/reader/repo2/' + 'a'.repeat(22) + '?s=all&per=30d');
  const session = { reads: { recentPullRequests: async () => ({ pullRequests: [] }) } };
  const view = await loadView({ url, viewer, session, runtime, surface: 'file', detail });
  assert.equal(requested.surface, 'file', 'detail routing does not enter the Files aggregation surface');
  assert.deepEqual(requested.repositoryIds, [2]);
  assert.deepEqual(requested.scope, { kind: 'repository', repositoryId: 2 });
  assert.equal(view.scope.kind, 'all');
  assert.deepEqual(view.fileIdentity, { repositoryId: 2, path: 'src/selected.ts', hasSelectedPeriodActivity: false });
  assert.equal(view.fileHasSelectedPeriodActivity, false);
  assert.deepEqual(view.files, [], 'a retained identity without a selected-period row is not passed as aggregate detail');
  assert.equal(view.state.per, '30d');

  hasSelectedPeriodActivity = true;
  const activeView = await loadView({ url, viewer, session, runtime, surface: 'file', detail });
  assert.deepEqual(activeView.fileIdentity, { repositoryId: 2, path: 'src/selected.ts', hasSelectedPeriodActivity: true });
  assert.equal(activeView.fileHasSelectedPeriodActivity, true, 'the pathless locator response carries active-period state');
  assert.deepEqual(activeView.files, [], 'pathless locator metadata is not mislabeled as rich aggregate detail');
});

test('invalid file detail does not query a broader analytical population before its not-found page can render', async () => {
  const repository = { repositoryId: 1, owner: 'reader', fullName: 'reader/repo', standing: { historyReadable: true } };
  const runtime = { now: () => '2026-10-21T00:00:00.000Z', store: {
    analyticalCoverage: async ids => ({ counts: new Map(ids.map(id => [id, 3])) }), observationBounds: async () => ({}) },
    cache: createContextCache(), premium: { provided: false },
    analytics: { query: async () => { throw new Error('An invalid detail route must not read another population'); } } };
  const viewer = { userId: 123, plan: 'Pro', namespaces: [], repositories: [repository] };
  const view = await loadView({ url: new URL('https://app.example/file/reader/repo/not-a-locator'), viewer,
    session: { reads: { recentPullRequests: async () => ({ pullRequests: [] }) } }, runtime, surface: 'file',
    detail: { repositoryId: undefined, fileLocator: 'not-a-locator' } });
  assert.deepEqual(view.ids, []);
  assert.equal(view.dataStanding, 'none');
  assert.equal(view.fileIdentity, undefined);
  assert.deepEqual(view.repositories, [repository], 'the authorised navigation remains available');
});

test('the original 30-day file consumer resolves one opaque identity without interpreting unrelated retained reports', async t => {
  const validations = new Map();
  const rows = [transition(1, 'selected.txt', revisions.slice(0, 2), '2026-09-20T00:00:00.000Z'),
    transition(2, 'excluded.txt', revisions.slice(0, 2), '2026-09-21T00:00:00.000Z'),
    ...Array.from({ length: 140 }, (_, index) => transition(index + 3, `older-${index}.txt`, revisions.slice(0, 2), '2026-08-20T00:00:00.000Z'))];
  const reportOwners = new Map(rows.map(row => [row.final.report, row.pullRequest]));
  // Meter the real inert-data validation without replacing it or changing the report inputs.
  const descriptors = Object.getOwnPropertyDescriptors;
  t.mock.method(Object, 'getOwnPropertyDescriptors', value => {
    const owner = reportOwners.get(value);
    if (owner) validations.set(owner, (validations.get(owner) ?? 0) + 1);
    return descriptors(value);
  });
  let reads = 0;
  const repository = { repositoryId: 17, owner: 'reader', fullName: 'reader/repo', standing: { historyReadable: true } };
  const store = { analyticalRecords: async () => { reads++; return rows; }, historySettings: async () => ({ readable: true }),
    analyticalCoverage: async () => ({ counts: new Map([[17, rows.length]]) }), observationBounds: async () => ({}) };
  const policy = { id: 'current', compiled: unwrap(compilePolicy({ version: 1, defaults: { paths: { exclude: ['excluded.txt'] } } })) };
  const service = createAnalyticalDataService({ store, authorize: async () => true, entitlement: async () => 'pro', namespace: async () => 9,
    currentPolicy: async () => policy, premium: {
      files: async ({ merged, query }) => ({ files: merged.flatMap(row => row.facts.report?.files
        .filter(file => file.path === query.path).map(file => ({ repositoryId: 17, path: file.path, included: file.included, contributions: [row.pullRequest] })) ?? []), sizeObservation: [] }),
      file: async ({ files }) => files[0]
    } });
  const runtime = { store, now: () => '2026-10-01T00:00:00.000Z', cache: createContextCache(), premium: { provided: true },
    locator: createLocator({ secret: 'local-non-secret-file-fixture' }),
    analytics: { service, query: (input, actor, source) => service.query({ version: 1, ...input }, actor, source) } };
  const viewer = { userId: 123, plan: 'Pro', namespaces: [{ login: 'reader', yours: true }], repositories: [repository] };
  const session = { reads: { recentPullRequests: async () => ({ pullRequests: [] }) } };
  const open = async path => {
    const fileLocator = await runtime.locator.of(17, path);
    return loadView({ url: new URL(`https://app.example/file/reader/repo/${fileLocator}?s=all&per=30d`), viewer, session, runtime,
      surface: 'file', detail: { repositoryId: 17, fileLocator } });
  };
  const selected = await open('selected.txt');
  assert.deepEqual(selected.fileIdentity, { repositoryId: 17, path: 'selected.txt', hasSelectedPeriodActivity: true });
  assert.deepEqual([...validations.keys()], [1], 'only measurements naming the resolved identity need engine validation and current-policy interpretation');
  const detail = await loadSurface(selected, runtime, 'file', { path: selected.fileIdentity.path });
  assert.equal(detail.result.path, 'selected.txt');
  assert.equal(detail.coverage.merged, 2, 'the complete selected-period population still governs coverage');
  assert.equal(detail.coverage.completeWindow, false);
  assert.equal(reads, 1, 'locator and detail share their request-local retained read');
  const excluded = await open('excluded.txt');
  assert.deepEqual(excluded.fileIdentity, { repositoryId: 17, path: 'excluded.txt', hasSelectedPeriodActivity: true }, 'current analytical exclusion does not erase an authorized retained identity');
  assert.equal((await loadSurface(excluded, runtime, 'file', { path: excluded.fileIdentity.path })).result.included, false, 'the detail retains truthful current exclusion');
  const inactive = await open('older-139.txt');
  assert.deepEqual(inactive.fileIdentity, { repositoryId: 17, path: 'older-139.txt', hasSelectedPeriodActivity: false });
  assert.equal((await open('absent.txt')).fileIdentity, undefined);
});

test('retained file identity survives policy exclusion and unavailable interpretation while real access and history checks still apply', async () => {
  const rows = [transition(1, 'a.txt', revisions.slice(0, 2), '2026-09-20T00:00:00.000Z')];
  const retained = structuredClone(rows);
  const defaultPolicy = { compiled: unwrap(compilePolicy({ version: 1 })) };
  const excludedPolicy = { compiled: unwrap(compilePolicy({ version: 1, defaults: { paths: { exclude: ['**'] } } })) };
  let policy = defaultPolicy, allowed = true, readable = true, plan = 'pro';
  const service = createAnalyticalDataService({ store: { analyticalRecords: async () => rows, historySettings: async () => ({ readable }) },
    authorize: async () => allowed, entitlement: async () => plan, namespace: async () => 9, currentPolicy: async () => policy,
    premium: { files: async () => ({ files: [], sizeObservation: [] }) } });
  const actor = { userId: 123, authorizedRepositoryIds: [17] };
  const query = { version: 1, surface: 'file', repositoryIds: [17], scope: { kind: 'repository', repositoryId: 17 }, from: '2026-09-01T00:00:00.000Z', to: '2026-10-01T00:00:00.000Z' };
  const locator = createLocator({ secret: 'local-non-secret-retained-identity' });
  const handle = await locator.of(17, 'a.txt');
  const resolve = candidates => locator.resolve(handle, candidates);
  const identity = { repositoryId: 17, path: 'a.txt', hasSelectedPeriodActivity: true };
  for (const current of [defaultPolicy, excludedPolicy, { id: null, compiled: null, reason: 'trusted-policy-unavailable' }, defaultPolicy]) {
    policy = current;
    const source = await service.query(query, actor);
    assert.deepEqual(await service.resolveFileCandidate(source, 17, resolve), identity);
    assert.deepEqual(rows, retained, 'identity resolution must not change measurements or recorded results');
  }
  const source = await service.query(query, actor);
  assert.equal(await service.resolveFileCandidate({ ...source }, 17, resolve), undefined, 'only the server-held response context may resolve identities');
  assert.equal(await service.resolveFileCandidate(source, 18, resolve), undefined, 'the selected repository remains binding');
  const broadSource = await service.query({ ...query, scope: { kind: 'all' } }, actor);
  assert.equal(await service.resolveFileCandidate(broadSource, 17, resolve), undefined, 'a broad-scope response cannot supply a repository-detail identity');
  assert.equal(await service.resolveFileCandidate(source, 17, candidates => ({ ...candidates[0] })), undefined, 'the resolver must select an actual candidate');
  assert.equal(await service.resolveFileCandidate(source, 17, candidates => locator.resolve('a'.repeat(22), candidates)), undefined, 'a wrong locator reveals no identity');
  await assert.rejects(service.resolveFileCandidate(source, 17, async candidates => { allowed = false; return resolve(candidates); }), { code: 'E_APP_DATA_UNAUTHORIZED' });
  allowed = true; readable = false;
  await assert.rejects(service.resolveFileCandidate(source, 17, resolve), { code: 'E_APP_DATA_NOT_FOUND' });
  readable = true; plan = 'free';
  assert.equal(await service.resolveFileCandidate(await service.query(query, actor), 17, resolve), undefined, 'a non-premium response supplies no retained-file identity context');
});
