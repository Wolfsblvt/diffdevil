// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
// History capture against actual queue invocations on local D1. A merged PR and its siblings arrive together in a
// repository whose retained history knows hundreds of text paths. The test's database refuses every statement past
// 1,000 in an invocation, as D1 does on Workers Paid, so an invocation that overran would fail visibly. The provider is
// the in-memory fake; nothing leaves the process.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { Miniflare } from 'miniflare';
import { analyzeChanges, unwrap } from '@wolfsblvt/diffdevil';
import { budgetedClient, createGitHubAppWorker } from './app.mjs';
import { historyCaptureEnvelope, historyJobEnvelope, normalizeWebhookEvent, readQueueEnvelope } from './contracts.mjs';
import { D1HistoryJobStore } from './history-jobs.mjs';
import { normalizeAnalyticalRecord } from './analytical-data.mjs';
import { D1AppStore } from './storage.mjs';
import { FakeRepository, captureQueue } from './fake-repository.mjs';

const D1_QUERIES = 1000, MAIN = 'e'.repeat(40), PARENT = 'd'.repeat(40), MERGE = 'f'.repeat(40);

test('a history capture message carries identifiers only and a continuation carries exactly its pinned revision and start', () => {
  const first = historyCaptureEnvelope({ installationId: 9, repositoryId: 17, pullRequest: 4, causeId: 'd-4', receivedAt: 'now' });
  assert.equal(first.deliveryId, 'history-capture:d-4:17:0');
  assert.deepEqual(readQueueEnvelope(first), first);
  const next = historyCaptureEnvelope({ installationId: 9, repositoryId: 17, pullRequest: 4, causeId: 'd-4', part: 1, revision: MAIN, since: '2026-10-01T00:00:00.000Z', receivedAt: 'now' });
  assert.deepEqual(readQueueEnvelope(next), next);
  assert.throws(() => historyCaptureEnvelope({ installationId: 9, repositoryId: 17, pullRequest: 4, causeId: 'd-4', part: 1 }), /revision and start/u);
  assert.throws(() => historyCaptureEnvelope({ installationId: 9, repositoryId: 17, pullRequest: 4, causeId: 'd-4', revision: MAIN, since: '2026-10-01T00:00:00.000Z' }), /revision and start/u);
  assert.throws(() => readQueueEnvelope({ ...next, path: 'src/a.ts' }), /prohibited field/u);
  assert.throws(() => readQueueEnvelope({ ...next, deliveryId: 'history-capture:d-4:17:0' }), /does not match/u);
});

/** Counts each D1 statement (batches statement by statement) and, like D1, refuses every one past the limit. */
function refusingDatabase(database, tally) {
  const raw = new WeakMap();
  const spend = count => { if (tally.d1 + count > D1_QUERIES) { tally.refused += count; throw new Error('D1_ERROR: Too many API requests by single worker invocation.'); } tally.d1 += count; };
  const wrap = statement => {
    const proxy = new Proxy(statement, { get(target, key) {
      if (key === 'bind') return (...values) => wrap(target.bind(...values));
      if (['run', 'first', 'all', 'raw'].includes(key)) return (...values) => { spend(1); return target[key](...values); };
      const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
    } });
    raw.set(proxy, statement); return proxy;
  };
  return { prepare: sql => wrap(database.prepare(sql)), batch: statements => { spend(statements.length); return database.batch(statements.map(item => raw.get(item) ?? item)); } };
}

async function historyRepository(paths) {
  const runtime = new Miniflare({ workers: [{ config: { name: 'capture', type: 'worker', compatibilityDate: '2026-09-17', env: { APP_DB: { type: 'd1', id: `capture-${crypto.randomUUID()}` } },
    manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'), modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } } }] });
  const database = await runtime.getD1Database('APP_DB');
  const store = new D1AppStore(database);
  const directory = resolve('apps/github-app/migrations');
  for (const name of (await readdir(directory)).sort()) await store.migrate(await readFile(resolve(directory, name), 'utf8'));
  await store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [17], removedRepositories: [] });
  await store.setRepositoryExecution(17, { enabled: true, origin: 'fixture' });
  await store.setRepositoryConsent(17, { enabled: true, retentionDays: 30, policyId: null, origin: 'fixture' });
  // Earlier merged PRs whose retained final comparisons name `paths` distinct text files.
  const at = new Date(Date.now() - 86_400_000).toISOString();
  for (let index = 0, number = 900; index < paths; index += 100, number++) {
    const files = Array.from({ length: Math.min(100, paths - index) }, (_, offset) => ({ path: `src/module-${String(index + offset).padStart(4, '0')}.ts`, changeType: 'modified', kind: 'text', additions: 1, deletions: 1 }));
    const report = unwrap(analyzeChanges(files, { source: { kind: 'github-api', comparison: 'direct', comparisonId: `final-${number}`, base: PARENT, head: MERGE } }));
    assert.equal((await store.recordAnalytical(normalizeAnalyticalRecord({ version: 1, repositoryId: 17, pullRequest: number, state: 'merged', openedAt: at, readyAt: at, mergedAt: at, closedAt: at,
      updatedAt: at, currentHead: MERGE, revisions: [], final: { base: PARENT, head: MERGE, observedAt: at, report, sizes: [], basis: 'final-merged-comparison' } }))).status, 'published');
  }
  return { runtime, database, store };
}

test('recalculation captures every known size across invocation budgets with a durable pinned cursor', async () => {
  const { runtime, database, store } = await historyRepository(1200);
  try {
    const jobs = new D1HistoryJobStore(database);
    const { job } = await jobs.request({ repositoryId: 17, installationId: 9, kind: 'recalculate', actorId: 123 });
    const queue = captureQueue();
    const tally = { d1: 0, refused: 0, github: 0, contents: 0 };
    const repository = new FakeRepository({ numbers: [1] });
    const worker = createGitHubAppWorker({ analyticalClientFactory: async () => budgetedClient({ fetch: historyProvider(repository, tally), readRetries: 0 }) });
    let messages = [historyJobEnvelope({ installationId: 9, repositoryId: 17, jobId: job.jobId, kind: 'recalculate', sequence: 0 })];
    const invocations = [];
    for (let iteration = 0; messages.length && iteration < 10; iteration++) {
      tally.d1 = 0;
      const batch = messages.map(body => ({ body, outcome: null, ack() { this.outcome = 'ack'; }, retry() { this.outcome = 'retry'; } }));
      await worker.queue({ messages: batch }, { APP_DB: refusingDatabase(database, tally), APP_QUEUE: queue });
      invocations.push(tally.d1);
      assert.ok(batch.every(message => message.outcome === 'ack'), 'each completed part acknowledges rather than losing the job to retries');
      const current = await jobs.job(job.jobId);
      assert.ok(current.cursor.capture, JSON.stringify({ state: current.state, reason: current.reason, cursor: current.cursor, progress: current.progress, queries: tally.d1 }));
      assert.equal(current.cursor.capture.revision, MAIN);
      assert.ok(current.cursor.capture.since, 'the capture pin is durable before any size batch');
      messages = queue.sent.splice(0);
    }
    assert.equal(messages.length, 0);
    assert.equal(tally.refused, 0);
    assert.ok(invocations.length >= 3, 'pin and capture span multiple invocations');
    assert.ok(invocations.every(count => count <= D1_QUERIES));
    const completed = await jobs.job(job.jobId);
    assert.equal(completed.state, 'complete');
    assert.equal(completed.progress.sizes, 1200);
    assert.equal(tally.contents, 1200, 'each immutable size is acquired once');
    assert.equal((await store.analyticalSizesAt(17, MAIN)).length, 1200);
  } finally { await runtime.dispose(); }
});

/** The history client's view: lifecycle times the shared fake omits, PR 1 merged with a two-parent merge commit, sizes at any revision. */
function historyProvider(repository, tally) {
  const merged = { state: 'closed', merged_at: '2026-10-02T00:00:00Z', closed_at: '2026-10-02T00:00:00Z', merge_commit_sha: MERGE };
  const reply = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });
  return async (input, init = {}) => {
    tally.github++;
    const path = new URL(String(input)).pathname, accept = new Headers(init.headers).get('accept');
    if (path === '/repos/example/repository/branches/main') return reply({ commit: { sha: MAIN } });
    if (path.startsWith('/repos/example/repository/contents/')) { tally.contents++; return new Response('one\ntwo\n'); }
    if (path === `/repos/example/repository/git/commits/${MERGE}`) return reply({ sha: MERGE, parents: [{ sha: PARENT }, { sha: 'c'.repeat(40) }] });
    if (path === `/repos/example/repository/compare/${PARENT}...${MERGE}`) return accept === 'application/vnd.github.diff'
      ? new Response('diff --git a/src/merged.ts b/src/merged.ts\n--- a/src/merged.ts\n+++ b/src/merged.ts\n@@ -1 +1 @@\n-old\n+new\n')
      : reply({ merge_base_commit: { sha: PARENT }, files: [{ filename: 'src/merged.ts' }] });
    const response = await repository.fetch(input, init);
    const pull = /^\/repos\/example\/repository\/pulls\/(\d+)$/u.exec(path);
    if (!pull || accept === 'application/vnd.github.diff' || !response.ok) return response;
    return reply({ ...(await response.json()), created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-02T00:00:00Z', ...(pull[1] === '1' ? merged : {}) });
  };
}

test('a merge whose history knows hundreds of paths leaves its siblings intact and captures every size in parts that fit the D1 allowance', async () => {
  const { runtime, database, store } = await historyRepository(400);
  try {
    const repository = new FakeRepository();
    for (let number = 1; number <= 3; number++) repository.add(number);
    repository.pulls.get(1).state = 'closed';
    const tally = { d1: 0, refused: 0, github: 0, contents: 0 };
    const worker = createGitHubAppWorker({ clientFactory: async () => budgetedClient({ fetch: repository.fetch, readRetries: 0 }),
      analyticalClientFactory: async () => budgetedClient({ fetch: historyProvider(repository, tally), readRetries: 0 }) });
    const event = (number, action) => normalizeWebhookEvent('pull_request', { action, installation: { id: 9 }, repository: { id: 17 }, pull_request: { number } }, new Date().toISOString(), `d-${number}`);
    let pending = [event(1, 'closed'), event(2, 'synchronize'), event(3, 'synchronize')];
    const invocations = [];
    while (pending.length) {
      assert.ok(invocations.length < 10, 'the capture drains');
      const queue = captureQueue(), outcome = [];
      Object.assign(tally, { d1: 0, refused: 0 });
      await worker.queue({ messages: pending.map(body => ({ body, ack() { outcome.push('ack'); }, retry() { outcome.push('retry'); } })) },
        { GITHUB_APP_ID: '1', GITHUB_APP_BOT_LOGIN: repository.author.login, APP_QUEUE: queue, APP_DB: refusingDatabase(database, tally) });
      invocations.push({ types: pending.map(body => body.type), d1: tally.d1, refused: tally.refused, outcome, sent: queue.sent.map((body, index) => [body.type, body.part, queue.delays[index]]) });
      pending = queue.sent;
    }

    assert.ok(invocations.every(value => value.refused === 0 && value.d1 <= D1_QUERIES), JSON.stringify(invocations.map(value => value.d1)));
    assert.ok(invocations.every(value => value.outcome.every(result => result === 'ack')), 'no message was retried');
    // Basic operation finished in the first invocation, and each published record started one capture there.
    const [first] = invocations;
    assert.deepEqual(first.sent, [['history-capture', 0, 0], ['history-capture', 0, 0], ['history-capture', 0, 0]]);
    const deliveries = (await database.prepare("SELECT delivery_id, state FROM deliveries WHERE delivery_id LIKE 'd-%' ORDER BY delivery_id").all()).results;
    assert.deepEqual(deliveries.map(row => row.state), ['rejected', 'complete', 'complete'], 'the merged PR is closed to writes; its siblings completed');
    assert.ok(repository.pulls.get(2).labels.size && repository.pulls.get(3).labels.size, 'siblings received their size labels');
    // The captures outgrew one invocation and continued at once, without a part re-sent unclaimed or a repair.
    assert.ok(invocations.length >= 3 && invocations.slice(1, -1).some(value => value.sent.some(([type, part, delay]) => type === 'history-capture' && part > 0 && delay === 0)));
    assert.equal((await database.prepare("SELECT COUNT(*) AS n FROM repairs").first()).n, 0);
    // Every known text path, including the merge's own, was observed at the branch revision by each capture.
    const known = new Set((await store.analyticalRecords(17)).flatMap(record => [record.final, ...record.revisions].flatMap(value => value?.report?.files.map(file => file.path) ?? [])));
    assert.ok(known.size > 400 && known.has('src/merged.ts'));
    const observed = (await database.prepare('SELECT path, COUNT(*) AS n FROM analytical_file_sizes WHERE repository_id=17 AND revision=? GROUP BY path').bind(MAIN).all()).results;
    assert.deepEqual(new Set(observed.map(row => row.path)), known);
    assert.ok(observed.every(row => row.n === 3), 'three captures, one observation each per path');
    assert.equal(tally.contents, known.size + 2, 'each size at the immutable revision was read once (plus the merge comparison\'s two sides)');
  } finally { await runtime.dispose(); }
});

/** A store double for the capture consumer: delivery claims and the analytical rows it reads and writes. */
function captureStore({ paths, enabled = () => true }) {
  const report = unwrap(analyzeChanges(paths.map(path => ({ path, changeType: 'modified', kind: 'text', additions: 1, deletions: 1 })),
    { source: { kind: 'github-api', comparison: 'direct', comparisonId: 'final', base: PARENT, head: MERGE } }));
  const at = '2026-09-01T00:00:00.000Z';
  const record = normalizeAnalyticalRecord({ version: 1, repositoryId: 17, pullRequest: 900, state: 'merged', openedAt: at, readyAt: at, mergedAt: at, closedAt: at, updatedAt: at,
    currentHead: MERGE, revisions: [], final: { base: PARENT, head: MERGE, observedAt: at, report, sizes: [], basis: 'final-merged-comparison' } });
  const rows = [], finished = [], released = [], repairs = [];
  return { rows, finished, released, repairs,
    claimDelivery: async () => ({ kind: 'claimed', attemptId: 'a', fence: 1 }), renewDelivery: async () => {},
    finishLifecycle: async (envelope, _, state) => { finished.push([envelope.part, state]); }, releaseDelivery: async (envelope, _, code) => { released.push([envelope.part, code]); },
    recordAnalyticalRepair: async (envelope, code) => { repairs.push([envelope.pullRequest, code]); },
    historySettings: async () => ({ enabled: enabled() }), analyticalRecords: async () => [record],
    analyticalSizesAt: async (_, revision) => rows.filter(row => row.revision === revision),
    recordAnalyticalSizes: async values => enabled() ? (rows.push(...values), { status: 'published', published: values.length }) : { status: 'disabled' } };
}
/** The history client: branch head, sizes, and the hourly budget GitHub reports on each response. */
function captureProvider({ heads = () => MAIN, remaining = () => 5000, limited = () => false } = {}) {
  let reads = 0;
  const fetch = async input => {
    const path = new URL(String(input)).pathname;
    const headers = { 'content-type': 'application/json', 'x-ratelimit-limit': '5000', 'x-ratelimit-remaining': String(remaining(reads)), 'x-ratelimit-reset': String(Math.floor(Date.parse(NOW) / 1000) + 600) };
    if (path === '/repositories/17') return new Response(JSON.stringify({ id: 17, full_name: 'owner/repo', default_branch: 'main' }), { headers });
    if (path === '/repos/owner/repo/branches/main') return new Response(JSON.stringify({ commit: { sha: heads(reads) } }), { headers });
    reads++;
    if (limited(reads)) return new Response(JSON.stringify({ message: 'API rate limit exceeded' }), { status: 403, headers: { ...headers, 'x-ratelimit-remaining': '0' } });
    return new Response('one\ntwo\n', { headers });
  };
  return { client: () => budgetedClient({ fetch, readRetries: 0 }), reads: () => reads };
}
const NOW = '2026-10-10T12:00:00.000Z';
const capture = (part = 0, pinned = {}) => historyCaptureEnvelope({ installationId: 9, repositoryId: 17, pullRequest: 4, causeId: 'd-4', part, ...pinned, receivedAt: NOW });
async function consume(store, provider, body) {
  const queue = captureQueue(), outcome = [];
  await createGitHubAppWorker({ store, now: () => NOW, analyticalClientFactory: async () => provider.client() })
    .queue({ messages: [{ body, ack() { outcome.push('ack'); }, retry() { outcome.push('retry'); } }] }, { APP_QUEUE: queue });
  return { queue, outcome };
}

test('inside the rate reserve a capture part stops and continues after the reset; a rate limit runs the same part again', async () => {
  const paths = Array.from({ length: 150 }, (_, index) => `src/f${index}.ts`);
  // The budget falls into the 25% reserve after 60 content reads.
  const store = captureStore({ paths }), provider = captureProvider({ remaining: reads => reads >= 59 ? 1000 : 4000 });
  const reserved = await consume(store, provider, capture());
  assert.deepEqual(reserved.outcome, ['ack']);
  assert.equal(provider.reads(), 60);
  assert.equal(store.rows.length, 60, 'what was read before the reserve is published');
  assert.deepEqual(reserved.queue.sent.map(body => [body.part, body.revision, body.since]), [[1, MAIN, NOW]]);
  assert.equal(reserved.queue.delays[0], 605, 'the next part waits for the reported reset');
  assert.deepEqual(store.finished, [[0, 'complete']]);

  // Sizes already retained at the revision spend no provider budget, so they are captured inside the reserve too.
  const known = captureStore({ paths }), reserve = captureProvider({ remaining: () => 1000 });
  known.rows.push(...paths.map(path => ({ repositoryId: 17, path, revision: MAIN, size: 2, observedAt: '2026-10-09T00:00:00.000Z' })));
  const reusing = await consume(known, reserve, capture());
  assert.deepEqual([reusing.outcome, reusing.queue.sent, reserve.reads()], [['ack'], [], 0]);
  assert.equal(known.rows.filter(row => row.observedAt === NOW).length, 150);

  const limitedStore = captureStore({ paths }), limited = captureProvider({ limited: reads => reads === 5 });
  const body = capture(1, { revision: MAIN, since: NOW });
  const result = await consume(limitedStore, limited, body);
  assert.deepEqual(result.outcome, ['ack'], 'pacing never spends the queue\'s retries');
  assert.deepEqual(result.queue.sent, [body]);
  assert.deepEqual(result.queue.delays, [3600]);
  assert.deepEqual(limitedStore.released, [[1, 'E_GITHUB_RATE_LIMIT']]);
  assert.deepEqual(limitedStore.repairs, []);
});

test('a moved branch ends a capture chain with the PR\'s analytical repair, and a withdrawal ends it without writing', async () => {
  const paths = ['src/a.ts', 'src/b.ts'];
  const moved = captureStore({ paths });
  const stale = await consume(moved, captureProvider({ heads: () => 'c'.repeat(40) }), capture(2, { revision: MAIN, since: NOW }));
  assert.deepEqual(stale.outcome, ['ack']);
  assert.deepEqual(stale.queue.sent, []);
  assert.deepEqual(moved.repairs, [[4, 'E_APP_DATA_STALE']]);
  assert.deepEqual(moved.finished, [[2, 'repair']]);

  let consent = true;
  const withdrawn = captureStore({ paths, enabled: () => consent });
  const provider = captureProvider({ remaining: reads => { if (reads >= 1) consent = false; return 5000; } });
  const stopped = await consume(withdrawn, provider, capture());
  assert.deepEqual([stopped.outcome, stopped.queue.sent, withdrawn.rows, withdrawn.repairs], [['ack'], [], [], []]);
  assert.deepEqual(withdrawn.finished, [[0, 'complete']]);
});
