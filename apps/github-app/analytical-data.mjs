// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import { readReport, withPathPolicy, evaluatePolicy, unwrap, SEMANTICS } from '@wolfsblvt/diffdevil';
import { interval, amount, sum, median } from './analytical-math.mjs';
import { fileContinuity, turnover, turnoverEvidence } from './turnover-v1.mjs';

export { interval, median, fileContinuity, turnover };

const DAY = 86_400_000;
const fileSurfaces = new Set(['overview', 'history', 'files', 'file']);
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
    || (query.surface === 'pr' && !positive(query.pullRequest)) || (query.surface === 'file' && query.path !== undefined && typeof query.path !== 'string')
    || (query.metric !== undefined && !['mergedPullRequests', 'changed', 'rawChurn', 'turnover'].includes(query.metric))) throw fail('E_APP_DATA_QUERY');
  return { ...query, scope, repositoryIds: [...new Set(query.repositoryIds)], from, to };
}
const inside = (value, query) => value !== null && value >= query.from && value < query.to;
const latest = record => record.revisions.at(-1) ?? null;
function facts(record, policy) {
  if (!record?.report) return { report: null, policyId: policy?.id ?? null, basis: 'comparison-unrecovered', band: null };
  if (!policy?.compiled) return { report: record.report, policyId: null, basis: 'unfiltered-base-facts', band: null };
  // evaluatePolicy validates the report itself. Parsing it here repeated the same full tree walk.
  const result = unwrap(evaluatePolicy(policy.compiled, record.report, { phase: 'analyze' }));
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

/**
 * What a premium extension receives from this module: the interval arithmetic, the turnover-v1 definition and evidence
 * rules, and the validation helpers a file view needs. Handing them over keeps the extension free of path imports
 * from the public tree.
 */
export const analyticalKit = Object.freeze({ interval, amount, sum, median, fileContinuity, turnoverEvidence, reference, time, fail, DAY });

/**
 * Six route-neutral analytical reads. authorize and entitlement are server-side, never query claims.
 *
 * `premium` is the optional file extension (`files`, `file`, `pr`) a private package supplies; it is called only for an
 * entitled reader. Without it the service is the Community service: it answers every surface from the common facts,
 * and an entitled reader's Files and File detail answer `premium-not-provided` instead of pretending the result was computed.
 */
export function createAnalyticalDataService({ store, authorize, entitlement, namespace, currentPolicy, interpretationCache, premium: extension, now = () => new Date().toISOString() }) {
  if (!store || typeof authorize !== 'function' || typeof entitlement !== 'function' || typeof namespace !== 'function' || typeof currentPolicy !== 'function') throw new TypeError('Analytical read adapters are required.');
  // A file page resolves its opaque handle from Files before reading that file's detail.
  // Continue that same server view without interpreting and enriching every file twice.
  // Only this service's actual response object can carry the context; HTTP inputs cannot.
  const fileViews = new WeakMap();
  const historyReadable = async ids => typeof store.historySettings === 'function'
    && (await Promise.all(ids.map(id => store.historySettings(id, { independentExecution: true })))).every(settings => settings.readable);
  return {
    /** Resolve a handle against normalized paths, then interpret only matching measurements before exposing its identity. */
    async resolveFileCandidate(source, repositoryId, resolve) {
      const prior = fileViews.get(source);
      if (!prior || !['file', 'files'].includes(prior.query.surface) || prior.query.scope.kind !== 'repository'
        || prior.query.scope.repositoryId !== repositoryId || !prior.authorized.includes(repositoryId)) return undefined;
      const paths = new Map();
      const activePullRequests = new Set(prior.merged.filter(record => record.repositoryId === repositoryId).map(record => record.pullRequest));
      for (const record of prior.all) {
        if (record.repositoryId !== repositoryId || record.state !== 'merged') continue;
        for (const file of record.final?.report?.files ?? []) {
          if (!paths.has(file.path)) paths.set(file.path, []);
          paths.get(file.path).push(record);
        }
      }
      // These are server-local candidates from the store's normalized v1 contract, not a returned file table.
      // The opaque resolver selects one identity without needing unrelated reports' numbers or policy results.
      const candidates = [...paths.keys()].map(path => ({ repositoryId, path }));
      const selected = await resolve(candidates);
      if (!candidates.includes(selected)) return undefined;
      let included = false, hasSelectedPeriodActivity = false;
      for (const record of paths.get(selected.path)) {
        const report = prior.factsOf(record.final, repositoryId).report;
        if (!report?.files.some(file => file.path === selected.path && file.included)) continue;
        included = true;
        hasSelectedPeriodActivity ||= activePullRequests.has(record.pullRequest);
        if (hasSelectedPeriodActivity) break;
      }
      if (!await authorize({ repositoryId, actor: prior.actor, kind: 'read' })) throw fail('E_APP_DATA_UNAUTHORIZED');
      if (!await historyReadable([repositoryId])) throw fail('E_APP_DATA_NOT_FOUND');
      return included ? { ...selected, hasSelectedPeriodActivity } : undefined;
    },
    async query(input, actor, source) {
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
        premium: { enabled: premium, provided: Boolean(extension), repositoryIds: premiumIds, excludedFreeRepositories: authorized.filter(id => plans.get(id) === 'free').length,
          excludedUnknownPlanRepositories: authorized.filter(id => plans.get(id) === 'unknown').length } };
      const pageStanding = !authorized.length ? 'scope-unavailable' : aggregatePlan === 'unknown' ? 'entitlement-unavailable' : premium && !extension ? 'premium-not-provided' : 'free';
      const freePage = { kind: 'diffdevil.app-analytics', version: 1, surface: query.surface, scope: query.scope, standing: pageStanding,
        entitlements, fundedNamespaces, result: { standing: pageStanding, files: [],
          historyScope: { surface: 'history', repositoryIds: authorized, scope: query.scope, from: query.from, to: query.to } } };
      if (!authorized.length || (['files', 'file'].includes(query.surface) && !(premium && extension))) {
        for (const repositoryId of granted) if (!await authorize({ repositoryId, actor, kind: 'read' })) throw fail('E_APP_DATA_UNAUTHORIZED');
        return freePage;
      }
      for (const repositoryId of authorized) policies.set(repositoryId, await currentPolicy({ repositoryId, actor }));
      const prior = query.surface === 'file' ? fileViews.get(source) : undefined;
      const sameIds = (a, b) => a.length === b.length && a.every((id, index) => id === b[index]);
      const continued = prior && prior.actor === actor && prior.query.from === query.from && prior.query.to === query.to
        && prior.query.scope.kind === 'repository' && query.scope.repositoryId === prior.query.scope.repositoryId
        && (query.metric ?? 'mergedPullRequests') === (prior.query.metric ?? 'mergedPullRequests')
        && sameIds(prior.query.repositoryIds, query.repositoryIds) && sameIds(prior.authorized, authorized) && sameIds(prior.premiumIds, premiumIds)
        && authorized.every(id => policies.get(id)?.id === prior.policies.get(id)?.id && policies.get(id)?.compiled === prior.policies.get(id)?.compiled)
        && await historyReadable(authorized) ? prior : null;
      const all = continued ? continued.all : (await Promise.all(authorized.map(id => store.analyticalRecords(id)))).flat();
      // Always read the current retained population first. Only deterministic interpretation
      // can cross requests; authority, entitlement, expiry and withdrawal are never cached here.
      const interpretations = new Map();
      const factsOf = continued?.factsOf ?? ((measurement, repositoryId) => {
        if (!measurement) return facts(measurement, policies.get(repositoryId));
        if (!interpretations.has(repositoryId)) interpretations.set(repositoryId, new WeakMap());
        const cache = interpretations.get(repositoryId);
        if (!cache.has(measurement)) {
          const policy = policies.get(repositoryId);
          const compute = () => Object.freeze(facts(measurement, policy));
          // The stored report is normalized inert data. Its exact bytes, not a claimed
          // report ID or a friendly policy name, decide whether prior work is reusable.
          const value = interpretationCache && measurement.report && policy?.compiled
            ? interpretationCache.memo(`analytical:${JSON.stringify([repositoryId, policy.compiled.id, measurement.report])}`, compute)
            : compute();
          cache.set(measurement, value);
        }
        return cache.get(measurement);
      });
      const populationSurface = query.surface === 'overview' || query.surface === 'prs';
      const comparisonSurface = populationSurface || query.surface === 'history';
      // Detail coverage counts all retained merges, but a PR detail only interprets
      // its own measurements (and whatever related work the premium extension uses).
      // File identity lookup needs those counts and paths before any numeric interpretation.
      const merged = continued?.merged ?? all.filter(record => inside(record.mergedAt, query)).map(record => query.surface === 'pr' ? record
        : query.surface === 'file' ? { ...record, get facts() { return factsOf(record.final, record.repositoryId); } }
          : { ...record, facts: factsOf(record.final, record.repositoryId) });
      const previousQuery = { ...query, from: new Date(2 * Date.parse(query.from) - Date.parse(query.to)).toISOString(), to: query.from };
      const previous = comparisonSurface ? all.filter(record => inside(record.mergedAt, previousQuery)).map(record => factsOf(record.final, record.repositoryId)) : [];
      const retainedCoverage = window => ({ from: window.from, to: window.to, completeWindow: false,
        standing: 'retained-observations', countMeaning: 'observed-lower-bounds', distributionMeaning: 'retained-observed-population' });
      const comparison = comparisonSurface ? { standing: 'retained-observations', delta: null, reason: 'complete-period-populations-unestablished',
        current: { ...summarize(merged.map(record => record.facts)), coverage: retainedCoverage(query) },
        previous: { ...summarize(previous), coverage: retainedCoverage(previousQuery) } } : undefined;
      const active = all.filter(record => ['open', 'draft'].includes(record.state));
      const effective = record => factsOf(record.state === 'merged' ? record.final : latest(record), record.repositoryId);
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
      const overview = populationSurface ? { coverage: retainedCoverage(query), lifecycleBasis: 'last-observed-state',
        mergedPullRequests: merged.length, opened: all.filter(record => inside(record.openedAt, query)).length,
        openNow: active.length, ready: active.filter(record => record.state === 'open').length, draft: active.filter(record => record.state === 'draft').length,
        ...summarize(merged.map(record => record.facts)), timeToMergeMs: median(merged.map(record => ({ status: 'exact', value: Date.parse(record.mergedAt) - Date.parse(record.openedAt) }))) } : undefined;
      const mix = populationSurface ? sizeMix(merged) : [];
      const lifecycle = mix.map(value => {
        const records = merged.filter(record => (record.facts.band?.status === 'resolved' ? record.facts.band.id : 'unknown') === value.band);
        return { band: value.band, samples: records.length, timeToMergeMs: median(records.map(record => ({ status: 'exact', value: Date.parse(record.mergedAt) - Date.parse(record.openedAt) }))),
          readyToMergeMs: median(records.filter(record => record.readyAt).map(record => ({ status: 'exact', value: Date.parse(record.mergedAt) - Date.parse(record.readyAt) }))) };
      });
      const flowFrom = new Date(Date.parse(query.to) - 13 * 7 * DAY).toISOString();
      const flow = populationSurface ? { from: flowFrom, to: query.to, buckets: buckets({ from: flowFrom, to: query.to }).map(bucket => ({ ...bucket,
        coverage: retainedCoverage(bucket), opened: all.filter(record => inside(record.openedAt, bucket)).length, merged: all.filter(record => inside(record.mergedAt, bucket)).length,
        closedUnmerged: all.filter(record => record.state === 'closed' && inside(record.closedAt, bucket)).length })) } : undefined;
      let files = continued?.files ?? [], sizeObservation = continued?.sizeObservation ?? [];
      const needsSelectedFileEnrichment = continued && query.surface === 'file' && query.path !== undefined;
      if ((!continued || needsSelectedFileEnrichment) && premium && extension && fileSurfaces.has(query.surface)
        && (query.surface !== 'file' || query.path !== undefined)) {
        ({ files, sizeObservation } = await extension.files({ query, merged: merged.filter(record => premiumIds.includes(record.repositoryId)), all, premiumIds, store }));
      }
      let result;
      if (query.surface === 'overview') result = { overview, sizeMix: mix, lifecycle, flow, concentration: merged.map(record => ({ repositoryId: record.repositoryId, pullRequest: record.pullRequest, ...concentration(record.facts.report) })), activity: active.map(prRow), files, comparison };
      if (query.surface === 'prs') result = { overview, sizeMix: mix, lifecycle, flow, pullRequests: all.map(prRow).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        development: merged.map(record => ({ repositoryId: record.repositoryId, pullRequest: record.pullRequest,
          heads: new Set(record.revisions.map(value => value.head)).size, first: sum([changed(factsOf(record.revisions[0], record.repositoryId))]), final: sum([changed(record.facts)]) })) };
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
            changed: sum([changed(factsOf(revision, record.repositoryId))]), originalPolicyId: revision.originalPolicyId, originalBand: revision.originalBand })),
          alsoInProgress: null };
        if (premium && extension) Object.assign(result, await extension.pr({ record, query, all, active, effective, prRow, factsOf, paths }));
      }
      if (query.surface === 'file') {
        result = query.path === undefined ? { files: [] } : await extension.file({ query, files, all, authorized, factsOf });
        if (query.path !== undefined && !result) throw fail('E_APP_DATA_NOT_FOUND');
      }
      // Check current access again after asynchronous storage/policy work, before exposing names or aggregates.
      for (const repositoryId of granted) if (!await authorize({ repositoryId, actor, kind: 'read' })) throw fail('E_APP_DATA_UNAUTHORIZED');
      if (continued && !await historyReadable(authorized)) throw fail('E_APP_DATA_NOT_FOUND');
      const response = { kind: 'diffdevil.app-analytics', version: 1, surface: query.surface, scope: query.scope, generatedAt: now(),
        population: 'final-merged-comparisons', window: { from: query.from, to: query.to },
        coverage: { completeWindow: false, standing: 'retained-observations', requestedRepositories: query.repositoryIds.length,
          authorizedRepositories: granted.length, representedRepositories: authorized.length, recoveredMerged: merged.filter(record => record.final?.report).length, merged: merged.length },
        policies: authorized.map(repositoryId => ({ repositoryId, requestedId: policies.get(repositoryId)?.id ?? null, standing: policies.get(repositoryId)?.compiled ? 'current' : 'unfiltered-base-facts' })),
        sizeObservation, entitlements, fundedNamespaces, result };
      if (['file', 'files'].includes(query.surface) && query.scope.kind === 'repository' && premium && extension) {
        fileViews.set(response, { actor, query, authorized, premiumIds, policies, all, merged, factsOf, files, sizeObservation });
      }
      return response;
    }
  };
}
