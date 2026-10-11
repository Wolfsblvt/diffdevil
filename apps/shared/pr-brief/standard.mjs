// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The standard brief as one call: the useful basic report (current change, optional basic repository history), joined
 * by an eligible premium provider's context when one is present. Every module reports its standing so preview and
 * administration can say why something is absent instead of showing an empty block or a false “no related PRs”.
 */
import { composeBrief, measurementState } from './compose.mjs';
import { CONTEXT_MODULES, briefKit, readProvider } from './contract.mjs';

/**
 * @param {object} input
 * @param {object} input.current      currentFacts(…) for the subject comparison
 * @param {object} input.settings     readBriefSettings(…)
 * @param {object} [input.history]    { standing: 'available', facts } | { standing, reason }
 * @param {object} [input.premium]    { provider, eligible: true, facts | input } | { provider, eligible: false, reason }
 */
export function standardBrief({ current, settings, history, premium, links, snapshot, kit = briefKit() }) {
  const state = measurementState(current);
  const standings = [{ id: 'current', tier: 'basic', standing: 'shown' }];
  const historyFacts = history?.standing === 'available' ? history.facts : null;
  standings.push(historyFacts ? { id: 'history', tier: 'basic', standing: 'shown' } : { id: 'history', tier: 'basic', standing: history?.standing ?? 'consent-required', reason: history?.reason ?? 'history-off' });
  let contributions = [];
  const provider = readProvider(premium?.provider);
  if (!provider) for (const id of CONTEXT_MODULES) standings.push({ id, tier: 'premium', standing: 'not-provided', reason: 'premium-not-in-build' });
  else if (!premium.eligible) for (const id of CONTEXT_MODULES) standings.push({ id, tier: 'premium', standing: 'ineligible', reason: premium.reason });
  else if (state === 'unavailable') for (const id of CONTEXT_MODULES) standings.push({ id, tier: 'premium', standing: 'suppressed', reason: 'current-file-population-unavailable' });
  else {
    const facts = premium.facts ?? provider.facts(kit, { ...premium.input, current });
    contributions = provider.contributions(kit, { current, facts, state, links }, new Set(settings.modules));
    for (const item of contributions) standings.push({ id: item.id, tier: 'premium', standing: item.standing, ...(item.reason ? { reason: item.reason } : {}) });
  }
  const composed = composeBrief({ current, history: historyFacts, contributions: contributions.filter(item => item.standing === 'shown'), links, snapshot }, { priority: settings.priority });
  for (const id of composed.trimmed) {
    const row = standings.find(item => item.id === id);
    if (row) Object.assign(row, { standing: 'trimmed', reason: 'body-budget' });
  }
  return { route: 'standard', state, markdown: composed.markdown, bytes: composed.bytes, trimmed: composed.trimmed, modules: standings };
}
