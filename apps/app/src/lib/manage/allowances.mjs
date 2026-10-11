// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The repository allowances Manage counts against. The hosted offer (docs/app-plans.md) pools three private and ten
 * public-with-history repositories on Free across the personal account and its one connected organisation, and gives
 * each Pro organisation three private repositories; Pro personal and Business scopes have no repository-count limit.
 * A Community operator chooses its own limits, and without a subscription source there are none: `APP_PLAN_ALLOWANCES`
 * (JSON) overrides either default, so the hosted numbers are operator configuration rather than a constant the App
 * silently hardens. `free.importPullRequests` is how many recent pull requests one Free import reaches (D059: up to
 * 100 per selected repository import); a monthly import budget is launch configuration not settled yet, so none exists.
 */

export const HOSTED_ALLOWANCES = Object.freeze({ free: Object.freeze({ private: 3, publicHistory: 10, importPullRequests: 100 }), proOrganisation: Object.freeze({ private: 3 }) });
export const NO_ALLOWANCES = Object.freeze({ free: Object.freeze({ private: null, publicHistory: null, importPullRequests: null }), proOrganisation: Object.freeze({ private: null }) });

const bounded = value => (value === null || value === undefined ? null : Number.isSafeInteger(value) && value >= 0 ? value : undefined);

/** `hosted` means a subscription source is connected, so the hosted offer's limits apply unless the operator says otherwise. */
export function readAllowances(value, { hosted = false } = {}) {
  const base = hosted ? HOSTED_ALLOWANCES : NO_ALLOWANCES;
  if (value === undefined || value === null || value === '') return { ...base, source: hosted ? 'hosted-offer' : 'none' };
  let parsed;
  try { parsed = typeof value === 'string' ? JSON.parse(value) : value; } catch { return { ...base, source: hosted ? 'hosted-offer' : 'none', invalid: true }; }
  const free = { private: bounded(parsed?.free?.private), publicHistory: bounded(parsed?.free?.publicHistory), importPullRequests: bounded(parsed?.free?.importPullRequests) };
  const proOrganisation = { private: bounded(parsed?.proOrganisation?.private) };
  if ([free.private, free.publicHistory, free.importPullRequests, proOrganisation.private].includes(undefined)) return { ...base, source: hosted ? 'hosted-offer' : 'none', invalid: true };
  return { free: Object.freeze(free), proOrganisation: Object.freeze(proOrganisation), source: 'operator' };
}
