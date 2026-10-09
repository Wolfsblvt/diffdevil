// SPDX-License-Identifier: AGPL-3.0-only
import { readReport, withPathPolicy, evaluatePolicy, unwrap, SEMANTICS } from '@wolfsblvt/diffdevil';

const DAY = 86_400_000;
const surfaces = new Set(['overview', 'prs', 'history', 'files', 'pr', 'file']);
const states = new Set(['open', 'draft', 'merged', 'closed']);
const fail = code => Object.assign(new Error(code), { code });
const positive = value => Number.isSafeInteger(value) && value > 0;
function time(value, optional = false) {
  if (optional && value == null) return null;
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) throw fail('E_APP_DATA_TIME');
  return value;
}
function reference(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9._:-]+$/u.test(value)) throw fail('E_APP_DATA_REFERENCE');
  return value;
}
function label(value) {
  if (value == null) return null;
  if (typeof value !== 'string' || !value || value.length > 100 || /[\u0000-\u001f]/u.test(value)) throw fail('E_APP_DATA_LABEL');
  return value;
}
function path(value) {
  if (typeof value !== 'string' || !value || value.includes('\0') || value.startsWith('/') || value.split('/').includes('..')) throw fail('E_APP_DATA_PATH');
  return value;
}

/** Non-negative interval endpoints. null is unbounded, never an invented zero measurement. */
export function interval(value) {
  if (value && Object.hasOwn(value, 'lower')) return { lower: value.lower ?? 0, upper: value.upper ?? null };
  if (value?.status === 'exact') return { lower: value.value, upper: value.value };
  return { lower: value?.lower ?? value?.minimum ?? 0, upper: value?.upper ?? value?.maximum ?? null };
}
function amount(lower, upper) {
  return { status: upper === lower ? 'exact' : upper === null ? 'unknown' : 'bounded', lower, upper };
}
function sum(values) {
  const bounds = values.map(interval);
  return amount(bounds.reduce((n, value) => n + value.lower, 0), bounds.some(value => value.upper === null) ? null : bounds.reduce((n, value) => n + value.upper, 0));
}
/** Median envelopes include bounded and unrecovered observations in the same population. */
export function median(values) {
  if (!values.length) return { status: 'unavailable', lower: null, upper: null, samples: 0 };
  const bounds = values.map(interval);
  const middle = sides => {
    const sorted = sides.map(value => value ?? Infinity).sort((a, b) => a - b);
    const index = Math.floor(sorted.length / 2);
    const result = sorted.length % 2 ? sorted[index] : (sorted[index - 1] + sorted[index]) / 2;
    return Number.isFinite(result) ? result : null;
  };
  return { ...amount(middle(bounds.map(value => value.lower)), middle(bounds.map(value => value.upper))), samples: values.length };
}

function safeReasons(value) {
  if (Array.isArray(value)) return value.map(safeReasons);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === 'reasons'
    ? item.map(reason => ({ code: /^[A-Z0-9_]+$/u.test(reason.code) ? reason.code : 'UNRESOLVED_EVIDENCE' })) : safeReasons(item)]));
}
/** Retain the engine's numeric facts and paths, never patches, prose or provider payloads. */
export function numericReport(input) {
  const report = withPathPolicy(unwrap(readReport(input)), {});
  const source = { kind: report.source.kind, comparisonId: reference(report.source.comparisonId),
    ...(report.source.comparison ? { comparison: report.source.comparison } : {}),
    ...(report.source.base ? { base: reference(report.source.base) } : {}),
    ...(report.source.head ? { head: reference(report.source.head) } : {}) };
  return safeReasons({ kind: report.kind, schemaVersion: report.schemaVersion, semantics: report.semantics,
    source, fileSet: report.fileSet, measurement: report.measurement, totals: report.totals,
    files: report.files.map(file => ({ ...file, id: reference(file.id), ...(file.family ? { family: { ...file.family, id: reference(file.family.id) } } : {}) })) });
}
function sizes(input, report) {
  const known = new Set(report?.files.map(file => file.path) ?? []);
  const values = (input ?? []).map(file => {
    const name = path(file.path);
    if (!known.has(name)) throw fail('E_APP_DATA_SIZE_FILE');
    const read = value => value === null || value === undefined ? null : Number.isSafeInteger(value) && value >= 0 ? value : (() => { throw fail('E_APP_DATA_SIZE'); })();
    return { path: name, before: read(file.before), after: read(file.after) };
  });
  if (new Set(values.map(value => value.path)).size !== values.length) throw fail('E_APP_DATA_SIZE_FILE');
  return values;
}
function revision(input) {
  const report = input.report ? numericReport(input.report) : null;
  if (report && (report.source.base !== input.base || report.source.head !== input.head)) throw fail('E_APP_DATA_REVISION');
  return { base: reference(input.base), head: reference(input.head), observedAt: time(input.observedAt),
    report, originalPolicyId: input.originalPolicyId ? reference(input.originalPolicyId) : null,
    originalBand: input.originalBand ? reference(input.originalBand) : null,
    desiredLabel: label(input.desiredLabel),
    observedLabel: label(input.observedLabel),
    sizes: sizes(input.sizes, report) };
}

/** Versioned storage contract. Revisions and final comparisons have different identities and time bases. */
export function normalizeAnalyticalRecord(input) {
  if (input?.version !== 1 || !positive(input.repositoryId) || !positive(input.pullRequest) || !states.has(input.state)) throw fail('E_APP_DATA_RECORD');
  const openedAt = time(input.openedAt), mergedAt = time(input.mergedAt, true), closedAt = time(input.closedAt, true);
  if ((input.state === 'merged') !== (mergedAt !== null) || (mergedAt && mergedAt < openedAt) || (closedAt && closedAt < openedAt)) throw fail('E_APP_DATA_LIFECYCLE');
  const revisions = (input.revisions ?? []).map(revision);
  if (new Set(revisions.map(value => `${value.base}:${value.head}`)).size !== revisions.length) throw fail('E_APP_DATA_DUPLICATE_REVISION');
  const final = input.final ? { ...revision(input.final), basis: input.final.basis } : null;
  if (final && (input.state !== 'merged' || final.basis !== 'final-merged-comparison' || !final.report
    || final.report.source.comparison !== 'direct' || final.report.source.base !== final.base || final.report.source.head !== final.head)) throw fail('E_APP_DATA_FINAL_BASIS');
  const readyAt = time(input.readyAt, true);
  if (readyAt && (readyAt < openedAt || (mergedAt && readyAt > mergedAt))) throw fail('E_APP_DATA_LIFECYCLE');
  return { version: 1, repositoryId: input.repositoryId, pullRequest: input.pullRequest, state: input.state,
    openedAt, readyAt, mergedAt, closedAt, updatedAt: time(input.updatedAt), observedAt: time(input.observedAt ?? input.updatedAt), currentHead: input.currentHead ? reference(input.currentHead) : null,
    revisions: revisions.sort((a, b) => a.observedAt.localeCompare(b.observedAt)), final };
}

function selectedWindow(query) {
  if (query?.version !== 1 || !surfaces.has(query.surface) || !Array.isArray(query.repositoryIds) || !query.repositoryIds.length
    || query.repositoryIds.some(id => !positive(id))) throw fail('E_APP_DATA_QUERY');
  const from = time(query.from), to = time(query.to);
  const scope = query.scope ?? (['pr', 'file'].includes(query.surface) && query.repositoryIds.length === 1
    ? { kind: 'repository', repositoryId: query.repositoryIds[0] } : { kind: 'all' });
  if (!['all', 'namespace', 'repository'].includes(scope?.kind) || (scope.kind === 'namespace' && !positive(scope.namespaceId))
    || (scope.kind === 'repository' && !positive(scope.repositoryId))) throw fail('E_APP_DATA_QUERY');
  if (from >= to || (['pr', 'file'].includes(query.surface) && scope.kind !== 'repository')
    || (query.surface === 'pr' && !positive(query.pullRequest)) || (query.surface === 'file' && typeof query.path !== 'string')
    || (query.metric !== undefined && !['mergedPullRequests', 'changed', 'rawChurn', 'turnover'].includes(query.metric))) throw fail('E_APP_DATA_QUERY');
  return { ...query, scope, repositoryIds: [...new Set(query.repositoryIds)], from, to };
}
const inside = (value, query) => value !== null && value >= query.from && value < query.to;
const latest = record => record.revisions.at(-1) ?? null;
function facts(record, policy) {
  if (!record?.report) return { report: null, policyId: policy?.id ?? null, basis: 'comparison-unrecovered', band: null };
  if (!policy?.compiled) return { report: record.report, policyId: null, basis: 'unfiltered-base-facts', band: null };
  const result = unwrap(evaluatePolicy(policy.compiled, unwrap(readReport(record.report)), { phase: 'analyze' }));
  return { report: result.report, policyId: result.policyId, basis: 'current-policy', band: result.report.bands?.size ?? null };
}
const changed = value => value?.report?.totals.lines.changed;
const raw = value => value?.report?.totals.raw.churn;
function summarize(values) {
  return { samples: values.length, recovered: values.filter(value => value.report).length,
    changed: sum(values.map(changed)), rawChurn: sum(values.map(raw)), medianChanged: median(values.map(changed)), medianRawChurn: median(values.map(raw)),
    composition: { version: SEMANTICS.replacementLines, addedOnly: sum(values.map(value => value.report?.totals.lines.added)),
      deletedOnly: sum(values.map(value => value.report?.totals.lines.deleted)), modified: sum(values.map(value => value.report?.totals.lines.modified)),
      rawAdded: sum(values.map(value => value.report?.totals.raw.added)), rawDeleted: sum(values.map(value => value.report?.totals.raw.deleted)) } };
}
function sizeMix(records) {
  const counts = new Map();
  for (const record of records) {
    const band = record.facts.band?.status === 'resolved' ? record.facts.band.id : 'unknown';
    counts.set(band, (counts.get(band) ?? 0) + 1);
  }
  return [...counts].map(([band, count]) => ({ band, count, samples: records.length }));
}
function concentration(report) {
  if (!report?.fileSet.complete) return { status: 'unavailable', reason: 'file-set-incomplete' };
  const values = report.files.filter(file => file.included).map(file => interval(file.lines.changed));
  const total = interval(sum(report.files.filter(file => file.included).map(file => file.lines.changed)));
  if (total.upper === 0) return { status: 'unavailable', reason: 'zero-change' };
  const top = (side, count) => values.some(value => value[side] === null) ? null : values.map(value => value[side]).sort((a, b) => b - a).slice(0, count).reduce((a, b) => a + b, 0);
  const share = count => amount(total.upper === null ? 0 : top('lower', count) / total.upper,
    total.lower > 0 && top('upper', count) !== null ? Math.min(1, top('upper', count) / total.lower) : null);
  return { status: values.every(value => value.lower === value.upper) ? 'exact' : 'bounded', largest: share(1), topThree: share(3) };
}
function buckets(query) {
  const start = Date.parse(query.from), end = Date.parse(query.to), duration = end - start;
  const monthly = duration > 100 * DAY;
  const step = duration <= 7 * DAY ? DAY : duration <= 31 * DAY ? 2 * DAY : 7 * DAY;
  const result = [];
  for (let cursor = start; cursor < end;) {
    const date = new Date(cursor);
    const next = monthly ? Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) : cursor + step;
    result.push({ from: new Date(cursor).toISOString(), to: new Date(Math.min(end, next)).toISOString() });
    cursor = next;
  }
  return result;
}
function fileKey(repositoryId, name) { return JSON.stringify([repositoryId, name]); }

/**
 * Each recorded complete final comparison is one atomic default-branch transition. A chain of them from one
 * observed revision to another that never names a path establishes that the path stayed unchanged throughout,
 * including while unrelated pull requests merged. A net comparison of the two endpoints cannot: a change and
 * revert inside the gap leaves the same endpoint tree but a different time-weighted size. Direct pushes,
 * unrecovered or incomplete comparisons, history-off time and expired records leave no link, so continuity
 * across them stays unestablished.
 */
export function fileContinuity(records) {
  const transitions = new Map();
  for (const record of records) {
    const report = record.final?.report;
    if (!report?.fileSet.complete || !record.mergedAt) continue;
    const link = { base: record.final.base, at: Date.parse(record.mergedAt),
      paths: new Set(report.files.flatMap(file => file.oldPath ? [file.path, file.oldPath] : [file.path])) };
    transitions.set(record.final.head, [...(transitions.get(record.final.head) ?? []), link]);
  }
  const chains = new Map();
  // Walk back from the later revision. A transition before the earlier revision's observation cannot follow it;
  // one second absorbs provider timestamp precision, and skipping only ever withholds continuity.
  const chain = (from, to, since) => {
    const stack = [[to, []]], seen = new Set([to]);
    while (stack.length) {
      const [node, links] = stack.pop();
      for (const link of transitions.get(node) ?? []) {
        if (link.at < since - 1000) continue;
        if (link.base === from) return [...links, link];
        if (!seen.has(link.base)) { seen.add(link.base); stack.push([link.base, [...links, link]]); }
      }
    }
    return null;
  };
  return (from, to, since, name) => {
    if (from === null || to === null) return false;
    if (from === to) return true;
    const key = `${from}>${to}>${since}`;
    if (!chains.has(key)) chains.set(key, chain(from, to, since));
    return chains.get(key)?.every(link => !link.paths.has(name)) ?? false;
  };
}

/** turnover-v1 uses observed sizes. Unobserved time and unestablished file continuity widen its denominator. */
export function turnover(contributions, query, observations = [], unchanged = (from, to) => from !== null && from === to) {
  const ordered = contributions.toSorted((a, b) => a.mergedAt.localeCompare(b.mergedAt));
  if (ordered.some(value => ['added', 'deleted'].includes(value.file.changeType))) return { status: 'unavailable', reason: 'created-or-deleted-in-period', version: 'turnover-v1' };
  const start = Date.parse(query.from), end = Date.parse(query.to);
  const first = observations.filter(value => value.observedAt <= query.from).toSorted((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
  const last = observations.filter(value => value.observedAt >= query.to).toSorted((a, b) => a.observedAt.localeCompare(b.observedAt))[0];
  let cursor = start, prior = first?.size ?? null, priorRevision = first?.revision ?? null, priorAt = first ? Date.parse(first.observedAt) : null;
  let areaLower = 0, areaUpper = 0, unknown = false, discontinuities = 0;
  for (const contribution of ordered) {
    const at = Date.parse(contribution.mergedAt), before = contribution.size?.before ?? null, after = contribution.size?.after ?? null;
    const continuous = prior !== null && before !== null && prior === before && unchanged(priorRevision, contribution.base, priorAt);
    // The first before-size is observed at the first merge, not at period start.
    if (!continuous && at > cursor) { unknown = true; discontinuities++; }
    if (continuous) { areaLower += prior * (at - cursor); areaUpper += prior * (at - cursor); }
    cursor = at; prior = after; priorRevision = contribution.head; priorAt = at;
  }
  // Close with the earliest observation after the period, else the latest continuous one inside it. Time after
  // the latest continuous observation stays unobserved: direct pushes or unrecovered PRs may have intervened.
  if (cursor < end) {
    const within = observations.filter(value => Date.parse(value.observedAt) > cursor && value.observedAt < query.to)
      .toSorted((a, b) => b.observedAt.localeCompare(a.observedAt));
    const closing = [last, ...within].find(value => value && prior !== null && value.size === prior && unchanged(priorRevision, value.revision, priorAt));
    const observed = closing ? Math.min(end, Date.parse(closing.observedAt)) : cursor;
    if (closing) { areaLower += prior * (observed - cursor); areaUpper += prior * (observed - cursor); }
    if (observed < end) unknown = true;
  }
  const average = amount(areaLower / (end - start), unknown ? null : areaUpper / (end - start));
  const numerator = interval(sum(ordered.map(value => value.file.lines.changed)));
  if (!unknown && average.upper === 0) return { status: 'unavailable', reason: 'zero-average-size', version: 'turnover-v1' };
  return { ...amount(average.upper === null ? 0 : numerator.lower / average.upper,
    average.lower > 0 && numerator.upper !== null ? numerator.upper / average.lower : null),
    version: 'turnover-v1', averageSize: average, discontinuities, sizeBasis: 'observed-final-comparisons' };
}

function fileRows(merged, query, observations, records) {
  const continuity = new Map();
  for (const repositoryId of new Set(merged.map(record => record.repositoryId))) {
    continuity.set(repositoryId, fileContinuity(records.filter(record => record.repositoryId === repositoryId)));
  }
  const grouped = new Map();
  for (const record of merged) for (const file of record.facts.report?.files ?? []) {
    const key = fileKey(record.repositoryId, file.path);
    if (!grouped.has(key)) grouped.set(key, { repositoryId: record.repositoryId, path: file.path, contributions: [] });
    grouped.get(key).contributions.push({ pullRequest: record.pullRequest, mergedAt: record.mergedAt, file,
      base: record.final.base, head: record.final.head,
      size: record.final.sizes.find(value => value.path === file.path) ?? null,
      prChanged: record.final.report.totals.lines.changed, prPolicyChanged: record.facts.report.totals.lines.changed });
  }
  const rows = [...grouped.values()].map(value => {
    const missing = merged.filter(record => record.repositoryId === value.repositoryId && record.facts.report?.fileSet.complete !== true).length;
    const boundTotal = values => {
      const total = sum(values);
      return missing ? amount(total.lower, null) : total;
    };
    const changed = boundTotal(value.contributions.map(value => value.file.lines.changed));
    const ratio = turnover(value.contributions, query, observations.filter(row => row.repositoryId === value.repositoryId && row.path === value.path),
      (from, to, since) => continuity.get(value.repositoryId)(from, to, since, value.path));
    const sizeHistory = observations.filter(row => row.repositoryId === value.repositoryId && row.path === value.path).toSorted((a, b) => a.observedAt.localeCompare(b.observedAt));
    const growth = side => {
      const known = value.contributions.filter(row => row.size?.before !== null && row.size?.after !== null && row.size);
      const total = known.reduce((total, row) => total + Math.max(0, side === 'grown' ? row.size.after - row.size.before : row.size.before - row.size.after), 0);
      return amount(total, missing || known.length !== value.contributions.length ? null : total);
    };
    const included = value.contributions.filter(row => row.file.included).length;
    return { ...value, scope: 'all-observed-file-facts', inclusion: included === 0 ? 'excluded' : included === value.contributions.length ? 'included' : 'mixed',
      mergedPullRequests: amount(value.contributions.length, value.contributions.length + missing),
      coverage: { missingComparisons: missing, standing: missing ? 'partial' : 'recovered-merged-population' }, changed,
      rawChurn: boundTotal(value.contributions.map(value => value.file.raw.churn)),
      grown: growth('grown'), shrunk: growth('shrunk'), sizeHistory, observedSize: sizeHistory.at(-1) ?? null,
      turnover: missing && ratio.status !== 'unavailable' ? { ...ratio, status: 'unknown', lower: 0, upper: null, reason: 'unrecovered-file-contributions' } : ratio };
  });
  const metric = query.metric ?? 'mergedPullRequests';
  return rows.sort((a, b) => (b[metric].lower ?? 0) - (a[metric].lower ?? 0) || a.repositoryId - b.repositoryId || a.path.localeCompare(b.path));
}
function cochange(records, repositoryId, name) {
  const population = records.filter(record => record.repositoryId === repositoryId && record.facts.report?.fileSet.complete === true);
  const own = population.filter(record => record.facts.report.files.some(file => file.path === name));
  const neighbors = new Set(own.flatMap(record => record.facts.report.files.map(file => file.path)).filter(value => value !== name));
  return { basis: 'complete-recovered-final-comparisons', scope: 'all-observed-file-facts', samples: population.length, own: own.length,
    companions: [...neighbors].map(path => {
      const contains = record => record.facts.report.files.some(file => file.path === path);
      return { repositoryId, path, together: own.filter(contains).length, of: population.filter(contains).length, own: own.length };
    }).sort((a, b) => b.together - a.together || a.path.localeCompare(b.path)) };
}

/** Six route-neutral analytical reads. authorize and entitlement are server-side, never query claims. */
export function createAnalyticalDataService({ store, authorize, entitlement, namespace, currentPolicy, now = () => new Date().toISOString() }) {
  if (!store || typeof authorize !== 'function' || typeof entitlement !== 'function' || typeof namespace !== 'function' || typeof currentPolicy !== 'function') throw new TypeError('Analytical read adapters are required.');
  return {
    async query(input, actor) {
      const query = selectedWindow(input);
      const granted = [], policies = new Map(), plans = new Map(), namespaces = new Map();
      for (const repositoryId of query.repositoryIds) {
        if (!actor?.authorizedRepositoryIds?.includes(repositoryId) || !await authorize({ repositoryId, actor, kind: 'read' })) continue;
        granted.push(repositoryId);
        const namespaceId = await namespace({ repositoryId, actor });
        namespaces.set(repositoryId, positive(namespaceId) ? namespaceId : null);
        plans.set(repositoryId, await entitlement({ repositoryId, actor }));
      }
      if (!granted.length) throw fail('E_APP_DATA_UNAUTHORIZED');
      const authorized = granted.filter(id => query.scope.kind === 'all' || (query.scope.kind === 'repository'
        ? id === query.scope.repositoryId : namespaces.get(id) === query.scope.namespaceId));
      const paid = id => ['pro', 'business'].includes(plans.get(id));
      const namespacePlans = authorized.map(id => plans.get(id));
      const aggregatePlan = query.scope.kind === 'all' ? await entitlement({ repositoryId: null, actor })
        : namespacePlans.includes('business') ? 'business' : namespacePlans.includes('pro') ? 'pro'
          : namespacePlans.some(plan => plan === 'unknown') || !authorized.length ? 'unknown' : 'free';
      const premium = ['pro', 'business'].includes(aggregatePlan);
      const premiumIds = premium ? authorized.filter(paid) : [];
      const fundedNamespaces = [...new Set(granted.filter(paid).map(id => namespaces.get(id)).filter(positive))].map(namespaceId => ({ namespaceId,
        repositoryIds: granted.filter(id => namespaces.get(id) === namespaceId && paid(id)),
        plan: granted.some(id => namespaces.get(id) === namespaceId && plans.get(id) === 'business') ? 'business' : 'pro' }));
      const entitlements = { aggregatePlan, repositories: granted.map(repositoryId => ({ repositoryId, namespaceId: namespaces.get(repositoryId), plan: plans.get(repositoryId) })),
        premium: { enabled: premium, repositoryIds: premiumIds, excludedFreeRepositories: authorized.filter(id => plans.get(id) === 'free').length,
          excludedUnknownPlanRepositories: authorized.filter(id => plans.get(id) === 'unknown').length } };
      const pageStanding = !authorized.length ? 'scope-unavailable' : aggregatePlan === 'unknown' ? 'entitlement-unavailable' : 'free';
      const freePage = { kind: 'diffdevil.app-analytics', version: 1, surface: query.surface, scope: query.scope, standing: pageStanding,
        entitlements, fundedNamespaces, result: { standing: pageStanding, files: [],
          historyScope: { surface: 'history', repositoryIds: authorized, scope: query.scope, from: query.from, to: query.to } } };
      if (!authorized.length || (['files', 'file'].includes(query.surface) && !premium)) {
        for (const repositoryId of granted) if (!await authorize({ repositoryId, actor, kind: 'read' })) throw fail('E_APP_DATA_UNAUTHORIZED');
        return freePage;
      }
      const all = (await Promise.all(authorized.map(id => store.analyticalRecords(id)))).flat();
      for (const repositoryId of authorized) policies.set(repositoryId, await currentPolicy({ repositoryId, actor }));
      const merged = all.filter(record => inside(record.mergedAt, query)).map(record => ({ ...record, facts: facts(record.final, policies.get(record.repositoryId)) }));
      const previousQuery = { ...query, from: new Date(2 * Date.parse(query.from) - Date.parse(query.to)).toISOString(), to: query.from };
      const previous = all.filter(record => inside(record.mergedAt, previousQuery)).map(record => facts(record.final, policies.get(record.repositoryId)));
      const retainedCoverage = window => ({ from: window.from, to: window.to, completeWindow: false,
        standing: 'retained-observations', countMeaning: 'observed-lower-bounds', distributionMeaning: 'retained-observed-population' });
      const comparison = { standing: 'retained-observations', delta: null, reason: 'complete-period-populations-unestablished',
        current: { ...summarize(merged.map(record => record.facts)), coverage: retainedCoverage(query) },
        previous: { ...summarize(previous), coverage: retainedCoverage(previousQuery) } };
      const active = all.filter(record => ['open', 'draft'].includes(record.state));
      const effective = record => facts(record.state === 'merged' ? record.final : latest(record), policies.get(record.repositoryId));
      const prRow = record => {
        const measured = effective(record), revision = latest(record);
        const comparison = record.state === 'merged' ? record.final : revision;
        return { repositoryId: record.repositoryId, pullRequest: record.pullRequest, state: record.state, openedAt: record.openedAt,
          readyAt: record.readyAt, mergedAt: record.mergedAt, closedAt: record.closedAt, updatedAt: record.updatedAt,
          changed: sum([changed(measured)]), rawChurn: sum([raw(measured)]), band: measured.band,
          composition: summarize([measured]).composition,
          policy: { id: measured.policyId, basis: measured.basis, requestedId: policies.get(record.repositoryId)?.id ?? null },
          measurement: { basis: record.state === 'merged' ? 'final-merged-comparison' : 'pull-request-revision',
            standing: measured.report ? 'recovered' : 'unrecovered', quality: measured.report?.measurement.status ?? 'unknown',
            files: measured.report ? { complete: measured.report.fileSet.complete, total: sum([measured.report.fileSet.total]), observed: measured.report.files.length } : null,
            base: comparison?.base ?? null, head: comparison?.head ?? null, observedAt: comparison?.observedAt ?? null },
          analyzedHeads: new Set(record.revisions.map(value => value.head)).size,
          freshness: { basis: 'pr-development-head', analyzedHead: revision?.head ?? null, currentHead: record.currentHead, standing: !revision ? 'unavailable' : revision.head === record.currentHead ? 'current' : 'stale' },
          original: revision ? { policyId: revision.originalPolicyId, band: revision.originalBand } : null,
          desiredLabel: revision?.desiredLabel ?? null, observedLabel: revision?.observedLabel ?? null };
      };
      const overview = { coverage: retainedCoverage(query), lifecycleBasis: 'last-observed-state',
        mergedPullRequests: merged.length, opened: all.filter(record => inside(record.openedAt, query)).length,
        openNow: active.length, ready: active.filter(record => record.state === 'open').length, draft: active.filter(record => record.state === 'draft').length,
        ...summarize(merged.map(record => record.facts)), timeToMergeMs: median(merged.map(record => ({ status: 'exact', value: Date.parse(record.mergedAt) - Date.parse(record.openedAt) }))) };
      const mix = sizeMix(merged);
      const lifecycle = mix.map(value => {
        const records = merged.filter(record => (record.facts.band?.status === 'resolved' ? record.facts.band.id : 'unknown') === value.band);
        return { band: value.band, samples: records.length, timeToMergeMs: median(records.map(record => ({ status: 'exact', value: Date.parse(record.mergedAt) - Date.parse(record.openedAt) }))),
          readyToMergeMs: median(records.filter(record => record.readyAt).map(record => ({ status: 'exact', value: Date.parse(record.mergedAt) - Date.parse(record.readyAt) }))) };
      });
      const flowFrom = new Date(Date.parse(query.to) - 13 * 7 * DAY).toISOString();
      const flow = { from: flowFrom, to: query.to, buckets: buckets({ from: flowFrom, to: query.to }).map(bucket => ({ ...bucket,
        coverage: retainedCoverage(bucket), opened: all.filter(record => inside(record.openedAt, bucket)).length, merged: all.filter(record => inside(record.mergedAt, bucket)).length,
        closedUnmerged: all.filter(record => record.state === 'closed' && inside(record.closedAt, bucket)).length })) };
      const premiumMerged = merged.filter(record => premiumIds.includes(record.repositoryId));
      const sizeObservations = premium ? (await Promise.all(premiumIds.map(id => store.analyticalSizes(id, query.from, query.to)))).flat() : [];
      const files = premium ? fileRows(premiumMerged, query, sizeObservations, all) : [];
      let result;
      if (query.surface === 'overview') result = { overview, sizeMix: mix, lifecycle, flow, concentration: merged.map(record => ({ repositoryId: record.repositoryId, pullRequest: record.pullRequest, ...concentration(record.facts.report) })), activity: active.map(prRow), files, comparison };
      if (query.surface === 'prs') result = { overview, sizeMix: mix, lifecycle, flow, pullRequests: all.map(prRow).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        development: merged.map(record => ({ repositoryId: record.repositoryId, pullRequest: record.pullRequest,
          heads: new Set(record.revisions.map(value => value.head)).size, first: sum([changed(facts(record.revisions[0], policies.get(record.repositoryId)))]), final: sum([changed(record.facts)]) })) };
      if (query.surface === 'history') result = { buckets: buckets(query).map(bucket => {
        const contributions = merged.filter(record => inside(record.mergedAt, bucket));
        return { ...bucket, coverage: retainedCoverage(bucket), ...summarize(contributions.map(record => record.facts)), pullRequests: contributions.map(prRow),
          concentration: premium ? contributions.filter(record => premiumIds.includes(record.repositoryId)).map(record => ({ repositoryId: record.repositoryId, pullRequest: record.pullRequest, ...concentration(record.facts.report) })) : null };
      }), comparison, files };
      if (query.surface === 'files') result = { files, metric: query.metric ?? 'mergedPullRequests' };
      if (query.surface === 'pr') {
        const record = all.find(record => record.repositoryId === authorized[0] && record.pullRequest === query.pullRequest);
        if (!record) throw fail('E_APP_DATA_NOT_FOUND');
        const measured = effective(record), paths = new Set(measured.report?.files.map(file => file.path) ?? []);
        result = { ...prRow(record), files: (measured.report?.files ?? []).map(file => ({ path: file.path, included: file.included, changed: sum([file.lines.changed]), rawChurn: sum([file.raw.churn]) })),
          development: record.revisions.map(revision => ({ base: revision.base, head: revision.head, observedAt: revision.observedAt,
            changed: sum([changed(facts(revision, policies.get(record.repositoryId)))]), originalPolicyId: revision.originalPolicyId, originalBand: revision.originalBand })),
          alsoInProgress: premium ? active.filter(other => other !== record && other.repositoryId === record.repositoryId).flatMap(other => {
            const sharedFiles = effective(other).report?.files.filter(file => paths.has(file.path)).map(file => file.path) ?? [];
            return sharedFiles.length ? [{ ...prRow(other), sharedFiles }] : [];
          }) : null };
        if (premium) {
          const from = new Date(Date.parse(query.to) - 90 * DAY).toISOString();
          const history = all.filter(other => other.repositoryId === record.repositoryId && other.mergedAt >= from && other.mergedAt < query.to)
            .map(other => ({ ...other, facts: facts(other.final, policies.get(other.repositoryId)) }));
          result.recentFileActivity = { from, to: query.to, pullRequests: history.filter(other => other.facts.report?.files.some(file => paths.has(file.path))).map(prRow) };
          result.cochange = { from, to: query.to, files: [...paths].map(path => ({ path, ...cochange(history, record.repositoryId, path) })) };
        }
      }
      if (query.surface === 'file') {
        result = files.find(value => value.repositoryId === authorized[0] && value.path === query.path);
        if (!result) throw fail('E_APP_DATA_NOT_FOUND');
        const coFrom = new Date(Date.parse(query.to) - 90 * DAY).toISOString();
        const coRecords = all.filter(record => record.mergedAt >= coFrom && record.mergedAt < query.to).map(record => ({ ...record, facts: facts(record.final, policies.get(record.repositoryId)) }));
        result = { ...result, cochange: { from: coFrom, to: query.to, ...cochange(coRecords, authorized[0], query.path) } };
      }
      // Check current access again after asynchronous storage/policy work, before exposing names or aggregates.
      for (const repositoryId of granted) if (!await authorize({ repositoryId, actor, kind: 'read' })) throw fail('E_APP_DATA_UNAUTHORIZED');
      return { kind: 'diffdevil.app-analytics', version: 1, surface: query.surface, scope: query.scope, generatedAt: now(),
        population: 'final-merged-comparisons', window: { from: query.from, to: query.to },
        coverage: { completeWindow: false, standing: 'retained-observations', requestedRepositories: query.repositoryIds.length,
          authorizedRepositories: granted.length, representedRepositories: authorized.length, recoveredMerged: merged.filter(record => record.final?.report).length, merged: merged.length },
        policies: authorized.map(repositoryId => ({ repositoryId, requestedId: policies.get(repositoryId)?.id ?? null, standing: policies.get(repositoryId)?.compiled ? 'current' : 'unfiltered-base-facts' })), entitlements, fundedNamespaces, result };
    }
  };
}
