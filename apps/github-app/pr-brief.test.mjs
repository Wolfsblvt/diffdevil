// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';
import { GitHubClient } from '@wolfsblvt/diffdevil/github';
import { unwrap } from '@wolfsblvt/diffdevil';
import { REFRESH_PACING, budgetedClient, createBriefRefresher, createGitHubAppWorker, createPolicyResolver } from './app.mjs';
import { createAdmissionService } from './admission.mjs';
import { BRIEF_RULE, resolveBriefRoute } from './brief.mjs';
import { briefRefreshEnvelope, briefRefreshTarget, normalizeWebhookEvent, readQueueEnvelope } from './contracts.mjs';
import { validateRepositoryConfiguration } from './configuration.mjs';
import { readBriefSettings } from '../shared/pr-brief/settings.mjs';
import { FakeGitHub, json } from '../../src/diffdevil/tests/helpers/github.mjs';
import { FakeRepository, SHARED, captureQueue } from './fake-repository.mjs';

// The premium provider is present only in a tree that carries premium/; a Community checkout runs the basic cases and
// skips the ones whose subject is premium context.
const PREMIUM_BRIEF = new URL('../../premium/pr-brief/index.mjs', import.meta.url);
const HAS_PREMIUM = existsSync(PREMIUM_BRIEF);
const premiumProvider = HAS_PREMIUM ? (await import(PREMIUM_BRIEF.href)).premiumBrief : null;
const premiumTest = (name, fn) => test(name, { skip: !HAS_PREMIUM && 'premium/ is not part of this tree' }, fn);

const base = { action: 'opened', installation: { id: 9 }, repository: { id: 17 }, pull_request: { number: 42 } };
function store(calls, configuration, extra = {}) {
  const lease = { kind: 'claimed', attemptId: 'a', fence: 1, executionFence: 2, leaseUntil: '2030-01-01T00:00:00.000Z' };
  return {
    async claimDelivery() { return lease; }, async claimExecution() { return lease; }, async executionAllowed() { return true; },
    async renewLease() { return lease; }, async assertLease() {}, async retry() {},
    async finish(_e, _l, state, result) { calls.push(['finish', state, result]); },
    async finishLifecycle(envelope, _d, state) { calls.push(['finishLifecycle', state, envelope.deliveryId]); },
    async repositoryConfiguration() { return { value: configuration }; },
    async check() { return undefined; }, async recordCheck() {}, async recordHistory() { return { status: 'disabled' }; },
    async recordAnalyticalRepair() {},
    async historySettings() { return { enabled: false, retentionDays: null }; },
    async analyticalRecords() { return []; }, async analyticalSizes() { return []; },
    ...extra
  };
}
async function deliver(fake, configuration, { action = 'opened', extra = {}, options = {}, delivery = 'delivery-1' } = {}) {
  const calls = [];
  const message = { id: 't', body: normalizeWebhookEvent('pull_request', { ...base, action }, new Date().toISOString(), delivery), ack() { calls.push('ack'); }, retry() { calls.push('retry'); } };
  const fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (path === '/repositories/17') return json({ id: 17, full_name: 'example/repository' });
    if (path.startsWith('/repos/example/repository/check-runs')) return json({ id: 99 }, init?.method === 'POST' ? 201 : 200);
    return fake.fetch(input, init);
  };
  await createGitHubAppWorker({ store: store(calls, configuration, extra), clientFactory: async () => new GitHubClient({ fetch, readRetries: 0 }),
    collectAnalytics: async () => ({ status: 'disabled' }), ...options }).queue({ messages: [message] }, { GITHUB_APP_ID: '1', GITHUB_APP_BOT_LOGIN: fake.author.login });
  return calls;
}
const standard = { repository: {}, brief: { mode: 'standard' } };
const owned = fake => fake.comments.filter(comment => comment.user.login === fake.author.login);

test('comments stay off by default: the managed size policy posts no brief', async () => {
  const fake = new FakeGitHub();
  await deliver(fake, { repository: {} });
  assert.equal(fake.comments.length, 0);
});

test('the first eligible evaluation posts one useful basic brief; an identical re-evaluation writes nothing', async () => {
  const fake = new FakeGitHub();
  const calls = await deliver(fake, standard);
  assert.equal(calls.find(row => row[0] === 'finish')[1], 'complete');
  assert.equal(owned(fake).length, 1);
  const body = owned(fake)[0].body;
  assert.match(body, /^### This change\n\n\*\*3 Changed · Size XS · 1 included file\*\*/u);
  assert.match(body, /\[Full measurement and effect status in the check\]\(https:\/\/github\.com\/example\/repository\/pull\/42\/checks\)/u);
  assert.doesNotMatch(body, /Explore this PR in the App/u, 'no App destination is claimed unless this deployment declares one');
  assert.match(body, /<!-- diffdevil:state=/u);
  const writes = fake.writes().length;
  await deliver(fake, standard, { delivery: 'delivery-2' });
  assert.equal(fake.writes().length, writes, 'same facts and same day: no comment or label write');
  assert.equal(owned(fake).length, 1);
});

test('a new head refreshes the same owned comment; a closed PR receives no further edit', async () => {
  const fake = new FakeGitHub();
  await deliver(fake, standard);
  fake.head = 'c'.repeat(40);
  fake.files = [{ filename: 'src/main.ts', status: 'modified', additions: 30, deletions: 0, changes: 30, patch: '@@ -0,0 +1,30 @@\n' + Array.from({ length: 30 }, (_, i) => `+line ${i}`).join('\n') }];
  await deliver(fake, standard, { action: 'synchronize', delivery: 'delivery-2' });
  assert.equal(owned(fake).length, 1); assert.match(owned(fake)[0].body, /\*\*30 Changed · Size S/u);
  fake.state = 'closed';
  const writes = fake.writes().length;
  const calls = await deliver(fake, standard, { action: 'closed', delivery: 'delivery-3' });
  assert.equal(fake.writes().length, writes); assert.equal(calls.find(row => row[0] === 'finish')[1], 'rejected');
});

test('repository-authored comment wording keeps the advanced route; the standard brief never overwrites it', async () => {
  const fake = new FakeGitHub();
  await deliver(fake, { repository: { rules: { note: { when: 'true', effects: { comment: { mode: 'upsert', template: 'Repository wording' } } } } }, brief: { mode: 'standard' } });
  assert.equal(owned(fake).length, 1); assert.match(owned(fake)[0].body, /^Repository wording/u);
  assert.deepEqual(resolveBriefRoute(readBriefSettings({ mode: 'standard' }), { rules: { note: { effects: { comment: {} } } } }).reason, 'repository-authored-comments');
});

test('context failure degrades to the basic brief and never blocks the size report', async () => {
  const fake = new FakeGitHub();
  await deliver(fake, standard, { extra: { async historySettings() { throw Object.assign(new Error('D1 down'), { code: 'E_D1' }); } } });
  assert.equal(owned(fake).length, 1); assert.match(owned(fake)[0].body, /^### This change/u);
  assert.ok(fake.labels.has('size/XS'));
});

premiumTest('premium context joins only for a funded repository; neighbour titles come from the live listing, escaped', async () => {
  const repository = new FakeRepository();
  repository.add(42); repository.add(7, { title: 'Neighbour @someone' });
  await deliverEnvelope(repository, pullEvent(42), standard);
  assert.match(repository.owned(42)[0].body, /\[#7 — Neighbour @​someone\]\(https:\/\/github\.com\/example\/repository\/pull\/7\)/u, 'titles are escaped and cannot mention anyone');
  const free = new FakeRepository();
  free.add(42); free.add(7);
  const listed = [];
  const fetch = free.fetch; free.fetch = async (input, init) => { listed.push(new URL(String(input)).pathname); return fetch(input, init); };
  await deliverEnvelope(free, pullEvent(42), standard, { options: { briefPlan: async () => 'free' } });
  assert.doesNotMatch(free.owned(42)[0].body, /\[!NOTE\]/u);
  assert.equal(listed.includes('/repos/example/repository/pulls'), false, 'an ineligible repository reads no neighbour listing');
});

test('A11: an explicitly enabled final summary is posted once on merge and never replayed', async () => {
  const fake = new FakeGitHub();
  const settings = { repository: {}, brief: { mode: 'standard', finalSummary: true } };
  await deliver(fake, settings);
  fake.state = 'closed';
  fake.before = (call, state) => call.method === 'GET' && call.path === '/repos/example/repository/pulls/42' && call.accept !== 'application/vnd.github.diff'
    ? json({ number: 42, state: 'closed', merged: true, head: { sha: state.head }, base: { sha: state.base, repo: { full_name: 'example/repository' } }, changed_files: state.files.length }) : undefined;
  await deliver(fake, settings, { action: 'closed', delivery: 'close-1' });
  assert.equal(owned(fake).length, 2);
  assert.match(owned(fake)[1].body, /^### Merged · final comparison `bbbbbbb` → `aaaaaaa`/u);
  await deliver(fake, settings, { action: 'closed', delivery: 'close-2' });
  assert.equal(owned(fake).length, 2, 'a repeated close event is the same terminal occasion');
  const unmerged = new FakeGitHub(); unmerged.state = 'closed';
  unmerged.before = call => call.method === 'GET' && call.path === '/repos/example/repository/pulls/42' && call.accept !== 'application/vnd.github.diff'
    ? json({ number: 42, state: 'closed', merged: false, head: { sha: unmerged.head }, base: { sha: unmerged.base, repo: { full_name: 'example/repository' } }, changed_files: 1 }) : undefined;
  await deliver(unmerged, settings, { action: 'closed' });
  assert.equal(unmerged.comments.length, 0, 'closing without merge posts nothing');
});

test('stored brief settings validate beside the repository policy layer and the preview performs no effect', async () => {
  assert.equal(validateRepositoryConfiguration({ repository: {}, brief: { mode: 'standard' } }).value.brief.mode, 'standard');
  assert.throws(() => validateRepositoryConfiguration({ repository: {}, brief: { template: 'x' } }));
  assert.throws(() => validateRepositoryConfiguration({ repository: {}, extra: {} }));
  const admission = { repositoryId: 17, installationId: 9, state: 'active', reach: { repository: 'available', installation: 'active', tombstoned: false }, revision: 1,
    execution: { reason: null }, history: { enabled: true, reason: null }, configuration: { value: { repository: {}, brief: { mode: 'standard' } } }, writer: { confidence: 'administrator-declared' } };
  let writes = 0;
  const service = createAdmissionService({ store: { async repositoryAdmission() { return admission; }, async updateRepositoryAdmission() { writes++; } }, authorize: async () => true, entitlement: async () => 'free' });
  const preview = await service.previewBrief(17, {}, { mode: 'standard', finalSummary: true });
  assert.equal(preview.effects, 'none'); assert.equal(preview.synthetic, true); assert.equal(writes, 0);
  assert.equal(preview.route.reason, 'repository-templates-unobserved', 'without an observed trusted policy the route is reported unconfirmed');
  assert.equal(preview.writer.login, 'diffdevil[bot]');
  assert.equal(preview.modules.find(item => item.id === 'neighbours').standing, 'not-provided');
  await assert.rejects(service.previewBrief(17, {}, { mode: 'nonsense' }), { code: 'E_ADMISSION_BRIEF_SETTINGS' });
  const read = await service.read(17, {});
  assert.equal(read.brief.settings.mode, 'standard'); assert.equal(read.brief.writer.lifecycle, 'diffdevil-app-brief/1');
  assert.equal(BRIEF_RULE, 'diffdevil-brief');
  const { policyNameOf } = await import('./brief.mjs');
  assert.equal(policyNameOf({ presets: ['size@1'] }, {}), 'size@1');
  assert.equal(policyNameOf({ presets: ['size@1'] }, { '/bands/size': 'supplied' }), null, 'an overridden size band is not named as the preset');
  assert.equal(policyNameOf({ presets: [], bands: { size: {} } }, { '/bands/size': 'repository' }), null);
});

test('a failing context provider degrades to the basic brief; labels and the report still land', async () => {
  const fake = new FakeGitHub();
  fake.before = call => call.method === 'GET' && call.path === '/repos/example/repository/pulls' ? json([]) : undefined;
  const broken = { kind: 'diffdevil.pr-brief-provider', version: 1, modules: ['neighbours'], facts() { throw new Error('provider bug'); }, contributions() { return []; } };
  await deliver(fake, standard, { extra: { async historySettings() { return { enabled: true, retentionDays: null }; } }, options: { briefProvider: broken, briefPlan: async () => 'business' } });
  assert.equal(owned(fake).length, 1); assert.match(owned(fake)[0].body, /^### This change/u);
  assert.ok(fake.labels.has('size/XS'));
});

// Several PRs in one repository: see fake-repository.mjs.
function repoStore(calls, configuration, flags, extra = {}) {
  return store(calls, configuration, { async historySettings() { return { enabled: flags.history === true, retentionDays: null }; }, ...extra });
}
async function deliverEnvelope(repository, envelope, configuration, { flags = {}, extra = {}, options = {}, queue = captureQueue() } = {}) {
  const calls = [];
  const message = { id: 't', body: envelope, ack() { calls.push('ack'); }, retry() { calls.push('retry'); } };
  await createGitHubAppWorker({ store: repoStore(calls, configuration, flags, extra), clientFactory: async () => new GitHubClient({ fetch: repository.fetch, readRetries: 0 }),
    collectAnalytics: async () => ({ status: 'disabled' }), briefProvider: premiumProvider, briefPlan: async () => 'pro',
    now: () => '2026-10-10T12:00:00.000Z', ...options }).queue({ messages: [message] }, { GITHUB_APP_ID: '1', GITHUB_APP_BOT_LOGIN: repository.author.login, APP_QUEUE: queue });
  return { calls, queue, finish: calls.find(row => row[0] === 'finish') };
}
const pullEvent = (pullRequest, action = 'opened', delivery = `d-${pullRequest}-${action}`) =>
  normalizeWebhookEvent('pull_request', { ...base, action, pull_request: { number: pullRequest } }, new Date().toISOString(), delivery);
const markerState = body => JSON.parse(Buffer.from(/<!-- diffdevil:state=([A-Za-z0-9_-]+) -->$/u.exec(body)[1], 'base64url').toString('utf8'));

premiumTest('P5: an eligible repository receives current same-file neighbours without history consent; history modules stay unavailable', async () => {
  const repository = new FakeRepository();
  repository.add(42); repository.add(7, { title: 'Neighbour' });
  const { finish, queue } = await deliverEnvelope(repository, pullEvent(42), standard, { flags: { history: false } });
  assert.equal(finish[1], 'complete');
  const body = repository.owned(42)[0].body;
  assert.match(body, /> \[!NOTE\]\n> \*\*One open PR touches the same files\*\*/u);
  assert.match(body, /\[#7 — Neighbour\]\(https:\/\/github\.com\/example\/repository\/pull\/7\)/u);
  assert.doesNotMatch(body, /Repository median|Repository history|merged PRs/u, 'nothing history-backed is published without consent');
  assert.equal(markerState(body).context, 'n:7', 'the publication records which open PRs it described');
  assert.deepEqual(queue.sent.map(item => [item.type, item.action, item.targets]), [['brief-refresh', 'neighbour', [7]]]);
  assert.deepEqual(readQueueEnvelope(queue.sent[0]), queue.sent[0], 'a refresh is an ordinary admitted queue message');
});

premiumTest('neighbour moves and closes refresh the affected open briefs through the delivery path; no write after close', async () => {
  const repository = new FakeRepository();
  const subject = repository.add(42); repository.add(7, { title: 'Neighbour' });
  const flags = { history: false };
  // Each PR's own opening evaluation records which open PRs its brief described.
  await deliverEnvelope(repository, pullEvent(42), standard, { flags });
  assert.equal(markerState(repository.owned(42)[0].body).context, 'n:7');
  const first = await deliverEnvelope(repository, pullEvent(7), standard, { flags });
  assert.equal(first.finish?.[1], 'complete', JSON.stringify(first.finish?.[2]));
  assert.match(repository.owned(7)[0].body, /\[#42 — PR 42\]/u, 'PR 7 describes PR 42 as sharing its file');
  // PR 42 moves away from the shared file: it shares nothing now, but its previous publication described PR 7.
  subject.head = 'e'.repeat(40);
  subject.files = [{ filename: 'docs/other.md', status: 'modified', additions: 1, deletions: 0, changes: 1, patch: '@@ -1,0 +1,1 @@\n+x' }];
  const moved = await deliverEnvelope(repository, pullEvent(42, 'synchronize'), standard, { flags });
  const refresh = moved.queue.sent.find(item => item.targets.includes(7));
  assert.ok(refresh, 'the brief that described PR 42 is refreshed although they no longer share files');
  const refreshed = await deliverEnvelope(repository, refresh, standard, { flags });
  assert.equal(refreshed.finish[1], 'complete');
  assert.deepEqual(refreshed.calls.find(row => row[0] === 'finishLifecycle'), ['finishLifecycle', 'complete', 'brief-refresh-part:neighbour:d-42-synchronize:17:0']);
  assert.equal(repository.owned(7).length, 1, 'the same owned comment is refreshed');
  assert.doesNotMatch(repository.owned(7)[0].body, /#42/u);
  // A repeated cause is the same delivery identities, so the ordinary delivery claims make it a duplicate.
  const same = { installationId: 9, repositoryId: 17, targets: [7], cause: 'neighbour', causeId: 'd-42-synchronize' };
  assert.equal(briefRefreshEnvelope(same).deliveryId, refresh.deliveryId); assert.equal(briefRefreshEnvelope(same).deliveryId, briefRefreshEnvelope({ ...same, receivedAt: 'later' }).deliveryId);
  assert.equal(briefRefreshTarget(briefRefreshEnvelope(same), 7).deliveryId, 'brief-refresh:neighbour:d-42-synchronize:17:7');

  // Back onto the shared file, then closed: PR 7 is refreshed again, and PR 42 receives nothing.
  subject.head = 'f'.repeat(40);
  subject.files = [{ filename: 'src/main.ts', status: 'modified', additions: 3, deletions: 3, changes: 6, patch: SHARED }];
  await deliverEnvelope(repository, pullEvent(42, 'synchronize', 'd-back'), standard, { flags });
  const back = await deliverEnvelope(repository, pullEvent(7, 'edited', 'd-7-edited'), standard, { flags });
  assert.match(repository.owned(7)[0].body, /#42/u); assert.ok(back.finish);
  subject.state = 'closed';
  const subjectWrites = subject.writes().length;
  const closed = await deliverEnvelope(repository, pullEvent(42, 'closed'), standard, { flags });
  assert.equal(closed.finish[1], 'rejected', 'a closed PR is still not written to');
  assert.equal(subject.writes().length, subjectWrites);
  const afterClose = closed.queue.sent.find(item => item.targets.includes(7));
  assert.ok(afterClose, 'closing refreshes the briefs that described the closed PR');
  await deliverEnvelope(repository, afterClose, standard, { flags });
  assert.doesNotMatch(repository.owned(7)[0].body, /#42/u, 'a closed PR is no longer presented as an open neighbour');
  // A refresh never refreshes further, and a closed PR named by a refresh is neither evaluated nor written to.
  const closedRefresh = await deliverEnvelope(repository, briefRefreshEnvelope({ installationId: 9, repositoryId: 17, targets: [42], cause: 'neighbour', causeId: 'x' }), standard, { flags });
  assert.equal(closedRefresh.finish, undefined); assert.equal(closedRefresh.calls.find(row => row[0] === 'finishLifecycle')[1], 'complete');
  assert.equal(subject.writes().length, subjectWrites); assert.equal(closedRefresh.queue.sent.length, 0);
});

test('a merged trusted-policy change refreshes every open brief and settings changes refresh through admission', async () => {
  const repository = new FakeRepository();
  const subject = repository.add(42, { files: [{ filename: '.diffdevil.yml', status: 'modified', additions: 1, deletions: 1, changes: 2, patch: '@@ -1,1 +1,1 @@\n-a\n+b' }] });
  repository.add(7); repository.add(8);
  subject.state = 'closed';
  const mergeCommit = 'c'.repeat(40);
  const mergedAt = '2026-10-10T12:00:00.000Z';
  subject.before = (call, state) => call.method === 'GET' && call.path === '/repos/example/repository/pulls/42' && call.accept !== 'application/vnd.github.diff'
    ? json({ number: 42, state: 'closed', merged: true, merged_at: mergedAt, head: { sha: state.head }, base: { sha: state.base, repo: { full_name: 'example/repository' } }, changed_files: state.files.length })
    : call.method === 'GET' && call.path === '/repos/example/repository/issues/42/timeline'
      ? json([{ event: 'merged', commit_id: mergeCommit, created_at: mergedAt }]) : undefined;
  const merged = await deliverEnvelope(repository, pullEvent(42, 'closed'), standard);
  const policy = merged.queue.sent.filter(item => item.action === 'policy');
  assert.deepEqual(policy.map(item => [item.targets, item.deliveryId]), [['open', `brief-refresh-part:policy:policy-${mergeCommit}:17:0`]]);
  // The direct default-branch push of the same commit is the same refresh.
  const push = normalizeWebhookEvent('push', { installation: { id: 9 }, repository: { id: 17, default_branch: 'main' }, ref: 'refs/heads/main', after: mergeCommit,
    commits: [{ added: [], modified: ['.diffdevil.yml'], removed: [] }] }, '2026-10-10T12:00:00.000Z', 'push-delivery');
  assert.equal(push.deliveryId, policy[0].deliveryId);
  const otherPolicyPush = normalizeWebhookEvent('push', { installation: { id: 9 }, repository: { id: 17, default_branch: 'main' }, ref: 'refs/heads/main', after: 'e'.repeat(40),
    commits: [{ added: [], modified: ['.diffdevil.yml'], removed: [] }] }, '2026-10-10T12:00:00.000Z', 'other-push');
  assert.notEqual(otherPolicyPush.deliveryId, policy[0].deliveryId, 'a different policy commit keeps its own refresh identity');
  const applied = await deliverEnvelope(repository, policy[0], standard);
  assert.deepEqual(applied.calls.filter(row => row[0] === 'finish').map(row => row[1]), ['complete', 'complete'], 'PRs 7 and 8 are evaluated again; closed PR 42 is not');
  assert.equal(repository.owned(7).length, 1); assert.equal(repository.owned(8).length, 1);

  const readTimeline = subject.before;
  subject.before = (call, state) => call.method === 'GET' && call.path === '/repos/example/repository/issues/42/timeline'
    ? json({ message: 'unavailable' }, 503) : readTimeline(call, state);
  const unavailable = await deliverEnvelope(repository, pullEvent(42, 'closed', 'timeline-unavailable'), standard);
  const fallbackPolicy = unavailable.queue.sent.filter(item => item.action === 'policy');
  assert.deepEqual(fallbackPolicy.map(item => [item.causeId, item.deliveryId]), [[
    'timeline-unavailable', 'brief-refresh-part:policy:timeline-unavailable:17:0'
  ]], 'an unavailable merge timeline preserves the unique delivery-ID refresh');

  // Settings: the admission service enqueues the cause; the queue lists the open briefs, admission reads nothing.
  const queue = captureQueue();
  const refresher = createBriefRefresher({ GITHUB_APP_ID: '1', GITHUB_APP_PRIVATE_KEY: 'unused', APP_QUEUE: queue });
  let admission = { repositoryId: 17, installationId: 9, state: 'active', revision: 1, reach: { repository: 'available', installation: 'active', tombstoned: false },
    execution: { reason: null }, history: { enabled: false, reason: 'never-enabled' }, configuration: { value: { repository: {}, brief: { mode: 'standard' } } }, writer: { confidence: 'administrator-declared' } };
  const service = createAdmissionService({ store: { async repositoryAdmission() { return admission; }, async updateRepositoryAdmission(_id, change) { admission = { ...admission, revision: 2, configuration: { value: change.configuration?.value ?? admission.configuration.value } }; return admission; } },
    authorize: async () => true, refreshBriefs: refresher });
  const updated = await service.update(17, { origin: 'dashboard', revision: 1, configuration: { repository: {}, brief: { mode: 'standard', modules: ['neighbours'] } } });
  assert.deepEqual(updated.brief.refresh, { status: 'enqueued', scope: 'open' });
  assert.deepEqual(queue.sent.map(item => [item.action, item.targets, item.deliveryId]), [['settings', 'open', 'brief-refresh-part:settings:revision-2:17:0']]);
});

test('history consent withdrawn after the inputs were read is never published; the basic report and labels still land', async () => {
  const { analyzeDiff } = await import('@wolfsblvt/diffdevil');
  const retained = unwrap(analyzeDiff('diff --git a/src/x.ts b/src/x.ts\n--- a/src/x.ts\n+++ b/src/x.ts\n@@ -1,0 +1,60 @@\n' + Array.from({ length: 60 }, (_, i) => `+l${i}`).join('\n') + '\n'));
  const records = [{ repositoryId: 17, pullRequest: 5, state: 'merged', mergedAt: '2026-09-01T00:00:00.000Z', revisions: [], final: { base: 'b', head: 'h', report: retained, sizes: [] } }];
  for (const trigger of ['files', 'labels']) {
    const repository = new FakeRepository();
    const subject = repository.add(42);
    const flags = { history: true };
    subject.before = call => {
      // Withdraw while the subject is being acquired (after the inputs were read), or just before the first provider write.
      if (trigger === 'files' && call.path === '/repos/example/repository/pulls/42/files') flags.history = false;
      if (trigger === 'labels' && call.method !== 'GET') flags.history = false;
      return undefined;
    };
    const extra = { async analyticalRecords() { return flags.history ? records : []; } };
    const { finish } = await deliverEnvelope(repository, pullEvent(42), standard, { flags, extra, options: { briefPlan: async () => 'free' } });
    assert.equal(finish[1], 'complete', trigger);
    const owned = repository.owned(42);
    assert.equal(owned.length, 1, `${trigger}: one brief`);
    assert.match(owned[0].body, /^### This change\n\n\*\*3 Changed · Size XS/u, `${trigger}: the basic report is published`);
    assert.doesNotMatch(owned[0].body, /Repository median|Repository history/u, `${trigger}: no history-backed context after withdrawal`);
    assert.ok(subject.labels.has('size/XS'), `${trigger}: labels are independent of history consent`);
  }
  // Consent still held: the same inputs publish the history line.
  const repository = new FakeRepository(); repository.add(42);
  await deliverEnvelope(repository, pullEvent(42), standard, { flags: { history: true }, extra: { async analyticalRecords() { return records; } }, options: { briefPlan: async () => 'free' } });
  assert.match(repository.owned(42)[0].body, /Repository median: \*\*60 Changed\*\*/u);
});

test('a final summary whose write is acknowledged but unreadable keeps its observations and terminal identity for repair', async () => {
  const fake = new FakeGitHub();
  const settings = { repository: {}, brief: { mode: 'standard', finalSummary: true } };
  fake.state = 'closed';
  let posted = false;
  fake.before = (call, state) => {
    if (call.method === 'GET' && call.path === '/repos/example/repository/pulls/42' && call.accept !== 'application/vnd.github.diff')
      return json({ number: 42, state: 'closed', merged: true, head: { sha: state.head }, base: { sha: state.base, repo: { full_name: 'example/repository' } }, changed_files: state.files.length });
    if (call.method === 'POST' && call.path === '/repos/example/repository/issues/42/comments') { posted = true; return undefined; }
    if (posted && call.method === 'GET' && call.path === '/repos/example/repository/issues/42/comments') return json({ message: 'unavailable' }, 500);
    return undefined;
  };
  const calls = await deliver(fake, settings, { action: 'closed', delivery: 'close-readback' });
  assert.equal(fake.comments.filter(comment => comment.user.login === fake.author.login).length, 1, 'the write landed');
  const [, state, result] = calls.find(row => row[0] === 'finish');
  assert.equal(state, 'repair');
  assert.equal(result.repair.kind, 'effect-reconciliation');
  assert.deepEqual(result.repair.projection.observations.map(item => [item.kind, item.request, item.readback]), [['comment.create', 'acknowledged', 'unobserved']]);
  assert.equal(result.repair.identity.repositoryId, 17); assert.equal(result.repair.identity.pullRequest, 42);
  assert.match(result.repair.identity.comparisonId, /^[A-Za-z0-9._-]+$/u); assert.ok(result.repair.identity.policyId);
});

test('the preview route resolves the effective trusted policy with a production resolver and renders through it', async () => {
  const fake = new FakeGitHub();
  fake.contents.set(`${fake.defaultBranch}:.diffdevil.yml`, 'version: 1\npresets: [size@1]\nbands:\n  size:\n    value: metrics.review\n    minimum: 0\n    ranges:\n      - id: xs\n        lt: 1000\n      - id: s\n        lt: 2000\n      - id: m\n        lt: 3000\n      - id: l\n        lt: 4000\n      - id: xl\n        otherwise: true\n');
  const fetch = async (input, init) => {
    const path = new URL(String(input)).pathname;
    if (path === '/app/installations/9/access_tokens') return json({ token: 'installation', expires_at: '2999-01-01T00:00:00Z' }, 201);
    if (path === '/repositories/17') return json({ id: 17, full_name: 'example/repository', default_branch: 'main' });
    return fake.fetch(input, init);
  };
  const admission = { repositoryId: 17, installationId: 9, state: 'active', reach: { repository: 'available', installation: 'active', tombstoned: false }, revision: 1,
    execution: { reason: null }, history: { enabled: false, reason: 'never-enabled' }, configuration: { value: { repository: {}, brief: { mode: 'standard' } } }, writer: { confidence: 'administrator-declared' } };
  const service = createAdmissionService({ store: { async repositoryAdmission() { return admission; }, async updateRepositoryAdmission() {} }, authorize: async () => true, entitlement: async () => 'free',
    previewPolicy: createPolicyResolver({ GITHUB_APP_ID: '1', GITHUB_APP_PRIVATE_KEY: 'unused' }, { fetch, createJwt: async () => 'jwt' }) });
  const preview = await service.previewBrief(17, {}, { mode: 'standard' });
  assert.equal(preview.source.standing, 'observed'); assert.equal(preview.source.identity, `.diffdevil.yml@${fake.defaultBranch}`);
  assert.deepEqual(preview.evaluation, { kind: 'effective-policy', policyId: preview.source.policyId });
  assert.match(preview.states.exact.markdown, /Size XS/u);
  assert.match(preview.states.exact.markdown, /defines XS as 0–999 included Changed/u);
  assert.equal(preview.route.effective, 'standard', 'an observed policy without authored comment rules confirms the standard route');
  assert.equal(fake.writes().length, 0, 'the resolver performs no provider write');
  const unreachable = createAdmissionService({ store: { async repositoryAdmission() { return admission; }, async updateRepositoryAdmission() {} }, authorize: async () => true,
    previewPolicy: async () => { throw Object.assign(new Error('down'), { code: 'E_GITHUB_UNAVAILABLE' }); } });
  const specimen = await unreachable.previewBrief(17, {}, { mode: 'standard' });
  assert.deepEqual(specimen.source, { standing: 'unobserved', reason: 'E_GITHUB_UNAVAILABLE' });
  assert.equal(specimen.evaluation.kind, 'design-specimen');
});

premiumTest('an unreadable current index keeps the recorded neighbours, so a later change still refreshes them', async () => {
  const repository = new FakeRepository();
  const subject = repository.add(42); repository.add(7);
  await deliverEnvelope(repository, pullEvent(42), standard);
  assert.equal(markerState(repository.owned(42)[0].body).context, 'n:7');
  const fetch = repository.fetch;
  repository.fetch = async (input, init) => new URL(String(input)).pathname === '/repos/example/repository/pulls' ? json({ message: 'unavailable' }, 502) : fetch(input, init);
  subject.head = 'e'.repeat(40);
  subject.files = [{ filename: 'src/main.ts', status: 'modified', additions: 30, deletions: 0, changes: 30, patch: '@@ -0,0 +1,30 @@\n' + Array.from({ length: 30 }, (_, i) => `+line ${i}`).join('\n') }];
  const { finish, queue } = await deliverEnvelope(repository, pullEvent(42, 'synchronize'), standard);
  assert.equal(finish[1], 'complete');
  assert.match(repository.owned(42)[0].body, /\*\*30 Changed · Size S/u, 'the basic report still refreshes');
  assert.doesNotMatch(repository.owned(42)[0].body, /\[!NOTE\]/u, 'no neighbour is claimed from an unreadable index');
  assert.equal(markerState(repository.owned(42)[0].body).context, 'n:7', 'the recorded neighbours survive');
  assert.deepEqual(queue.sent.map(item => item.targets), [[7]]);
});

// ---------------------------------------------------------------------------------------------------------------------
// Refresh cost: one in-memory read of the open PRs' files per refresh part, paced parts and an honest continuation.
// ---------------------------------------------------------------------------------------------------------------------
const NOW = '2026-10-10T12:00:00.000Z';
/** Count every GET path the repository answers; `budget`, when set, is reported in GitHub's rate headers and spent. */
function instrument(repository, budget) {
  const reads = [], fetch = repository.fetch;
  repository.fetch = async (input, init = {}) => {
    if ((init.method ?? 'GET') === 'GET') reads.push(new URL(String(input)).pathname);
    const response = await fetch(input, init);
    if (!budget) return response;
    budget.remaining = Math.max(0, budget.remaining - 1);
    const headers = new Headers(response.headers);
    headers.set('x-ratelimit-limit', String(budget.limit)); headers.set('x-ratelimit-remaining', String(budget.remaining)); headers.set('x-ratelimit-reset', String(budget.reset));
    return new Response(response.status === 204 ? null : await response.arrayBuffer(), { status: response.status, headers });
  };
  return reads;
}
const budgeted = repository => ({ clientFactory: async () => budgetedClient({ fetch: repository.fetch, readRetries: 0 }) });
const fileReads = reads => reads.filter(path => /^\/repos\/example\/repository\/pulls\/\d+\/files$/u.test(path)).length;
const settingsRefresh = (targets = 'open', part = 0) => briefRefreshEnvelope({ installationId: 9, repositoryId: 17, targets, cause: 'settings', causeId: 'revision-3', part, receivedAt: NOW });

test('a settings refresh shares its optional file index and continues every remaining brief in either edition', async () => {
  const repository = new FakeRepository();
  for (let number = 1; number <= 45; number++) repository.add(number);
  const reads = instrument(repository);
  // Part 0: 20 briefs share one read of all 45 open PRs' files; each brief's own analysis reads its own files once.
  const first = await deliverEnvelope(repository, settingsRefresh(), standard);
  assert.equal(first.calls.filter(row => row[0] === 'finish' && row[1] === 'complete').length, REFRESH_PACING.perPart);
  assert.equal(fileReads(reads), (HAS_PREMIUM ? 45 : 0) + 20, 'a provided context shares one index; Community reads only its subjects');
  assert.deepEqual(first.queue.sent.map(item => [item.part, item.targets, item.after, item.carried]), [[1, 'open', 20, undefined]], 'the walk continues above the last PR it reached');
  assert.deepEqual(first.queue.delays, [REFRESH_PACING.unobservedDelaySeconds], 'an unobserved budget spaces the parts');
  assert.deepEqual(readQueueEnvelope(first.queue.sent[0]), first.queue.sent[0]);
  // Parts 1 and 2 finish the cause; nothing is silently left beyond a batch bound.
  const second = await deliverEnvelope(repository, first.queue.sent[0], standard);
  assert.deepEqual(second.queue.sent.map(item => [item.part, item.targets, item.after]), [[2, 'open', 40]]);
  const third = await deliverEnvelope(repository, second.queue.sent[0], standard);
  assert.equal(third.queue.sent.length, 0);
  assert.equal(fileReads(reads), (HAS_PREMIUM ? 3 * 45 : 0) + 45, 'every subject is refreshed, with only the provided context index');
  for (let number = 1; number <= 45; number++) assert.equal(repository.owned(number).length, 1, `PR ${number} has its one refreshed brief`);
  if (HAS_PREMIUM) assert.match(repository.owned(45)[0].body, /open PRs touch the same files/u, 'the shared read still yields each brief its current neighbours');
});

test('within one queue invocation, ordinary PR events share one optional current index read', async () => {
  const repository = new FakeRepository();
  for (let number = 1; number <= 6; number++) repository.add(number);
  const reads = instrument(repository);
  const calls = [], queue = captureQueue();
  const messages = [1, 2, 3].map(number => ({ id: `m${number}`, body: pullEvent(number), ack() { calls.push('ack'); }, retry() { calls.push('retry'); } }));
  await createGitHubAppWorker({ store: repoStore(calls, standard, {}), clientFactory: async () => new GitHubClient({ fetch: repository.fetch, readRetries: 0 }),
    collectAnalytics: async () => ({ status: 'disabled' }), briefProvider: premiumProvider, briefPlan: async () => 'pro', now: () => NOW })
    .queue({ messages }, { GITHUB_APP_ID: '1', GITHUB_APP_BOT_LOGIN: repository.author.login, APP_QUEUE: queue });
  assert.deepEqual(calls.filter(call => call === 'ack').length, 3);
  assert.equal(fileReads(reads), (HAS_PREMIUM ? 6 : 0) + 3, 'only a provided context reads the shared index, and every subject is analyzed');
  for (const number of [1, 2, 3]) {
    assert.equal(repository.owned(number).length, 1);
    if (HAS_PREMIUM) assert.match(repository.owned(number)[0].body, /open PRs touch the same files/u);
  }
});

test('inside the rate reserve a refresh waits for the reset and an ordinary event skips the optional index; labels still land', async () => {
  const reset = Math.floor(Date.parse(NOW) / 1000) + 1800;
  const repository = new FakeRepository();
  for (let number = 1; number <= 6; number++) repository.add(number);
  // 1,300 of 5,000 left: the part starts, crosses the 25% reserve and hands the rest to a part after the reset.
  const budget = { limit: 5000, remaining: 1300, reset };
  const reads = instrument(repository, budget);
  const first = await deliverEnvelope(repository, settingsRefresh(), standard, { options: budgeted(repository) });
  const refreshed = first.calls.filter(row => row[0] === 'finish').length;
  assert.ok(refreshed >= 1 && refreshed < 6, `the part yields at the reserve (${refreshed} refreshed)`);
  assert.equal(budget.remaining < 1250 && budget.remaining > 1100, true, `the refresh stopped near the reserve (${budget.remaining} left)`);
  assert.deepEqual(first.queue.sent.map(item => item.targets.length), [6 - refreshed]);
  assert.deepEqual(first.queue.delays, [1805], 'the continuation waits for GitHub’s reset');
  // A healthy observed budget lets the next part follow at once.
  budget.remaining = 4900;
  const ample = new FakeRepository();
  for (let number = 1; number <= 25; number++) ample.add(number);
  instrument(ample, budget);
  const healthy = await deliverEnvelope(ample, settingsRefresh(), standard, { options: budgeted(ample) });
  assert.deepEqual(healthy.queue.delays, [0]);

  // An ordinary event inside the reserve: no other PR's files are read, the basic brief and size label still land.
  budget.remaining = 200;
  const prior = repository.owned(3).length ? markerState(repository.owned(3)[0].body).context : undefined;
  const before = reads.length;
  const event = await deliverEnvelope(repository, pullEvent(3, 'synchronize', 'd-3-reserve'), standard, { options: budgeted(repository) });
  assert.equal(event.finish[1], 'complete');
  assert.deepEqual(reads.slice(before).filter(path => /\/pulls\/\d+\/files$/u.test(path)), ['/repos/example/repository/pulls/3/files'], 'only the subject’s own files');
  assert.ok(repository.pulls.get(3).labels.size > 0);
  assert.equal(repository.owned(3).length, 1);
  assert.equal(markerState(repository.owned(3)[0].body).context, prior, 'the recorded neighbours are kept, not erased');
});

test('a brief whose execution lease is held, or a rate limit mid-part, continues in a later part instead of being dropped', async () => {
  const repository = new FakeRepository();
  for (const number of [7, 8, 9]) repository.add(number);
  instrument(repository);
  const held = { kind: 'claimed', attemptId: 'a', fence: 1, executionFence: 2, leaseUntil: '2030-01-01T00:00:00.000Z' };
  const deferred = await deliverEnvelope(repository, settingsRefresh(), standard,
    { extra: { async claimExecution(envelope) { return envelope.pullRequest === 8 ? { kind: 'active' } : held; } } });
  assert.deepEqual(deferred.calls.filter(row => row[0] === 'finish').length, 2);
  assert.deepEqual(deferred.queue.sent.map(item => [item.targets, item.after, item.carried]), [['open', 9, [8]]], 'the deferred brief is carried; the walk moves on');
  assert.deepEqual(deferred.queue.delays, [REFRESH_PACING.deferredDelaySeconds], 'the deferred brief waits out the lease it met');
  assert.equal(deferred.queue.sent[0].deliveryId, 'brief-refresh-part:settings:revision-3:17:1');
  const carried = await deliverEnvelope(repository, deferred.queue.sent[0], standard);
  assert.deepEqual(carried.calls.filter(row => row[0] === 'finish').map(row => row[2].status), ['verified'], 'the carried brief runs first and alone');
  assert.equal(carried.queue.sent.length, 0, 'no open PR remains above the cursor: the refresh is complete');

  // GitHub rate-limits PR 8's own read: the part stops there and PR 8 onwards continue after the reset window.
  const fetch = repository.fetch;
  repository.fetch = async (input, init) => new URL(String(input)).pathname === '/repos/example/repository/pulls/8' ? json({ message: 'rate limited' }, 429, { 'retry-after': '60' }) : fetch(input, init);
  const limited = await deliverEnvelope(repository, settingsRefresh([7, 8, 9]), standard);
  assert.deepEqual(limited.calls.filter(row => row[0] === 'finish').map(row => row[1]), ['complete']);
  assert.deepEqual(limited.queue.sent.map(item => item.targets), [[8, 9]]);
  assert.deepEqual(limited.queue.delays, [REFRESH_PACING.maximumDelaySeconds], 'an unobserved reset waits the maximum');
});

test('a refresh for a repository without the standard brief reads nothing; queue identities must match their cause', async () => {
  const repository = new FakeRepository();
  repository.add(7);
  let minted = 0;
  const off = await deliverEnvelope(repository, settingsRefresh(), { repository: {}, brief: { mode: 'off' } }, { options: { clientFactory: async () => { minted++; return new GitHubClient({ fetch: repository.fetch }); } } });
  assert.equal(minted, 0); assert.equal(off.calls.find(row => row[0] === 'finishLifecycle')[1], 'complete'); assert.equal(off.queue.sent.length, 0);

  const envelope = settingsRefresh([7]);
  assert.throws(() => readQueueEnvelope({ ...envelope, deliveryId: 'brief-refresh-part:settings:other:17:0' }), /does not match/u);
  assert.throws(() => readQueueEnvelope({ ...envelope, targets: [] }), /bounded list/u);
  assert.throws(() => readQueueEnvelope({ ...envelope, targets: Array.from({ length: 501 }, (_, i) => i + 1) }), /bounded list/u);
  assert.throws(() => readQueueEnvelope({ ...envelope, part: -1 }), /out of range/u);
  assert.equal(readQueueEnvelope(settingsRefresh([7], 250)).part, 250, 'parts are not capped: pacing never ends a chain');
  assert.throws(() => readQueueEnvelope({ ...envelope, after: 3 }), /Only an open/u, 'a named refresh carries no cursor');
  assert.throws(() => readQueueEnvelope({ ...settingsRefresh(), carried: 'x' }), /bounded list/u);
  assert.deepEqual(readQueueEnvelope({ ...settingsRefresh(), after: 40, page: 2, carried: [8, 3] }).carried, [3, 8]);
  assert.throws(() => readQueueEnvelope({ ...envelope, paths: ['src/main.ts'] }), /prohibited field/u);
});

test('a default-branch push that may change the trusted policy is a policy refresh; other pushes are ignored', () => {
  const sha = 'd'.repeat(40);
  const push = (extra = {}) => normalizeWebhookEvent('push', { installation: { id: 9 }, repository: { id: 17, default_branch: 'main', owner: { id: 3 } }, ref: 'refs/heads/main', after: sha,
    commits: [{ added: [], modified: ['src/a.ts'], removed: [] }], ...extra }, NOW, 'push-1');
  assert.equal(push(), undefined, 'a push that leaves the policy alone');
  for (const touched of [{ added: ['.diffdevil.yml'] }, { modified: ['.diffdevil.yml'] }, { removed: ['.diffdevil.yml'] }]) {
    const envelope = push({ commits: [{ added: [], modified: [], removed: [], ...touched }] });
    assert.deepEqual([envelope.type, envelope.action, envelope.targets, envelope.accountId, envelope.deliveryId], ['brief-refresh', 'policy', 'open', 3, `brief-refresh-part:policy:policy-${sha}:17:0`]);
  }
  assert.equal(push({ forced: true })?.action, 'policy', 'a forced push cannot show the policy was left alone');
  assert.equal(push({ commits: Array.from({ length: 2048 }, () => ({ added: [], modified: ['src/a.ts'], removed: [] })) })?.action, 'policy', 'nor can a truncated commit list');
  assert.equal(push({ ref: 'refs/heads/feature', commits: [{ modified: ['.diffdevil.yml'] }] }), undefined, 'another branch');
  assert.equal(push({ deleted: true, commits: [{ modified: ['.diffdevil.yml'] }] }), undefined, 'a deleted branch');
  assert.equal(push({ after: 'not-a-sha', commits: [{ modified: ['.diffdevil.yml'] }] }), undefined);
});

test('a rate limit on a refresh part’s own listing continues the same part after the reset window, without spending queue retries', async () => {
  const repository = new FakeRepository();
  repository.add(7);
  const fetch = repository.fetch;
  repository.fetch = async (input, init) => new URL(String(input)).pathname === '/repos/example/repository/pulls' ? json({ message: 'rate limited' }, 429, { 'retry-after': '60' }) : fetch(input, init);
  const calls = [], released = [], queue = captureQueue();
  const message = { id: 'r', body: settingsRefresh(), ack() { calls.push('ack'); }, retry(options) { calls.push(['retry', options?.delaySeconds]); } };
  await createGitHubAppWorker({ store: repoStore(calls, standard, {}, { async releaseDelivery(envelope, _d, code) { released.push([envelope.deliveryId, code]); } }),
    clientFactory: async () => new GitHubClient({ fetch: repository.fetch, readRetries: 0 }), now: () => NOW })
    .queue({ messages: [message] }, { GITHUB_APP_ID: '1', GITHUB_APP_BOT_LOGIN: repository.author.login, APP_QUEUE: queue });
  assert.deepEqual(released, [], 'pacing is not a failure');
  assert.deepEqual(calls.filter(call => call === 'ack' || call[0] === 'retry'), ['ack']);
  assert.deepEqual(queue.sent.map(item => [item.part, item.targets, item.deliveryId]), [[1, 'open', 'brief-refresh-part:settings:revision-3:17:1']]);
  assert.deepEqual(queue.delays, [REFRESH_PACING.maximumDelaySeconds]);
});

test('an open refresh reaches every open PR beyond the listing bound, through closures and deferrals, and then ends', async () => {
  const repository = new FakeRepository();
  for (let number = 1; number <= 650; number++) repository.add(number);
  const reads = instrument(repository);
  const refreshed = new Map(), parts = [];
  // The evaluation itself is the ordinary delivery path's concern; this walk only needs to know which PRs it reached.
  const execute = async envelope => { refreshed.set(envelope.pullRequest, (refreshed.get(envelope.pullRequest) ?? 0) + 1); return { status: 'verified', effectCount: 0 }; };
  let heldOnce = true;
  const extra = { async claimExecution(envelope) {
    if (envelope.pullRequest === 600 && heldOnce) { heldOnce = false; return { kind: 'active' }; }
    return { kind: 'claimed', attemptId: 'a', fence: 1, executionFence: 2, leaseUntil: '2030-01-01T00:00:00.000Z' };
  } };
  let message = settingsRefresh();
  while (message) {
    parts.push(message);
    // Midway, PRs below the cursor close (later PRs move to earlier listing pages) and some not yet reached close too.
    if (message.part === 15) for (let number = 1; number <= 250; number += 2) repository.pulls.get(number).state = 'closed';
    if (message.part === 15) for (const number of [640, 641]) repository.pulls.get(number).state = 'closed';
    const { queue } = await deliverEnvelope(repository, message, standard, { extra, options: { execute } });
    assert.ok(queue.sent.length <= 1);
    message = queue.sent[0];
    if (message) assert.deepEqual(readQueueEnvelope(message), message);
  }
  const open = [...repository.pulls].filter(([, fake]) => fake.state === 'open').map(([number]) => number);
  assert.ok(open.length > 500, 'more open PRs than one bounded listing holds');
  for (const number of open) assert.equal(refreshed.get(number), 1, `open PR ${number} is refreshed exactly once`);
  assert.equal(refreshed.has(640) || refreshed.has(641), false, 'PRs that closed before the walk reached them receive nothing');
  assert.ok(parts.some(part => part.carried?.includes(600)), 'the deferred PR was carried, not dropped');
  const listingReads = reads.filter(path => path === '/repos/example/repository/pulls').length;
  assert.ok(listingReads <= parts.length * 3, `the walk resumes near its page instead of re-listing from the start (${listingReads} listing reads, ${parts.length} parts)`);
});
