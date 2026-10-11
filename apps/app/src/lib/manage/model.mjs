// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The Manage model: who administers what, under which plan, with which capacity, and what needs a decision. It joins
 * the viewer (GitHub reach and App standing per repository), the Manage store (selection, the Free connection, the
 * departure to Works), the commercial consumer's status (the viewer's own plan, slots and bindings with observed
 * authority) and the account's service-connection fact. Pages load it fresh; the navigation badge reads a per-isolate
 * copy that lasts a minute, so every page shows the same count without repeating the commercial read.
 */
import { attentionItems, capacityOf, describeRepository } from './states.mjs';

const STATUS_TTL_MS = 60_000;

/** The commercial status of the signed-in account, or null without a subscription source. Never throws: an unavailable read is `unavailable`. */
export async function commercialStatus({ session, runtime, fresh = false }) {
  if (!runtime.commercial) return null;
  const load = async () => {
    try { return { standing: 'available', status: (await runtime.commercial.status({ session: session.session })).body }; }
    catch (error) { return { standing: 'unavailable', code: typeof error?.code === 'string' ? error.code : 'E_COMMERCIAL_UNAVAILABLE', status: null }; }
  };
  if (fresh) return load();
  return runtime.cache.get(`manage-status:${session.actor.userId}`, load, STATUS_TTL_MS);
}

async function accountOf(runtime, repositories) {
  for (const repository of repositories) {
    const accountId = await runtime.cache.get(`namespace-account:${repository.repositoryId}`, () => runtime.namespaceOf({ repositoryId: repository.repositoryId }), STATUS_TTL_MS);
    if (Number.isSafeInteger(accountId) && accountId > 0) return accountId;
  }
  return null;
}

function fundingOf({ namespace, accountId, standing, status, viewerPlan, freeConnection, elsewhere }) {
  const own = accountId === null || !status?.linked ? undefined : (status.capacity ?? []).find(slot => slot.binding?.organisationId === accountId);
  if (standing === 'pro' || standing === 'business') {
    return own ? { kind: 'own-slot', slot: own.slot, funding: own.funding, authority: own.binding.authority, checkedAt: own.binding.authorityCheckedAt, pendingEndOn: own.pendingEndOn ?? null } : { kind: 'other-funder' };
  }
  if (standing === 'unknown') return own ? { kind: 'paused', slot: own.slot, funding: own.funding, authority: own.binding.authority, checkedAt: own.binding.authorityCheckedAt, pendingEndOn: own.pendingEndOn ?? null } : { kind: 'unknown' };
  if (viewerPlan === 'Free' && freeConnection && freeConnection.organisationId === accountId) return { kind: 'free-connected', since: freeConnection.since };
  if (elsewhere) return { kind: 'free-connected-elsewhere', since: elsewhere.since };
  return viewerPlan === 'Free' ? { kind: 'unconnected' } : { kind: 'unfunded' };
}
const PLAN_OF_FUNDING = { 'own-slot': null, 'other-funder': null, paused: null, unknown: 'Unknown', 'free-connected': 'Free', 'free-connected-elsewhere': 'Free', unconnected: 'Unconnected', unfunded: 'Unfunded' };

/**
 * Load the console's model for the signed-in viewer. `fresh` bypasses the status cache (every Manage page), the badge
 * does not. Repositories carry their explanatory state; namespaces carry their plan, funding and capacity.
 */
export async function loadManage({ viewer, session, runtime, fresh = true }) {
  const manage = runtime.manage;
  const userId = viewer.userId;
  // A saved choice of what stays becomes durable state as soon as the reduction it was made for has taken effect.
  if (runtime.operating) { try { if (await runtime.operating.applyDueChoice(userId)) runtime.cache.clear(); } catch { /* the scheduled maintenance tries again */ } }
  const [commercial, serviceConnection, freeConnection, departure, planChoice] = await Promise.all([
    commercialStatus({ session, runtime, fresh }),
    runtime.auth.serviceConnection({ session: session.session }).then(result => result.body.serviceConnection).catch(() => 'unknown'),
    manage.freeConnection(userId),
    manage.departure(userId),
    manage.planChoice(userId)
  ]);
  const status = commercial?.status ?? null;
  const viewerPlan = viewer.planStanding === 'unknown' ? 'Unknown' : viewer.plan;
  const admin = viewer.namespaces.filter(namespace => namespace.yours && (namespace.kind === 'user' || namespace.role === 'admin'));
  const namespaces = [];
  for (const namespace of admin) {
    const accountId = namespace.kind === 'user' ? userId : await accountOf(runtime, namespace.repositories);
    const elsewhere = namespace.kind === 'org' && accountId !== null ? await manage.freeConnectionOf(accountId) : null;
    const funding = namespace.kind === 'user' ? { kind: 'personal' } : fundingOf({ namespace, accountId, standing: namespace.planStanding, status, viewerPlan, freeConnection, elsewhere: elsewhere && elsewhere.userId !== userId ? elsewhere : null });
    const plan = namespace.kind === 'user' ? viewerPlan : (PLAN_OF_FUNDING[funding.kind] ?? (funding.kind === 'paused' ? viewerPlan : namespace.plan));
    const installationState = namespace.repositories.map(repository => repository.standing?.installationState).find(Boolean) ?? 'unknown';
    namespaces.push({ login: namespace.login, kind: namespace.kind, accountId, plan, planStanding: namespace.planStanding, funding, administration: { kind: 'owner', role: null }, installation: { state: installationState }, repositories: namespace.repositories.map(repository => ({ ...repository })), capacity: null });
  }
  // Delegated administration (Business): namespaces whose GitHub administrators named this person. The delegation
  // acts only where GitHub gives them write and only while the namespace is on Business; elsewhere it is named, not
  // active. Funding a namespace never puts it here: only GitHub's own administration (above) or a delegation does.
  const delegatedElsewhere = [];
  const delegations = await manage.delegationsOf(userId).catch(() => []);
  for (const namespace of viewer.namespaces.filter(candidate => !admin.includes(candidate))) {
    if (!delegations.length) break;
    const accountId = await accountOf(runtime, namespace.repositories);
    const delegation = accountId === null ? null : delegations.find(candidate => candidate.accountId === accountId);
    if (!delegation) continue;
    if (namespace.planStanding !== 'business') { delegatedElsewhere.push({ login: namespace.login, plan: namespace.plan, role: delegation.role }); continue; }
    const reachable = delegation.role === 'account-admin' ? namespace.repositories : namespace.repositories.filter(repository => (delegation.repositories ?? []).includes(repository.repositoryId));
    const installationState = namespace.repositories.map(repository => repository.standing?.installationState).find(Boolean) ?? 'unknown';
    namespaces.push({ login: namespace.login, kind: namespace.kind, accountId, plan: 'Business', planStanding: 'business', funding: { kind: 'delegated' }, administration: { kind: 'delegate', role: delegation.role, repositories: delegation.repositories ?? null }, installation: { state: installationState }, repositories: reachable.map(repository => ({ ...repository })), capacity: null });
  }
  // What this administrator's own GitHub reads establish, the runtime's allowance check needs without them: visibility and account kind.
  for (const namespace of namespaces) {
    if (namespace.accountId !== null) await manage.recordAccountKind(namespace.accountId, namespace.kind === 'user' ? 'user' : 'organization').catch(() => undefined);
    for (const repository of namespace.repositories) if (repository.standing && repository.standing.visibility !== (repository.private ? 'private' : 'public')) await manage.recordVisibility(repository.repositoryId, repository.private).catch(() => undefined);
  }
  const freeConnected = viewerPlan === 'Free' && freeConnection ? namespaces.find(namespace => namespace.accountId === freeConnection.organisationId) ?? null : null;
  // The administrator's saved choice decides an over-the-limit scope they fund; nobody else's choice applies to it.
  const keep = planChoice?.keep ?? null;
  // Capacity: Free pools the personal account and its connected organisation; every other scope stands alone.
  const personal = namespaces.find(namespace => namespace.kind === 'user');
  if (viewerPlan === 'Free' && personal) {
    const pool = [personal, ...(freeConnected ? [freeConnected] : [])];
    const capacity = capacityOf({ plan: 'Free', kind: 'user', pooled: true, repositories: pool.flatMap(namespace => namespace.repositories) }, { allowances: runtime.allowances, keep });
    for (const namespace of pool) namespace.capacity = capacity;
  }
  for (const namespace of namespaces) {
    if (!namespace.capacity) namespace.capacity = capacityOf({ plan: namespace.plan, kind: namespace.kind, pooled: false, repositories: namespace.repositories }, { allowances: runtime.allowances, keep: ['own-slot', 'paused'].includes(namespace.funding.kind) ? keep : null });
    for (const repository of namespace.repositories) {
      repository.state = describeRepository(repository, namespace, namespace.capacity, { freeConnectedLogin: freeConnected?.login ?? null });
      // A delegate manages diffdevil on a repository only while GitHub gives them write there; the repository's own
      // state stays true, and the page says why this person can't change it.
      if (namespace.administration.kind === 'delegate' && repository.canWrite !== true) repository.state = { ...repository.state, readOnlyForYou: true, why: `${repository.state.why} You can't change it: GitHub gives you read access here, not write.` };
    }
  }
  const administered = new Set(namespaces.map(namespace => namespace.login));
  const readers = viewer.namespaces.filter(namespace => !administered.has(namespace.login)).map(namespace => ({ login: namespace.login, kind: namespace.kind, plan: namespace.plan, planStanding: namespace.planStanding, repositories: namespace.repositories, delegation: delegatedElsewhere.find(candidate => candidate.login === namespace.login) ?? null }));
  const anySelected = namespaces.some(namespace => namespace.repositories.some(repository => repository.standing && (repository.standing.selected || repository.standing.executionActive)));
  // Imports and recalculation in progress, for the one-line processing standing on each repository row.
  let jobs = new Map();
  if (runtime.jobs) { try { jobs = await runtime.jobs.openFor(namespaces.flatMap(namespace => namespace.repositories.filter(repository => repository.standing?.historyEnabled).map(repository => repository.repositoryId))); } catch { jobs = new Map(); } }
  // Business coordination (Policies, People, Audit) is shown for every namespace this person coordinates: their own Business namespaces, and those where they are an Account administrator.
  const businessScopes = namespaces.filter(namespace => namespace.plan === 'Business' && (namespace.administration.kind === 'owner' || namespace.administration.role === 'account-admin'));
  // What each coordinated namespace's automatic setup acts as, and what it held since it was chosen, so a coordinator
  // sees when it stopped reaching new repositories and can choose it again for themselves.
  for (const namespace of businessScopes) {
    const setup = namespace.accountId === null ? null : await Promise.resolve().then(() => manage.automaticSetup?.(namespace.accountId)).catch(() => null);
    namespace.automaticSetup = setup ? { ...setup, held: (await Promise.resolve().then(() => manage.setupHeld?.(namespace.accountId, setup.savedAt)).catch(() => null)) ?? { count: 0, latestAt: null, reason: null } } : null;
  }
  const model = { userId, login: viewer.login, jobs, viewerPlan, hosted: runtime.commercial !== undefined, commercialSource: runtime.commercialSource, commercial, serviceConnection, freeConnection, freeConnected, departure, planChoice,
    namespaces, readers, businessScopes, coordinates: viewerPlan === 'Business' || businessScopes.length > 0, allowances: runtime.allowances, worksOrigin: runtime.config.worksOrigin, firstRun: viewerPlan === 'Free' && !status?.linked && !anySelected, attention: [] };
  model.attention = attentionItems(model);
  return model;
}

/** The navigation's Manage badge: the same decisions the Overview lists, from the cached model. */
export async function manageBadge({ viewer, session, runtime }) {
  if (!viewer || !session || !runtime?.manage) return { count: 0, urgent: false };
  try {
    const model = await runtime.cache.get(`manage-model:${viewer.userId}`, () => loadManage({ viewer, session, runtime, fresh: false }), STATUS_TTL_MS);
    return { count: model.attention.length, urgent: model.attention.some(item => item.tone === 'err') };
  } catch { return { count: 0, urgent: false }; }
}

/** The namespaces an administrator could fund with an open slot: organisations they administer that nobody funds. */
export function fundableOrganisations(model) {
  return model.namespaces.filter(namespace => namespace.kind === 'org' && namespace.accountId !== null && ['unfunded', 'unconnected', 'free-connected', 'free-connected-elsewhere'].includes(namespace.funding.kind));
}

/** Whether this person coordinates the namespace (policies, automatic setup, people): its owner, or an Account administrator named by them. */
export function coordinatesNamespace(namespace) {
  return Boolean(namespace) && namespace.plan === 'Business' && (namespace.administration?.kind === 'owner' || namespace.administration?.role === 'account-admin');
}
