// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The managed App's standard PR brief: which route the stored settings and trusted policy select, the policy layer that
 * gives the brief its owned upsert lifecycle, the audience-filtered context it may read, and the optional terminal
 * summary on merge. The brief joins the engine's existing owned-comment machinery; it is not a second writer, template
 * language or comment lifecycle.
 */
import { DiffdevilError, analyzeChanges, evaluatePolicy, readReport, unwrap } from '@wolfsblvt/diffdevil';
import { analyzeGitHub, reconcileHostComment } from '@wolfsblvt/diffdevil/github';
import { briefKit } from '../shared/pr-brief/contract.mjs';
import { composeFinalSummary } from '../shared/pr-brief/compose.mjs';
import { currentFacts } from '../shared/pr-brief/facts.mjs';
import { historyWindow, readBriefSettings } from '../shared/pr-brief/settings.mjs';
import { standardBrief } from '../shared/pr-brief/standard.mjs';
import { fileContinuity, interval as analyticalInterval, median, turnover } from './analytical-data.mjs';

export const BRIEF_RULE = 'diffdevil-brief';
export const BRIEF_LIFECYCLE = 'diffdevil-app-brief/1';
export const FINAL_RULE = 'diffdevil-final-summary';
export const FINAL_LIFECYCLE = 'diffdevil-app-final-summary/1';
const PLACEHOLDER = 'diffdevil standard PR brief (composed by the managed App)';

/**
 * Bounds of the live current-neighbour read. Open PRs are read most recently updated first; beyond these bounds the
 * index is partial and the brief says so, rather than claiming a complete set of open PRs.
 */
export const NEIGHBOUR_ACQUISITION = Object.freeze({ openPullRequests: 500, pullRequests: 50, filesPerPullRequest: 300 });
/** At most this many neighbour numbers are recorded with a publication for later refresh. */
const RECORDED_NEIGHBOURS = 100;

/** Rules in the trusted effective policy that already author comment wording. */
function authoredCommentRules(document) {
  return Object.entries(document?.rules ?? {}).filter(([id, rule]) => id !== BRIEF_RULE && rule?.effects?.comment).map(([id]) => id).sort();
}

/**
 * Off, the standard brief, or the existing advanced portable-template route. Repository-authored comment wording is
 * never silently overwritten: when the trusted policy declares its own comment rules, they stay the route.
 */
export function resolveBriefRoute(settings, document) {
  const templateRules = authoredCommentRules(document);
  if (settings.mode === 'off') return { mode: 'off', effective: 'off', reason: 'comments-off', templateRules };
  if (settings.mode === 'advanced') return { mode: 'advanced', effective: 'advanced', reason: templateRules.length ? 'repository-templates' : 'no-template-rules', templateRules };
  if (templateRules.length) return { mode: 'standard', effective: 'advanced', reason: 'repository-authored-comments', templateRules };
  return { mode: 'standard', effective: 'standard', reason: 'standard-selected', templateRules };
}

/** The policy layer that gives the standard brief one owned upsert comment; its body is always host-composed. */
export function briefPolicyLayer() {
  return { rules: { [BRIEF_RULE]: { when: 'true', effects: { comment: { mode: 'upsert', trigger: 'always', template: PLACEHOLDER } } } } };
}

/** Read the App-only brief settings stored beside the repository policy layer; malformed settings stay off. */
export function storedBriefSettings(configuration) {
  try { return readBriefSettings(configuration?.brief); }
  catch { return readBriefSettings(undefined); }
}

/** Premium context needs a funded repository; the plan reader answers `unknown` while funding is unestablished. */
export function premiumEligibility(plan) {
  if (plan === 'pro' || plan === 'business') return { eligible: true };
  return { eligible: false, reason: plan === 'free' ? 'free-plan' : 'entitlement-unavailable' };
}

const short = value => (typeof value === 'string' ? value : '');
export function briefLinks({ repository, pullRequest, appOrigin }) {
  const [owner, name] = repository.split('/');
  return { check: `https://github.com/${repository}/pull/${pullRequest}/checks`,
    // The App destination is linked only when this deployment declares it serves the signed-in App.
    app: appOrigin ? `${appOrigin}/pr/${encodeURIComponent(owner)}/${encodeURIComponent(name)}/${pullRequest}` : null,
    pullRequest: number => `https://github.com/${repository}/pull/${number}` };
}

/** Live open PRs of the subject repository, most recently updated first: transient titles and draft state, never retained. */
export async function openPullRequests(client, repository, { maximumItems = NEIGHBOUR_ACQUISITION.openPullRequests } = {}) {
  const listed = await client.list(`/repos/${repository}/pulls?state=open&sort=updated&direction=desc&per_page=100`, { maximumItems });
  const rows = listed.items.flatMap(item => Number.isSafeInteger(item?.number) && typeof item?.head?.sha === 'string'
    ? [{ number: item.number, title: short(item.title), draft: item.draft === true, head: item.head.sha, url: short(item.html_url) }] : []);
  return Object.assign(rows, { complete: listed.truncated !== true });
}

/** The paths the effective policy includes, from file identities alone (no patch, counters or content). */
function includedPaths(compiledPolicy, paths) {
  const changes = paths.map(path => ({ path, changeType: 'modified', additions: 0, deletions: 0, kind: 'unknown', incompleteReason: 'MATERIAL_KIND_UNKNOWN' }));
  const report = unwrap(analyzeChanges(changes, { fileSet: { complete: true, total: { status: 'exact', value: changes.length } } }));
  return unwrap(evaluatePolicy(compiledPolicy, report, { phase: 'analyze' })).report.files.filter(file => file.included).map(file => file.path);
}

/**
 * The repository's open PRs and the raw paths the most recently updated of them change, read live once and held only in
 * memory. One read answers the neighbour index of every open PR in the repository at that moment: each subject excludes
 * itself and applies its own policy (`neighbourIndexFor`), so one more PR than the per-subject bound is read. Supply an
 * already-read `open` listing to avoid reading it twice. A PR that closed or became unreadable mid-read is left out
 * and marked unreadable; a rate limit is never absorbed.
 */
export async function readOpenFileIndex({ client, repository, open }) {
  const listed = open ?? await openPullRequests(client, repository);
  const files = new Map();
  for (const pull of listed.slice(0, NEIGHBOUR_ACQUISITION.pullRequests + 1)) {
    let read;
    try { read = await client.list(`/repos/${repository}/pulls/${pull.number}/files?per_page=100`, { maximumItems: NEIGHBOUR_ACQUISITION.filesPerPullRequest }); }
    catch (error) {
      if (error?.diagnostic?.code === 'E_GITHUB_RATE_LIMIT') throw error;
      files.set(pull.number, null); continue;
    }
    files.set(pull.number, { complete: read.truncated !== true,
      paths: [...new Set(read.items.flatMap(item => typeof item?.filename === 'string' && item.filename ? [item.filename] : []))] });
  }
  // `included` holds each policy's inclusion of the paths above for as long as the read itself lives.
  return { open: listed, files, included: new Map() };
}

/**
 * The paths a policy includes from one PR of a shared read, evaluated once per policy and PR. Policy identities are
 * content-derived, so subjects under the same effective policy get the identical result; `null` when it cannot be
 * evaluated. Without this, each subject re-evaluated every neighbour, which dominated a refresh part's CPU time.
 */
function sharedInclusion(raw, compiledPolicy, number, paths) {
  if (!raw.included || typeof compiledPolicy?.id !== 'string') {
    try { return includedPaths(compiledPolicy, paths); } catch { return null; }
  }
  let byPolicy = raw.included.get(compiledPolicy.id);
  if (!byPolicy) { byPolicy = new Map(); raw.included.set(compiledPolicy.id, byPolicy); }
  if (!byPolicy.has(number)) {
    let files;
    try { files = includedPaths(compiledPolicy, paths); } catch { files = null; }
    byPolicy.set(number, files);
  }
  return byPolicy.get(number);
}

/**
 * One subject's current same-file neighbour index, derived from a shared raw read without another provider request:
 * the other open PRs (bounded, most recently updated first) and the paths the subject's effective policy includes.
 * Any bound, unreadable PR or truncated file list marks the index partial.
 */
export function neighbourIndexFor(raw, { pullRequest, compiledPolicy }) {
  const others = raw.open.filter(pull => pull.number !== pullRequest);
  const read = others.slice(0, NEIGHBOUR_ACQUISITION.pullRequests);
  let complete = raw.open.complete && read.length === others.length;
  const items = [];
  for (const pull of read) {
    const listed = raw.files.get(pull.number);
    if (!listed) { complete = false; continue; }
    if (!listed.complete) complete = false;
    const files = sharedInclusion(raw, compiledPolicy, pull.number, listed.paths);
    if (!files) { complete = false; continue; }
    items.push({ number: pull.number, title: pull.title, draft: pull.draft, url: pull.url, head: pull.head, files });
  }
  return { complete, items, open: raw.open.map(pull => pull.number), openComplete: raw.open.complete };
}

/** One page of GitHub's open-PR listing in creation order, which is PR number order. */
export const OPEN_LISTING_PAGE = 100;
/**
 * The next `needed` open PRs numbered above `after`, walking every open PR rather than the most recently updated
 * ones. `page` is where the walk stood last time: PRs that closed since then move later PRs onto earlier pages, so the
 * walk steps back until a page starts at or before the cursor. Returns the numbers, the page it reached, and whether
 * no open PR remains above the last number returned. Numbers only; nothing else from the listing is kept.
 */
export async function openPullRequestsAfter(client, repository, { after = 0, page = 1, needed }) {
  const read = async number => {
    const rows = await client.json(`/repos/${repository}/pulls?state=open&sort=created&direction=asc&per_page=${OPEN_LISTING_PAGE}&page=${number}`);
    if (!Array.isArray(rows)) throw new TypeError('GitHub returned an invalid open pull request listing.');
    return { full: rows.length >= OPEN_LISTING_PAGE, numbers: rows.flatMap(row => Number.isSafeInteger(row?.number) && row.number > 0 ? [row.number] : []).sort((a, b) => a - b) };
  };
  let current = Math.max(1, page), rows = await read(current);
  while (current > 1 && (rows.numbers.length === 0 || rows.numbers[0] > after)) rows = await read(--current);
  const due = new Set();
  for (;;) {
    for (const number of rows.numbers) if (number > after) due.add(number);
    if (due.size >= needed || !rows.full) break;
    rows = await read(++current);
  }
  const numbers = [...due].sort((a, b) => a - b);
  return { numbers: numbers.slice(0, needed), page: current, exhausted: numbers.length <= needed && !rows.full };
}

/**
 * The current same-file neighbour index: other open PRs and the paths they change now, read live from the provider for
 * this evaluation only. This is current operation, not history: it needs no history consent, reads no retained record
 * and stores nothing. `readIndex`, when supplied, returns an equivalent raw read already made for this repository.
 */
export async function currentNeighbourIndex({ client, repository, pullRequest, compiledPolicy, readIndex }) {
  const raw = readIndex ? await readIndex() : await readOpenFileIndex({ client, repository });
  return neighbourIndexFor(raw, { pullRequest, compiledPolicy });
}

/** Share of an installation's hourly GitHub budget that optional reads leave for the basic size report and its effects. */
export const RATE_RESERVE = 0.25;
/**
 * Whether the last observed installation budget is inside the reserve. Optional reads (the neighbour index, brief
 * refreshes) yield there so ordinary size labels, checks and the basic brief keep working; an unobserved budget is not
 * treated as low.
 */
export function rateReserveReached(budget) {
  return Number.isSafeInteger(budget?.remaining) && Number.isSafeInteger(budget?.limit) && budget.limit > 0 && budget.remaining < budget.limit * RATE_RESERVE;
}

/**
 * Basic history and premium inputs for one subject PR. Current neighbours are a live operational read available to an
 * eligible repository without history consent; history-backed facts (median, activity, companion) are read only from
 * that repository's retained records under its current consent. `historyBacked` tells the writer that a publication
 * built from these inputs relies on history consent, which it must still hold when the comment is written.
 */
export async function gatherBriefInputs({ store, client, repositoryId, repository, pullRequest, settings, compiledPolicy, plan, now, provider = null, readIndex }) {
  const eligibility = premiumEligibility(plan);
  const wantsNeighbours = eligibility.eligible && Array.isArray(provider?.modules) && provider.modules.includes('neighbours') && settings.modules.includes('neighbours');
  let neighbours = null;
  // Inside the rate reserve the index is not read: the brief keeps its previously recorded neighbours instead.
  if (wantsNeighbours && !rateReserveReached(client?.rateBudget)) {
    try { neighbours = await currentNeighbourIndex({ client, repository, pullRequest, compiledPolicy, readIndex }); }
    catch (error) { if (error?.diagnostic?.code === 'E_GITHUB_RATE_LIMIT') throw error; neighbours = null; }
  }
  // Whether the current index was wanted and read; an unreadable index keeps the previously recorded neighbours.
  const neighbourRead = !wantsNeighbours ? 'not-wanted' : neighbours ? 'read' : 'unavailable';
  const subject = { repositoryId, pullRequest };
  const policyReport = report => report ? unwrap(evaluatePolicy(compiledPolicy, unwrap(readReport(report)), { phase: 'analyze' })).report : null;
  const kit = { policyReport, fileContinuity, turnover: (contributions, query, observations, unchanged) => turnover(contributions, query, observations, unchanged) };
  const historySettings = store.historySettings ? await store.historySettings(repositoryId, { independentExecution: true }) : { enabled: false };
  if (!historySettings.enabled) {
    const history = { standing: 'consent-required', reason: 'history-off' };
    if (!eligibility.eligible) return { history, premium: eligibility, historyBacked: false, neighbours, neighbourRead };
    return { history, historyBacked: false, neighbours, neighbourRead, kit,
      premium: { eligible: true, input: { records: [], sizes: [], currentNeighbours: neighbours, subject, window: null, historyReason: 'history-off' } } };
  }
  const window = historyWindow(settings, { now, retentionDays: historySettings.retentionDays ?? null });
  const records = (await store.analyticalRecords(repositoryId)).filter(record => record.repositoryId === repositoryId);
  const merged = records.filter(record => record.state === 'merged' && record.mergedAt >= window.from && record.mergedAt < window.to);
  const recovered = merged.map(record => policyReport(record.final?.report)).filter(report => report?.fileSet.complete === true);
  const history = recovered.length ? { standing: 'available', facts: { repository, from: window.from, to: window.to, displayTo: window.displayTo, days: window.days,
    knownMerged: merged.length, recovered: recovered.length, medianChanged: analyticalInterval(median(recovered.map(report => report.totals.lines.changed))) } }
    : { standing: 'unavailable', reason: merged.length ? 'no-recovered-comparisons' : 'no-merged-pull-requests' };
  if (!eligibility.eligible) return { history, premium: eligibility, historyBacked: true, neighbours, neighbourRead };
  const sizes = await store.analyticalSizes(repositoryId, window.from, window.to);
  return { history, historyBacked: true, neighbours, neighbourRead, kit, premium: { eligible: true, input: { records, sizes, currentNeighbours: neighbours, subject, window } } };
}

/** The engine-visible code for a history-consent withdrawal observed before the brief was written. */
export const HISTORY_WITHDRAWN = 'E_BRIEF_HISTORY_WITHDRAWN';
/**
 * Before the brief comment is written, a publication composed from history-backed inputs must still hold history
 * consent. A withdrawal refuses this write; the caller recomposes from fresh inputs, which no longer read history.
 */
export function historyPublicationGuard({ store, repositoryId, inputs }) {
  return async write => {
    if (!inputs?.historyBacked || write?.subject !== BRIEF_RULE || !String(write?.kind).startsWith('comment.')) return;
    const current = store.historySettings ? await store.historySettings(repositoryId, { independentExecution: true }) : { enabled: false };
    if (!current.enabled) throw new DiffdevilError({ code: HISTORY_WITHDRAWN, phase: 'apply', severity: 'error', message: 'History consent was withdrawn before the brief was written; it is recomposed without history.' });
  };
}

/** `n:7,12` ↔ [7, 12]: the open PRs a publication described as sharing files with its subject. */
export function neighbourContext(numbers) { return `n:${[...new Set(numbers)].sort((a, b) => a - b).slice(0, RECORDED_NEIGHBOURS).join(',')}`; }
export function readNeighbourContext(context) {
  const match = typeof context === 'string' ? /^n:((?:\d+(?:,\d+)*)?)$/u.exec(context) : null;
  return match ? (match[1] ? match[1].split(',').map(Number).filter(Number.isSafeInteger) : []) : [];
}

/** Open PRs in the current index whose included paths share at least one included path of the subject's report. */
export function sharingNeighbours(index, report) {
  if (!index) return [];
  const included = new Set((report?.files ?? []).filter(file => file.included).map(file => file.path));
  return index.items.filter(item => item.files.some(path => included.has(path))).map(item => item.number);
}

/**
 * The engine's host-composed comment entry for the standard brief, composed from the freshly evaluated report. When a
 * current neighbour index was read, the publication records which open PRs shared files with it, and `observed`
 * receives both that set and the previous publication's, so a change can refresh exactly the briefs it affects.
 */
export function briefComposer({ settings, policyDocument, policyName, inputs, provider, links, observed = {} }) {
  return { [BRIEF_RULE]: { lifecycle: BRIEF_LIFECYCLE, compose: ({ report, previous }) => {
    const current = currentFacts(report, { policyDocument, policyName });
    const premium = provider ? { provider, ...inputs.premium } : { provider: null };
    let markdown;
    try { markdown = standardBrief({ current, settings, history: inputs.history, premium, links, kit: briefKit(inputs.kit) }).markdown; }
    catch {
      // A context module failure must not take the size report or its label effects with it: post the basic brief.
      markdown = standardBrief({ current, settings, history: inputs.history, premium: { provider, eligible: false, reason: 'context-error' }, links }).markdown;
    }
    observed.previous = readNeighbourContext(previous?.context);
    if (!inputs.neighbours) {
      observed.current = null;
      // A transiently unreadable index must not erase which open PRs the previous publication described.
      return inputs.neighbourRead === 'unavailable' && previous?.context ? { body: markdown, context: previous.context } : markdown;
    }
    observed.current = sharingNeighbours(inputs.neighbours, report);
    return { body: markdown, context: neighbourContext(observed.current) };
  } } };
}

/** Whether the effective policy's size band is the unchanged `size@1` preset, so copy may name it. */
export function policyNameOf(document, provenance = {}) {
  const preset = (document?.presets ?? []).includes('size@1');
  const overridden = Object.keys(provenance).some(key => key.startsWith('/bands/size') || key === '/size');
  return preset && !overridden ? 'size@1' : null;
}

/**
 * The optional terminal summary on a merged PR: one host comment per final comparison, from fresh analysis of the
 * PR's final comparison under trusted policy. A retry or replayed close event is a no-op for the same occasion. A
 * failure keeps its provider observations and carries the terminal identity known so far for repair.
 */
export async function postFinalSummary({ client, target, policy, author, beforeWrite, links, identity }) {
  let comparisonId;
  try {
    const pull = await client.json(`/repos/${target.repository}/pulls/${target.pullRequest}`);
    if (pull?.merged !== true) return { status: 'not-merged' };
    const report = unwrap(evaluatePolicy(policy.policy, unwrap(await analyzeGitHub(client, target)), { phase: 'analyze' })).report;
    comparisonId = report.source.comparisonId;
    const current = currentFacts(report, { policyDocument: policy.document, policyName: policyNameOf(policy.document, policy.provenance) });
    const outcome = await reconcileHostComment(client, { target, policyId: policy.policy.id, rule: FINAL_RULE, host: FINAL_LIFECYCLE,
      occasionId: `final:${comparisonId}`, body: composeFinalSummary({ current, links }) }, author, { beforeWrite });
    return { status: outcome.status, observations: outcome.observations, comparisonId };
  } catch (error) {
    const repairIdentity = identity ? { ...identity, policyId: policy.policy.id, ...(comparisonId ? { comparisonId } : {}) } : undefined;
    throw Object.assign(error, repairIdentity ? { repairIdentity } : {});
  }
}
