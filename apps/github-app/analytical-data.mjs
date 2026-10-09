// SPDX-License-Identifier: AGPL-3.0-only
import { readReport, withPathPolicy, evaluatePolicy, unwrap } from '@wolfsblvt/diffdevil';

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
  if (from >= to || (['pr', 'file'].includes(query.surface) && query.repositoryIds.length !== 1)
    || (query.surface === 'pr' && !positive(query.pullRequest)) || (query.surface === 'file' && typeof query.path !== 'string')
    || (query.metric !== undefined && !['mergedPullRequests', 'changed', 'rawChurn', 'turnover'].includes(query.metric))) throw fail('E_APP_DATA_QUERY');
  return { ...query, repositoryIds: [...new Set(query.repositoryIds)], from, to };
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
    changed: sum(values.map(changed)), rawChurn: sum(values.map(raw)), medianChanged: median(values.map(changed)), medianRawChurn: median(values.map(raw)) };
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

/** turnover-v1 uses observed sizes. Unobserved time and discontinuities widen its denominator. */
export function turnover(contributions, query, observations = []) {
  const ordered = contributions.toSorted((a, b) => a.mergedAt.localeCompare(b.mergedAt));
  if (ordered.some(value => ['added', 'deleted', 'renamed'].includes(value.file.changeType))) return { status: 'unavailable', reason: 'created-deleted-or-renamed-in-period', version: 'turnover-v1' };
  const start = Date.parse(query.from), end = Date.parse(query.to);
  const first = observations.filter(value => value.observedAt <= query.from).toSorted((a, b) => b.observedAt.localeCompare(a.observedAt))[0];
  const last = observations.filter(value => value.observedAt >= query.to).toSorted((a, b) => a.observedAt.localeCompare(b.observedAt))[0];
  let cursor = start, prior = first?.size ?? null, priorRevision = first?.revision ?? null, areaLower = 0, areaUpper = 0, unknown = false, discontinuities = 0;
  for (const contribution of ordered) {
    const at = Date.parse(contribution.mergedAt), before = contribution.size?.before ?? null, after = contribution.size?.after ?? null;
    const continuous = prior !== null && before !== null && prior === before && priorRevision === contribution.base;
    // The first before-size is observed at the first merge, not at period start.
    if (!continuous && at > cursor) { unknown = true; discontinuities++; }
    if (continuous) { areaLower += prior * (at - cursor); areaUpper += prior * (at - cursor); }
    cursor = at; prior = after; priorRevision = contribution.head;
  }
  // No default-branch observation at period end: direct pushes or unrecovered PRs may have intervened.
  if (cursor < end) {
    if (last && prior !== null && last.size === prior && last.revision === priorRevision) {
      areaLower += prior * (end - cursor); areaUpper += prior * (end - cursor);
    } else unknown = true;
  }
  const average = amount(areaLower / (end - start), unknown ? null : areaUpper / (end - start));
  const numerator = interval(sum(ordered.map(value => value.file.lines.changed)));
  if (!unknown && average.upper === 0) return { status: 'unavailable', reason: 'zero-average-size', version: 'turnover-v1' };
  return { ...amount(average.upper === null ? 0 : numerator.lower / average.upper,
    average.lower > 0 && numerator.upper !== null ? numerator.upper / average.lower : null),
    version: 'turnover-v1', averageSize: average, discontinuities, sizeBasis: 'observed-final-comparisons' };
}

function fileRows(merged, query, observations) {
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
    const ratio = turnover(value.contributions, query, observations.filter(row => row.repositoryId === value.repositoryId && row.path === value.path));
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
export function createAnalyticalDataService({ store, authorize, entitlement, currentPolicy, now = () => new Date().toISOString() }) {
  if (!store || typeof authorize !== 'function' || typeof entitlement !== 'function' || typeof currentPolicy !== 'function') throw new TypeError('Analytical read adapters are required.');
  return {
    async query(input, actor) {
      const query = selectedWindow(input);
      const authorized = [], policies = new Map(), plans = new Map();
      for (const repositoryId of query.repositoryIds) {
        if (!actor?.authorizedRepositoryIds?.includes(repositoryId) || !await authorize({ repositoryId, actor, kind: 'read' })) continue;
        authorized.push(repositoryId);
        policies.set(repositoryId, await currentPolicy({ repositoryId, actor }));
        plans.set(repositoryId, await entitlement({ repositoryId, actor }));
      }
      if (!authorized.length) throw fail('E_APP_DATA_UNAUTHORIZED');
      const all = (await Promise.all(authorized.map(id => store.analyticalRecords(id)))).flat();
      const aggregatePlan = query.repositoryIds.length > 1 ? await entitlement({ repositoryId: null, actor }) : plans.get(authorized[0]);
      const premium = ['pro', 'business'].includes(aggregatePlan);
      const entitlements = { aggregatePlan, repositories: authorized.map(repositoryId => ({ repositoryId, plan: plans.get(repositoryId) })) };
      if (['files', 'file'].includes(query.surface) && !premium) return { version: 1, surface: query.surface, standing: 'plan-required', plan: 'pro', entitlements };
      const merged = all.filter(record => inside(record.mergedAt, query)).map(record => ({ ...record, facts: facts(record.final, policies.get(record.repositoryId)) }));
      const previousQuery = { ...query, from: new Date(2 * Date.parse(query.from) - Date.parse(query.to)).toISOString(), to: query.from };
      const previous = all.filter(record => inside(record.mergedAt, previousQuery)).map(record => facts(record.final, policies.get(record.repositoryId)));
      const active = all.filter(record => ['open', 'draft'].includes(record.state));
      const effective = record => facts(record.state === 'merged' ? record.final : latest(record), policies.get(record.repositoryId));
      const prRow = record => {
        const measured = effective(record), revision = latest(record);
        return { repositoryId: record.repositoryId, pullRequest: record.pullRequest, state: record.state, openedAt: record.openedAt,
          readyAt: record.readyAt, mergedAt: record.mergedAt, closedAt: record.closedAt, updatedAt: record.updatedAt,
          changed: sum([changed(measured)]), rawChurn: sum([raw(measured)]), band: measured.band,
          policy: { id: measured.policyId, basis: measured.basis, requestedId: policies.get(record.repositoryId)?.id ?? null },
          analyzedHeads: new Set(record.revisions.map(value => value.head)).size,
          freshness: { analyzedHead: revision?.head ?? null, currentHead: record.currentHead, standing: !revision ? 'unavailable' : revision.head === record.currentHead ? 'current' : 'stale' },
          original: revision ? { policyId: revision.originalPolicyId, band: revision.originalBand } : null,
          desiredLabel: revision?.desiredLabel ?? null, observedLabel: revision?.observedLabel ?? null };
      };
      const overview = { mergedPullRequests: merged.length, opened: all.filter(record => inside(record.openedAt, query)).length,
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
        opened: all.filter(record => inside(record.openedAt, bucket)).length, merged: all.filter(record => inside(record.mergedAt, bucket)).length,
        closedUnmerged: all.filter(record => record.state === 'closed' && inside(record.closedAt, bucket)).length })) };
      const sizeObservations = premium ? (await Promise.all(authorized.map(id => store.analyticalSizes(id, query.from, query.to)))).flat() : [];
      const files = premium ? fileRows(merged, query, sizeObservations) : [];
      let result;
      if (query.surface === 'overview') result = { overview, sizeMix: mix, lifecycle, flow, concentration: merged.map(record => ({ repositoryId: record.repositoryId, pullRequest: record.pullRequest, ...concentration(record.facts.report) })), activity: active.map(prRow), files, comparison: { current: summarize(merged.map(record => record.facts)), previous: summarize(previous) } };
      if (query.surface === 'prs') result = { overview, sizeMix: mix, lifecycle, flow, pullRequests: all.map(prRow).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        development: merged.map(record => ({ repositoryId: record.repositoryId, pullRequest: record.pullRequest,
          heads: new Set(record.revisions.map(value => value.head)).size, first: sum([changed(facts(record.revisions[0], policies.get(record.repositoryId)))]), final: sum([changed(record.facts)]) })) };
      if (query.surface === 'history') result = { buckets: buckets(query).map(bucket => {
        const contributions = merged.filter(record => inside(record.mergedAt, bucket));
        return { ...bucket, ...summarize(contributions.map(record => record.facts)), pullRequests: contributions.map(prRow),
          concentration: premium ? contributions.map(record => ({ repositoryId: record.repositoryId, pullRequest: record.pullRequest, ...concentration(record.facts.report) })) : null };
      }), comparison: { current: summarize(merged.map(record => record.facts)), previous: summarize(previous) }, files };
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
      for (const repositoryId of authorized) if (!await authorize({ repositoryId, actor, kind: 'read' })) throw fail('E_APP_DATA_UNAUTHORIZED');
      return { kind: 'diffdevil.app-analytics', version: 1, surface: query.surface, generatedAt: now(),
        population: 'final-merged-comparisons', window: { from: query.from, to: query.to },
        coverage: { completeWindow: false, standing: 'retained-observations', requestedRepositories: query.repositoryIds.length,
          authorizedRepositories: authorized.length, recoveredMerged: merged.filter(record => record.final?.report).length, merged: merged.length },
        policies: authorized.map(repositoryId => ({ repositoryId, requestedId: policies.get(repositoryId)?.id ?? null, standing: policies.get(repositoryId)?.compiled ? 'current' : 'unfiltered-base-facts' })), entitlements, result };
    }
  };
}
