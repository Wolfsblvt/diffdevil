// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
// One actual queue invocation of refresh parts and ordinary events against local D1, with every D1 statement, GitHub
// request and queue send counted against Cloudflare's per-invocation limits (Workers Paid: 1,000 D1 queries and 10,000
// subrequests). The provider is the in-memory fake; nothing leaves the process.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { Miniflare } from 'miniflare';
import { INVOCATION_BUDGET, budgetedClient, createGitHubAppWorker, executeDelivery } from './app.mjs';
import { briefRefreshEnvelope, normalizeWebhookEvent } from './contracts.mjs';
import { D1AppStore } from './storage.mjs';
import { FakeRepository, captureQueue } from './fake-repository.mjs';

const WORKERS_PAID = Object.freeze({ d1Queries: 1000, subrequests: 10_000 });
const premiumEntry = new URL('../../premium/pr-brief/index.mjs', import.meta.url);
const briefProvider = existsSync(premiumEntry) ? (await import(premiumEntry.href)).premiumBrief : null;

/** The test's own count of what reaches D1, independent of the App's: each statement of a batch counts. */
function countingDatabase(database, tally) {
  const raw = new WeakMap();
  const wrap = statement => {
    const proxy = new Proxy(statement, { get(target, key) {
      if (key === 'bind') return (...values) => wrap(target.bind(...values));
      if (['run', 'first', 'all', 'raw'].includes(key)) return (...values) => { tally.d1++; return target[key](...values); };
      const value = target[key]; return typeof value === 'function' ? value.bind(target) : value;
    } });
    raw.set(proxy, statement); return proxy;
  };
  return { prepare: sql => wrap(database.prepare(sql)), batch: statements => { tally.d1 += statements.length; return database.batch(statements.map(item => raw.get(item) ?? item)); } };
}

async function localDatabase() {
  const runtime = new Miniflare({ workers: [{ config: { name: 'invocation', compatibilityDate: '2026-09-17', env: { APP_DB: { type: 'd1', id: `invocation-${crypto.randomUUID()}` } },
    manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'), modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } } }] });
  const database = await runtime.getD1Database('APP_DB');
  const store = new D1AppStore(database);
  const directory = resolve('apps/github-app/migrations');
  for (const name of (await readdir(directory)).sort()) await store.migrate(await readFile(resolve(directory, name), 'utf8'));
  await store.recordLifecycle({ installationId: 9, action: 'created', addedRepositories: [17], removedRepositories: [] });
  await store.setRepositoryExecution(17, { enabled: true, origin: 'fixture' });
  await store.setRepositoryConfiguration(17, { repository: {}, brief: { mode: 'standard' } }, 'fixture');
  return { runtime, database };
}

const event = number => normalizeWebhookEvent('pull_request', { action: 'synchronize', installation: { id: 9 }, repository: { id: 17 }, pull_request: { number } }, new Date().toISOString(), `d-${number}`);
const refresh = (cause, causeId) => briefRefreshEnvelope({ installationId: 9, repositoryId: 17, targets: 'open', cause, causeId });

test('one queue invocation of refresh parts and ordinary events stays inside the D1 and subrequest limits; ordinary events run first', async () => {
  const { runtime, database } = await localDatabase();
  try {
    const repository = new FakeRepository();
    for (let number = 1; number <= 20; number++) repository.add(number);
    const tally = { d1: 0, github: 0 };
    const fetch = repository.fetch;
    repository.fetch = async (input, init) => { tally.github++; return fetch(input, init); };
    const order = [], starts = [];
    const execute = async (envelope, id, dependencies) => { order.push(envelope.type); starts.push(tally.d1); return executeDelivery(envelope, id, dependencies); };
    const queue = captureQueue(), outcome = new Map();
    // Two refreshes of all 20 open briefs and three ordinary events: about 1,400 D1 queries if everything ran.
    const bodies = [refresh('settings', 'revision-3'), refresh('policy', `policy-${'c'.repeat(40)}`), event(1), event(2), event(3)];
    const messages = bodies.map(body => ({ body, ack() { outcome.set(body.deliveryId, 'ack'); }, retry() { outcome.set(body.deliveryId, 'retry'); } }));
    await createGitHubAppWorker({ execute, clientFactory: async () => budgetedClient({ fetch: repository.fetch, readRetries: 0 }),
      briefProvider, briefPlan: async () => 'pro', collectAnalytics: async () => ({ status: 'disabled' }) })
      .queue({ messages }, { GITHUB_APP_ID: '1', GITHUB_APP_BOT_LOGIN: repository.author.login, APP_QUEUE: queue, APP_DB: countingDatabase(database, tally) });

    assert.ok(tally.d1 <= WORKERS_PAID.d1Queries, `D1 queries in one invocation: ${tally.d1}`);
    const subrequests = tally.d1 + tally.github + queue.sent.length;
    assert.ok(subrequests <= WORKERS_PAID.subrequests, `subrequests in one invocation: ${subrequests}`);
    assert.deepEqual(order.slice(0, 3), ['pull-request', 'pull-request', 'pull-request'], 'basic operation runs before refresh parts');
    assert.deepEqual([...outcome.values()], ['ack', 'ack', 'ack', 'ack', 'ack']);
    const states = (await database.prepare("SELECT delivery_id, state FROM deliveries WHERE delivery_id LIKE 'd-%' ORDER BY delivery_id").all()).results;
    assert.deepEqual(states.map(row => row.state), ['complete', 'complete', 'complete']);
    // The reserve per evaluation covers every evaluation this invocation measured.
    const costs = starts.slice(1).map((value, index) => value - starts[index]);
    assert.ok(Math.max(...costs) < INVOCATION_BUDGET.perEvaluation, `largest measured evaluation: ${Math.max(...costs)} D1 queries`);
    // What did not fit continues at once in the next invocation; nothing is dropped.
    const refreshed = order.filter(type => type === 'brief-refresh').length;
    assert.ok(refreshed >= 20 && refreshed <= 40, `refresh evaluations that fit: ${refreshed}`);
    // (Each ordinary event also enqueues its own neighbour refresh.)
    const continued = queue.sent.flatMap((item, index) => item.action === 'neighbour' ? [] : [[item.action, item.targets, queue.delays[index]]]);
    assert.deepEqual(continued, refreshed < 40 ? [['policy', 'open', 0]] : [], 'only work that did not fit continues with a fresh allowance');
  } finally { await runtime.dispose(); }
});
