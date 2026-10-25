// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Temporary, one-decision reinterpretation of authorized final merged comparisons. No effects or stored results. */
import { compilePolicy, evaluatePolicy, explainPolicy, unwrap } from '@wolfsblvt/diffdevil';
import { stringify } from 'yaml';

const threshold = /^(metrics\.[A-Za-z_][A-Za-z0-9_-]*|totals\.(?:lines|raw|files)\.[A-Za-z]+)\s*(>=|<=|>|<)\s*(-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][+-]?\d+)?)$/u;
const numeric = /^(metrics\.[A-Za-z_][A-Za-z0-9_-]*|totals\.(?:lines|raw|files)\.[A-Za-z]+)$/u;
const error = code => Object.assign(new Error(code), { code });

/** Only existing numeric decisions can become an editor. Expressions remain authored policy. */
export function policyDecisions(document) {
  const bands = Object.entries(document.bands ?? {}).filter(([, band]) => numeric.test(band.value)).map(([id, band]) => ({
    key: `band:${id}`, kind: 'band', id, metric: band.value, ranges: band.ranges, minimum: band.minimum ?? null
  }));
  const rules = Object.entries(document.rules ?? {}).flatMap(([id, rule]) => {
    const match = typeof rule.when === 'string' && threshold.exec(rule.when);
    return match ? [{ key: `rule:${id}`, kind: 'rule', id, metric: match[1], operator: match[2], threshold: Number(match[3]) }] : [];
  });
  return [...bands, ...rules];
}

function metricValue(report, path) { return path.split('.').reduce((value, key) => value?.[key], report); }
function classification(report, decision) {
  const result = decision.kind === 'band' ? report.bands?.[decision.id] : report.rules?.[decision.id];
  if (decision.kind === 'band') return result?.status === 'resolved' ? result.id : null;
  return ['matched', 'unmatched'].includes(result?.disposition) ? result.disposition : null;
}

/** Candidate input contains numbers and an allowlisted retained metric, never executable expressions. */
export function proposePolicy(document, decision, input, metrics) {
  const candidate = structuredClone(document);
  const metric = input?.metric ?? decision.metric;
  if (!metrics.includes(metric)) throw error('E_POLICY_LAB_METRIC');
  if (decision.kind === 'rule') {
    if (!Number.isFinite(input?.threshold)) throw error('E_POLICY_LAB_THRESHOLD');
    candidate.rules[decision.id].when = `${metric} ${decision.operator} ${input.threshold}`;
  } else {
    if (!Array.isArray(input?.limits) || input.limits.length !== decision.ranges.length - 1
      || input.limits.some(value => !Number.isFinite(value))) throw error('E_POLICY_LAB_BANDS');
    candidate.bands[decision.id] = { ...candidate.bands[decision.id], value: metric,
      ranges: decision.ranges.map((range, index) => range.otherwise ? { ...range } : { ...range, lt: input.limits[index] }) };
  }
  // The engine owns ordering, minimums, interval semantics and every other policy constraint.
  return { document: candidate, compiled: unwrap(compilePolicy(candidate)) };
}

function adoption(document, proposed, decision, repository, head, origin) {
  const section = decision.kind === 'band' ? 'bands' : 'rules';
  const snippet = value => stringify({ [section]: { [decision.id]: value[section][decision.id] } });
  const before = snippet(document), after = snippet(proposed);
  return { path: `/${section}/${decision.id}`, origin, before, after,
    patch: `--- current effective policy\n+++ .diffdevil.yml (merge this declaration)\n${before.trimEnd().split('\n').map(line => `-${line}`).join('\n')}\n${after.trimEnd().split('\n').map(line => `+${line}`).join('\n')}\n`,
    context: stringify(proposed),
    url: origin === 'trusted-base' ? `https://github.com/${repository}/blob/${head}/.diffdevil.yml`
      : `https://github.com/${repository}/new/${head}?filename=.diffdevil.yml` };
}

/** The caller supplies a freshly authorized viewer; history standing is checked before and after asynchronous reads. */
export async function policyLab({ repository, from, to, policies, store, input = null, canRead }) {
  if (!await canRead()) throw error('E_POLICY_LAB_ACCESS');
  if (![from, to].every(value => typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value) || from >= to) throw error('E_POLICY_LAB_WINDOW');
  const [policy, records] = await Promise.all([policies.current({ repositoryId: repository.repositoryId }), store.analyticalRecords(repository.repositoryId)]);
  if (!await canRead()) throw error('E_POLICY_LAB_ACCESS');
  const population = records.filter(record => record.repositoryId === repository.repositoryId && record.state === 'merged' && record.mergedAt >= from && record.mergedAt < to);
  const populationBytes = new TextEncoder().encode(JSON.stringify([...population].sort((a, b) => a.pullRequest - b.pullRequest)
    .map(record => [record.pullRequest, record.mergedAt, record.final?.report ?? null])));
  const populationId = [...new Uint8Array(await crypto.subtle.digest('SHA-256', populationBytes))].map(byte => byte.toString(16).padStart(2, '0')).join('');
  const basis = { repository: repository.fullName, repositoryId: repository.repositoryId, from, to, population: population.length,
    populationId,
    reportVersions: [...new Set(population.flatMap(record => record.final?.report ? [record.final.report.schemaVersion] : []))],
    measurementVersions: [...new Set(population.flatMap(record => record.final?.report ? [record.final.report.semantics?.replacementLines ?? 'unavailable'] : []))],
    semantics: policy.compiled?.semantics ?? null,
    recovered: population.filter(record => record.final?.report).length, coverage: 'retained observations; not complete repository history',
    policyId: policy.id, trustedHead: policy.trustedHead ?? null, source: policy.sourceIdentity ?? null, origin: policy.origin ?? null, provenance: policy.provenance ?? {} };
  if (!policy.compiled) return { standing: 'unavailable', reason: policy.reason, code: policy.code, basis, decisions: [] };
  const document = policy.document ?? explainPolicy(policy.compiled).document;
  const decisions = policyDecisions(document);
  if (!decisions.length) return { standing: 'unsupported', reason: 'no-existing-numeric-decision', basis, decisions };
  if (input?.basis && (input.basis.policyId !== basis.policyId || input.basis.trustedHead !== basis.trustedHead
    || input.basis.from !== from || input.basis.to !== to || input.basis.repositoryId !== basis.repositoryId || input.basis.populationId !== populationId)) {
    return { standing: 'superseded', reason: 'policy-or-window-changed', basis, decisions };
  }
  const decision = input ? decisions.find(item => item.key === input.decision) : decisions[0];
  if (!decision) throw error('E_POLICY_LAB_DECISION');
  // One current evaluation per comparison, reused for the metric picker and transition account.
  const current = population.map(record => {
    if (!record.final?.report) return { record, reason: 'missing-retained-comparison' };
    try { return { record, report: unwrap(evaluatePolicy(policy.compiled, record.final.report)).report }; }
    catch { return { record, reason: 'incompatible-report-or-policy-version' }; }
  });
  const possibleMetrics = [decision.metric, ...Object.keys(document.metrics ?? {}).map(id => `metrics.${id}`)];
  const metrics = [...new Set(possibleMetrics)].filter(path => current.some(row => {
    const value = metricValue(row.report, path);
    return value && ['exact', 'bounded', 'unknown', 'unmeasurable'].includes(value.status);
  }));
  // Keep the existing value inspectable even when this period has no compatible evidence.
  if (!metrics.includes(decision.metric)) metrics.unshift(decision.metric);
  const proposal = input ?? { decision: decision.key, metric: decision.metric, threshold: decision.threshold,
    limits: decision.ranges?.filter(range => !range.otherwise).map(range => range.lt) };
  const candidate = proposePolicy(document, decision, proposal, metrics);
  const results = current.map(row => {
    const common = { pullRequest: row.record.pullRequest, mergedAt: row.record.mergedAt, comparisonId: row.record.final?.report?.source.comparisonId ?? null,
      reportVersion: row.record.final?.report?.schemaVersion ?? null, metricVersion: row.record.final?.report?.semantics?.replacementLines ?? null };
    if (row.reason) return { ...common, standing: 'unavailable', reason: row.reason };
    const metric = metricValue(row.report, proposal.metric ?? decision.metric);
    if (!metric) return { ...common, standing: 'unavailable', reason: 'selected-metric-unavailable' };
    let next;
    try { next = unwrap(evaluatePolicy(candidate.compiled, row.record.final.report)).report; }
    catch { return { ...common, standing: 'unavailable', reason: 'incompatible-report-or-policy-version', metric }; }
    const previous = classification(row.report, decision), proposed = classification(next, decision);
    if (previous === null || proposed === null) return { ...common, standing: 'unavailable', reason: 'insufficient-or-crossing-bounded-evidence', metric };
    return { ...common, previous, proposed, metric, standing: previous === proposed ? 'same' : 'changed' };
  });
  const classes = decision.kind === 'band' ? decision.ranges.map(range => range.id) : ['unmatched', 'matched'];
  const transitions = classes.flatMap(previous => classes.map(proposed => ({ previous, proposed,
    count: results.filter(row => row.previous === previous && row.proposed === proposed).length })));
  const reasons = [...new Set(results.filter(row => row.reason).map(row => row.reason))].map(reason => ({ reason, count: results.filter(row => row.reason === reason).length }));
  const changed = results.filter(row => row.standing === 'changed').length, same = results.filter(row => row.standing === 'same').length;
  const rank = value => classes.indexOf(value);
  results.sort((a, b) => Math.abs(rank(b.proposed) - rank(b.previous)) - Math.abs(rank(a.proposed) - rank(a.previous)) || b.mergedAt.localeCompare(a.mergedAt));
  return { standing: 'ready', basis, decisions, decision, metrics, proposal, candidateId: candidate.compiled.id,
    changed, same, unavailable: results.length - changed - same, classes, transitions, reasons, results,
    adoption: adoption(document, candidate.document, decision, repository.fullName, basis.trustedHead, policy.origin),
    providerMutationsReplayed: false };
}
