// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The ratified `pr-brief-r4.1` synthetic fixture as composer inputs: the current comparison in each measurement state,
 * the repository history, and the context facts a premium provider would derive. Preview and tests use it; it is
 * explicitly synthetic and never reaches a provider write. The source is the preserved design candidate under
 * `packages/design/pr-brief/r4.1/fixture.json`.
 */
import fixture from '../../../packages/design/pr-brief/r4.1/fixture.json' with { type: 'json' };
import { bandRanges } from './facts.mjs';
import { compilePolicy, explainPolicy, unwrap } from '@wolfsblvt/diffdevil';

const SIZE_POLICY_DOCUMENT = explainPolicy(unwrap(compilePolicy({ version: 1, presets: ['size@1'] }))).document;

export const FIXTURE = fixture;
export const FIXTURE_STATES = Object.freeze(['exact', 'bounded', 'partial', 'unknown', 'unavailable']);
export const FIXTURE_SNAPSHOT = Object.freeze({ synthetic: true, observedAt: '2026-10-10T02:20:00.000Z' });
export const FIXTURE_LINKS = Object.freeze({ check: '#check', app: '#app', pullRequest: number => `#pr-${number}` });

const exactValue = value => ({ lower: value, upper: value });
const BOUNDED_FILE = 'src/report.ts';

/** The current comparison in one of the five reading states. */
export function fixtureCurrent(state) {
  if (!FIXTURE_STATES.includes(state)) throw new TypeError(`Unknown fixture state ${state}.`);
  const policy = { name: 'size@1', ranges: bandRanges(SIZE_POLICY_DOCUMENT) };
  const comparison = { base: fixture.basis.base, head: fixture.basis.head, id: null };
  if (state === 'unavailable') return { comparison, population: 'unavailable', files: [], excluded: [], totals: { changed: null, composition: null, raw: { added: null, deleted: null, churn: null } }, band: { status: 'unknown', candidates: [] }, policy };
  const files = fixture.files.map(file => {
    const exact = { path: file.path, changeType: 'modified', changed: exactValue(file.changed), composition: { modified: file.modified, addedOnly: file.added, deletedOnly: file.deleted }, raw: { added: exactValue(file.rawAdded), deleted: exactValue(file.rawDeleted) } };
    if (state === 'exact') return exact;
    if (state === 'unknown') return { ...exact, changed: null, composition: null, raw: { added: null, deleted: null } };
    if (file.path !== BOUNDED_FILE) return exact;
    // The report file has raw counts but no usable edit-block pairing: max(42, 36) through 42 + 36 Changed.
    if (state === 'bounded') return { ...exact, changed: { lower: Math.max(file.rawAdded, file.rawDeleted), upper: file.rawAdded + file.rawDeleted }, composition: null };
    return { ...exact, changed: null, composition: null, raw: { added: null, deleted: null } };
  });
  const t = fixture.total;
  const totals = state === 'exact' ? { changed: exactValue(t.changed), composition: { modified: t.modified, addedOnly: t.added, deletedOnly: t.deleted }, raw: { added: exactValue(t.rawAdded), deleted: exactValue(t.rawDeleted), churn: exactValue(t.rawChurn) } }
    : state === 'bounded' ? { changed: { lower: fixture.bounded.lower, upper: fixture.bounded.upper }, composition: null, raw: { added: exactValue(t.rawAdded), deleted: exactValue(t.rawDeleted), churn: exactValue(t.rawChurn) } }
    : state === 'partial' ? { changed: { lower: fixture.partial.changed, upper: null }, composition: null, raw: { added: null, deleted: null, churn: { lower: fixture.partial.raw, upper: null } } }
    : { changed: null, composition: null, raw: { added: null, deleted: null, churn: null } };
  const band = state === 'exact' || state === 'bounded' ? { status: 'resolved', id: 'm', label: 'M' } : { status: 'unknown', candidates: state === 'partial' ? ['m', 'l', 'xl'] : ['xs', 's', 'm', 'l', 'xl'] };
  return { comparison, population: 'complete', files, excluded: [...fixture.excluded], totals, band, policy };
}

/**
 * The synthetic lockfile change the r4.1 fixture names as excluded but gives no counts for. The preview adds these
 * synthetic counts so a policy that does not exclude the lockfile measures it instead of inventing an exclusion.
 */
export const FIXTURE_LOCKFILE = Object.freeze({ path: 'pnpm-lock.yaml', modified: 12, added: 4, deleted: 2 });

/** A unified-diff hunk with exactly `modified` replacements, `added` added-only and `deleted` deleted-only lines. */
function syntheticPatch({ modified, added, deleted }) {
  const removed = Array.from({ length: modified }, (_, index) => `-old ${index}`);
  const inserted = Array.from({ length: modified + added }, (_, index) => `+new ${index}`);
  const dropped = Array.from({ length: deleted }, (_, index) => `-gone ${index}`);
  return [`@@ -1,${modified + 1 + deleted} +1,${modified + added + 1} @@`, ...removed, ...inserted, ' kept', ...dropped].join('\n');
}

/**
 * The fixture's current comparison as provider-shaped evidence (engine change inputs) in one reading state, so a
 * preview can evaluate it through an observed trusted policy instead of presenting the design's own policy result.
 * `exact` carries complete patches; `bounded` omits `src/report.ts`'s patch while keeping its raw counters; `partial`
 * omits both for that file; `unknown` omits every patch and counter; `unavailable` has no file population.
 */
export function fixtureEvidence(state) {
  if (!FIXTURE_STATES.includes(state)) throw new TypeError(`Unknown fixture state ${state}.`);
  const source = { kind: 'github-api', comparison: 'three-dot', comparisonId: `synthetic:${fixture.basis.base}...${fixture.basis.head}`, base: fixture.basis.base, head: fixture.basis.head };
  if (state === 'unavailable') return { changes: [], source, fileSet: { complete: false, total: { status: 'unknown', reasons: [{ code: 'FILE_SET_INCOMPLETE' }] } } };
  const changes = [...fixture.files, FIXTURE_LOCKFILE].map(file => {
    const rawAdded = file.modified + file.added, rawDeleted = file.modified + file.deleted;
    const common = { path: file.path, changeType: 'modified', kind: 'text' };
    if (state === 'unknown' || (state === 'partial' && file.path === BOUNDED_FILE)) return { ...common, incompleteReason: 'PATCH_OMITTED' };
    if (state === 'bounded' && file.path === BOUNDED_FILE) return { ...common, additions: rawAdded, deletions: rawDeleted, incompleteReason: 'PATCH_OMITTED' };
    return { ...common, additions: rawAdded, deletions: rawDeleted, patch: syntheticPatch(file) };
  });
  return { changes, source, fileSet: { complete: true, total: { status: 'exact', value: changes.length } } };
}

function median(values) {
  const sorted = values.toSorted((a, b) => a - b), middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Basic repository history (Free, history consent on). */
export function fixtureHistory() {
  const h = fixture.history;
  const value = median(h.comparisons.map(row => row.changed));
  return { repository: h.repository, from: h.windowStart, to: h.windowEnd, days: 90, knownMerged: h.coverage.knownMerged, recovered: h.coverage.recovered, medianChanged: exactValue(value) };
}

/** Time-weighted average of piecewise-constant size segments over the window. */
function averageSize(evidence, from, to) {
  const start = Date.parse(from), end = Date.parse(to);
  const area = evidence.segments.reduce((total, segment) => total + segment.size * (Math.min(end, Date.parse(segment.end)) - Math.max(start, Date.parse(segment.start))), 0);
  return area / (end - start);
}

/** The context facts a premium provider derives from the fixture's 40 final merged comparisons and open-PR index. */
export function fixtureContextFacts() {
  const h = fixture.history;
  const recovered = h.comparisons.filter(row => row.finalComparison && row.measurement === 'exact');
  const touching = path => recovered.filter(row => row.files.includes(path));
  const window = { from: h.windowStart, to: h.windowEnd, days: 90 };
  const files = fixture.files.map(({ path }) => {
    const rows = touching(path);
    const changed = rows.reduce((total, row) => total + row.observations.find(item => item.path === path).changed, 0);
    const evidence = h.sizeEvidence.find(row => row.path === path);
    const size = evidence && !evidence.binary ? averageSize(evidence, h.windowStart, h.windowEnd) : null;
    const turnover = evidence?.createdOrDeletedWithinPeriod ? { status: 'unavailable', reason: 'created-or-deleted-in-period' }
      : size ? { status: 'exact', lower: changed / size, upper: changed / size } : { status: 'unavailable', reason: 'size-unavailable' };
    return { path, frequency: rows.length, changed: exactValue(changed), averageSize: size === null ? null : exactValue(size), createdOrDeleted: evidence?.createdOrDeletedWithinPeriod === true, turnover };
  });
  const cochange = [];
  for (const { path: anchor } of fixture.files) {
    const subjectRows = touching(anchor);
    const partners = new Set(subjectRows.flatMap(row => row.files).filter(path => path !== anchor));
    for (const partner of partners) cochange.push({ anchor, partner, together: subjectRows.filter(row => row.files.includes(partner)).length, subjectPullRequests: subjectRows.length, partnerPullRequests: touching(partner).length });
  }
  return {
    window,
    population: { knownMerged: h.coverage.knownMerged, recovered: recovered.length, compatible: true },
    neighbours: { indexComplete: true, items: fixture.neighbours.map(item => ({ number: item.number, title: item.title, draft: item.draft, url: `#pr-${item.number}`, files: item.files })) },
    files, cochange
  };
}
