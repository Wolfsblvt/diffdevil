// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPolicyReader } from '../src/lib/policies.mjs';
import { createPolicyResolver } from '../../github-app/app.mjs';
import { createAnalyticalDataService } from '../../github-app/analytical-data.mjs';
import { record, from, to } from '../../github-app/analytical-data.fixtures.mjs';
import { createFakeGitHub } from '../qa/fixture.mjs';
import { runHistoryJob } from '../../github-app/history-jobs.mjs';

function fixture() {
  const github = createFakeGitHub();
  const configuration = { value: { repository: { defaults: { paths: { exclude: ['a.txt'] } } } }, origin: 'repository' };
  const retained = { ...record(), repositoryId: 1001 };
  retained.revisions = [{ ...retained.final, originalPolicyId: 'original-policy', originalBand: 'xl', desiredLabel: 'size/XL', observedLabel: 'size/XL' }];
  let failConfiguration = false, identity = { installation_id: 10 };
  const reader = (env = {}) => createPolicyReader({ repositoryConfiguration: async () => {
    if (failConfiguration) throw new Error('database unavailable');
    return configuration;
  } }, { repositoryIdentity: async () => identity,
    resolvePolicy: createPolicyResolver(env, { fetch: github.fetch, createJwt: async () => 'fixture.jwt.signature' }) });
  const service = policy => createAnalyticalDataService({ store: { analyticalRecords: async () => [retained], analyticalSizes: async () => [] },
    authorize: async ({ repositoryId, actor }) => actor.authorizedRepositoryIds.includes(repositoryId),
    entitlement: async () => 'free', namespace: async () => 7001, currentPolicy: request => policy.current(request) });
  const query = { version: 1, surface: 'prs', repositoryIds: [1001], from, to, scope: { kind: 'repository', repositoryId: 1001 } };
  const actor = { userId: 123, authorizedRepositoryIds: [1001] };
  return { github, configuration, retained, reader, service, query, actor, failConfiguration: () => { failConfiguration = true; }, missingIdentity: () => { identity = null; } };
}

test('analytics uses trusted file precedence, reuses one acquisition and changes current interpretation without rewriting originals', async () => {
  const f = fixture(), original = structuredClone(f.retained);
  const absent = await f.reader().current({ repositoryId: 1001 });
  assert.equal(absent.origin, 'stored');
  f.github.state.policyFiles.set('parser-guild/parser-lab', 'version: 1\ndefaults: { paths: { exclude: [] } }\n');
  const reader = f.reader();
  const before = f.github.calls.length;
  const [one, two] = await Promise.all([reader.current({ repositoryId: 1001 }), reader.current({ repositoryId: 1001 })]);
  assert.equal(one, two);
  assert.equal(f.github.calls.length - before, 4, 'one credential, repository, head and policy read for the request');
  assert.equal(one.origin, 'trusted-base');
  assert.equal(one.trustedHead, 'a'.repeat(40));
  const first = await f.service(reader).query(f.query, f.actor);
  assert.equal(first.result.pullRequests[0].changed.lower, 1);
  assert.equal(first.policies[0].requestedId, one.id);
  assert.match(first.policies[0].sourceIdentity, /\.diffdevil\.yml@/u);
  f.github.state.policyHead = 'c'.repeat(40);
  f.github.state.policyFiles.set('parser-guild/parser-lab', 'version: 1\ndefaults: { paths: { exclude: [a.txt] } }\n');
  const second = await f.service(f.reader()).query(f.query, f.actor);
  assert.equal(second.result.pullRequests[0].changed.lower, 0);
  assert.notEqual(second.policies[0].requestedId, first.policies[0].requestedId);
  assert.equal(second.policies[0].trustedHead, 'c'.repeat(40));
  assert.deepEqual(f.retained, original);
  assert.ok(f.github.state.installationTokens.every(value => value.repositoryIds.length === 1 && value.repositoryIds[0] === 1001));
  assert.ok(f.github.state.installationTokens.every(value => value.permissions.contents === 'read'));
  assert.ok(f.github.calls.every(call => call.method === 'GET' || call.path.endsWith('/access_tokens')), 'no GitHub data writes');
});

test('positive absence may fall back; provider, parsing, stored reads and unknown installations cannot', async () => {
  const f = fixture();
  const absent = await f.reader().current({ repositoryId: 1001 });
  assert.ok(absent.compiled);
  for (const supplied of [403, 503, 'version: [broken']) {
    f.github.state.policyFiles.set('parser-guild/parser-lab', supplied);
    const data = await f.service(f.reader()).query(f.query, f.actor);
    assert.equal(data.policies[0].standing, 'unfiltered-base-facts');
    assert.equal(data.policies[0].reason, 'trusted-policy-unavailable');
    assert.equal(data.policies[0].requestedId, null);
    assert.equal(data.result.pullRequests[0].changed.lower, 1, 'retained measurements survive');
    assert.equal(data.result.pullRequests[0].policy.basis, 'unfiltered-base-facts');
  }
  f.failConfiguration();
  const before = f.github.calls.length;
  assert.equal((await f.reader().current({ repositoryId: 1001 })).reason, 'stored-configuration-unavailable');
  assert.equal(f.github.calls.length, before);
  const other = fixture(); other.missingIdentity();
  assert.equal((await other.reader().current({ repositoryId: 1001 })).reason, 'installation-unavailable');
});

test('a successful policy read followed by a missing referenced template is unavailable, never a fallback', async () => {
  const f = fixture();
  f.github.state.policyFiles.set('parser-guild/parser-lab', 'version: 1\nrules:\n  notice:\n    when: "true"\n    effects:\n      comment: { mode: upsert, templateFile: missing.md }\n');
  const policy = await f.reader().current({ repositoryId: 1001 });
  assert.equal(policy.compiled, null);
  assert.equal(policy.reason, 'trusted-policy-unavailable');
  assert.equal(policy.code, 'E_GITHUB_REQUEST');
  assert.ok(f.github.calls.some(call => call.path === '/repos/parser-guild/parser-lab/contents/missing.md'), 'a valid top-level policy reaches the referenced-template 404');
});

test('missing App credentials leave interpretation unavailable before any provider request', async () => {
  const f = fixture();
  const reader = createPolicyReader({ repositoryConfiguration: async () => f.configuration }, {
    repositoryIdentity: async () => ({ installation_id: 10 }),
    resolvePolicy: createPolicyResolver({}, { fetch: f.github.fetch })
  });
  const data = await f.service(reader).query(f.query, f.actor);
  assert.equal(data.policies[0].requestedId, null);
  assert.equal(data.policies[0].reason, 'trusted-policy-unavailable');
  assert.equal(data.result.pullRequests[0].changed.lower, 1);
  assert.equal(f.github.calls.length, 0);
});

test('an inaccessible repository is refused before trusted policy acquisition', async () => {
  const f = fixture();
  await assert.rejects(f.service(f.reader()).query(f.query, { ...f.actor, authorizedRepositoryIds: [] }), { code: 'E_APP_DATA_UNAUTHORIZED' });
  assert.equal(f.github.calls.length, 0);
});

test('recalculation retains the policy actually resolved and fails honestly without relabelling an earlier receipt', async () => {
  const f = fixture(), repositoryId = 1001;
  const head = 'a'.repeat(40);
  const run = async reader => {
    const job = { jobId: 'fixture-job', repositoryId, kind: 'recalculate', sequence: 0, cursor: { targets: [], index: 0, capture: { revision: head, since: from } }, progress: {} };
    let receipt;
    const jobs = { claim: async () => job, finish: async (_, state, result) => { receipt = { state, ...result }; } };
    const store = { historySettings: async () => ({ enabled: true }), analyticalRecords: async () => [f.retained],
      analyticalSizesAt: async () => [{ path: 'a.txt', size: 100, captured: true }] };
    const client = { json: async route => route.startsWith('/repositories/') ? { id: repositoryId, full_name: 'parser-guild/parser-lab', default_branch: 'main' } : { commit: { sha: head } } };
    await runHistoryJob({ jobId: job.jobId, repositoryId, action: 'recalculate', sequence: 0 }, { jobs, store, clientFor: async () => client, currentPolicy: id => reader.current({ repositoryId: id }) });
    return receipt;
  };
  f.github.state.policyFiles.set('parser-guild/parser-lab', 'version: 1\ndefaults: { paths: { exclude: [] } }\n');
  const first = await run(f.reader()), saved = structuredClone(first);
  assert.equal(first.state, 'complete');
  assert.equal(first.progress.basis, 'current-policy');
  assert.equal(first.progress.policy.trustedHead, head);
  assert.equal(first.policyId, (await f.reader().current({ repositoryId })).id);
  f.github.state.policyHead = 'c'.repeat(40);
  f.github.state.policyFiles.set('parser-guild/parser-lab', 'version: 1\ndefaults: { paths: { exclude: [a.txt] } }\n');
  const changed = await run(f.reader());
  assert.equal(changed.state, 'complete');
  assert.equal(changed.progress.policy.trustedHead, 'c'.repeat(40));
  assert.notEqual(changed.policyId, first.policyId);
  f.github.state.policyFiles.set('parser-guild/parser-lab', 503);
  const failed = await run(f.reader());
  assert.equal(failed.state, 'failed');
  assert.equal(failed.reason, 'E_EFFECTIVE_POLICY_UNAVAILABLE');
  assert.equal(failed.progress.policy.id, null);
  assert.deepEqual(first, saved);
});
