// SPDX-License-Identifier: AGPL-3.0-only

export const HISTORY_QUERY_VERSION = 1;
export const BASELINE_ORDINAL_BELOW = 20;
export const QUANTILE_METHOD = 'nearest-rank-v1';
const METRICS = new Set(['files', 'changed', 'rawChurn', 'includedFiles']);
const FAMILIES = new Set(['overview', 'distribution', 'concentration', 'trajectories', 'occurrence', 'operations']);
const EVIDENCE = new Set(['all', 'exact', 'bounded', 'unknown']);
const REF = /^[A-Za-z0-9._-]{1,80}$/u;
const BUCKETS = [0, 10, 50, 100, 500, 1_000, 5_000];

function invalid(code) { return Object.assign(new TypeError(code), { code }); }
function positive(value) { if (!Number.isSafeInteger(value) || value < 1) throw invalid('E_HISTORY_REPOSITORY'); return value; }
function iso(value) {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw invalid('E_HISTORY_TIME');
  return value;
}
function ref(value) { if (typeof value !== 'string' || !REF.test(value)) throw invalid('E_HISTORY_REFERENCE'); return value; }
function metric(value = { kind: 'total', name: 'changed', scope: 'policy-included' }) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw invalid('E_HISTORY_METRIC');
  if (value.kind === 'configured') return { kind: 'configured', ref: ref(value.ref) };
  if (value.kind === 'scope') {
    if (!['files', 'changed', 'rawChurn'].includes(value.name)) throw invalid('E_HISTORY_METRIC');
    return { kind: 'scope', ref: ref(value.ref), name: value.name };
  }
  if (value.kind !== 'total' || !METRICS.has(value.name) || !['all-observed', 'policy-included'].includes(value.scope)
    || (value.name === 'includedFiles' && value.scope !== 'policy-included')) throw invalid('E_HISTORY_METRIC');
  return { kind: 'total', name: value.name, scope: value.scope };
}
function window(request) {
  if (request?.version !== HISTORY_QUERY_VERSION) throw invalid('E_HISTORY_VERSION');
  const repositoryId = positive(request.repositoryId), from = iso(request.from), to = iso(request.to);
  if (from >= to) throw invalid('E_HISTORY_TIME');
  const evidence = request.evidence ?? 'all';
  if (!EVIDENCE.has(evidence)) throw invalid('E_HISTORY_EVIDENCE');
  return { repositoryId, from, to, policyId: request.policyId === undefined ? undefined : ref(request.policyId), evidence,
    metric: metric(request.metric), family: request.family ?? 'overview' };
}
/** Canonical saved query meaning; labels stay in protected configuration only. */
export function normalizeHistoryLens(repositoryId, lens) {
  positive(repositoryId);
  if (!lens || typeof lens !== 'object' || Array.isArray(lens) || lens.version !== 1
    || Object.keys(lens).some(key => !['version', 'id', 'name', 'description', 'query', 'focus'].includes(key))) throw invalid('E_HISTORY_LENS');
  const id = ref(lens.id);
  const label = (value, limit) => {
    if (value === undefined) return undefined;
    if (typeof value !== 'string' || value.length > limit || /[\x00-\x1f\x7f]/u.test(value)) throw invalid('E_HISTORY_LENS');
    return value;
  };
  if (!lens.query || Object.keys(lens.query).some(key => !['version', 'repositoryId', 'from', 'to', 'policyId', 'evidence', 'family', 'metric'].includes(key))) throw invalid('E_HISTORY_LENS');
  const selected = window(lens.query);
  if (selected.repositoryId !== repositoryId || !FAMILIES.has(selected.family)
    || (['distribution', 'trajectories'].includes(selected.family) && lens.query.metric === undefined)) throw invalid('E_HISTORY_LENS');
  const query = { version: 1, repositoryId, from: selected.from, to: selected.to, family: selected.family,
    evidence: selected.evidence, ...(lens.query.metric === undefined ? {} : { metric: selected.metric }),
    ...(selected.policyId ? { policyId: selected.policyId } : {}) };
  let focus;
  if (lens.focus !== undefined) {
    if (selected.family !== 'occurrence' || !lens.focus || !['band', 'rule', 'effect', 'effect-readback', 'effect-rule', 'effect-band'].includes(lens.focus.kind)
      || Object.keys(lens.focus).some(key => !['kind', 'ref'].includes(key))) throw invalid('E_HISTORY_LENS');
    focus = { kind: lens.focus.kind, ref: ref(lens.focus.ref) };
  }
  return { version: 1, id, ...(lens.name !== undefined ? { name: label(lens.name, 120) } : {}),
    ...(lens.description !== undefined ? { description: label(lens.description, 500) } : {}), query, ...(focus ? { focus } : {}) };
}
function bound(value) {
  if (!value || typeof value !== 'object') return { status: 'unknown', lower: null, upper: null };
  if (value.status === 'exact' && Number.isFinite(value.value)) return { status: 'exact', lower: value.value, upper: value.value };
  if (value.status === 'bounded') return { status: 'bounded', lower: Number.isFinite(value.minimum) ? value.minimum : null,
    upper: Number.isFinite(value.maximum) ? value.maximum : null };
  return { status: 'unknown', lower: null, upper: null };
}
function sum(values) {
  const parts = values.map(bound);
  const lower = parts.every(value => value.lower !== null) ? parts.reduce((total, value) => total + value.lower, 0) : null;
  const upper = parts.every(value => value.upper !== null) ? parts.reduce((total, value) => total + value.upper, 0) : null;
  return { status: parts.every(value => value.status === 'exact') ? 'exact' : parts.some(value => value.status === 'unknown') ? 'unknown' : 'bounded', lower, upper };
}
function resultSet(record) { return Array.isArray(record.results) ? { metrics: record.results, scopes: [], bands: [], rules: [] } : record.results ?? {}; }
function measure(record, selected) {
  const results = resultSet(record);
  if (selected.kind === 'configured') return bound(results.metrics?.find(item => item.metric === selected.ref)?.result);
  if (selected.kind === 'scope') {
    const scope = results.scopes?.find(item => item.ref === selected.ref);
    return bound(selected.name === 'files' ? scope?.fileSet?.total : selected.name === 'changed' ? scope?.totals?.lines?.changed : scope?.totals?.raw?.churn);
  }
  if (selected.name === 'files') return bound(record.fileSet.total);
  if (selected.name === 'includedFiles') return bound(record.fileSet.included);
  if (selected.scope === 'all-observed') {
    const observed = sum(record.files.map(file => selected.name === 'changed' ? file.lines?.changed : file.raw?.churn));
    return record.fileSet.complete === true ? observed : { status: 'bounded', lower: observed.lower, upper: null };
  }
  return bound(selected.name === 'changed' ? record.projection.totals?.lines?.changed : record.projection.totals?.raw?.churn);
}
function standing(value) { return value.status === 'exact' ? 'exact' : value.status === 'bounded' && value.lower !== null && value.upper !== null ? 'finite-bounded' : 'unknown-unbounded'; }
function population(values) {
  return { total: values.length, exact: values.filter(value => standing(value) === 'exact').length,
    finiteBounded: values.filter(value => standing(value) === 'finite-bounded').length,
    unknownUnbounded: values.filter(value => standing(value) === 'unknown-unbounded').length };
}
function nearest(values, fraction, side) {
  if (values.some(value => value[side] === null)) return null;
  const ordered = values.map(value => value[side]).sort((a, b) => a - b);
  return ordered.length ? ordered[Math.max(0, Math.ceil(fraction * ordered.length) - 1)] : null;
}
function histogram(values) {
  return BUCKETS.map((minimum, index) => {
    const maximum = BUCKETS[index + 1] ?? null;
    const contains = number => number >= minimum && (maximum === null || number < maximum);
    return { minimum, maximum,
      certain: values.filter(value => value.lower !== null && value.upper !== null && contains(value.lower) && contains(value.upper)).length,
      possible: values.filter(value => value.lower === null || value.upper === null || (value.upper >= minimum && (maximum === null || value.lower < maximum))).length };
  });
}
function distribution(records, selected) {
  const values = records.map(record => measure(record, selected));
  return { metric: selected, population: population(values), quantileMethod: QUANTILE_METHOD,
    quantiles: [0.5, 0.75, 0.9, 0.95].map(p => ({ p, lower: nearest(values, p, 'lower'), upper: nearest(values, p, 'upper') })),
    histogram: histogram(values), exactOnlyPartial: values.filter(value => value.status === 'exact').map(value => value.lower) };
}
function representative(records) {
  const latest = new Map();
  for (const record of records) {
    const prior = latest.get(record.pullRequest);
    if (!prior || record.observedAt > prior.observedAt || (record.observedAt === prior.observedAt && record.comparisonId > prior.comparisonId)) latest.set(record.pullRequest, record);
  }
  return [...latest.values()].sort((a, b) => a.pullRequest - b.pullRequest);
}
function coverage(records, request, excluded = 0) {
  return { timeBasis: 'analysis-observed-at', requested: { from: request.from, to: request.to },
    standing: 'observed-samples-only', completeWindow: false,
    reason: 'Opt-in and delivery gaps outside retained observations cannot be reconstructed from analysis rows.',
    firstObservedAt: records.length ? records.reduce((first, record) => record.observedAt < first ? record.observedAt : first, records[0].observedAt) : null,
    lastObservedAt: records.length ? records.reduce((last, record) => record.observedAt > last ? record.observedAt : last, records[0].observedAt) : null,
    retainedAnalyses: records.length, excludedByEvidenceFilter: excluded,
    knownRecordGaps: records.filter(record => record.gaps.length || record.fileSet.complete !== true).length };
}
function overview(records, representatives, request, excluded) {
  return { uniquePullRequests: new Set(records.map(record => record.pullRequest)).size,
    analyzedRevisions: new Set(records.map(record => `${record.pullRequest}:${record.comparisonId}`)).size,
    retainedAnalyses: records.length, representativeCount: representatives.length,
    representative: 'latest-observed-in-window', finalOrMergedSize: false,
    coverage: coverage(records, request, excluded) };
}
function ratio(numerator, denominator) {
  if (numerator.lower === null || denominator.upper === null || denominator.upper <= 0) return { lower: null, upper: null };
  return { lower: Math.min(1, numerator.lower / denominator.upper),
    upper: numerator.upper !== null && denominator.lower !== null && denominator.lower > 0 ? Math.min(1, numerator.upper / denominator.lower) : null };
}
function concentration(records) {
  return records.map(record => {
    if (record.fileSet.complete !== true) return { pullRequest: record.pullRequest, comparisonId: record.comparisonId, standing: 'incomplete-file-set', largest: null, topThree: null };
    const files = record.files.map(file => bound(file.lines?.changed));
    const total = sum(record.files.map(file => file.lines?.changed));
    const top = side => files.every(file => file[side] !== null) ? files.map(file => file[side]).sort((a, b) => b - a) : null;
    const lower = top('lower'), upper = top('upper');
    const portion = count => ratio({ lower: lower ? lower.slice(0, count).reduce((a, b) => a + b, 0) : null,
      upper: upper ? upper.slice(0, count).reduce((a, b) => a + b, 0) : null }, total);
    return { pullRequest: record.pullRequest, comparisonId: record.comparisonId,
      standing: files.every(file => file.status === 'exact') ? 'exact' : 'bounded-or-unknown',
      observedFiles: files.length, largest: portion(1), topThree: portion(3) };
  });
}
function trajectories(records, selected) {
  const groups = new Map();
  for (const record of [...records].sort((a, b) => a.observedAt.localeCompare(b.observedAt))) {
    if (!groups.has(record.pullRequest)) groups.set(record.pullRequest, []);
    groups.get(record.pullRequest).push({ comparisonId: record.comparisonId, base: record.base, head: record.head,
      observedAt: record.observedAt, policyId: record.policyId, value: measure(record, selected) });
  }
  return [...groups].map(([pullRequest, revisions]) => ({ pullRequest, revisions }));
}
function occurrence(records) {
  const counts = new Map();
  function add(kind, refValue, standingValue) {
    const key = JSON.stringify([kind, refValue ?? null, standingValue ?? null]);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const record of records) {
    const results = resultSet(record);
    for (const band of results.bands ?? []) add('band', band.ref, band.status === 'resolved' ? band.id : 'unknown');
    for (const rule of results.rules ?? []) add('rule', rule.ref, rule.disposition);
    for (const effect of record.effects) {
      add('effect', effect.kind, effect.outcome);
      add('effect-readback', effect.kind, effect.readback);
      if (effect.rule) add('effect-rule', effect.rule, effect.outcome);
      if (effect.band) add('effect-band', effect.band, effect.outcome);
    }
  }
  return [...counts].map(([key, count]) => { const [kind, refValue, standingValue] = JSON.parse(key); return { kind, ref: refValue, standing: standingValue, count }; });
}
function operations(value, request) {
  const durations = value.attempts.map(attempt => attempt.completed_at && Date.parse(attempt.completed_at) >= Date.parse(attempt.started_at)
    ? Date.parse(attempt.completed_at) - Date.parse(attempt.started_at) : null).filter(number => number !== null);
  const queue = value.attempts.map(attempt => Number.isFinite(Date.parse(attempt.received_at)) && Date.parse(attempt.started_at) >= Date.parse(attempt.received_at)
    ? Date.parse(attempt.started_at) - Date.parse(attempt.received_at) : null).filter(number => number !== null);
  const median = values => values.length ? [...values].sort((a, b) => a - b)[Math.ceil(values.length / 2) - 1] : null;
  const count = (rows, key) => Object.entries(rows.reduce((result, row) => { const name = row[key] ?? 'unknown'; result[name] = (result[name] ?? 0) + 1; return result; }, {}))
    .map(([standingValue, occurrences]) => ({ standing: standingValue, count: occurrences }));
  return { timeBasis: 'delivery-received-at-and-attempt-started-at', retention: 'seven-day-operational-ledger',
    coverage: { requested: { from: request.from, to: request.to }, completeWindow: false, standing: 'retained-ledger-only' },
    deliveries: value.deliveries.length, duplicateReceipts: value.deliveries.reduce((n, row) => n + row.duplicate_count, 0),
    executionAttempts: value.attempts.length, attemptStates: count(value.attempts, 'state'),
    deliveryStates: count(value.deliveries, 'state'), refusalAndFailureCodes: count(value.attempts.filter(row => row.state !== 'complete'), 'code'),
    repairs: { total: value.repairs.length, states: count(value.repairs, 'state') },
    queueLatencyMs: { samples: queue.length, median: median(queue) },
    analysisLatencyMs: { samples: durations.length, median: median(durations) } };
}

/** A route-neutral, versioned read API. The adapter supplies current authorization for every repository. */
export function createHistoryAnalyticsService({ store, authorize }) {
  if (!store || typeof authorize !== 'function') throw invalid('E_HISTORY_AUTH_ADAPTER');
  async function permitted(repositoryId, actor, kind = 'read') {
    if (!Array.isArray(actor?.authorizedRepositoryIds) || !actor.authorizedRepositoryIds.includes(repositoryId)) throw invalid('E_HISTORY_UNAUTHORIZED');
    if (!await authorize({ repositoryId, actor, kind })) throw invalid('E_HISTORY_UNAUTHORIZED');
  }
  async function load(request, actor) {
    const selected = window(request);
    await permitted(selected.repositoryId, actor);
    const all = await store.historyWindow(selected.repositoryId, selected.from, selected.to, selected.policyId);
    const records = selected.evidence === 'all' ? all : all.filter(record => record.projection.evidence === selected.evidence);
    return { selected, records, representatives: representative(records), excluded: all.length - records.length };
  }
  async function query(request, actor) {
    const { selected, records, representatives, excluded } = await load(request, actor);
    if (!FAMILIES.has(selected.family)) throw invalid('E_HISTORY_FAMILY');
    const common = { kind: 'diffdevil.history-query', version: HISTORY_QUERY_VERSION, family: selected.family,
      repositoryId: selected.repositoryId, policyId: selected.policyId ?? null, overview: overview(records, representatives, selected, excluded) };
    if (selected.family === 'overview') return common;
    if (selected.family === 'distribution') return { ...common, result: distribution(representatives, selected.metric) };
    if (selected.family === 'concentration') return { ...common, result: concentration(representatives) };
    if (selected.family === 'trajectories') return { ...common, result: trajectories(records, selected.metric) };
    if (selected.family === 'occurrence') return { ...common, result: occurrence(representatives) };
    return { ...common, result: operations(await store.historyOperations(selected.repositoryId, selected.from, selected.to), selected) };
  }
  async function compare(left, right, actor) {
    const requested = [...new Set([window(left).repositoryId, window(right).repositoryId])];
    async function available(request) {
      if (!actor?.authorizedRepositoryIds?.includes(request.repositoryId)) return null;
      try { return await load(request, actor); }
      catch (error) { if (error?.code === 'E_HISTORY_UNAUTHORIZED') return null; throw error; }
    }
    const [a, b] = await Promise.all([available(left), available(right)]);
    const authorizedIds = new Set([a, b].filter(Boolean).map(value => value.selected.repositoryId));
    const representedIds = new Set([a, b].filter(value => value?.representatives.length).map(value => value.selected.repositoryId));
    const authorizationCoverage = { requested: requested.length, authorized: authorizedIds.size, represented: representedIds.size };
    const summarize = group => group ? { overview: overview(group.records, group.representatives, group.selected, group.excluded),
      distribution: distribution(group.representatives, group.selected.metric) } : null;
    const identity = group => new Set(group.representatives.map(record => JSON.stringify([
      record.reportVersion, record.metricVersion,
      ...(group.selected.metric.kind === 'total' && group.selected.metric.scope === 'all-observed' ? [] : [record.policyId])
    ])));
    const keys = a && b ? [identity(a), identity(b)] : [new Set(), new Set()];
    const compatible = a && b && JSON.stringify(a.selected.metric) === JSON.stringify(b.selected.metric) && keys[0].size === 1 && keys[1].size === 1
      && [...keys[0]][0] === [...keys[1]][0] && a.selected.evidence === b.selected.evidence;
    return { kind: 'diffdevil.history-comparison', version: HISTORY_QUERY_VERSION, comparable: Boolean(compatible), authorizationCoverage,
      reason: authorizedIds.size !== requested.length ? 'authorization-coverage-incomplete' : compatible ? null : 'quantity-semantics-policy-or-evidence-coverage-differ',
      left: summarize(a), right: summarize(b),
      coverageComparable: false, coverageReason: 'Complete opt-in and collection intervals are not retained.' };
  }
  async function baseline(request, actor) {
    const { selected, records, representatives, excluded } = await load(request, actor);
    const current = bound(request.current);
    if (current.status !== 'exact') throw invalid('E_HISTORY_BASELINE_CURRENT');
    const identity = request.currentIdentity;
    if (!identity || typeof identity.reportVersion !== 'string' || !REF.test(identity.reportVersion)
      || typeof identity.metricVersion !== 'string' || !REF.test(identity.metricVersion)
      || (selected.metric.kind !== 'total' || selected.metric.scope !== 'all-observed') && (typeof identity.policyId !== 'string' || !REF.test(identity.policyId)))
      throw invalid('E_HISTORY_BASELINE_IDENTITY');
    const compatible = representatives.filter(record => record.reportVersion === identity.reportVersion && record.metricVersion === identity.metricVersion
      && ((selected.metric.kind === 'total' && selected.metric.scope === 'all-observed') || record.policyId === identity.policyId));
    const values = compatible.map(record => measure(record, selected.metric));
    const below = values.filter(value => value.upper !== null && value.upper < current.lower).length;
    const above = values.filter(value => value.lower !== null && value.lower > current.lower).length;
    const equal = values.filter(value => value.lower === current.lower && value.upper === current.upper).length;
    const n = values.length, uncertain = n - below - above - equal;
    return { kind: 'diffdevil.repository-baseline', version: HISTORY_QUERY_VERSION, metric: selected.metric, currentIdentity: identity,
      n, incompatible: representatives.length - compatible.length,
      presentation: n < BASELINE_ORDINAL_BELOW ? 'ordinal' : 'rank-interval', ordinalBelow: below, ordinalEqual: equal, ordinalAbove: above,
      uncertain, rankInterval: n ? { minimum: below + 1, maximum: n - above } : null,
      percentileInterval: n >= BASELINE_ORDINAL_BELOW && n ? { minimum: below / n, maximum: (n - above) / n } : null,
      median: distribution(compatible, selected.metric).quantiles[0],
      policyEras: [...new Set(compatible.map(record => record.policyId))],
      coverage: coverage(records, selected, excluded) };
  }
  async function policyLab(request, proposal, actor) {
    const { selected, records, representatives, excluded } = await load(request, actor);
    if (!proposal || proposal.version !== 1 || Object.keys(proposal).some(key => !['version', 'kind', 'metric', 'operator', 'threshold', 'ruleRef', 'bandRef', 'ranges', 'otherwise', 'reportVersion', 'metricVersion', 'policyId'].includes(key))
      || proposal.metric === undefined || typeof proposal.reportVersion !== 'string' || !REF.test(proposal.reportVersion)
      || typeof proposal.metricVersion !== 'string' || !REF.test(proposal.metricVersion)
      || typeof proposal.policyId !== 'string' || !REF.test(proposal.policyId)
      || proposal.metric?.kind === 'scope' || !['rule', 'band'].includes(proposal.kind ?? 'rule')) throw invalid('E_POLICY_LAB_UNSUPPORTED');
    const resultKind = proposal.kind ?? 'rule';
    if (resultKind === 'rule' && (!['gte', 'gt', 'lte', 'lt'].includes(proposal.operator)
      || !Number.isFinite(proposal.threshold) || !REF.test(proposal.ruleRef ?? ''))) throw invalid('E_POLICY_LAB_UNSUPPORTED');
    let ranges;
    if (resultKind === 'band') {
      if (!REF.test(proposal.bandRef ?? '') || !REF.test(proposal.otherwise ?? '') || !Array.isArray(proposal.ranges)
        || proposal.ranges.some(range => !REF.test(range?.id ?? '') || !Number.isFinite(range.minimum) || !Number.isFinite(range.maximum)
          || range.minimum >= range.maximum)) throw invalid('E_POLICY_LAB_UNSUPPORTED');
      ranges = [...proposal.ranges].sort((a, b) => a.minimum - b.minimum);
      if (ranges.some((range, index) => index > 0 && range.minimum < ranges[index - 1].maximum)) throw invalid('E_POLICY_LAB_UNSUPPORTED');
    }
    const proposedMetric = metric(proposal.metric);
    const outcomes = representatives.map(record => {
      if (record.reportVersion !== proposal.reportVersion || record.metricVersion !== proposal.metricVersion
        || (proposedMetric.kind !== 'total' || proposedMetric.scope !== 'all-observed') && record.policyId !== proposal.policyId)
        return { standing: 'incompatible', reason: 'semantic-or-policy-identity' };
      const prior = resultKind === 'rule' ? resultSet(record).rules?.find(rule => rule.ref === proposal.ruleRef)
        : resultSet(record).bands?.find(band => band.ref === proposal.bandRef);
      if (resultKind === 'rule' ? !prior || !['matched', 'unmatched'].includes(prior.disposition)
        : !prior || prior.status !== 'resolved' || !prior.id) return { standing: 'unsupported', reason: 'historical-result-unavailable' };
      const value = measure(record, proposedMetric);
      if (value.status !== 'exact') return { standing: 'insufficient-evidence', reason: 'metric-not-exact' };
      if (resultKind === 'band') {
        const proposed = ranges.find(range => value.lower >= range.minimum && value.lower < range.maximum)?.id ?? proposal.otherwise;
        return { standing: proposed === prior.id ? 'unchanged' : 'changed', previous: prior.id, proposed };
      }
      const matched = proposal.operator === 'gte' ? value.lower >= proposal.threshold : proposal.operator === 'gt' ? value.lower > proposal.threshold
        : proposal.operator === 'lte' ? value.lower <= proposal.threshold : value.lower < proposal.threshold;
      return { standing: matched === (prior.disposition === 'matched') ? 'unchanged' : 'changed',
        previous: prior.disposition, proposed: matched ? 'matched' : 'unmatched' };
    });
    const count = name => outcomes.filter(outcome => outcome.standing === name).length;
    return { kind: 'diffdevil.policy-lab', version: 1, resultKind, population: representatives.length,
      changed: count('changed'), unchanged: count('unchanged'), incompatible: count('incompatible'),
      unsupported: count('unsupported'), insufficientEvidence: count('insufficient-evidence'),
      compatibleEvaluated: count('changed') + count('unchanged'), evidence: population(representatives.map(record => measure(record, proposedMetric))),
      coverage: coverage(records, selected, excluded), desiredEffectsOnly: true, providerMutationsReplayed: false,
      results: representatives.map((record, index) => ({ pullRequest: record.pullRequest, comparisonId: record.comparisonId, ...outcomes[index] })) };
  }
  async function saveLens(repositoryId, lens, actor) {
    positive(repositoryId); await permitted(repositoryId, actor, 'write');
    const value = normalizeHistoryLens(repositoryId, lens);
    await store.saveHistoryLens(repositoryId, value);
    return value;
  }
  async function lenses(repositoryId, actor) { positive(repositoryId); await permitted(repositoryId, actor); return store.historyLenses(repositoryId); }
  async function removeLens(repositoryId, lensId, actor) { positive(repositoryId); await permitted(repositoryId, actor, 'write'); await store.removeHistoryLens(repositoryId, ref(lensId)); }
  async function lens(request, actor) {
    const repositoryId = positive(request?.repositoryId);
    await permitted(repositoryId, actor);
    const selectedLens = (await store.historyLenses(repositoryId)).find(value => value.id === ref(request.lensId));
    if (!selectedLens) throw invalid('E_HISTORY_LENS_UNKNOWN');
    const loaded = await load(selectedLens.query, actor);
    const present = record => {
      const results = resultSet(record);
      const selected = selectedLens.query.metric;
      if (selected?.kind === 'configured' && !results.metrics?.some(value => value.metric === selected.ref)) return false;
      if (selected?.kind === 'scope' && !results.scopes?.some(value => value.ref === selected.ref)) return false;
      if (selectedLens.focus?.kind === 'band') return results.bands?.some(value => value.ref === selectedLens.focus.ref);
      if (selectedLens.focus?.kind === 'rule') return results.rules?.some(value => value.ref === selectedLens.focus.ref);
      if (selectedLens.focus?.kind === 'effect-rule') return record.effects.some(value => value.rule === selectedLens.focus.ref);
      if (selectedLens.focus?.kind === 'effect-band') return record.effects.some(value => value.band === selectedLens.focus.ref);
      if (selectedLens.focus) return record.effects.some(value => value.kind === selectedLens.focus.ref);
      return true;
    };
    const seen = loaded.representatives.filter(present);
    const answer = await query(selectedLens.query, actor);
    if (selectedLens.focus) answer.result = answer.result.filter(value => value.kind === selectedLens.focus.kind && value.ref === selectedLens.focus.ref);
    return { kind: 'diffdevil.history-lens', version: 1, lens: selectedLens,
      historicalCoverage: { representativeCount: loaded.representatives.length, evaluated: seen.length, missing: loaded.representatives.length - seen.length },
      coverage: coverage(loaded.records, loaded.selected, loaded.excluded), result: answer };
  }
  async function exportNumeric(repositoryId, actor) {
    positive(repositoryId); await permitted(repositoryId, actor, 'export');
    if (!(await store.historySettings(repositoryId)).enabled) throw invalid('E_HISTORY_CONSENT');
    const exported = await store.exportHistory(repositoryId);
    if (!(await store.historySettings(repositoryId)).enabled) throw invalid('E_HISTORY_CONSENT');
    return exported;
  }
  return { query, compare, baseline, policyLab, saveLens, lenses, removeLens, lens, exportNumeric };
}
