// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Every Manage mutation, as one same-origin form post to `/manage/do` that answers with a redirect and a short
 * message code. Each action goes through the contract that owns its consequence: repository admission through the
 * authorization service (which proves current GitHub administration at every call), funding through the commercial
 * consumer, the funding connection through the authorization service, and the console's own facts (selection, the
 * Free connection, departures, the choice of what stays) through the Manage store after the same admission check.
 * Allowances are enforced here, at the boundary where a selection is made, so a swap is the route when they are full.
 */
import { readBriefSettings, BRIEF_MODES, HISTORY_WINDOWS } from '../../../../shared/pr-brief/settings.mjs';
import { CONTEXT_MODULES } from '../../../../shared/pr-brief/contract.mjs';
import { documentHeaders } from '../routes.mjs';
import { commercialStatus, loadManage, coordinatesNamespace } from './model.mjs';
import { readAnswers } from '../participation/survey.mjs';
import { holdsSlot, isRemoved } from './states.mjs';
import { worksDestinations } from './works.mjs';
import { recordAction, resultOfMessage } from './audit.mjs';
import { readLinkedPolicy, POLICY_NAME, publishPolicy, retryPublication, summarizePublication, applyRevision } from './linked-policies.mjs';
import { ROLE_KEYS, LOGIN, WRITE_CEILING, coordinates } from './people.mjs';
import { adoptedConfiguration } from './defaults.mjs';
import { sendJobStep } from '../../../../github-app/history-jobs.mjs';
import { SETUP_ROLES } from './setup.mjs';

/** Plain words for the message codes a redirect carries in `m`. */
export const MESSAGES = Object.freeze({
  selected: { tone: 'ok', text: 'Selected. It holds a slot and isn\'t running yet: review its policy, then enable it.' },
  enabled: { tone: 'ok', text: 'Enabled. Size labels and the check run on its pull requests from now on. History stays a separate choice.' },
  stopped: { tone: 'ok', text: 'Stopped. Labels and the check no longer run; its history and settings stay.' },
  released: { tone: 'ok', text: 'Released. It no longer holds a slot.' },
  swapped: { tone: 'ok', text: 'Swapped. The repository you picked stopped; the incoming one holds the slot as Pending enable.' },
  'history-on': { tone: 'ok', text: 'History is on from now. Past pull requests are not imported by this.' },
  'history-off': { tone: 'ok', text: 'Collection stopped. What exists is kept until you delete it.' },
  'history-deleted': { tone: 'ok', text: 'History deleted. A deletion record stops imports, queued work and restores from bringing it back.' },
  'brief-saved': { tone: 'ok', text: 'Pull-request message settings saved. Open pull requests are evaluated again where the deployment can.' },
  'allowance-full': { tone: 'err', text: 'Every private slot is taken. Swap one in, stop another repository, or add capacity to your plan.' },
  'not-connected': { tone: 'err', text: 'This organisation is not connected to your Free allowance. Connect it first; Free connects one organisation.' },
  'no-plan': { tone: 'err', text: 'No slot funds this organisation, so nothing can run there. Fund it with a slot, or another administrator can connect it on their Free account.' },
  'plan-unknown': { tone: 'err', text: 'The plan funding this namespace could not be established right now, so nothing was changed.' },
  'history-allowance-full': { tone: 'err', text: 'All public history places are in use. Switch another public repository to labels only first.' },
  'writer-undeclared': { tone: 'err', text: 'Confirm that no other writer manages size labels here before enabling.' },
  'not-selected': { tone: 'err', text: 'Select the repository first.' },
  unauthorized: { tone: 'err', text: 'GitHub does not confirm you administer that repository right now.' },
  'write-required': { tone: 'err', text: 'GitHub gives you read access to this repository, not write. Managing diffdevil on a repository needs write access on GitHub, so nothing was changed.' },
  stale: { tone: 'err', text: 'The settings changed since this page loaded. Nothing was written; look again and retry.' },
  unavailable: { tone: 'err', text: 'The repository is not reachable right now (removed, suspended or unknown), so nothing was changed.' },
  invalid: { tone: 'err', text: 'The settings were not valid. Nothing was written.' },
  bound: { tone: 'ok', text: 'Funded. Everyone who can read the organisation gets its plan\'s features. Your GitHub funding connection is kept while you fund it; disconnect it from Account at any time.' },
  'bind-refused': { tone: 'err', text: 'Works\' slot was not bound: GitHub does not confirm you administer that organisation right now, or someone else funds it.' },
  unbound: { tone: 'ok', text: 'Released. The organisation has no plan until it is funded again; its repositories stop, history and settings stay.' },
  'not-funded': { tone: 'err', text: 'The plan is not funded right now, so a slot cannot be bound.' },
  reconnected: { tone: 'ok', text: 'Reconnected. diffdevil can confirm your organisation administration again; premium features resume where it is present.' },
  'reconnect-unconfirmed': { tone: 'err', text: 'The reconnect was not confirmed. Look at the connection standing before trying again.' },
  unlinked: { tone: 'ok', text: 'Unlinked. Works-funded benefits ended here at once; the subscription itself is managed at Works.' },
  linked: { tone: 'ok', text: 'Linked to Wolfsblvt Works.' },
  'link-pending': { tone: 'warn', text: 'The link didn\'t finish: Works didn\'t answer after you approved. Nothing was charged. Trying again continues the same link.' },
  'already-linked': { tone: 'warn', text: 'This account is already linked to Works.' },
  'commercial-unavailable': { tone: 'err', text: 'Works is not reachable from this deployment right now, so nothing was changed.' },
  'free-connected': { tone: 'ok', text: 'Connected. The organisation shares your Free allowance; nothing runs there until you select repositories.' },
  'free-disconnected': { tone: 'ok', text: 'Disconnected. The organisation\'s repositories stopped; their history and settings stay with it.' },
  'free-taken': { tone: 'err', text: 'That organisation is already connected on another administrator\'s Free account.' },
  'choice-saved': { tone: 'ok', text: 'Saved. It applies on the effective date; you can change it until then.' },
  'choice-applied': { tone: 'ok', text: 'Applied. The plan had already changed, so your choice is in effect now: below is what it kept and what stopped, with history and settings kept.' },
  'choice-over': { tone: 'err', text: 'That keeps more private repositories than the lower plan allows. Nothing was saved; choose fewer.' },
  'import-queued': { tone: 'ok', text: 'Import queued. It runs behind live pull requests and shows its progress here; labels and checks are not affected.' },
  'import-running': { tone: 'warn', text: 'An import is already in progress for this repository. Its progress is shown below.' },
  'recalculate-queued': { tone: 'ok', text: 'Recalculation queued. Retained observations are re-read under the current policy; nothing on GitHub is rewritten.' },
  'recalculate-running': { tone: 'warn', text: 'A recalculation is already in progress for this repository.' },
  'history-required': { tone: 'err', text: 'Turn on history first: imports and recalculation fill and re-read retained history.' },
  'queue-unavailable': { tone: 'warn', text: 'The job is recorded, but this deployment has no work queue to run it, so it waits.' },
  'job-paused': { tone: 'ok', text: 'Paused. What was collected stays; resuming continues from the same place.' },
  'job-resumed': { tone: 'ok', text: 'Resumed from where it stopped.' },
  'job-unknown': { tone: 'err', text: 'That job is not open any more.' },
  'default-applied': { tone: 'ok', text: 'Default applied as this repository\'s own settings. Later changes to the default don\'t reach it until you apply again.' },
  'default-unchanged': { tone: 'warn', text: 'The default was not applied: it changed since this page loaded. Look at the differences again.' },
  'no-default': { tone: 'err', text: 'This namespace has no default to apply. Set one in Defaults first.' },
  'not-pro-default': { tone: 'err', text: 'Applying a reusable default is Pro. Business repositories follow their linked policy from Policies.' },
  'return-dismissed': { tone: 'ok', text: 'Noted.' },
  'close-linked': { tone: 'err', text: 'Your account is linked to a Works plan. Whether closure may end or unlink the plan is not settled yet, so unlink it at Works first.' },
  'confirm-mismatch': { tone: 'err', text: 'Type your account name exactly to confirm.' },
  'repository-mismatch': { tone: 'err', text: 'Type the repository name exactly to confirm.' },
  'default-saved': { tone: 'ok', text: 'Default saved as a new revision. A repository adopts it from its own settings.' },
  'default-removed': { tone: 'ok', text: 'Default removed. Repositories keep their own policy over the preset.' },
  'not-pro': { tone: 'err', text: 'A reusable default comes with Pro.' },
  'not-github-administrator': { tone: 'err', text: 'Only a current GitHub administrator of this namespace can do this. Funding a plan or being named here doesn\'t make someone one.' },
  'not-business': { tone: 'err', text: 'Linked policies, automatic setup and delegated administration come with Business.' },
  'not-coordinator': { tone: 'err', text: 'Only the namespace\'s administrator or an Account administrator they named can do this.' },
  'policy-created': { tone: 'ok', text: 'Policy created as revision 1. Link repositories to it, then publish.' },
  'policy-saved': { tone: 'ok', text: 'Saved as a new revision. Linked repositories take it when you publish.' },
  'policy-removed': { tone: 'ok', text: 'Policy removed. Its repositories keep their current settings as plain repository settings.' },
  'policy-name-taken': { tone: 'err', text: 'This namespace already has a policy with that name. Nothing was created.' },
  'policy-invalid': { tone: 'err', text: 'The policy did not read as a valid policy document. Nothing was written.' },
  'policy-unknown': { tone: 'err', text: 'That policy does not exist.' },
  'policy-linked': { tone: 'ok', text: 'Linked. The policy\'s current revision is applied as the repository\'s App settings; its own .diffdevil.yml still wins for what it sets.' },
  'policy-linked-partly': { tone: 'ok', text: 'Linked and applied, partly: the repository file wins for the values it sets.' },
  'policy-link-queued': { tone: 'warn', text: 'Linked. Applying waits behind work on this repository; publish or retry when it has finished.' },
  'policy-link-failed': { tone: 'err', text: 'Linked, but the revision could not be applied; nothing was half-written. Publish again to retry.' },
  'policy-unlinked': { tone: 'ok', text: 'Unlinked. The repository keeps its current settings as plain repository settings; later revisions no longer reach it.' },
  'policy-mismatch': { tone: 'err', text: 'A repository links to a policy of its own namespace.' },
  'policy-published': { tone: 'ok', text: 'Published to every linked repository. Closed pull requests are untouched; history is re-read, not rewritten.' },
  'policy-published-partly': { tone: 'warn', text: 'Published. Some repositories are queued or failed; the result names each one, with Retry.' },
  'policy-published-none': { tone: 'warn', text: 'No repository is linked to this policy, so there was nothing to publish.' },
  'policy-retried': { tone: 'ok', text: 'Retried. The result below is what happened this time.' },
  'setup-saved': { tone: 'ok', text: 'Automatic setup saved. History and the pull-request message stay separate choices per repository.' },
  'setup-off': { tone: 'ok', text: 'Automatic setup is off. Newly granted repositories wait for you.' },
  'delegate-added': { tone: 'ok', text: 'Named. They manage diffdevil only on repositories they can write to on GitHub; where GitHub gives them read access only, they are refused. Funding and invoices are never theirs.' },
  'delegate-removed': { tone: 'ok', text: 'Removed. They no longer manage diffdevil here; what GitHub itself grants them is unchanged.' },
  'delegate-removed-setup': { tone: 'warn', text: 'Removed. They chose this namespace\'s automatic setup, so new repositories now wait until someone chooses it again in Policies.' },
  'delegate-unknown': { tone: 'err', text: 'GitHub knows no user with that login. Nothing was changed.' },
  'delegate-self': { tone: 'err', text: 'You already administer this namespace.' },
  'delegate-no-repositories': { tone: 'err', text: 'A Repository administrator needs at least one repository named.' },
  'survey-saved': { tone: 'ok', text: 'Saved. Finish the survey whenever you like before it closes; completing it is what earns the reward.' },
  'survey-completed': { tone: 'ok', text: 'Thank you. The survey is complete. Only the completion fact is queued for Wolfsblvt Works; your answers stay in diffdevil.' },
  'survey-already-completed': { tone: 'ok', text: 'This survey was already complete. Nothing was sent again.' },
  'survey-incomplete': { tone: 'err', text: 'Choose at least one answer to "What did you actually use diffdevil for?" to complete the survey. Your other answers are saved.' },
  'survey-closed': { tone: 'err', text: 'The survey isn\'t open right now, so nothing was saved.' },
  'survey-not-eligible': { tone: 'err', text: 'This survey is for beta participants with a linked Works account, so nothing was saved.' },
  'survey-unavailable': { tone: 'err', text: 'No survey is running on this deployment.' },
  'survey-deleted': { tone: 'ok', text: 'Your answers are deleted. The completion and any reward it earned stay.' },
  'survey-dismissed': { tone: 'ok', text: 'Okay. The survey stays available from Plan & funding.' },
  'preview-ready': { tone: 'ok', text: 'Works quoted this continuation with your reward. A preview reserves nothing.' },
  'preview-not-quotable': { tone: 'warn', text: 'Works can\'t quote that continuation right now, for example while another payment is being confirmed. Nothing was reserved.' },
  'preview-unavailable': { tone: 'err', text: 'Works can\'t be reached for a price right now. Nothing was reserved.' },
  simulated: { tone: 'ok', text: 'Works stand-in: simulated.' },
  unknown: { tone: 'err', text: 'That action is not available.' }
});

/** What each action is called in the administrative record. */
const ACTION_WORDS = Object.freeze({ select: 'Selected to operate', enable: 'Enabled labels and the check', stop: 'Stopped operating', release: 'Released the slot', swap: 'Swapped in', 'delete-history': 'Deleted history', brief: 'Saved the pull-request message settings',
  fund: 'Funded with a slot', 'release-slot': 'Released the funding slot', link: 'Started the Wolfsblvt Works link', unlink: 'Unlinked Wolfsblvt Works', reconnect: 'Reconnected the funding connection', disconnect: 'Disconnected the funding connection', 'free-connect': 'Connected as the Free organisation', 'free-disconnect': 'Disconnected the Free organisation', 'plan-choice': 'Saved what stays on the lower plan',
  'default-save': 'Saved the namespace default', 'default-remove': 'Removed the namespace default', 'policy-create': 'Created a policy', 'policy-save': 'Saved a policy revision', 'policy-remove': 'Removed a policy', 'policy-link': 'Linked to a policy', 'policy-unlink': 'Unlinked from its policy', 'policy-publish': 'Published a policy revision', 'policy-retry': 'Retried a publication', 'setup-save': 'Chose automatic setup', 'setup-off': 'Turned automatic setup off', 'delegate-add': 'Named an administrator', 'delegate-remove': 'Removed an administrator' });

const MANAGE_PATH = /^\/manage(?:\/[A-Za-z0-9._\/-]*)?(?:\?[A-Za-z0-9=&%._-]*)?$/u;
function backOf(form, fallback = '/manage') { const value = form.get('back'); return typeof value === 'string' && MANAGE_PATH.test(value) ? value : fallback; }
// The survey invitation can be dismissed from any signed-in page; it returns to that same-origin path.
const APP_PATH = /^\/(?!\/)[A-Za-z0-9._\/-]*(?:\?[A-Za-z0-9=&%._-]*)?$/u;
function appBackOf(form) { const value = form.get('back'); return typeof value === 'string' && APP_PATH.test(value) ? value : '/'; }
export function withMessage(path, code) {
  const url = new URL(path, 'http://manage.invalid');
  url.searchParams.set('m', code);
  return `${url.pathname}${url.search}`;
}
const redirect = (location, headers = {}) => new Response(null, { status: 303, headers: documentHeaders({ location, ...headers }) });
const actionError = (code, status = 400) => Object.assign(new Error(code), { code, status });
const integer = value => { const number = Number(value); return Number.isSafeInteger(number) && number > 0 ? number : undefined; };
const sameOrigin = (request, runtime) => runtime.config.allowedOrigins.includes(request.headers.get('origin'));

/** Which message a refused admission call earns. */
function admissionMessage(error) {
  const code = typeof error?.code === 'string' ? error.code : '';
  if (code === 'E_ADMISSION_UNAUTHORIZED' || code === 'E_SESSION_UNAVAILABLE') return 'unauthorized';
  if (code === 'E_ADMISSION_WRITE_REQUIRED') return 'write-required';
  if (code === 'E_ADMISSION_STALE') return 'stale';
  if (code === 'E_ADMISSION_WRITER_UNRESOLVED') return 'writer-undeclared';
  if (['E_ADMISSION_UNAVAILABLE', 'E_ADMISSION_TOMBSTONED', 'E_ADMISSION_UNKNOWN_REPOSITORY'].includes(code)) return 'unavailable';
  return 'invalid';
}

/** The brief settings the Operation form posts: bounded App controls, validated by the shared reader. */
export function briefSettingsFromForm(form) {
  const mode = form.get('mode');
  if (!BRIEF_MODES.includes(mode)) throw actionError('E_BRIEF_MODE');
  const modules = CONTEXT_MODULES.filter(id => form.getAll('modules').includes(id));
  const priority = String(form.get('priority') ?? '').split(',').map(value => value.trim()).filter(Boolean);
  const window = Number(form.get('historyWindowDays'));
  return readBriefSettings({ mode, modules, ...(priority.length ? { priority } : {}), historyWindowDays: HISTORY_WINDOWS.includes(window) ? window : undefined, finalSummary: form.get('finalSummary') === 'on' });
}

export async function handleManageAction(request, { runtime, session, viewer }) {
  if (request.method !== 'POST') return redirect('/manage');
  if (!sameOrigin(request, runtime)) return new Response('The request did not come from the App.', { status: 403, headers: documentHeaders({ 'content-type': 'text/plain; charset=utf-8' }) });
  let form;
  try { form = await request.formData(); } catch { return redirect(withMessage('/manage', 'invalid')); }
  const action = String(form.get('action') ?? '');
  const back = backOf(form);
  const cookie = session.session, origin = request.headers.get('origin');
  const mutation = { session: cookie, method: 'POST', origin };
  const repositoryOf = () => {
    const fullName = String(form.get('repository') ?? '');
    const repository = viewer.repositories.find(candidate => candidate.fullName === fullName);
    if (!repository) throw actionError('E_UNKNOWN_REPOSITORY', 404);
    return repository;
  };
  const admission = repositoryId => runtime.auth.readAdmission({ session: cookie, repositoryId }).then(result => result.body);
  const update = (repositoryId, settings) => runtime.auth.updateAdmission({ session: cookie, repositoryId, method: 'POST', origin, settings }).then(result => result.body);
  /**
   * The administrative record: every action that has words is recorded with its outcome, where it happened (the
   * repository, or the namespace), and the acting person. `event` may name the account, place, words and detail;
   * otherwise they follow from the form. Recording never changes the answer.
   */
  const audit = async (code, event = {}) => {
    const words = event.what ?? ACTION_WORDS[action];
    if (!words) return;
    const repository = event.repositoryId !== undefined ? null : viewer.repositories.find(candidate => candidate.fullName === String(form.get('repository') ?? ''));
    const repositoryId = event.repositoryId ?? repository?.repositoryId ?? null;
    let accountId = event.accountId ?? null;
    if (accountId === null && repositoryId !== null) { try { accountId = (await runtime.namespaceOf({ repositoryId })) ?? null; } catch { accountId = null; } }
    if (accountId === null) accountId = integer(form.get('namespace')) ?? integer(form.get('organisation')) ?? viewer.userId;
    const qualifier = action === 'operate' ? ({ run: 'Set to run', labels: 'Set to labels only', 'labels-history': 'Set to labels and history', stop: 'Stopped operating' })[String(form.get('mode') ?? '')] : action === 'history' ? (form.get('enabled') === 'on' ? 'Turned history on' : 'Stopped history collection') : action === 'swap' ? `Swapped in instead of ${String(form.get('outgoing') ?? '')}` : null;
    await recordAction(runtime, { viewer, accountId, repositoryId, where: event.where ?? repository?.fullName ?? String(form.get('namespaceLogin') || viewer.login), what: qualifier ?? words, ...(event.result ? { result: event.result, reason: event.reason ?? null } : resultOfMessage(MESSAGES, code)), detail: event.detail ?? null });
  };
  const done = async (code, event, to) => { runtime.cache.clear(); await audit(code, event); return redirect(withMessage(to ?? back, code)); };
  const fresh = () => loadManage({ viewer, session, runtime, fresh: true });
  /** The Business namespace a coordination action names, or the refusal code. Coordination belongs to the owner or an Account administrator they named. */
  const coordinated = async accountId => {
    const model = await fresh();
    const namespace = model.namespaces.find(candidate => candidate.accountId === accountId);
    // A namespace this person neither administers on GitHub nor was named for, funded by them or not, is refused as such.
    if (!namespace) return { refusal: Number.isSafeInteger(accountId) ? 'not-coordinator' : 'invalid' };
    if (namespace.plan !== 'Business') return { refusal: 'not-business' };
    if (!coordinatesNamespace(namespace)) return { refusal: 'not-coordinator' };
    return { namespace, model };
  };
  /**
   * Naming or removing people belongs to the namespace's current GitHub administration, read from GitHub again for this
   * action: never to whoever funds the plan, nor to an Account administrator named here.
   */
  const administered = async accountId => {
    const found = await coordinated(accountId);
    if (found.refusal) return found;
    if (found.namespace.administration?.kind !== 'owner') return { refusal: 'not-github-administrator' };
    if (found.namespace.kind === 'org' && await session.reads.organizationRole(found.namespace.login).catch(() => 'unknown') !== 'admin') return { refusal: 'not-github-administrator' };
    return found;
  };
  /** The message code that refuses selecting `repository`, or null when its scope's plan and private allowance allow it. */
  const allowanceRefusal = async repository => {
    const model = await fresh();
    const namespace = model.namespaces.find(candidate => candidate.login === repository.owner);
    if (!namespace) return 'unauthorized';
    const planRefusal = { Unconnected: 'not-connected', Unfunded: 'no-plan', Unknown: 'plan-unknown' }[namespace.plan];
    if (planRefusal) return planRefusal;
    if (!repository.private || holdsSlot(repository)) return null;
    return namespace.capacity.kind !== 'slots' || namespace.capacity.inSlot.length + namespace.capacity.waiting.length < namespace.capacity.of ? null : 'allowance-full';
  };
  const allowanceAllows = async repository => (await allowanceRefusal(repository)) === null;
  const stopRepository = async (repository, { keepSelection = false } = {}) => {
    const current = await admission(repository.repositoryId);
    if (current.state === 'active' || current.execution.reason === null) await update(repository.repositoryId, { revision: current.revision, execution: false });
    if (!keepSelection) await runtime.manage.deselect(repository.repositoryId);
  };
  try {
    switch (action) {
      case 'select': {
        const repository = repositoryOf();
        await admission(repository.repositoryId);
        const refusal = await allowanceRefusal(repository);
        if (refusal) return done(refusal);
        await runtime.manage.select(repository.repositoryId, viewer.userId);
        return done('selected');
      }
      case 'enable': {
        const repository = repositoryOf();
        const current = await admission(repository.repositoryId);
        if (!holdsSlot(repository) && !repository.standing?.selected) {
          const refusal = await allowanceRefusal(repository);
          if (refusal) return done(refusal);
          await runtime.manage.select(repository.repositoryId, viewer.userId);
        }
        const declared = form.get('writer') === 'declared';
        if (!declared && !['detected', 'administrator-declared'].includes(current.writer.confidence)) return done('writer-undeclared');
        await update(repository.repositoryId, { revision: current.revision, execution: true, ...(declared ? { writer: { confidence: 'administrator-declared' } } : {}) });
        return done('enabled');
      }
      case 'stop': { await stopRepository(repositoryOf()); return done('stopped'); }
      case 'operate': {
        // The Operation switch of a running repository: Running / Stopped, or Labels + history / Labels only / Stopped.
        const repository = repositoryOf();
        const mode = String(form.get('mode') ?? '');
        if (mode === 'stop') { await stopRepository(repository); return done('stopped'); }
        if (!['run', 'labels', 'labels-history'].includes(mode)) return done('invalid');
        const current = await admission(repository.repositoryId);
        if (current.state !== 'active' || current.execution.reason !== null) {
          if (!holdsSlot(repository) && !repository.standing?.selected) { const refusal = await allowanceRefusal(repository); if (refusal) return done(refusal); await runtime.manage.select(repository.repositoryId, viewer.userId); }
          if (!['detected', 'administrator-declared'].includes(current.writer.confidence)) return done('writer-undeclared');
          await update(repository.repositoryId, { revision: current.revision, execution: true });
        }
        if (mode === 'labels-history' && !current.history.enabled) {
          const model = await fresh();
          const places = model.namespaces.find(candidate => candidate.login === repository.owner)?.capacity.publicHistory;
          if (places?.of !== null && places?.of !== undefined && places.used >= places.of) return done('history-allowance-full');
          const latest = await admission(repository.repositoryId);
          await update(repository.repositoryId, { revision: latest.revision, history: { enabled: true, retentionDays: runtime.config.retentionDays } });
          return done('history-on');
        }
        if (mode === 'labels' && current.history.enabled) { const latest = await admission(repository.repositoryId); await update(repository.repositoryId, { revision: latest.revision, history: { enabled: false } }); return done('history-off'); }
        return done('enabled');
      }
      case 'release': { const repository = repositoryOf(); await admission(repository.repositoryId); await runtime.manage.deselect(repository.repositoryId); return done('released'); }
      case 'swap': {
        const incoming = repositoryOf();
        const outgoing = viewer.repositories.find(candidate => candidate.fullName === String(form.get('outgoing') ?? ''));
        if (!outgoing || outgoing.owner !== incoming.owner && !(await fresh()).namespaces.some(namespace => namespace.capacity.pooled && namespace.capacity.inSlot.some(held => held.repositoryId === outgoing.repositoryId))) throw actionError('E_UNKNOWN_REPOSITORY', 404);
        await admission(incoming.repositoryId);
        const planRefusal = await allowanceRefusal({ ...incoming, private: false });
        if (planRefusal) return done(planRefusal);
        await stopRepository(outgoing);
        await runtime.manage.select(incoming.repositoryId, viewer.userId);
        return done('swapped');
      }
      case 'history': {
        const repository = repositoryOf();
        const enabled = form.get('enabled') === 'on';
        const current = await admission(repository.repositoryId);
        if (enabled && !repository.private) {
          const model = await fresh();
          const namespace = model.namespaces.find(candidate => candidate.login === repository.owner);
          const places = namespace?.capacity.publicHistory;
          if (places?.of !== null && places?.of !== undefined && !repository.standing?.historyEnabled && places.used >= places.of) return done('history-allowance-full');
        }
        await update(repository.repositoryId, { revision: current.revision, history: enabled ? { enabled: true, retentionDays: runtime.config.retentionDays } : { enabled: false } });
        return done(enabled ? 'history-on' : 'history-off');
      }
      case 'delete-history': {
        const repository = repositoryOf();
        if (String(form.get('confirm') ?? '') !== repository.name) return done('repository-mismatch');
        await admission(repository.repositoryId);
        await runtime.appStore.deleteHistory(repository.repositoryId);
        return done('history-deleted');
      }
      case 'brief': {
        const repository = repositoryOf();
        const current = await admission(repository.repositoryId);
        let brief;
        try { brief = briefSettingsFromForm(form); } catch { return done('invalid'); }
        const stored = current.configuration.value ?? { repository: {} };
        await update(repository.repositoryId, { revision: current.revision, configuration: { repository: stored.repository ?? {}, brief } });
        return done('brief-saved');
      }
      case 'fund': {
        if (!runtime.commercial) return done('commercial-unavailable');
        const organisationId = integer(form.get('organisation')), slot = String(form.get('slot') ?? '');
        if (!organisationId || !slot) return done('invalid');
        const result = await runtime.commercial.bind({ ...mutation, slot, organisationId });
        return done(result.body.ok ? 'bound' : 'bind-refused');
      }
      case 'release-slot': {
        if (!runtime.commercial) return done('commercial-unavailable');
        const organisationId = integer(form.get('organisation'));
        if (!organisationId) return done('invalid');
        await runtime.commercial.unbind({ ...mutation, organisationId });
        return done('unbound');
      }
      case 'link': {
        if (!runtime.commercial) return done('commercial-unavailable');
        const begun = await runtime.commercial.beginLink(mutation);
        if (begun.outcome === 'authorize') {
          await runtime.manage.recordDeparture(viewer.userId, { purpose: 'link', fromPath: back, snapshot: null });
          runtime.cache.clear();
          return redirect(begun.authorizationUrl, begun.headers);
        }
        return done(begun.outcome === 'linked' ? 'linked' : 'link-pending');
      }
      case 'unlink': {
        if (!runtime.commercial) return done('commercial-unavailable');
        await runtime.commercial.unlink(mutation);
        return done('unlinked');
      }
      case 'reconnect': {
        if (!runtime.commercial?.reconnectFundingAuthorization) return done('commercial-unavailable');
        const result = await runtime.commercial.reconnectFundingAuthorization(mutation);
        return done(result.body.ok ? 'reconnected' : 'reconnect-unconfirmed');
      }
      case 'disconnect': {
        if (!runtime.commercial?.revokeFundingAuthorization) return done('commercial-unavailable');
        // Disconnecting removes the retained GitHub grant, which also ends this browser's session; sign-in explains why.
        const result = await runtime.commercial.revokeFundingAuthorization(mutation);
        runtime.cache.clear();
        return redirect(`/sign-in?reason=E_FUNDING_DISCONNECTED${result.body.authorityReconciliation === 'required' ? '&reconcile=required' : ''}`, result.headers);
      }
      case 'dismiss-return': { await runtime.manage.clearDeparture(viewer.userId); return done('return-dismissed'); }
      case 'free-connect': {
        const organisationId = integer(form.get('organisation'));
        const model = await fresh();
        const namespace = model.namespaces.find(candidate => candidate.accountId === organisationId && candidate.kind === 'org');
        if (!namespace || model.viewerPlan !== 'Free') return done('invalid');
        // The organisation it replaces stops running; its history and settings stay, and its selections wait for a connection.
        if (model.freeConnected && model.freeConnected.accountId !== organisationId) for (const repository of model.freeConnected.repositories) if (repository.standing?.executionActive) await stopRepository(repository, { keepSelection: true });
        if (!await runtime.manage.connectFree(viewer.userId, organisationId)) return done('free-taken');
        return done('free-connected');
      }
      case 'free-disconnect': {
        const model = await fresh();
        if (model.freeConnected) for (const repository of model.freeConnected.repositories) if (repository.standing?.executionActive) await stopRepository(repository, { keepSelection: true });
        await runtime.manage.disconnectFree(viewer.userId);
        return done('free-disconnected');
      }
      case 'plan-choice': {
        const organisation = integer(form.get('organisation')) ?? null;
        const keep = form.getAll('keep').map(integer).filter(Boolean);
        const target = ['free', 'pro'].includes(String(form.get('target'))) ? String(form.get('target')) : 'free';
        const from = String(form.get('from') ?? '').toLowerCase();
        if (!['pro', 'business'].includes(from)) return done('invalid');
        const model = await fresh();
        // The choice covers the scopes this plan funds: the personal account and the organisations on its slots or Free connection.
        const bound = new Set((model.commercial?.status?.capacity ?? []).map(slot => slot.binding?.organisationId).filter(Boolean));
        const accounts = model.namespaces.filter(namespace => namespace.accountId !== null && (namespace.kind === 'user' || bound.has(namespace.accountId) || ['own-slot', 'paused', 'free-connected'].includes(namespace.funding.kind))).map(namespace => namespace.accountId);
        const kept = model.namespaces.flatMap(namespace => namespace.repositories.filter(repository => keep.includes(repository.repositoryId) && repository.private).map(repository => ({ repository, namespace })));
        const limit = target === 'free' ? runtime.allowances.free.private : runtime.allowances.proOrganisation.private;
        if (limit !== null) {
          if (target === 'free' && kept.filter(({ namespace }) => namespace.kind === 'user' || namespace.accountId === organisation).length > limit) return done('choice-over');
          if (target === 'pro') for (const namespace of model.namespaces.filter(candidate => candidate.kind === 'org')) if (kept.filter(entry => entry.namespace === namespace).length > limit) return done('choice-over');
        }
        await runtime.manage.savePlanChoice(viewer.userId, { organisation, keep: kept.map(({ repository }) => repository.repositoryId), target, from, on: String(form.get('on') ?? '') || null, accounts });
        // When the reduction has already taken effect, the choice applies now rather than at a date that has passed.
        const applied = runtime.operating ? await runtime.operating.applyDueChoice(viewer.userId) : null;
        return done(applied ? 'choice-applied' : 'choice-saved');
      }
      case 'import': case 'recalculate': {
        const repository = repositoryOf();
        const current = await admission(repository.repositoryId);
        if (!current.history.enabled || current.history.reason !== null) return done('history-required');
        let scopeLimit = null;
        if (action === 'import') {
          const scope = await runtime.importScope(repository.repositoryId);
          if (scope.unknown) return done('plan-unknown');
          scopeLimit = scope.limit;
        }
        const { job, created } = await runtime.jobs.request({ repositoryId: repository.repositoryId, installationId: current.installationId, kind: action, scopeLimit, actorId: viewer.userId });
        if (!created) return done(`${action}-running`);
        return done(await sendJobStep(runtime.queue, job, job.sequence, { now: runtime.now }) === 'sent' ? `${action}-queued` : 'queue-unavailable');
      }
      case 'job-pause': case 'job-resume': {
        const repository = repositoryOf();
        await admission(repository.repositoryId);
        const job = await runtime.jobs.job(String(form.get('job') ?? ''));
        if (!job || job.repositoryId !== repository.repositoryId) return done('job-unknown');
        if (action === 'job-pause') return done(await runtime.jobs.pauseByPerson(job.jobId) ? 'job-paused' : 'job-unknown');
        const resumed = await runtime.jobs.resume(job.jobId);
        if (!resumed) return done('job-unknown');
        return done(await sendJobStep(runtime.queue, resumed, resumed.sequence, { now: runtime.now }) === 'sent' ? 'job-resumed' : 'queue-unavailable');
      }
      case 'default-apply': {
        // Pro adopts the namespace default from the repository's own settings: its sections become this repository's App settings.
        const repository = repositoryOf();
        const current = await admission(repository.repositoryId);
        const model = await fresh();
        const namespace = model.namespaces.find(candidate => candidate.login === repository.owner);
        if (!namespace || namespace.plan !== 'Pro' || namespace.accountId === null) return done('not-pro-default');
        const namespaceDefault = await runtime.manage.namespaceDefault(namespace.accountId);
        if (!namespaceDefault) return done('no-default');
        if (namespaceDefault.revision !== Number(form.get('defaultRevision'))) return done('default-unchanged');
        await update(repository.repositoryId, { revision: current.revision, configuration: adoptedConfiguration(current.configuration.value, namespaceDefault) });
        await runtime.manage.recordAdoption(repository.repositoryId, { accountId: namespace.accountId, revision: namespaceDefault.revision, actorId: viewer.userId });
        return done('default-applied');
      }
      case 'sign-out-everywhere': {
        await runtime.manage.revokeUserSessions(viewer.userId);
        runtime.cache.clear();
        return redirect('/sign-in?reason=E_SIGNED_OUT_EVERYWHERE', { 'Set-Cookie': '__Host-diffdevil-session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax' });
      }
      case 'close-account': {
        if (String(form.get('confirm') ?? '') !== viewer.login) return done('confirm-mismatch');
        const model = await fresh();
        if (model.commercial?.status?.linked) return done('close-linked');
        // Personal repositories: stop, deselect and delete their history; organisations keep their own data.
        const personal = model.namespaces.find(namespace => namespace.kind === 'user');
        for (const repository of personal?.repositories ?? []) {
          if (!repository.standing || isRemoved(repository)) continue;
          try { await stopRepository(repository); if (repository.standing.historyEnabled) await runtime.appStore.deleteHistory(repository.repositoryId); } catch { /* a repository that cannot be administered right now keeps its state */ }
        }
        await runtime.manage.forgetAccount(viewer.userId);
        // Survey answers, completions and invitation records go too; Wirt keeps its own commercial record of any reward.
        await runtime.participationStore.forgetAccount(viewer.userId);
        const revoked = await runtime.auth.revokeAuthorization(mutation);
        await runtime.manage.forgetPreference(viewer.userId);
        runtime.cache.clear();
        return redirect('/sign-in?reason=E_ACCOUNT_CLOSED', revoked.headers);
      }
      case 'default-save': case 'default-remove': {
        const accountId = integer(form.get('namespace'));
        const model = await fresh();
        const namespace = model.namespaces.find(candidate => candidate.accountId === accountId);
        if (!namespace) return done('invalid');
        if (!['Pro', 'Business'].includes(namespace.plan)) return done('not-pro');
        if (action === 'default-remove') { await runtime.manage.removeNamespaceDefault(accountId); return done('default-removed'); }
        const { readNamespaceDefault } = await import('./defaults.mjs');
        let parsed;
        try { parsed = readNamespaceDefault(String(form.get('document') ?? '')); } catch { return done('invalid'); }
        const saved = await runtime.manage.saveNamespaceDefault(accountId, { configuration: parsed.configuration, policyId: parsed.policyId, actorId: viewer.userId, expectedRevision: Number(form.get('revision') ?? 0) });
        return done(saved === undefined ? 'stale' : 'default-saved');
      }
      // ── Business: named linked policies, publishing, automatic setup, delegated administration ──
      case 'policy-create': {
        const accountId = integer(form.get('namespace'));
        const { refusal, namespace } = await coordinated(accountId);
        if (refusal) return done(refusal, { accountId, where: String(form.get('namespaceLogin') ?? '') || viewer.login });
        const name = String(form.get('name') ?? '').trim();
        if (!POLICY_NAME.test(name)) return done('invalid', { accountId, where: namespace.login });
        let parsed;
        try { parsed = readLinkedPolicy(String(form.get('document') ?? '')); } catch { return done('policy-invalid', { accountId, where: namespace.login }); }
        const policyId = await runtime.manage.createLinkedPolicy({ accountId, name, configuration: parsed.configuration, enginePolicyId: parsed.policyId, actorId: viewer.userId });
        if (!policyId) return done('policy-name-taken', { accountId, where: namespace.login });
        return done('policy-created', { accountId, where: namespace.login, what: `Created the policy ${name} (revision 1)` }, `/manage/policies?ns=${encodeURIComponent(namespace.login)}&policy=${policyId}`);
      }
      case 'policy-save': case 'policy-remove': case 'policy-publish': {
        const policy = await runtime.manage.linkedPolicy(String(form.get('policy') ?? ''));
        if (!policy) return done('policy-unknown');
        const { refusal, namespace } = await coordinated(policy.accountId);
        if (refusal) return done(refusal, { accountId: policy.accountId, where: viewer.login });
        const place = { accountId: policy.accountId, where: `${namespace.login} · ${policy.name}` };
        const home = `/manage/policies?ns=${encodeURIComponent(namespace.login)}&policy=${policy.policyId}`;
        if (action === 'policy-remove') { await runtime.manage.removeLinkedPolicy(policy.policyId); return done('policy-removed', { ...place, what: `Removed the policy ${policy.name}` }, `/manage/policies?ns=${encodeURIComponent(namespace.login)}`); }
        if (action === 'policy-save') {
          let parsed;
          try { parsed = readLinkedPolicy(String(form.get('document') ?? '')); } catch { return done('policy-invalid', place, home); }
          const name = String(form.get('name') ?? '').trim();
          if (name && !POLICY_NAME.test(name)) return done('invalid', place, home);
          const saved = await runtime.manage.saveLinkedPolicy(policy.policyId, { configuration: parsed.configuration, enginePolicyId: parsed.policyId, actorId: viewer.userId, expectedRevision: Number(form.get('revision') ?? 0), ...(name && name !== policy.name ? { name } : {}) });
          if (saved === undefined) return done(name && name !== policy.name ? 'policy-name-taken' : 'stale', place, home);
          return done('policy-saved', { ...place, what: `Saved ${name || policy.name} as revision ${saved}` }, home);
        }
        const publication = await publishPolicy({ runtime, cookie, origin, viewer, policy });
        const summary = summarizePublication(publication);
        await recordAction(runtime, { viewer, accountId: policy.accountId, where: place.where, what: `Published ${policy.name} revision ${policy.revision}`, result: summary.result, reason: summary.text, detail: { publicationId: publication.publicationId, results: publication.results.map(result => ({ repositoryId: result.repositoryId, state: result.state })) } });
        for (const result of publication.results.filter(result => result.state !== 'applied')) await recordAction(runtime, { viewer, accountId: policy.accountId, repositoryId: result.repositoryId, where: viewer.repositories.find(candidate => candidate.repositoryId === result.repositoryId)?.fullName ?? `repository ${result.repositoryId}`, what: `Publish ${policy.name} revision ${policy.revision}`, result: result.state, reason: result.reason, detail: result.detail });
        runtime.cache.clear();
        return redirect(withMessage(`${home}&publication=${publication.publicationId}`, summary.total === 0 ? 'policy-published-none' : summary.retryable ? 'policy-published-partly' : 'policy-published'));
      }
      case 'policy-retry': {
        const publication = await runtime.manage.publication(String(form.get('publication') ?? ''));
        const policy = publication ? await runtime.manage.linkedPolicy(publication.policyId) : null;
        if (!publication || !policy) return done('policy-unknown');
        const { refusal, namespace } = await coordinated(policy.accountId);
        if (refusal) return done(refusal, { accountId: policy.accountId, where: viewer.login });
        const retried = await retryPublication({ runtime, cookie, origin, publication });
        const summary = summarizePublication(retried);
        await recordAction(runtime, { viewer, accountId: policy.accountId, where: `${namespace.login} · ${policy.name}`, what: `Retried publishing ${policy.name} revision ${publication.revision}`, result: summary.result, reason: summary.text, detail: { publicationId: retried.publicationId } });
        runtime.cache.clear();
        return redirect(withMessage(`/manage/policies?ns=${encodeURIComponent(namespace.login)}&policy=${policy.policyId}&publication=${retried.publicationId}`, 'policy-retried'));
      }
      case 'policy-link': case 'policy-unlink': {
        const repository = repositoryOf();
        await admission(repository.repositoryId);
        const accountId = await runtime.namespaceOf({ repositoryId: repository.repositoryId });
        const model = await fresh();
        const namespace = model.namespaces.find(candidate => candidate.accountId === accountId);
        if (!namespace || namespace.plan !== 'Business') return done('not-business');
        if (action === 'policy-unlink') { await runtime.manage.unlinkRepository(repository.repositoryId); return done('policy-unlinked'); }
        const policy = await runtime.manage.linkedPolicy(String(form.get('policy') ?? ''));
        if (!policy) return done('policy-unknown');
        if (policy.accountId !== accountId) return done('policy-mismatch');
        await runtime.manage.linkRepository(repository.repositoryId, policy.policyId, viewer.userId);
        const result = await applyRevision({ runtime, cookie, origin, policy, repositoryId: repository.repositoryId });
        const code = { applied: 'policy-linked', partly: 'policy-linked-partly', queued: 'policy-link-queued', failed: 'policy-link-failed' }[result.state] ?? 'policy-linked';
        return done(code, { what: `Linked to the policy ${policy.name} (revision ${policy.revision})`, result: result.state, reason: result.reason, detail: result.detail });
      }
      case 'setup-save': case 'setup-off': {
        const accountId = integer(form.get('namespace'));
        const { refusal, namespace } = await coordinated(accountId);
        if (refusal) return done(refusal, { accountId, where: viewer.login });
        const place = { accountId, where: namespace.login };
        const home = `/manage/policies?ns=${encodeURIComponent(namespace.login)}#automatic-setup`;
        if (action === 'setup-off') { await runtime.manage.removeAutomaticSetup(accountId); return done('setup-off', place, home); }
        const policyId = String(form.get('policy') ?? '') || null;
        const policy = policyId ? await runtime.manage.linkedPolicy(policyId) : null;
        if (policyId && (!policy || policy.accountId !== accountId)) return done('policy-unknown', place, home);
        const enableExecution = form.get('enable') === 'on', writerDeclared = form.get('writer') === 'declared';
        if (enableExecution && !writerDeclared) return done('writer-undeclared', place, home);
        if (!policy && !enableExecution) { await runtime.manage.removeAutomaticSetup(accountId); return done('setup-off', place, home); }
        // The choice acts for this person under the authority they hold now: an organisation's administration is read
        // from GitHub again; otherwise it is their Account-administrator delegation, which the setup re-checks later.
        let actorRole = namespace.administration?.kind === 'owner' ? 'owner' : 'account-admin';
        if (actorRole === 'owner' && namespace.kind === 'org' && await session.reads.organizationRole(namespace.login).catch(() => 'unknown') !== 'admin') {
          if (!coordinates(await runtime.manage.delegation(accountId, viewer.userId).catch(() => null))) return done('not-coordinator', place, home);
          actorRole = 'account-admin';
        }
        await runtime.manage.saveAutomaticSetup(accountId, { policyId: policy?.policyId ?? null, enableExecution, writerDeclared, actorId: viewer.userId, actorLogin: viewer.login, actorRole });
        return done('setup-saved', { ...place, what: `Chose automatic setup as ${SETUP_ROLES[actorRole]}: ${[policy ? `link to ${policy.name}` : 'no policy', enableExecution ? 'enable labels and the check' : 'leave disabled'].join(', ')}; history and the pull-request message stay off`, result: 'applied', reason: 'It acts for whoever chose it, on each new repository only where GitHub still gives them the access their role needs.' }, home);
      }
      case 'delegate-add': case 'delegate-remove': {
        const accountId = integer(form.get('namespace'));
        const { refusal, namespace } = await administered(accountId);
        if (refusal) return done(refusal, { accountId, where: viewer.login });
        const place = { accountId, where: namespace.login };
        const home = `/manage/people?ns=${encodeURIComponent(namespace.login)}`;
        if (action === 'delegate-remove') {
          const userId = integer(form.get('user'));
          const existing = userId ? await runtime.manage.delegation(accountId, userId) : null;
          if (!existing) return done('invalid', place, home);
          await runtime.manage.revokeDelegation(accountId, userId);
          // Automatic setup they chose as Account administrator stops acting with the delegation; say so where it happened.
          const setup = await runtime.manage.automaticSetup(accountId);
          const setupStops = setup?.actorId === userId && setup.actorRole === 'account-admin';
          return done(setupStops ? 'delegate-removed-setup' : 'delegate-removed', { ...place, what: `Removed ${existing.login} as ${existing.role === 'account-admin' ? 'Account administrator' : 'Repository administrator'}`, ...(setupStops ? { result: 'applied', reason: `Automatic setup was chosen by ${existing.login}; new repositories now wait until someone chooses it again.` } : {}) }, home);
        }
        const login = String(form.get('login') ?? '').trim(), role = String(form.get('role') ?? '');
        if (!LOGIN.test(login) || !ROLE_KEYS.includes(role)) return done('invalid', place, home);
        const repositories = form.getAll('repositories').map(integer).filter(id => id && namespace.repositories.some(repository => repository.repositoryId === id));
        if (role === 'repository-admin' && repositories.length === 0) return done('delegate-no-repositories', place, home);
        const user = await session.reads.userByLogin(login).catch(() => null);
        if (!user) return done('delegate-unknown', place, home);
        if (user.id === viewer.userId) return done('delegate-self', place, home);
        await runtime.manage.grantDelegation({ accountId, userId: user.id, login: user.login, role, repositories: role === 'repository-admin' ? repositories : null, grantedBy: viewer.userId });
        return done('delegate-added', { ...place, what: `Named ${user.login} ${role === 'account-admin' ? 'Account administrator' : `Repository administrator of ${repositories.map(id => namespace.repositories.find(repository => repository.repositoryId === id)?.name ?? id).join(', ')}`}`, result: 'applied', reason: WRITE_CEILING }, home);
      }
      case 'survey-save': case 'survey-complete': {
        const participation = runtime.participation;
        if (!participation) return done('survey-unavailable');
        const answers = readAnswers(participation.survey, form);
        const commercialStanding = await commercialStatus({ session, runtime, fresh: true });
        const result = action === 'survey-save' ? await participation.saveDraft({ userId: viewer.userId, commercial: commercialStanding, answers })
          : await participation.complete({ userId: viewer.userId, commercial: commercialStanding, answers });
        // Delivery is tried once right away; an unanswered attempt stays in the outbox for the next visit and maintenance.
        if (result === 'completed') await participation.flush({ userId: viewer.userId }).catch(() => undefined);
        return done({ saved: 'survey-saved', completed: 'survey-completed', 'already-completed': 'survey-already-completed', incomplete: 'survey-incomplete', closed: 'survey-closed', 'not-eligible': 'survey-not-eligible' }[result] ?? 'unknown');
      }
      case 'reward-preview': {
        // A preview creates a Wirt quote, so it is made only here, by the person's same-origin POST; rendering Plan & funding never creates one.
        if (!runtime.participation) return done('survey-unavailable');
        const cadence = String(form.get('cadence') ?? '');
        if (!['monthly', 'annual'].includes(cadence)) return done('invalid');
        const result = await runtime.participation.requestPreview({ userId: viewer.userId, session: cookie, cadence });
        runtime.cache.clear();
        return redirect(withMessage(`/manage/plan?preview=${cadence}`, { ready: 'preview-ready', 'not-quotable': 'preview-not-quotable' }[result] ?? 'preview-unavailable'));
      }
      case 'survey-delete': {
        if (!runtime.participation) return done('survey-unavailable');
        await runtime.participation.deleteAnswers(viewer.userId);
        return done('survey-deleted');
      }
      case 'survey-dismiss': {
        if (!runtime.participation) return done('survey-unavailable');
        await runtime.participation.dismiss(viewer.userId);
        runtime.cache.clear();
        return redirect(withMessage(appBackOf(form), 'survey-dismissed'));
      }
      case 'fixture-simulate': {
        if (runtime.commercialSource !== 'fixture') return done('unknown');
        const outcome = runtime.commercial.simulate(String(form.get('kind') ?? ''));
        runtime.cache.clear();
        return redirect(outcome === 'linked' ? '/manage/plan?works-link=linked' : '/manage/plan');
      }
      default: return done('unknown');
    }
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : '';
    runtime.cache.clear();
    if (code === 'E_COMMERCIAL_ALREADY_LINKED') return redirect(withMessage(back, 'already-linked'));
    if (code === 'E_COMMERCIAL_LINK_PENDING') return redirect(withMessage(back, 'link-pending'));
    if (code === 'E_COMMERCIAL_NOT_FUNDED') return redirect(withMessage(back, 'not-funded'));
    if (code.startsWith('E_COMMERCIAL_') || code === 'E_SERVICE_RECONNECT_UNCONFIRMED') return redirect(withMessage(back, code === 'E_SERVICE_RECONNECT_UNCONFIRMED' ? 'reconnect-unconfirmed' : 'commercial-unavailable'));
    if (code === 'E_UNKNOWN_REPOSITORY') return new Response('Not in your repositories.', { status: 404, headers: documentHeaders({ 'content-type': 'text/plain; charset=utf-8' }) });
    const refused = admissionMessage(error);
    // A refused request is kept as it happened: who asked for what, and why it did not happen.
    await audit(refused, { result: 'failed', reason: `${MESSAGES[refused]?.text ?? refused}${code ? ` (${code})` : ''}` });
    return redirect(withMessage(back, refused));
  }
}

/**
 * Leaving for Works: record what the person was doing (purpose, where from, the applied order) so the return can say
 * what it waits for, then send them to the Works destination in the DiffDevil frame. A GET, because the exits are links.
 */
export async function handleDeparture(request, { runtime, session, viewer }) {
  const url = new URL(request.url);
  const destinations = worksDestinations(runtime.config.worksOrigin);
  const to = url.searchParams.get('to') ?? '';
  const destination = runtime.commercialSource === 'fixture' ? `${runtime.config.origin}/manage/works-stand-in?dest=${encodeURIComponent(to)}` : destinations[to];
  if (!destination) return redirect(withMessage('/manage/plan', 'commercial-unavailable'));
  const purpose = ['change-plan', 'renewal', 'pay', 'add-slot', 'browse'].includes(url.searchParams.get('purpose')) ? url.searchParams.get('purpose') : 'browse';
  const from = url.searchParams.get('from');
  let snapshot = null;
  try { const status = runtime.commercial ? (await runtime.commercial.status({ session: session.session })).body : null; snapshot = status ? { order: status.order ?? null, capacity: (status.capacity ?? []).length, standing: status.commercial?.standing ?? null, tier: status.commercial?.tier ?? null, plan: status.plan } : null; } catch { snapshot = null; }
  await runtime.manage.recordDeparture(viewer.userId, { purpose, fromPath: typeof from === 'string' && MANAGE_PATH.test(from) ? from : null, snapshot });
  runtime.cache.clear();
  return redirect(destination);
}
