// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * One loader for every analytical page: URL state, authorised scope, period window, one read
 * of the analytical service for the page's surface, the record population on its named basis
 * (retained lifecycle and final comparisons, or the older pathless analyses where named
 * history is not retained yet), transient display titles, and the server-selected
 * entitlement that decides whether premium panels or their Free counterparts render.
 */
import { readViewState, describeScope, periodOf, link, PERIODS } from './scope.mjs';
import { scopeRepositories, loadTitles } from './viewer.mjs';
import { groupPullRequests, fromRetained, attachTitles, periodStats, DAY } from './derive.mjs';
import { planLabel, premium as premiumPlan } from './entitlement.mjs';

const PLAN_RANK = { Free: 0, Pro: 1, Business: 2 };

/**
 * What the shell expects before data answers: a namespace's features follow that namespace's
 * plan, a viewer's own namespaces follow the viewer's plan, and All repositories follows the
 * viewer's plan. The analytical service applies the same rule server-side on every read; its
 * answer replaces this expectation wherever retained data exists.
 */
export function entitlementFor(viewer, scope, repositories) {
  const planOf = namespace => {
    const entry = viewer.namespaces.find(candidate => candidate.login === namespace);
    return entry?.yours ? viewer.plan : entry?.plan ?? 'Free';
  };
  const premiumRepositories = repositories.filter(repository => repository.standing?.historyReadable && planOf(repository.owner) !== 'Free');
  const sharedPaid = [...new Set(viewer.repositories.filter(repository => !viewer.namespaces.find(candidate => candidate.login === repository.owner)?.yours && planOf(repository.owner) !== 'Free').map(repository => repository.owner))];
  if (scope.kind === 'all') {
    const premium = viewer.plan !== 'Free' && premiumRepositories.length > 0;
    return { premium, plan: viewer.plan, scope: 'all', premiumRepositories: premium ? premiumRepositories : [], excluded: premium ? repositories.filter(repository => repository.standing?.historyReadable).length - premiumRepositories.length : 0, sharedPaid: viewer.plan === 'Free' ? sharedPaid : [], source: 'expected' };
  }
  const plan = planOf(scope.namespace);
  return { premium: plan !== 'Free' && premiumRepositories.length > 0, plan, scope: 'namespace', premiumRepositories, excluded: 0, sharedPaid: plan === 'Free' ? sharedPaid : [], source: 'expected' };
}

/** The server's entitlement answer, mapped to presentation: plan labels and namespace logins. */
function entitlementFromData(viewer, scope, repositories, data, expected) {
  const entitlements = data?.entitlements;
  if (!entitlements) return expected;
  const ownerOf = new Map(viewer.repositories.map(repository => [repository.repositoryId, repository.owner]));
  const funded = [...new Set((data.fundedNamespaces ?? []).flatMap(namespace => namespace.repositoryIds.map(id => ownerOf.get(id))).filter(Boolean))];
  const premium = entitlements.premium?.enabled === true;
  const eligible = new Set(entitlements.premium?.repositoryIds ?? []);
  return {
    premium, plan: planLabel(entitlements.aggregatePlan), aggregatePlan: entitlements.aggregatePlan, scope: data.scope?.kind ?? scope.kind,
    premiumRepositories: repositories.filter(repository => eligible.has(repository.repositoryId)),
    excluded: (entitlements.premium?.excludedFreeRepositories ?? 0) + (entitlements.premium?.excludedUnknownPlanRepositories ?? 0),
    excludedUnknown: entitlements.premium?.excludedUnknownPlanRepositories ?? 0,
    sharedPaid: premium ? [] : funded.filter(owner => !viewer.namespaces.find(candidate => candidate.login === owner)?.yours),
    fundedNamespaces: funded, source: 'service'
  };
}

/**
 * The contract's explicit scope for the selected view. A namespace is addressed by its numeric
 * installation account; while that account is not recorded yet, the namespace's repositories are
 * read as All repositories (the viewer's plan), and the page names that standing.
 */
async function selectedScope(scope, repositories, runtime) {
  if (scope.kind === 'repository') return repositories[0] ? { kind: 'repository', repositoryId: repositories[0].repositoryId } : { kind: 'all' };
  if (scope.kind === 'namespace') {
    for (const repository of repositories) {
      const namespaceId = await runtime.namespaceOf({ repositoryId: repository.repositoryId });
      if (Number.isSafeInteger(namespaceId) && namespaceId > 0) return { kind: 'namespace', namespaceId };
    }
  }
  return { kind: 'all' };
}

export async function loadView({ url, viewer, session, runtime, surface = 'prs', detail = {} }) {
  const { repositoryId: detailRepositoryId, fileLocator, ...queryDetail } = detail;
  const state = readViewState(url);
  const scope = describeScope(state.s);
  const repositories = scopeRepositories(viewer, scope);
  const nowIso = runtime.now();
  const period = periodOf(state);
  const nowMs = Date.parse(nowIso);
  const window = { from: new Date(nowMs - period.days * DAY).toISOString(), to: nowIso, previousFrom: new Date(nowMs - 2 * period.days * DAY).toISOString() };
  const detailRepository = ['pr', 'files'].includes(surface) && Number.isSafeInteger(detailRepositoryId)
    ? viewer.repositories.find(repository => repository.repositoryId === detailRepositoryId)
    : undefined;
  const historyRepositories = (detailRepository ? [detailRepository] : repositories).filter(repository => repository.standing?.historyReadable);
  const ids = historyRepositories.map(repository => repository.repositoryId);
  const actor = { userId: viewer.userId, authorizedRepositoryIds: viewer.repositories.map(repository => repository.repositoryId) };
  // Detail fallback follows the authorised route repository; its broader query scope is only navigation context.
  const expectedScope = detailRepository ? { kind: 'namespace', namespace: detailRepository.owner } : scope;
  const expectedRepositories = detailRepository ? [detailRepository] : repositories;
  const expected = entitlementFor(viewer, expectedScope, expectedRepositories);
  const [coverage, bounds, titles] = await Promise.all([
    runtime.store.analyticalCoverage(ids),
    runtime.store.observationBounds(ids),
    loadTitles({ reads: session.reads, repositories: historyRepositories, cache: runtime.cache, userId: viewer.userId })
  ]);
  const retainedRepositories = historyRepositories.filter(repository => (coverage.counts.get(repository.repositoryId) ?? 0) > 0);
  const pathlessOnly = historyRepositories.filter(repository => (coverage.counts.get(repository.repositoryId) ?? 0) === 0);
  let data = null, dataStanding = 'none';
  const contractScope = detailRepository && historyRepositories.length > 0
    ? { kind: 'repository', repositoryId: detailRepository.repositoryId }
    : await selectedScope(scope, historyRepositories, runtime);
  if (ids.length > 0) {
    try {
      data = await runtime.analytics.query({ surface, repositoryIds: ids, from: window.from, to: window.to, scope: contractScope, ...queryDetail }, actor);
      // A Free page answer carries its standing (`free`, `scope-unavailable`, `entitlement-unavailable`); a data answer carries none.
      dataStanding = data.standing === undefined ? 'available' : data.standing === 'free' ? 'plan-required' : data.standing;
    } catch (error) {
      dataStanding = typeof error?.code === 'string' && error.code === 'E_APP_DATA_NOT_FOUND' ? 'not-found' : 'unavailable';
      // The document loader owns a retryable unavailable region. Do not feed an empty population
      // into charts and counters after a failed analytical read.
      if (dataStanding === 'unavailable' && surface !== 'pr') throw Object.assign(new Error('E_ANALYTICAL_UNAVAILABLE'), { code: 'E_ANALYTICAL_UNAVAILABLE' });
      data = null;
    }
  }
  const entitlement = entitlementFromData(viewer, scope, repositories, data, expected);
  entitlement.contractScope = contractScope;
  entitlement.namespaceEstablished = scope.kind !== 'namespace' || contractScope.kind === 'namespace' || Boolean(detailRepository);
  const retained = retainedRepositories.length > 0;
  const lifecycle = retained
    ? { standing: 'available', source: 'retained-analytical-records', coverageFrom: coverage.first, repositories: retainedRepositories.length, pathlessOnly }
    : { standing: 'unavailable', reason: ids.length === 0 ? 'no repository in this scope has history enabled' : 'lifecycle and merged populations are not retained for this scope yet; the App collects them as pull requests arrive', coverageFrom: null, repositories: 0, pathlessOnly };
  // The record population: retained rows from the surface that carries them, else the pathless analyses by analysis time.
  let pullRequests = new Map();
  let truncated = false;
  const rows = retained && dataStanding === 'available' ? retainedRows(surface, data.result) : [];
  if (retained && rows.length > 0) {
    const firstChanged = new Map((data.result.development ?? []).map(entry => [`${entry.repositoryId}#${entry.pullRequest}`, entry.first]));
    for (const row of rows) pullRequests.set(`${row.repositoryId}#${row.pullRequest}`, fromRetained(row, { first: firstChanged.get(`${row.repositoryId}#${row.pullRequest}`) }));
  } else if (!retained && ids.length > 0) {
    const analysis = await runtime.store.analyses(ids, window.previousFrom, window.to);
    pullRequests = groupPullRequests(analysis.records);
    truncated = analysis.truncated;
  }
  attachTitles(pullRequests, titles.byRepository);
  const current = periodStats({ pullRequests, lifecycle, from: window.from, to: window.to });
  const previous = periodStats({ pullRequests, lifecycle, from: window.previousFrom, to: window.from });
  const fileRows = Array.isArray(data?.result?.files) ? data.result.files.filter(row => Array.isArray(row.contributions)) : [];
  let fileIdentity;
  if (fileLocator && detailRepository && data && runtime.locator?.plausible(fileLocator)) {
    const inPeriod = await runtime.locator.resolve(fileLocator, fileRows);
    fileIdentity = inPeriod ?? await runtime.locator.resolve(fileLocator, runtime.analytics.service.fileCandidates(data, detailRepository.repositoryId));
  }
  const selectedFileRow = fileIdentity && fileRows.find(row => row.repositoryId === fileIdentity.repositoryId && row.path === fileIdentity.path);
  // File rows come from the premium extension; a detail route must not derive the unrelated Files ranking just to resolve its handle.
  const projectionRows = fileLocator ? (selectedFileRow ? [selectedFileRow] : []) : fileRows;
  const files = entitlement.premium && surface !== 'pr' && runtime.premium.projection ? await runtime.premium.projection.mapFiles(projectionRows, viewer, runtime) : [];
  const href = (path, patch = {}) => link(state, path, patch);
  // The plan decides who is entitled; the build decides whether the premium implementation exists. A premium slot renders only when both hold.
  const premiumProvided = runtime.premium.provided, premiumHere = entitlement.premium && premiumProvided;
  return { state, scope, repositories, historyRepositories, retainedRepositories, ids, actor, contractScope, nowIso, period, periods: Object.values(PERIODS), window, pullRequests, lifecycle, current, previous, bounds, coverage, truncated, entitlement, premiumProvided, premiumHere, data, dataStanding, files, fileIdentity, titles, href, viewer };
}

/** A second surface read for a page that composes two (a premium file panel beside the page's pull-request model). */
export async function loadSurface(view, runtime, surface, detail = {}) {
  if (view.ids.length === 0) return null;
  const scope = ['pr', 'file'].includes(surface) ? { kind: 'repository', repositoryId: view.ids[0] } : view.contractScope;
  try { return await runtime.analytics.query({ surface, repositoryIds: view.ids, from: view.window.from, to: view.window.to, scope, ...detail }, view.actor, surface === 'file' ? view.data : undefined); }
  catch { return null; }
}

/** Which rows a surface result carries as its pull-request population. */
function retainedRows(surface, result) {
  if (!result) return [];
  if (surface === 'prs') return result.pullRequests ?? [];
  if (surface === 'history') {
    const seen = new Map();
    for (const bucket of result.buckets ?? []) for (const row of bucket.pullRequests ?? []) seen.set(`${row.repositoryId}#${row.pullRequest}`, row);
    return [...seen.values()];
  }
  if (surface === 'overview') return result.activity ?? [];
  return [];
}

/** The scope line under every page title: repositories · with history · period · updated. */
export function scopeLine(view) {
  const count = view.repositories.length;
  const latest = view.coverage?.latest ?? view.bounds.latest;
  return { repositories: `${count} ${count === 1 ? 'repository' : 'repositories'}`, withHistory: `${view.historyRepositories.length} with history`, period: view.period.label, latest };
}

/** Navigation facts: the active section and the counts the sections carry. */
export function navModel(view, section) {
  const active = view.lifecycle.standing === 'available' && ['prs', 'overview'].includes(section) ? [...view.pullRequests.values()].filter(pr => pr.state === 'open' || pr.state === 'draft').length : null;
  return { section, active, premium: view.entitlement.premium };
}

export function repositoryByFullName(viewer, fullName) { return viewer.repositories.find(repository => repository.fullName === fullName); }

/** A namespace's plan label for the navigation; the viewer's own namespaces follow the viewer. */
export function namespacePlan(viewer, namespace) { return namespace.yours ? viewer.plan : namespace.plan; }

export { PLAN_RANK };
