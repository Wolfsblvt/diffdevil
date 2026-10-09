// SPDX-License-Identifier: AGPL-3.0-only
/**
 * One loader for every analytical page: URL state, authorised scope, period window, the
 * retained analyses for this and the previous period, transient lifecycle facts, and the
 * entitlement that decides whether premium panels or their Free counterparts render.
 */
import { readViewState, describeScope, periodOf, link, PERIODS } from './scope.mjs';
import { scopeRepositories, loadLifecycle } from './viewer.mjs';
import { groupPullRequests, attachLifecycle, periodStats, DAY } from './derive.mjs';

/**
 * Entitlement on screen follows the namespace: the viewer's own namespaces follow the viewer's
 * plan; a shared paid namespace keeps its plan inside its own scope. Across all repositories,
 * premium aggregates follow the viewer's plan, so a Free viewer never receives a premium
 * cross-repository analysis assembled from other people's paid namespaces.
 */
export function entitlementFor(viewer, scope, repositories) {
  const planOf = namespace => {
    const entry = viewer.namespaces.find(candidate => candidate.login === namespace);
    return entry?.yours ? viewer.plan : entry?.plan ?? 'Free';
  };
  const premiumRepositories = repositories.filter(repository => repository.standing?.historyEnabled && planOf(repository.owner) !== 'Free');
  if (scope.kind === 'all') {
    const premium = viewer.plan !== 'Free' && premiumRepositories.length > 0;
    return { premium, plan: viewer.plan, premiumRepositories: premium ? premiumRepositories : [], sharedPaid: viewer.plan === 'Free' ? [...new Set(premiumRepositories.map(repository => repository.owner))] : [] };
  }
  const plan = planOf(scope.namespace);
  return { premium: plan !== 'Free' && premiumRepositories.length > 0, plan, premiumRepositories, sharedPaid: [] };
}

export async function loadView({ url, viewer, session, runtime }) {
  const state = readViewState(url);
  const scope = describeScope(state.s);
  const repositories = scopeRepositories(viewer, scope);
  const nowIso = runtime.now();
  const period = periodOf(state);
  const nowMs = Date.parse(nowIso);
  const window = { from: new Date(nowMs - period.days * DAY).toISOString(), to: nowIso, previousFrom: new Date(nowMs - 2 * period.days * DAY).toISOString() };
  const ids = repositories.map(repository => repository.repositoryId);
  const [analysis, bounds, lifecycle] = await Promise.all([
    runtime.store.analyses(ids, window.previousFrom, window.to),
    runtime.store.observationBounds(ids),
    loadLifecycle({ reads: session.reads, repositories, cache: runtime.cache, userId: viewer.userId })
  ]);
  const pullRequests = attachLifecycle(groupPullRequests(analysis.records), lifecycle.byRepository);
  const current = periodStats({ pullRequests, lifecycle, from: window.from, to: window.to });
  const previous = periodStats({ pullRequests, lifecycle, from: window.previousFrom, to: window.from });
  const historyRepositories = repositories.filter(repository => repository.standing?.historyEnabled);
  const entitlement = entitlementFor(viewer, scope, repositories);
  const href = (path, patch = {}) => link(state, path, patch);
  return { state, scope, repositories, historyRepositories, nowIso, period, periods: Object.values(PERIODS), window, pullRequests, lifecycle, current, previous, bounds, truncated: analysis.truncated, entitlement, href, viewer };
}

/** The scope line under every page title: repositories · with history · period · updated. */
export function scopeLine(view) {
  const count = view.repositories.length;
  return { repositories: `${count} ${count === 1 ? 'repository' : 'repositories'}`, withHistory: `${view.historyRepositories.length} with history`, period: view.period.label, latest: view.bounds.latest };
}

/** Navigation facts: the active section and the counts the sections carry. */
export function navModel(view, section) {
  const active = view.lifecycle.standing === 'available' ? view.lifecycle.all.filter(pull => pull.state === 'open' || pull.state === 'draft').length : null;
  return { section, active, premium: view.entitlement.premium };
}

export function repositoryByFullName(viewer, fullName) { return viewer.repositories.find(repository => repository.fullName === fullName); }
