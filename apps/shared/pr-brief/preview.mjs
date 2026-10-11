// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The truthful brief preview: what the effective trusted configuration would post, rendered over the explicitly
 * synthetic r4.1 fixture in every reading state. When the effective trusted policy is observed, the synthetic evidence
 * is evaluated through that policy, so the bands, thresholds, exclusions and their explanation are the policy's own;
 * only the files, numbers and titles are synthetic. Without an observed policy the preview is labelled as the design
 * specimen and never borrows a policy identity. It names the effective route, policy source and expected writer, and
 * why each module is or is not present for this repository. It never posts, migrates ownership, enables history or
 * grants an entitlement; `effects: 'none'` is part of its contract.
 */
import { analyzeChanges, evaluatePolicy, parsePatch, unwrap } from '@wolfsblvt/diffdevil';
import { composeBrief, composeFinalSummary } from './compose.mjs';
import { currentFacts } from './facts.mjs';
import { FIXTURE_LINKS, FIXTURE_SNAPSHOT, fixtureContextFacts, fixtureCurrent, fixtureEvidence, fixtureHistory } from './fixture.mjs';
import { standardBrief } from './standard.mjs';

export const PREVIEW_STATES = Object.freeze(['exact', 'bounded', 'partial', 'unknown', 'context-unavailable', 'file-population-unavailable']);
const EFFECTIVE_NOTICE = 'Synthetic example evidence (pr-brief-r4.1 fixture, example/relay #452) evaluated through this repository’s effective trusted policy. The files, numbers and titles are not from this repository; the policy result, exclusions, module standing and route are.';
const SPECIMEN_NOTICE = 'Design specimen (pr-brief-r4.1 fixture, example/relay #452). The effective trusted policy was not observed, so the bands, thresholds and exclusions shown are the design’s size@1 specimen, not this repository’s policy. The route and module standing are this repository’s.';

/** The fixture's current comparison in one state, evaluated through the observed policy (`{ compiled, document, name }`). */
export function effectiveCurrent(policy, state) {
  const evidence = fixtureEvidence(state);
  const changes = evidence.changes.map(change => change.patch === undefined ? change : { ...change, patch: parsePatch(change.patch) });
  const report = unwrap(evaluatePolicy(policy.compiled, unwrap(analyzeChanges(changes, { source: evidence.source, fileSet: evidence.fileSet })), { phase: 'analyze' })).report;
  return currentFacts(report, { policyDocument: policy.document, policyName: policy.name ?? null });
}

/**
 * @param {object} input
 * @param {object} input.settings     readBriefSettings(…) — the stored or proposed settings
 * @param {object} input.route        resolveBriefRoute(…) — effective route and its reason
 * @param {object} input.source       { standing, kind, identity, policyId } of the effective trusted policy
 * @param {object} [input.policy]     { compiled, document, name } of that same observed policy
 * @param {object} input.writer       { login, confidence } of the expected comment author
 * @param {object} input.eligibility  { history: { standing, reason? }, premium: { eligible, reason? } }
 * @param {object} [input.provider]   the premium provider when this build joins one
 */
export function previewBrief({ settings, route, source, policy = null, writer, eligibility, provider = null }) {
  const effective = source?.standing === 'observed' && policy?.compiled && policy?.document ? policy : null;
  const evaluation = effective ? { kind: 'effective-policy', policyId: source.policyId } : { kind: 'design-specimen', reason: source?.standing === 'observed' ? 'effective-policy-not-supplied' : 'effective-policy-unobserved' };
  const current = state => effective ? effectiveCurrent(effective, state) : fixtureCurrent(state);
  const base = { kind: 'diffdevil.pr-brief-preview', version: 2, design: 'pr-brief-r4.1', synthetic: true, evaluation, notice: effective ? EFFECTIVE_NOTICE : SPECIMEN_NOTICE, effects: 'none',
    route, source, writer, settings, finalSummary: settings.finalSummary ? 'enabled' : 'disabled' };
  if (route.effective !== 'standard') return { ...base, states: {}, modules: [] };
  const history = eligibility.history?.standing === 'available' ? { standing: 'available', facts: fixtureHistory() } : eligibility.history;
  // Current neighbours need no history; without history consent the historical families are unavailable, not empty.
  const contextFacts = fixtureContextFacts();
  const facts = history?.standing === 'available' ? contextFacts
    : { ...contextFacts, population: null, files: null, cochange: null, historyReason: eligibility.history?.reason ?? 'history-off' };
  const premium = { provider, eligible: eligibility.premium?.eligible === true, reason: eligibility.premium?.reason, facts };
  const states = {};
  for (const state of ['exact', 'bounded', 'partial', 'unknown']) {
    const result = standardBrief({ current: current(state), settings, history, premium, links: FIXTURE_LINKS, snapshot: FIXTURE_SNAPSHOT });
    states[state] = { markdown: result.markdown, bytes: result.bytes, modules: result.modules };
  }
  // Context unavailable: the same exact change with no context or history, which must stay a complete useful report.
  const basic = standardBrief({ current: current('exact'), settings, history: { standing: 'unavailable', reason: 'context-unavailable' },
    premium: { provider, eligible: false, reason: 'context-unavailable' }, links: FIXTURE_LINKS, snapshot: FIXTURE_SNAPSHOT });
  states['context-unavailable'] = { markdown: basic.markdown, bytes: basic.bytes, modules: basic.modules };
  const missing = composeBrief({ current: current('unavailable'), history: null, contributions: [], links: FIXTURE_LINKS, snapshot: FIXTURE_SNAPSHOT });
  states['file-population-unavailable'] = { markdown: missing.markdown, bytes: missing.bytes, modules: [{ id: 'current', tier: 'basic', standing: 'shown' }] };
  return { ...base, modules: states.exact.modules, states,
    staleHead: 'When the head moves, the existing comment stays unchanged and keeps its old comparison identity in its details until a fresh evaluation of the new head replaces it. No stale banner is written; the check reports the pending head.',
    ...(settings.finalSummary ? { finalSummaryMarkdown: composeFinalSummary({ current: current('exact'), links: FIXTURE_LINKS }) } : {}) };
}
