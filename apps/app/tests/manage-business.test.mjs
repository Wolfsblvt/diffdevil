// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The Manage console's Business coordination against the real local D1 and the authorization service: named linked
 * policies by revision, linking (which applies the current revision as the repository's App settings), publishing
 * with the result kept per repository (applied, partly, queued behind in-flight work, failed, retried), automatic
 * setup of a newly granted repository through the managed runtime's lifecycle path, delegated administration only
 * where the delegate can write on GitHub and only on Business, funding that makes nobody an administrator, and the
 * administrative record every action leaves. Nothing here reaches GitHub or Works; the Works stand-in says which
 * namespaces are on Business.
 */
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { after, test } from 'node:test';
import { loadManage, coordinatesNamespace } from '../src/lib/manage/model.mjs';
import { handleManageAction, MESSAGES } from '../src/lib/manage/actions.mjs';
import { effectiveConfiguration } from '../src/lib/manage/configuration.mjs';
import { pathsSetBy, summarizePublication, readLinkedPolicy, applyRevision } from '../src/lib/manage/linked-policies.mjs';
import { presentEvent, resultOfMessage, fmtWhen } from '../src/lib/manage/audit.mjs';
import { delegationReaches, presentDelegations, LOGIN } from '../src/lib/manage/people.mjs';
import { SESSION_COOKIE, openSession } from '../src/lib/routes.mjs';
import { resolveViewer } from '../src/lib/viewer.mjs';
import { ACCOUNTS } from '../qa/fixture.mjs';
import { fixture, disposeFixture, signIn, ORIGIN } from './support.mjs';

after(disposeFixture);

const BUSINESS = JSON.stringify({ account: 123, linked: true, since: '2026-10-02', commercial: { standing: 'funded', tier: 'business', cadence: 'annual', period: { started_on: '2026-03-14', ends_on: '2027-03-14' }, renewal_preference: 'automatic', cancellation_intent: 'none', grace: null, ended: null, next_renewal: { on: '2027-03-14', total_cents: 49000, currency: 'EUR', tax_inclusive: true } }, protection: { kind: 'beta' }, capacity: [{ slot: 'slot-included', funding: 'included', binding: { organisationId: 7001, authority: 'present', display: 'parser-guild' } }], others: { 7002: 'business' } });
const PRO_WITH_PRO_NEIGHBOUR = JSON.stringify({ account: 123, linked: true, since: '2026-10-02', commercial: { standing: 'funded', tier: 'pro', cadence: 'annual', period: { started_on: '2026-03-14', ends_on: '2027-03-14' }, renewal_preference: 'automatic', cancellation_intent: 'none', grace: null, ended: null, next_renewal: { on: '2027-03-14', total_cents: 18000, currency: 'EUR', tax_inclusive: true } }, protection: { kind: 'beta' }, capacity: [], others: { 7002: 'pro' } });
const POLICY = 'version: 1\npresets: [size@1]\nscopes:\n  generated: { exclude: ["**/*.snap"] }\n';

async function locals(app, cookie) {
  const opened = await openSession(new Request(`${ORIGIN}/manage`, { headers: { cookie: `${SESSION_COOKIE}=${cookie}` } }), app);
  assert.ok(!('refusal' in opened), `session refused: ${opened.refusal}`);
  const viewer = await resolveViewer({ reads: opened.reads, actor: opened.actor, store: app.store, entitlement: app.entitlement, cache: app.cache });
  return { runtime: app, session: opened, viewer };
}
async function act(app, cookie, fields) {
  const response = await handleManageAction(new Request(`${ORIGIN}/manage/do`, { method: 'POST', headers: { cookie: `${SESSION_COOKIE}=${cookie}`, origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields) }), await locals(app, cookie));
  assert.equal(response.status, 303, `${fields.action}: ${response.status}`);
  const location = new URL(response.headers.get('location'), ORIGIN);
  return { location, message: location.searchParams.get('m'), params: location.searchParams };
}
async function model(app, cookie) { const context = await locals(app, cookie); return { ...context, model: await loadManage({ viewer: context.viewer, session: context.session, runtime: app }) }; }
const guild = String(ACCOUNTS['parser-guild']);
/** A GitHub App key for the runtime's installation credential; the GitHub double accepts any App JWT it signs. */
const APP_KEY = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs1', format: 'pem' });

test('the pure parts: a policy document is read with the engine, paths it sets are named, publications summarise, roles reach, and events present', () => {
  const parsed = readLinkedPolicy(POLICY);
  assert.deepEqual(Object.keys(parsed.configuration).sort(), ['presets', 'scopes']);
  assert.deepEqual(pathsSetBy(parsed.configuration), ['presets', 'scopes.generated']);
  assert.throws(() => readLinkedPolicy('version: 1\nbrief: { mode: standard }\n'));
  const publication = { results: [{ state: 'applied' }, { state: 'partly' }, { state: 'queued' }, { state: 'failed' }] };
  const summary = summarizePublication(publication);
  assert.equal(summary.result, 'queued'); assert.equal(summary.text, '2 of 4 applied, 1 queued, 1 failed.'); assert.equal(summary.retryable, true);
  assert.equal(summarizePublication({ results: [] }).text, 'No repository was linked; nothing to publish.');
  assert.equal(summarizePublication({ results: [{ state: 'applied' }] }).text, 'Applied to its one repository.');
  assert.equal(delegationReaches({ role: 'account-admin' }, 1), true);
  assert.equal(delegationReaches({ role: 'repository-admin', repositories: [2] }, 1), false);
  assert.equal(delegationReaches(null, 1), false);
  assert.ok(LOGIN.test('octo-cat')); assert.ok(!LOGIN.test('-octo')); assert.ok(!LOGIN.test('a'.repeat(40)));
  const rows = presentDelegations([{ accountId: 7001, userId: 456, login: 'kai-sample', role: 'repository-admin', repositories: [1001, 9999], grantedAt: '2026-10-10T10:00:00.000Z', grantedBy: 123 }], { repositories: [{ repositoryId: 1001, name: 'parser-lab' }], viewerId: 123 });
  assert.equal(rows[0].roleLabel, 'Repository administrator'); assert.equal(rows[0].scope, 'parser-lab, repository 9999'); assert.equal(rows[0].grantedByLogin, 'you');
  assert.deepEqual(resultOfMessage(MESSAGES, 'enabled'), { result: 'applied', reason: null });
  assert.equal(resultOfMessage(MESSAGES, 'allowance-full').result, 'failed');
  const shown = presentEvent({ at: '2026-10-10T14:02:00.000Z', actor: { kind: 'automation', id: 123 }, where: 'parser-guild', what: 'Automatic setup', result: 'applied', reason: null }, { logins: new Map([[123, 'ada-sample']]), viewerId: 123 });
  assert.equal(shown.when, '10 Oct 2026 14:02'); assert.equal(shown.who, 'automatic setup (chosen by ada-sample)'); assert.equal(shown.result, 'Applied');
  assert.equal(presentEvent({ at: 'x', actor: { kind: 'unknown' }, where: 'w', what: 'y', result: 'observed' }).who, 'unknown');
  assert.equal(fmtWhen(undefined), 'unknown');
});

test('on Business a named policy is created by revision, linking applies it as the repository\'s App settings, and publishing keeps a result per repository that Retry attempts again', async () => {
  const { app: compose } = await fixture();
  const app = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: BUSINESS } });
  const { cookie } = await signIn(app);
  let { model: loaded } = await model(app, cookie);
  assert.equal(loaded.viewerPlan, 'Business'); assert.equal(loaded.coordinates, true);
  assert.deepEqual(loaded.businessScopes.map(namespace => namespace.login), ['ada-sample', 'parser-guild']);
  assert.ok(coordinatesNamespace(loaded.businessScopes[1]));
  // Create, refuse a duplicate name, refuse an invalid document, save a revision, refuse a stale save.
  const created = await act(app, cookie, { action: 'policy-create', namespace: guild, namespaceLogin: 'parser-guild', name: 'Default', document: POLICY, back: '/manage/policies' });
  assert.equal(created.message, 'policy-created');
  const policyId = created.params.get('policy');
  assert.match(policyId, /^[0-9a-f]{24}$/u);
  assert.equal((await act(app, cookie, { action: 'policy-create', namespace: guild, name: 'Default', document: POLICY, back: '/manage/policies' })).message, 'policy-name-taken');
  assert.equal((await act(app, cookie, { action: 'policy-create', namespace: guild, name: 'Broken', document: 'version: 1\nbrief: {}\n', back: '/manage/policies' })).message, 'policy-invalid');
  assert.equal((await act(app, cookie, { action: 'policy-save', policy: policyId, revision: '1', document: 'version: 1\npresets: [size@1]\nscopes:\n  generated: { exclude: ["**/*.snap", "**/*.lock"] }\n', back: '/manage/policies' })).message, 'policy-saved');
  assert.equal((await act(app, cookie, { action: 'policy-save', policy: policyId, revision: '1', document: POLICY, back: '/manage/policies' })).message, 'stale');
  const policy = await app.manage.linkedPolicy(policyId);
  assert.equal(policy.revision, 2); assert.equal(policy.name, 'Default'); assert.equal(policy.accountId, 7001);
  // A personal-namespace policy cannot be linked to an organisation repository; a Pro namespace cannot coordinate at all.
  const personal = await act(app, cookie, { action: 'policy-create', namespace: '123', namespaceLogin: 'ada-sample', name: 'Mine', document: POLICY, back: '/manage/policies' });
  assert.equal((await act(app, cookie, { action: 'policy-link', policy: personal.params.get('policy'), repository: 'parser-guild/parser-lab', back: '/manage/policies' })).message, 'policy-mismatch');
  // Linking applies revision 2 at once; the chain names the linked policy; the stored settings are the policy's.
  assert.equal((await act(app, cookie, { action: 'policy-link', policy: policyId, repository: 'parser-guild/parser-lab', back: '/manage/policies' })).message, 'policy-linked');
  const link = await app.manage.policyLink(1001);
  assert.equal(link.policyId, policyId); assert.equal(link.appliedRevision, 2);
  const admission = (await app.auth.readAdmission({ session: cookie, repositoryId: 1001 })).body;
  assert.deepEqual(admission.configuration.value.repository.scopes.generated.exclude, ['**/*.snap', '**/*.lock']);
  ({ model: loaded } = await model(app, cookie));
  const configuration = effectiveConfiguration({ admission, namespace: loaded.namespaces.find(namespace => namespace.login === 'parser-guild'), login: 'parser-guild', link: { name: 'Default', revision: 2, appliedRevision: 2 } });
  assert.ok(configuration.chain.some(layer => layer.key === 'repository' && layer.label === 'linked policy Default · rev 2'));
  assert.ok(configuration.rows.some(row => row.key === 'scopes.generated' && row.from === 'repository'));
  // The published revision is the sole runtime policy: a saved namespace default cannot secretly override it.
  await app.manage.saveNamespaceDefault(7001, { configuration: { scopes: { unrelated: { exclude: ['**/*.lock'] } } }, policyId: 'unused-default', expectedRevision: 0 });
  const currentPolicy = await app.policies.current({ repositoryId: 1001 });
  assert.equal(currentPolicy.basis, 'stored-app-configuration');
  assert.equal(currentPolicy.id, configuration.policyId);
  // Link a second repository, then hold it busy with an active delivery: publishing applies one and queues the other.
  assert.equal((await act(app, cookie, { action: 'policy-link', policy: policyId, repository: 'parser-guild/grammar-fuzz', back: '/manage/policies' })).message, 'policy-linked');
  assert.equal((await act(app, cookie, { action: 'policy-save', policy: policyId, revision: '2', document: POLICY, back: '/manage/policies' })).message, 'policy-saved');
  const claim = await app.appStore.claimDelivery({ deliveryId: 'business-test-busy', installationId: 10, repositoryId: 1003, pullRequest: 77 });
  assert.equal(claim.kind, 'claimed');
  assert.equal((await app.manage.repositoryBusy(1003)).busy, true);
  const published = await act(app, cookie, { action: 'policy-publish', policy: policyId, back: '/manage/policies' });
  assert.equal(published.message, 'policy-published-partly');
  const publicationId = published.params.get('publication');
  let publication = await app.manage.publication(publicationId);
  assert.equal(publication.revision, 3);
  assert.deepEqual(Object.fromEntries(publication.results.map(result => [result.repositoryId, result.state])), { 1001: 'applied', 1003: 'queued' });
  assert.match(publication.results.find(result => result.repositoryId === 1003).reason, /Waiting behind a pull request is being evaluated/u);
  assert.equal((await app.manage.policyLink(1001)).appliedRevision, 3);
  assert.equal((await app.manage.policyLink(1003)).appliedRevision, 2, 'the queued repository keeps the revision it took when linked');
  // The delivery finishes; Retry applies the queued one and leaves the applied one alone.
  await app.appStore.database.prepare("UPDATE deliveries SET state='complete', lease_until=NULL WHERE delivery_id='business-test-busy'").run();
  const { job } = await app.jobs.request({ repositoryId: 1003, installationId: 10, kind: 'import', actorId: 123 });
  assert.deepEqual(await app.manage.repositoryBusy(1003), { busy: true, reason: 'a history job is in progress' });
  await act(app, cookie, { action: 'policy-retry', publication: publicationId, back: '/manage/policies' });
  assert.equal((await app.manage.publication(publicationId)).results.find(result => result.repositoryId === 1003).state, 'queued');
  const claimedJob = await app.jobs.claim(job.jobId, job.sequence);
  assert.ok(claimedJob);
  await app.jobs.finish(claimedJob, 'complete');
  assert.equal((await act(app, cookie, { action: 'policy-retry', publication: publicationId, back: '/manage/policies' })).message, 'policy-retried');
  publication = await app.manage.publication(publicationId);
  assert.deepEqual(Object.fromEntries(publication.results.map(result => [result.repositoryId, result.state])), { 1001: 'applied', 1003: 'applied' });
  assert.equal(publication.results.find(result => result.repositoryId === 1001).attempts, 1, 'an applied repository is not attempted again');
  assert.equal((await app.manage.policyLink(1003)).appliedRevision, 3);
  // Unlinking keeps the settings as plain repository settings; a removed policy unlinks everything.
  assert.equal((await act(app, cookie, { action: 'policy-unlink', repository: 'parser-guild/grammar-fuzz', back: '/manage/policies' })).message, 'policy-unlinked');
  assert.equal(await app.manage.policyLink(1003), null);
  assert.deepEqual((await app.appStore.repositoryAdmission(1003)).configuration.value.repository.presets, ['size@1'], 'the last applied revision stays');
  assert.equal((await act(app, cookie, { action: 'policy-remove', policy: policyId, back: '/manage/policies' })).message, 'policy-removed');
  assert.equal(await app.manage.policyLink(1001), null);
  assert.equal(await app.manage.linkedPolicy(policyId), null);
  // A Pro viewer cannot coordinate.
  const pro = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: PRO_WITH_PRO_NEIGHBOUR } });
  const { cookie: proCookie } = await signIn(pro);
  assert.equal((await act(pro, proCookie, { action: 'policy-create', namespace: '123', name: 'Nope', document: POLICY, back: '/manage/policies' })).message, 'not-business');
  // The record kept it all, as it happened, with the acting person.
  const events = await app.manage.events({ accountIds: [7001], limit: 50 });
  const whats = events.map(event => `${event.what} → ${event.result}`);
  assert.ok(whats.includes('Created the policy Default (revision 1) → applied'), whats.join('\n'));
  assert.ok(whats.some(what => /^Published Default revision 3 → queued$/u.test(what)), whats.join('\n'));
  assert.ok(whats.some(what => /^Publish Default revision 3 → queued$/u.test(what)), 'the queued repository has its own row');
  assert.ok(whats.includes('Linked to the policy Default (revision 2) → applied'));
  assert.ok(whats.includes('Removed the policy Default → applied'));
  assert.ok(events.every(event => event.actor.kind === 'person' && event.actor.id === 123 && event.actor.login === 'ada-sample'));
  await act(app, cookie, { action: 'policy-remove', policy: personal.params.get('policy'), back: '/manage/policies' });
});

test('automatic setup links the chosen policy, selects and enables a newly granted repository through the lifecycle path, never turns on history, and acts for its chooser only under the role they chose it as and the access GitHub gives that account now', async () => {
  const { app: compose, github } = await fixture();
  // The App's own installation credential (a generated key; the GitHub double accepts any App JWT) reads the chooser's account and permission.
  const app = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: BUSINESS, GITHUB_APP_ID: '4242', GITHUB_APP_PRIVATE_KEY: APP_KEY } });
  const { cookie } = await signIn(app);
  const setupEvent = async repositoryId => (await app.manage.events({ accountIds: [7001], limit: 80 })).find(event => event.what === 'Automatic setup of a newly granted repository' && event.repositoryId === repositoryId);
  const grant = async (...repositories) => {
    for (const [repositoryId, name] of repositories) github.state.extraRepositories.push({ repositoryId, installationId: 10, fullName: `parser-guild/${name}`, private: true, admin: false });
    await app.appStore.recordLifecycle({ installationId: 10, action: 'added', addedRepositories: repositories.map(([repositoryId]) => repositoryId), removedRepositories: [] });
  };
  const answer = (repositoryId, value, login = 'ada-sample') => github.state.collaborators.set(`${repositoryId}:${login}`, value);
  const held = async (repositoryId, pattern) => {
    const [outcome] = await app.automaticSetup({ installationId: 10, repositoryIds: [repositoryId] });
    assert.equal(outcome.state, 'held');
    const event = await setupEvent(repositoryId);
    assert.ok(event.result === 'failed' && pattern.test(event.reason) && /waits for a person; nothing was set up/u.test(event.reason), event.reason);
    assert.equal((await app.appStore.repositoryAdmission(repositoryId)).execution.reason, 'never-enabled', 'a held repository is left exactly as granted');
    assert.ok(!(await app.manage.policyLink(repositoryId)) && !(await app.manage.selection(repositoryId)), 'nothing was linked or selected');
    return event;
  };
  try {
    const created = await act(app, cookie, { action: 'policy-create', namespace: guild, name: 'Quarry', document: POLICY, back: '/manage/policies' });
    const policyId = created.params.get('policy');
    assert.equal((await act(app, cookie, { action: 'setup-save', namespace: guild, policy: policyId, enable: 'on', back: '/manage/policies' })).message, 'writer-undeclared');
    assert.equal((await act(app, cookie, { action: 'setup-save', namespace: guild, policy: policyId, enable: 'on', writer: 'declared', back: '/manage/policies' })).message, 'setup-saved');
    let setup = await app.manage.automaticSetup(7001);
    assert.equal(setup.policyId, policyId); assert.equal(setup.enableExecution, true); assert.equal(setup.writerDeclared, true);
    assert.deepEqual([setup.actorId, setup.actorLogin, setup.actorRole], [123, 'ada-sample', 'owner'], 'the choice keeps who made it and as what');
    // As the namespace's administrator on GitHub: GitHub's administration of grammar-fuzz sets it up. parser-lab runs already: it waits.
    answer(1003, { permission: 'admin' });
    let outcomes = await app.automaticSetup({ installationId: 10, repositoryIds: [1003, 1001] });
    assert.deepEqual(outcomes.map(outcome => [outcome.repositoryId, outcome.state]), [[1003, 'applied'], [1001, 'skipped']]);
    assert.deepEqual(github.state.installationTokens.at(-1), { installationId: 10, repositoryIds: [1003], permissions: { metadata: 'read' } }, 'the permission read uses a Metadata-read credential scoped to that repository');
    const after = await app.appStore.repositoryAdmission(1003);
    assert.equal(after.state, 'active'); assert.equal(after.execution.reason, null); assert.equal(after.execution.origin, 'automatic-setup'); assert.equal(after.execution.actorId, 123);
    assert.equal(after.writer.confidence, 'administrator-declared');
    assert.equal(after.history.enabled, false, 'history is never turned on by setup');
    assert.deepEqual(after.configuration.value.repository.scopes.generated.exclude, ['**/*.snap']);
    assert.equal((await app.manage.policyLink(1003)).policyId, policyId);
    assert.ok(await app.manage.selection(1003));
    assert.match((await setupEvent(1003)).reason, /linked to Quarry \(revision 1\), selected, labels and the check enabled\. History and the pull-request message stay off/u);
    assert.equal((await setupEvent(1001)).result, 'failed');
    // Every answer short of the chooser's current authority holds the one repository, with its reason.
    await grant([1101, 'quarry-a'], [1102, 'quarry-b']);
    await held(1101, /GitHub does not confirm that ada-sample, who chose automatic setup, has access to this repository/u);
    answer(1101, { status: 502 });
    await held(1101, /GitHub could not be asked whether ada-sample, who chose automatic setup, may act on this repository \(E_GITHUB_REQUEST\)/u);
    answer(1101, { permission: 'admin', id: 999 });
    await held(1101, /names a different account than the one that chose automatic setup/u);
    answer(1101, { permission: 'none' });
    await held(1101, /GitHub gives them no access on this repository, not administration/u);
    answer(1101, { permission: 'write' });
    await held(1101, /chose automatic setup as an administrator of this namespace on GitHub, and GitHub gives them write on this repository, not administration/u);
    // Renamed: the stable id finds the person under their new login, and the name people see follows.
    github.state.logins.set(123, 'ada-renamed');
    answer(1101, { permission: 'admin' }, 'ada-renamed');
    // Recycled: someone else now holds the old login with administration; it is never asked about.
    answer(1102, { permission: 'admin', id: 777 }, 'ada-sample');
    outcomes = await app.automaticSetup({ installationId: 10, repositoryIds: [1101, 1102] });
    assert.deepEqual(outcomes.map(outcome => [outcome.repositoryId, outcome.state]), [[1101, 'applied'], [1102, 'held']]);
    assert.match((await setupEvent(1102)).reason, /GitHub does not confirm that ada-renamed, who chose automatic setup/u);
    assert.equal((await app.manage.automaticSetup(7001)).actorLogin, 'ada-renamed');
    // Gone: GitHub knows no account with that id.
    github.state.logins.set(123, null);
    await held(1102, /GitHub no longer knows the account of ada-renamed, who chose automatic setup\. Choose it again\./u);
    github.state.logins.delete(123);
    // The administration lapses on GitHub: chosen again as a named Account administrator, it needs the delegation and write.
    github.state.roles.set('parser-guild', 'member');
    for (const repositoryId of [1001, 1002, 1003]) github.state.admin.set(repositoryId, false);
    await app.manage.grantDelegation({ accountId: 7001, userId: 123, login: 'ada-sample', role: 'account-admin', repositories: null, grantedBy: 999 });
    app.cache.clear();
    assert.equal((await act(app, cookie, { action: 'setup-save', namespace: guild, policy: policyId, enable: 'on', writer: 'declared', back: '/manage/policies' })).message, 'setup-saved');
    setup = await app.manage.automaticSetup(7001);
    assert.deepEqual([setup.actorLogin, setup.actorRole], ['ada-sample', 'account-admin']);
    await grant([1103, 'quarry-c'], [1104, 'quarry-d']);
    answer(1103, { permission: 'write' }); answer(1104, { permission: 'read' });
    outcomes = await app.automaticSetup({ installationId: 10, repositoryIds: [1103, 1104, 1001] });
    assert.deepEqual(outcomes.map(outcome => [outcome.repositoryId, outcome.state]), [[1103, 'applied'], [1104, 'held'], [1001, 'skipped']], 'mixed: write applies, read holds, an operated repository waits');
    assert.match((await setupEvent(1104)).reason, /GitHub gives ada-sample, who chose automatic setup as Account administrator, read access only on this repository, not write/u);
    // Removed as Account administrator: the choice stops even where GitHub makes them administrator of the repository.
    await app.manage.revokeDelegation(7001, 123);
    answer(1104, { permission: 'admin' });
    const before = github.state.installationTokens.length;
    await held(1104, /ada-sample chose automatic setup as Account administrator and is no longer one here\. Choose it again\./u);
    assert.equal(github.state.installationTokens.length, before, 'a removed Account administrator is held before GitHub is asked');
    // A deployment without App credentials cannot ask GitHub, and holds rather than acting.
    await app.manage.grantDelegation({ accountId: 7001, userId: 123, login: 'ada-sample', role: 'account-admin', repositories: null, grantedBy: 999 });
    const bare = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: BUSINESS } });
    assert.equal((await bare.automaticSetup({ installationId: 10, repositoryIds: [1104] }))[0].state, 'held');
    assert.match((await setupEvent(1104)).reason, /This deployment cannot ask GitHub whether ada-sample, who chose automatic setup, may act on this repository/u);
    const events = (await app.manage.events({ accountIds: [7001], limit: 80 })).filter(event => event.what === 'Automatic setup of a newly granted repository');
    assert.ok(events.every(event => event.actor.kind === 'automation' && event.actor.id === 123));
    assert.equal((await act(app, cookie, { action: 'setup-off', namespace: guild, back: '/manage/policies' })).message, 'setup-off');
    assert.equal(await app.manage.automaticSetup(7001), null);
    await act(app, cookie, { action: 'policy-remove', policy: policyId, back: '/manage/policies' });
  } finally {
    await app.manage.revokeDelegation(7001, 123);
    github.state.collaborators.clear(); github.state.extraRepositories.length = 0; github.state.installationTokens.length = 0; github.state.logins.clear();
    github.state.roles.clear(); github.state.admin.clear(); app.cache.clear();
    // Restore the fixture's standing for the other cases.
    await act(app, cookie, { action: 'stop', repository: 'parser-guild/grammar-fuzz', back: '/manage/repositories' }).catch(() => {});
  }
});

test('a coordinator sees who automatic setup acts for and what it left waiting, the remover is told when it stops, and choosing it again makes it theirs', async () => {
  const { app: compose, clock } = await fixture();
  const app = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: BUSINESS } });
  const { cookie } = await signIn(app);
  const saved = clock.value;
  try {
    // kai-sample, named Account administrator of parser-guild, chose automatic setup (a minute on, so earlier cases' records predate it).
    clock.value = new Date(Date.parse(saved) + 60_000).toISOString();
    await app.manage.grantDelegation({ accountId: 7001, userId: 456, login: 'kai-sample', role: 'account-admin', repositories: null, grantedBy: 123 });
    await app.manage.saveAutomaticSetup(7001, { enableExecution: true, writerDeclared: true, actorId: 456, actorLogin: 'kai-sample', actorRole: 'account-admin' });
    // ada-sample, parser-guild's GitHub administrator, removes kai-sample: she is told the setup now waits.
    const removed = await act(app, cookie, { action: 'delegate-remove', namespace: guild, user: '456', back: '/manage/people' });
    assert.equal(removed.message, 'delegate-removed-setup');
    assert.match(MESSAGES['delegate-removed-setup'].text, /new repositories now wait until someone chooses it again/u);
    assert.ok((await app.manage.events({ accountIds: [7001], limit: 10 })).some(event => event.what === 'Removed kai-sample as Account administrator' && /Automatic setup was chosen by kai-sample/u.test(event.reason ?? '')));
    // A new repository arrives: held. The coordinator's model, Needs you and the setup row carry it.
    await app.appStore.recordLifecycle({ installationId: 10, action: 'added', addedRepositories: [1201], removedRepositories: [] });
    assert.equal((await app.automaticSetup({ installationId: 10, repositoryIds: [1201] }))[0].state, 'held');
    app.cache.clear();
    let { model: loaded } = await model(app, cookie);
    const scope = loaded.businessScopes.find(namespace => namespace.login === 'parser-guild');
    assert.deepEqual([scope.automaticSetup.actorLogin, scope.automaticSetup.actorRole, scope.automaticSetup.held.count], ['kai-sample', 'account-admin', 1]);
    assert.match(scope.automaticSetup.held.reason, /kai-sample chose automatic setup as Account administrator and is no longer one here/u);
    const item = loaded.attention.find(candidate => candidate.title === 'Automatic setup in parser-guild left a new repository waiting');
    assert.ok(item && /It acts for kai-sample, and couldn't here/u.test(item.detail) && /Choose it again so it acts for you/u.test(item.detail) && item.href === '/manage/policies?ns=parser-guild#automatic-setup', JSON.stringify(item));
    // ada-sample chooses it again: it acts for her, and what the earlier choice held no longer counts against it.
    clock.value = new Date(Date.parse(saved) + 120_000).toISOString();
    assert.equal((await act(app, cookie, { action: 'setup-save', namespace: guild, enable: 'on', writer: 'declared', back: '/manage/policies' })).message, 'setup-saved');
    const setup = await app.manage.automaticSetup(7001);
    assert.deepEqual([setup.actorId, setup.actorLogin, setup.actorRole], [123, 'ada-sample', 'owner']);
    app.cache.clear();
    ({ model: loaded } = await model(app, cookie));
    assert.equal(loaded.businessScopes.find(namespace => namespace.login === 'parser-guild').automaticSetup.held.count, 0);
    assert.equal(loaded.attention.some(candidate => /^Automatic setup in parser-guild/u.test(candidate.title)), false);
    assert.ok((await app.manage.events({ accountIds: [7001], limit: 5 })).some(event => /^Chose automatic setup as administrator on GitHub/u.test(event.what)));
    // An Account administrator chooses setup too, saved under that role; they still cannot name people.
    await app.manage.grantDelegation({ accountId: 7002, userId: 123, login: 'ada-sample', role: 'account-admin', repositories: null, grantedBy: 999 });
    app.cache.clear();
    const northwindId = String(ACCOUNTS['northwind-tools']);
    assert.equal((await act(app, cookie, { action: 'setup-save', namespace: northwindId, enable: 'on', writer: 'declared', back: '/manage/policies' })).message, 'setup-saved');
    assert.equal((await app.manage.automaticSetup(7002)).actorRole, 'account-admin');
    assert.equal((await act(app, cookie, { action: 'delegate-add', namespace: northwindId, login: 'kai-sample', role: 'account-admin', back: '/manage/people' })).message, 'not-github-administrator');
  } finally {
    clock.value = saved;
    await app.manage.revokeDelegation(7001, 456); await app.manage.revokeDelegation(7002, 123);
    await app.manage.removeAutomaticSetup(7001); await app.manage.removeAutomaticSetup(7002); app.cache.clear();
  }
});

test('a named delegate manages diffdevil on a repository only while GitHub gives them write there: read-only is refused, write is allowed, narrowing to read holds it, revocation ends it, and only Business carries it', async () => {
  const { app: compose, github } = await fixture();
  const app = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: BUSINESS } });
  const { cookie } = await signIn(app);
  const brief = { action: 'brief', repository: 'northwind-tools/ci-recipes', mode: 'standard', historyWindowDays: '30', priority: 'activity,neighbours,companion', back: '/manage' };
  try {
    // ada-sample is a member of northwind-tools, not an administrator: its settings are refused.
    await assert.rejects(app.auth.readAdmission({ session: cookie, repositoryId: 1006 }), error => error.code === 'E_ADMISSION_UNAUTHORIZED');
    assert.equal((await act(app, cookie, { action: 'brief', repository: 'northwind-tools/ci-recipes', mode: 'off', back: '/manage' })).message, 'unauthorized');
    // northwind-tools' GitHub administrator names ada-sample Repository administrator of ci-recipes (written as that administrator would through the same store).
    await app.manage.grantDelegation({ accountId: 7002, userId: 123, login: 'ada-sample', role: 'repository-admin', repositories: [1006], grantedBy: 999 });
    // Read-only on GitHub: the delegation is refused for reading and for changing, with its own reason, and the model says why.
    github.state.push.set(1006, false);
    app.cache.clear();
    await assert.rejects(app.auth.readAdmission({ session: cookie, repositoryId: 1006 }), error => error.code === 'E_ADMISSION_WRITE_REQUIRED');
    assert.equal((await act(app, cookie, brief)).message, 'write-required');
    let { model: loaded } = await model(app, cookie);
    let northwind = loaded.namespaces.find(namespace => namespace.login === 'northwind-tools');
    assert.equal(northwind.repositories[0].state.readOnlyForYou, true);
    assert.match(northwind.repositories[0].state.why, /You can't change it: GitHub gives you read access here, not write\./u);
    assert.ok(loaded.attention.some(item => item.title === 'You can\'t manage diffdevil on northwind-tools/ci-recipes'), 'the Overview names what this person cannot manage and why');
    // Write on GitHub: the same delegation acts.
    github.state.push.delete(1006);
    app.cache.clear();
    assert.equal((await app.auth.readAdmission({ session: cookie, repositoryId: 1006 })).body.repositoryId, 1006);
    ({ model: loaded } = await model(app, cookie));
    northwind = loaded.namespaces.find(namespace => namespace.login === 'northwind-tools');
    assert.ok(northwind, 'the delegated namespace joins the administered ones');
    assert.deepEqual(northwind.administration, { kind: 'delegate', role: 'repository-admin', repositories: [1006] });
    assert.equal(northwind.funding.kind, 'delegated'); assert.equal(northwind.plan, 'Business');
    assert.equal(northwind.repositories[0].state.readOnlyForYou, undefined);
    assert.equal(loaded.readers.some(namespace => namespace.login === 'northwind-tools'), false);
    assert.equal(loaded.businessScopes.some(namespace => namespace.login === 'northwind-tools'), false, 'a Repository administrator does not coordinate');
    assert.equal((await act(app, cookie, brief)).message, 'brief-saved');
    assert.equal((await act(app, cookie, { action: 'policy-create', namespace: String(ACCOUNTS['northwind-tools']), name: 'X', document: POLICY, back: '/manage/policies' })).message, 'not-coordinator');
    // Narrowed from write to read: the next action is refused and kept with its reason; nothing is inherited from the App.
    github.state.push.set(1006, false);
    app.cache.clear();
    assert.equal((await act(app, cookie, brief)).message, 'write-required');
    const held = (await app.manage.events({ accountIds: [7002], limit: 20 })).find(event => event.result === 'failed' && event.repositoryId === 1006 && /E_ADMISSION_WRITE_REQUIRED/u.test(event.reason ?? ''));
    assert.ok(held && /read access to this repository, not write/u.test(held.reason), 'the held request is in the record');
    github.state.push.delete(1006);
    // An Account administrator coordinates policies and automatic setup, but does not name people.
    await app.manage.grantDelegation({ accountId: 7002, userId: 123, login: 'ada-sample', role: 'account-admin', repositories: null, grantedBy: 999 });
    app.cache.clear();
    ({ model: loaded } = await model(app, cookie));
    assert.ok(loaded.businessScopes.some(namespace => namespace.login === 'northwind-tools'));
    const northwindId = String(ACCOUNTS['northwind-tools']);
    assert.equal((await act(app, cookie, { action: 'delegate-add', namespace: northwindId, login: 'kai-sample', role: 'account-admin', back: '/manage/people' })).message, 'not-github-administrator');
    assert.equal(await app.manage.delegation(7002, 456), null);
    // Outside Business a delegation reaches nothing, even with write.
    const pro = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: PRO_WITH_PRO_NEIGHBOUR } });
    const { cookie: proCookie } = await signIn(pro);
    await assert.rejects(pro.auth.readAdmission({ session: proCookie, repositoryId: 1006 }), error => error.code === 'E_ADMISSION_UNAUTHORIZED', 'a delegation reaches nothing outside Business');
    const { model: proModel } = await model(pro, proCookie);
    assert.equal(proModel.namespaces.some(namespace => namespace.login === 'northwind-tools'), false);
    assert.equal(proModel.readers.find(namespace => namespace.login === 'northwind-tools').delegation.role, 'account-admin', 'the Overview says the delegation waits');
    // Revocation ends it at the next action, write access or not.
    await app.manage.revokeDelegation(7002, 123);
    app.cache.clear();
    await assert.rejects(app.auth.readAdmission({ session: cookie, repositoryId: 1006 }), error => error.code === 'E_ADMISSION_UNAUTHORIZED');
    assert.equal((await act(app, cookie, brief)).message, 'unauthorized');
    const northwindEvents = await app.manage.events({ accountIds: [7002], limit: 30 });
    const refused = northwindEvents.find(event => event.result === 'failed' && event.what === 'Saved the pull-request message settings' && /GitHub does not confirm/u.test(event.reason ?? ''));
    assert.ok(refused && refused.repositoryId === 1006, `the refused brief save is kept as a failed request: ${JSON.stringify(northwindEvents.map(event => [event.what, event.result]))}`);
    assert.ok(northwindEvents.some(event => event.result === 'failed' && /Only the namespace's administrator/u.test(event.reason ?? '')), 'a refused coordination attempt is kept too');
    assert.ok(northwindEvents.some(event => event.result === 'failed' && /Only a current GitHub administrator/u.test(event.reason ?? '')), 'a refused naming attempt is kept too');
  } finally { github.state.push.clear(); app.cache.clear(); }
});

test('funding makes nobody an administrator: only current GitHub administration names or removes people, and a publication across repositories keeps each one\'s own write ceiling', async () => {
  const { app: compose, github } = await fixture();
  const app = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: BUSINESS } });
  const { cookie } = await signIn(app);
  try {
    // ada-sample administers parser-guild on GitHub: naming by login resolves the GitHub user; unknown logins, oneself and an empty repository list are refused.
    assert.equal((await act(app, cookie, { action: 'delegate-add', namespace: guild, login: 'nobody-here', role: 'account-admin', back: '/manage/people' })).message, 'delegate-unknown');
    assert.equal((await act(app, cookie, { action: 'delegate-add', namespace: guild, login: 'ada-sample', role: 'account-admin', back: '/manage/people' })).message, 'delegate-self');
    assert.equal((await act(app, cookie, { action: 'delegate-add', namespace: guild, login: 'kai-sample', role: 'repository-admin', back: '/manage/people' })).message, 'delegate-no-repositories');
    assert.equal((await act(app, cookie, { action: 'delegate-add', namespace: guild, login: 'kai-sample', role: 'repository-admin', repositories: '1001', back: '/manage/people' })).message, 'delegate-added');
    const named = await app.manage.delegation(7001, 456);
    assert.equal(named.login, 'kai-sample'); assert.deepEqual(named.repositories, [1001]); assert.equal(named.grantedBy, 123);
    assert.equal((await act(app, cookie, { action: 'delegate-remove', namespace: guild, user: '456', back: '/manage/people' })).message, 'delegate-removed');
    assert.equal(await app.manage.delegation(7001, 456), null);
    const events = await app.manage.events({ accountIds: [7001], limit: 10 });
    assert.ok(events.some(event => event.what === 'Named kai-sample Repository administrator of parser-lab' && event.result === 'applied'));
    assert.ok(events.some(event => event.what === 'Removed kai-sample as Repository administrator' && event.result === 'applied'));
    // The administration is read from GitHub again for the action: demoted after the viewer was resolved as an administrator, the naming is refused.
    const page = await locals(app, cookie);
    github.state.roles.set('parser-guild', 'member');
    const naming = await handleManageAction(new Request(`${ORIGIN}/manage/do`, { method: 'POST', headers: { cookie: `${SESSION_COOKIE}=${cookie}`, origin: ORIGIN, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ action: 'delegate-add', namespace: guild, login: 'kai-sample', role: 'repository-admin', repositories: '1001', back: '/manage/people' }) }), page);
    assert.equal(new URL(naming.headers.get('location'), ORIGIN).searchParams.get('m'), 'not-github-administrator');
    assert.equal(await app.manage.delegation(7001, 456), null);
    // Funder without GitHub administration: ada-sample still funds parser-guild's Business slot, but GitHub no longer makes her an administrator.
    for (const repositoryId of [1001, 1002, 1003]) github.state.admin.set(repositoryId, false);
    app.cache.clear();
    let { model: loaded } = await model(app, cookie);
    assert.equal(loaded.namespaces.some(namespace => namespace.login === 'parser-guild'), false, 'funding alone puts no namespace in administration');
    assert.equal(loaded.readers.find(namespace => namespace.login === 'parser-guild').planStanding, 'business', 'the plan she funds still stands for the organisation');
    await assert.rejects(app.auth.readAdmission({ session: cookie, repositoryId: 1001 }), error => error.code === 'E_ADMISSION_UNAUTHORIZED');
    assert.equal((await act(app, cookie, { action: 'policy-create', namespace: guild, name: 'Funded', document: POLICY, back: '/manage/policies' })).message, 'not-coordinator');
    assert.equal((await act(app, cookie, { action: 'delegate-add', namespace: guild, login: 'kai-sample', role: 'account-admin', back: '/manage/people' })).message, 'not-coordinator');
    assert.equal(await app.manage.delegation(7001, 456), null);
    // Named Account administrator by parser-guild's GitHub administrators, she manages diffdevil repository by repository where she can write.
    await app.manage.grantDelegation({ accountId: 7001, userId: 123, login: 'ada-sample', role: 'account-admin', repositories: null, grantedBy: 999 });
    app.cache.clear();
    ({ model: loaded } = await model(app, cookie));
    assert.deepEqual(loaded.namespaces.find(namespace => namespace.login === 'parser-guild').administration, { kind: 'delegate', role: 'account-admin', repositories: null });
    const created = await act(app, cookie, { action: 'policy-create', namespace: guild, namespaceLogin: 'parser-guild', name: 'Mixed', document: POLICY, back: '/manage/policies' });
    assert.equal(created.message, 'policy-created');
    const policyId = created.params.get('policy');
    for (const repository of ['parser-guild/parser-lab', 'parser-guild/grammar-fuzz']) assert.equal((await act(app, cookie, { action: 'policy-link', policy: policyId, repository, back: '/manage/policies' })).message, 'policy-linked');
    // GitHub narrows her to read on grammar-fuzz: publishing applies where she can write and keeps the other as refused, with its reason.
    github.state.push.set(1003, false);
    const published = await act(app, cookie, { action: 'policy-publish', policy: policyId, back: '/manage/policies' });
    assert.equal(published.message, 'policy-published-partly');
    const publicationId = published.params.get('publication');
    let publication = await app.manage.publication(publicationId);
    assert.deepEqual(Object.fromEntries(publication.results.map(result => [result.repositoryId, result.state])), { 1001: 'applied', 1003: 'failed' });
    assert.match(publication.results.find(result => result.repositoryId === 1003).reason, /read access to this repository, not write/u);
    // Write restored: Retry applies the refused one and leaves the applied one alone.
    github.state.push.delete(1003);
    assert.equal((await act(app, cookie, { action: 'policy-retry', publication: publicationId, back: '/manage/policies' })).message, 'policy-retried');
    publication = await app.manage.publication(publicationId);
    assert.deepEqual(Object.fromEntries(publication.results.map(result => [result.repositoryId, result.state])), { 1001: 'applied', 1003: 'applied' });
    await act(app, cookie, { action: 'policy-remove', policy: policyId, back: '/manage/policies' });
  } finally {
    await app.manage.revokeDelegation(7001, 123);
    github.state.push.clear(); github.state.admin.clear(); github.state.roles.clear(); app.cache.clear();
  }
});

test('every ordinary Manage action leaves a record with its outcome, and closing the account forgets the person\'s own record', async () => {
  const { app: compose } = await fixture();
  const app = compose(undefined, { env: { APP_COMMERCIAL_FIXTURE: BUSINESS } });
  const { cookie } = await signIn(app);
  assert.equal((await act(app, cookie, { action: 'select', repository: 'parser-guild/grammar-fuzz', back: '/manage/repositories' })).message, 'selected');
  assert.equal((await act(app, cookie, { action: 'delete-history', repository: 'parser-guild/grammar-fuzz', confirm: 'wrong-name', back: '/manage/repositories' })).message, 'repository-mismatch');
  assert.equal((await act(app, cookie, { action: 'release', repository: 'parser-guild/grammar-fuzz', back: '/manage/repositories' })).message, 'released');
  // Its own actions on grammar-fuzz, newest first (other cases share the record and may date theirs later).
  const events = (await app.manage.events({ accountIds: [7001], limit: 200 })).filter(event => event.where === 'parser-guild/grammar-fuzz');
  assert.deepEqual(events.slice(0, 3).map(event => [event.what, event.result, event.where]), [['Released the slot', 'applied', 'parser-guild/grammar-fuzz'], ['Deleted history', 'failed', 'parser-guild/grammar-fuzz'], ['Selected to operate', 'applied', 'parser-guild/grammar-fuzz']]);
  assert.match(events[1].reason, /Type the repository name exactly/u);
  assert.ok(events.slice(0, 3).every(event => event.repositoryId === 1003 && event.actor.login === 'ada-sample'));
  await app.manage.recordEvent({ accountId: 123, where: 'ada-sample', actor: { kind: 'person', id: 123, login: 'ada-sample' }, what: 'x', result: 'applied' });
  assert.equal((await app.manage.events({ accountIds: [123], limit: 5 })).length >= 1, true);
  await app.manage.forgetAccount(123);
  assert.deepEqual(await app.manage.events({ accountIds: [123], limit: 5 }), []);
  assert.ok((await app.manage.events({ accountIds: [7001], limit: 5 })).length >= 3, 'an organisation keeps its record');
});
