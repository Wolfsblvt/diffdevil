// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The explanatory states of Manage, derived from facts that stay separate in storage: provider reach, explicit
 * selection, execution consent, history consent, the latest delivery, the namespace's plan and its allowance. Nothing
 * here reads or writes; the loader (model.mjs) gathers the facts and the pages render these words. A state names what
 * is true and why; it never collapses "not recorded" into "off" or an unknown plan into Free.
 */

const POLICY_FAILURE = /^(E_APP_(POLICY|REPOSITORY_CONFIGURATION|ACCOUNT_POLICY)|E_EFFECTIVE_POLICY_UNAVAILABLE)$/u;
export const repositoryPath = repository => `/manage/repositories/${repository.fullName}`;
export const namespacePath = login => `/manage/repositories?ns=${encodeURIComponent(login)}`;

const removedOf = standing => Boolean(standing) && (['offboarding', 'removed'].includes(standing.state) || standing.accessState === 'removed');
export const isRemoved = repository => removedOf(repository.standing);
const suspendedOf = (standing, namespace) => (standing ? standing.installationState !== 'active' || standing.accessState === 'suspended' : namespace?.installation?.state === 'suspended');
/** A repository takes part in the private allowance while it is selected or already running, and has not left the installation. */
export function holdsSlot(repository) {
  const standing = repository.standing;
  return repository.private && Boolean(standing) && !removedOf(standing) && (standing.selected || standing.executionActive);
}
/** The administrator-visible failure of the latest delivery, when a policy could not be read. */
export function heldBy(standing) {
  const delivery = standing?.lastDelivery;
  if (!delivery || !standing.executionActive || typeof delivery.code !== 'string' || !POLICY_FAILURE.test(delivery.code)) return null;
  if (['E_APP_ACCOUNT_POLICY', 'E_EFFECTIVE_POLICY_UNAVAILABLE'].includes(delivery.code)) return 'The namespace\'s linked policy could not be read on the last pull request.';
  return delivery.code === 'E_APP_REPOSITORY_CONFIGURATION' ? 'The stored App settings could not be compiled.' : 'The repository\'s .diffdevil.yml could not be read as a valid policy on the last pull request.';
}

/**
 * Private-repository capacity of one scope: the pooled Free allowance (personal plus the connected organisation), one
 * Pro organisation's three slots, or no limit. Cells are named by the repository holding each slot.
 *
 * Selection refuses a repository beyond the limit, so a scope is over its limit only after a plan or connection
 * reduced it. Then diffdevil does not pick (D078): with the administrator's choice of what stays (`keep`, repository
 * IDs), the chosen repositories hold the slots and the others wait; without one, every counted repository waits and
 * nothing private runs in the scope until a choice is made. Public history over its places is the same: no place is
 * picked, collection pauses for all of them until some switch to labels only. The runtime's operating check
 * (operating.mjs) applies this same function, so what Manage shows is what executes.
 */
export function capacityOf(scope, { allowances, keep = null }) {
  const repositories = scope.repositories.filter(repository => repository.standing && !removedOf(repository.standing));
  const counted = repositories.filter(holdsSlot).sort((left, right) => (left.standing.selectedAt ?? '').localeCompare(right.standing.selectedAt ?? '') || left.fullName.localeCompare(right.fullName));
  const publicHistory = repositories.filter(repository => !repository.private && repository.standing.historyEnabled);
  const running = repositories.filter(repository => repository.standing.executionActive);
  const pooled = scope.pooled === true;
  if (['Unconnected', 'Unfunded', 'Unknown'].includes(scope.plan)) return { kind: 'none', plan: scope.plan, of: null, inSlot: [], waiting: [], over: false, running, publicHistory: { used: publicHistory.length, of: null, over: false, repositories: publicHistory }, pooled };
  const limit = scope.plan === 'Free' ? allowances.free.private : scope.plan === 'Pro' && scope.kind === 'org' ? allowances.proOrganisation.private : null;
  const publicOf = scope.plan === 'Free' ? allowances.free.publicHistory : null;
  const history = { used: publicHistory.length, of: publicOf, over: publicOf !== null && publicHistory.length > publicOf, repositories: publicHistory };
  if (limit === null) return { kind: 'unlimited', plan: scope.plan, of: null, inSlot: counted, waiting: [], over: false, running, publicHistory: history, pooled };
  if (counted.length <= limit) return { kind: 'slots', plan: scope.plan, of: limit, inSlot: counted, waiting: [], over: false, running, publicHistory: history, pooled };
  const kept = Array.isArray(keep) ? counted.filter(repository => keep.includes(repository.repositoryId)).slice(0, limit) : [];
  return { kind: 'slots', plan: scope.plan, of: limit, inSlot: kept, waiting: counted.filter(repository => !kept.includes(repository)), over: true, chosen: Array.isArray(keep), running, publicHistory: history, pooled };
}
export function capacityWord(capacity) {
  if (capacity.kind === 'none') return capacity.plan === 'Unfunded' ? 'no plan' : capacity.plan === 'Unknown' ? 'plan not established' : 'not connected';
  if (capacity.kind === 'unlimited') return 'no private limit';
  const open = capacity.of - capacity.inSlot.length;
  return capacity.waiting.length ? `full · ${capacity.waiting.length} waiting` : open ? `${open} open` : 'full';
}
export function capacityTone(capacity) {
  if (capacity.kind !== 'slots') return '';
  return capacity.waiting.length ? 'warn' : capacity.of - capacity.inSlot.length ? 'ok' : '';
}

/** The one explanatory state of a repository, with its reason. `capacity` is the scope's capacity (for the over-the-limit cells). */
export function describeRepository(repository, namespace, capacity, { freeConnectedLogin = null } = {}) {
  const standing = repository.standing;
  if (!standing) return { kind: 'unrecorded', label: 'Not recorded', tone: 'off', icon: 'circle-dashed', why: 'GitHub grants this repository, but the App has not recorded it yet. Its next delivery records it.', holdsSlot: false };
  if (removedOf(standing)) return { kind: 'removed', label: 'Removed from installation', tone: 'off', icon: 'x', why: `GitHub no longer gives diffdevil access. History is kept until ${standing.retainedUntil ? fmtDay(standing.retainedUntil) : 'the offboarding period ends'}, then removed.`, holdsSlot: false };
  if (suspendedOf(standing, namespace)) return { kind: 'stopped', label: 'Stopped', tone: 'err', icon: 'circle-alert', why: `The GitHub App installation on ${namespace.login} is suspended. Nothing runs; retained history is kept.`, holdsSlot: holdsSlot(repository) };
  if (namespace.plan === 'Unfunded') return { kind: 'unfunded', label: 'No plan', tone: 'off', icon: 'circle-dashed', why: `${namespace.login} has no slot. Fund it with one, or another administrator can connect it as the one organisation on their Free account.`, holdsSlot: false };
  if (namespace.plan === 'Unconnected') return { kind: 'unconnected', label: 'Not connected', tone: 'off', icon: 'clock', why: freeConnectedLogin ? `Free connects one organisation, and yours is ${freeConnectedLogin}.` : 'Free connects one organisation. Connect this one to run its repositories on your allowance.', holdsSlot: false };
  if (namespace.plan === 'Unknown') return { kind: 'unknown', label: 'Plan not established', tone: 'off', icon: 'circle-dashed', why: 'The plan funding this namespace could not be established right now; nothing is changed until it is.', holdsSlot: holdsSlot(repository) };
  const held = heldBy(standing);
  if (held) return { kind: 'held', label: 'Held', tone: 'err', icon: 'circle-alert', why: `${held} Nothing is written until it is valid again; diffdevil does not fall back to defaults.`, holdsSlot: true };
  const waiting = capacity?.waiting.some(candidate => candidate.repositoryId === repository.repositoryId) === true;
  if (waiting && capacity.over) {
    // Over the allowance after a reduction: held by the runtime itself, not only shown here (operating.mjs).
    const why = capacity.chosen
      ? `Not among the private repositories you chose to keep. Nothing runs here; history and settings stay. Swap it in for one you kept to run it.`
      : `${capacity.inSlot.length + capacity.waiting.length} private repositories hold places and the plan now allows ${capacity.of}. diffdevil doesn't pick: none of them runs until you choose what stays.`;
    return { kind: 'overAllowance', label: 'Over the allowance', tone: 'warn', icon: 'pause', why, holdsSlot: true, overLimit: true };
  }
  if (standing.executionActive) {
    const historyHeld = !repository.private && standing.historyEnabled && capacity?.publicHistory?.over === true;
    const base = historyHeld ? { kind: 'labels', label: 'History paused', tone: 'warn', icon: 'pause', why: `Size labels and the check run. ${capacity.publicHistory.used} public repositories have history and the plan allows ${capacity.publicHistory.of}, so collection is paused for all of them until some switch to Labels only. Retained history stays.`, holdsSlot: false, historyHeld: true }
      : standing.historyEnabled ? { kind: 'active', label: 'Running', tone: 'ok', icon: 'circle-check', why: 'Size labels, the check and history.', holdsSlot: repository.private }
        : repository.private ? { kind: 'active', label: 'Running', tone: 'ok', icon: 'circle-check', why: 'Size labels and the check. No history is collected.', holdsSlot: true }
          : { kind: 'labels', label: 'Labels only', tone: '', icon: 'tag', why: 'Size labels and the check run. No history is collected.', holdsSlot: false };
    return base;
  }
  if (waiting) return { kind: 'inactive', label: 'Over the limit', tone: 'warn', icon: 'pause', why: 'Every private slot is taken. Swap it in for another repository to run it.', holdsSlot: true };
  if (standing.executionReason === 're-consent-required' && (standing.selected || standing.writerStanding !== 'unverified')) return { kind: 'reconsent', label: 'Enable again', tone: 'warn', icon: 'clock', why: 'Access to this repository was interrupted and restored. Review its policy, then enable it again; nothing restarts by itself.', holdsSlot: repository.private };
  if (standing.selected) return { kind: 'pending', label: 'Pending enable', tone: 'warn', icon: 'clock', why: repository.private ? 'Holds a slot but isn\'t running yet. Review its policy, then enable.' : 'Selected but not running yet. Review its policy, then enable.', holdsSlot: repository.private };
  if (standing.executionReason === 'explicitly-disabled') return { kind: 'stoppedByYou', label: 'Stopped', tone: '', icon: 'pause', why: standing.executionOrigin === 'plan-change' ? 'Stopped when the plan changed: it was not among what you chose to keep. Labels and the check don\'t run; retained history and settings are kept.' : 'Stopped by an administrator. Labels and the check don\'t run; retained history is kept.', holdsSlot: false };
  return { kind: 'available', label: 'Not selected', tone: 'off', icon: 'circle-dashed', why: 'The GitHub App can reach it. It doesn\'t run until you select it.', holdsSlot: false };
}
export const RUNNING_KINDS = new Set(['active', 'labels', 'pending', 'held', 'stopped', 'reconsent', 'overAllowance']);
export const isEnabledGroup = state => RUNNING_KINDS.has(state.kind);

function fmtDay(iso) { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); }

/**
 * Needs you: only decisions. Imports, enrichment and ordinary waiting stay on their repository. Each item names where
 * the decision is made. `model` is the loaded Manage model (model.mjs).
 */
export function attentionItems(model) {
  const items = [];
  const commercial = model.commercial?.status;
  const tier = model.viewerPlan;
  if (commercial?.linked && commercial.commercial?.grace?.renewal === 'payment-due') items.push({ tone: 'err', title: `Your ${tier} renewal is overdue`, detail: `Pay at Wolfsblvt Works to keep ${tier}. The subscription ends if payment isn't confirmed.`, go: 'Plan & funding', href: '/manage/plan' });
  for (const namespace of model.namespaces) {
    if (namespace.installation.state === 'suspended') items.push({ tone: 'err', title: `GitHub App installation suspended on ${namespace.login}`, detail: 'Nothing runs there. Retained history is kept. Resolve it in GitHub.', go: 'Repositories', href: namespacePath(namespace.login) });
    if (namespace.funding.kind === 'paused') items.push({ tone: 'warn', title: `${namespace.plan} is paused in ${namespace.login}`, detail: model.serviceConnection === 'disconnected' ? 'We can\'t confirm you still administer it, because your GitHub funding connection is disconnected. Your funding is unchanged.' : 'We can\'t confirm you still administer it right now. Your funding is unchanged.', go: model.serviceConnection === 'disconnected' ? 'Reconnect' : 'Account', href: '/manage/account' });
    for (const repository of namespace.repositories) {
      const state = repository.state;
      if (state.kind === 'held') items.push({ tone: 'err', title: `${repository.fullName} is held: invalid configuration`, detail: 'No labels or check are written until the policy is valid again.', go: 'Open', href: repositoryPath(repository) });
      if (state.kind === 'pending') items.push({ tone: 'warn', title: `${repository.fullName} is waiting to be enabled`, detail: 'Review the effective policy, then enable it.', go: 'Review', href: repositoryPath(repository) });
      if (state.kind === 'reconsent') items.push({ tone: 'warn', title: `${repository.fullName} needs enabling again`, detail: 'Access was interrupted and restored; review the policy, then enable it again.', go: 'Review', href: repositoryPath(repository) });
      if (state.kind === 'removed') items.push({ tone: 'warn', title: `${repository.fullName} left the installation`, detail: `History kept until ${repository.standing?.retainedUntil ? fmtDay(repository.standing.retainedUntil) : 'the offboarding period ends'}. Export or delete it before then, or do nothing.`, go: 'Open', href: repositoryPath(repository) });
    }
  }
  const unchosen = model.namespaces.flatMap(namespace => namespace.repositories.filter(repository => repository.state.kind === 'overAllowance'));
  const seen = new Set();
  const overScopes = model.namespaces.filter(namespace => namespace.capacity?.over && !namespace.capacity.chosen && !seen.has(namespace.capacity) && seen.add(namespace.capacity));
  if (overScopes.length) items.push({ tone: 'warn', title: `Choose what stays: ${overScopes.map(namespace => namespace.capacity.pooled ? 'your Free allowance' : namespace.login).join(', ')} ${overScopes.length === 1 ? 'is' : 'are'} over the private limit`, detail: `${unchosen.length} private ${unchosen.length === 1 ? 'repository doesn\'t' : 'repositories don\'t'} run until you choose which stay. Their history and settings are kept.`, go: 'Choose', href: '/manage/plan#choose' });
  const historyOver = [...new Set(model.namespaces.map(namespace => namespace.capacity?.publicHistory).filter(places => places?.over))];
  for (const places of historyOver) items.push({ tone: 'warn', title: `${places.used} public repositories have history; the plan allows ${places.of}`, detail: 'History collection is paused for all of them until some switch to Labels only. Labels and the check keep running.', go: 'Repositories', href: '/manage/repositories' });
  for (const namespace of model.namespaces.filter(candidate => candidate.administration?.kind === 'delegate')) {
    const readOnly = namespace.repositories.filter(repository => repository.state.readOnlyForYou);
    if (readOnly.length) items.push({ tone: 'warn', title: `You can't manage diffdevil on ${readOnly.length === 1 ? readOnly[0].fullName : `${readOnly.length} repositories of ${namespace.login}`}`, detail: `You were named a diffdevil administrator, but GitHub gives you read access ${readOnly.length === 1 ? 'there' : `to ${readOnly.map(repository => repository.name).join(', ')}`}, not write. Managing diffdevil on a repository needs write access on GitHub; ask the GitHub administrators of ${namespace.login}.`, go: 'Repositories', href: namespacePath(namespace.login) });
  }
  const inactive = model.namespaces.flatMap(namespace => namespace.repositories.filter(repository => repository.state.kind === 'inactive'));
  if (inactive.length) items.push({ tone: 'warn', title: `${inactive.length} private ${inactive.length === 1 ? 'repository is' : 'repositories are'} over the allowance`, detail: `${inactive.map(repository => repository.fullName).join(', ')} ${inactive.length === 1 ? 'won\'t' : 'won\'t'} run until a slot is free.`, go: 'Swap', href: `${namespacePath(inactive[0].owner)}&swap=${encodeURIComponent(inactive[0].fullName)}` });
  if (commercial?.linked) {
    const open = (commercial.capacity ?? []).filter(slot => !slot.binding);
    if (open.length) items.push({ tone: 'warn', title: `${open.length === 1 ? `Slot ${open[0].slot.replace(/^slot-/u, '')} is` : `${open.length} slots are`} open: you pay for ${open.length === 1 ? 'it, it funds' : 'them, they fund'} nothing`, detail: 'Fund an organisation you administer, or remove the slot at renewal.', go: 'Plan & funding', href: '/manage/plan' });
  }
  return items;
}
