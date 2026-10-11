// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The standard PR brief (`pr-brief-r4.1`): one deterministic, bounded Markdown report. Its reading order is ratified:
 * an optional context lead (one native NOTE), the selected file-history table, a historical companion, the current
 * change core, and one supporting details fold. Context arrives as module contributions; this file owns the core,
 * the fold, the ordering and the budget, so the useful current-change report survives any module being absent.
 *
 * The composer states facts. It never predicts conflicts, scores risk or quality, prescribes splits or tests, or turns
 * unknown evidence into zero. Effects (labels, the check) are reported by the check, never inferred here.
 */
import { amount, bytes, code, countWord, dateRange, exact, instant, interval, link, list, number, share, shortRevision, sum } from './markdown.mjs';

/** Nyxara's proposed visible budgets (handoff §5), qualified here; they are engineering inputs, not ratified settings. */
export const BRIEF_LIMITS = Object.freeze({ bodyBytes: 16 * 1024, visibleFiles: 5, detailFiles: 50, listedExcluded: 3 });

const DETAIL_ORDER = ['history', 'activity', 'turnover', 'companion', 'neighbours'];

function sortedFiles(files) {
  // Measured files by descending Changed; files the evidence cannot measure follow in their provider order.
  return files.map((file, index) => ({ file, index })).sort((a, b) => {
    const x = a.file.changed, y = b.file.changed;
    if (x && y) return y.lower - x.lower || (y.upper ?? Infinity) - (x.upper ?? Infinity) || a.index - b.index;
    return x ? -1 : y ? 1 : a.index - b.index;
  }).map(entry => entry.file);
}

/**
 * Which of the four measurement states (or an unavailable population) the evidence supports. Measurement and population
 * completeness are independent: an `unknown` measurement may still have an incomplete file list, and copy reads
 * `current.population` beside the state rather than letting one erase the other.
 */
export function measurementState(current) {
  if (current.population === 'unavailable') return 'unavailable';
  const files = current.files;
  const measured = files.filter(file => file.changed);
  if (files.length && !measured.length) return 'unknown';
  if (measured.length < files.length || current.population === 'incomplete') return 'partial';
  return files.every(file => exact(file.changed)) ? 'exact' : 'bounded';
}

function rangeText(range) {
  if (range.upper === null) return `${range.label} as ${number(range.lower)} or more`;
  return `${range.label} as ${number(range.lower ?? 0)}–${number(range.upper - 1)}`;
}
function bandFor(current) {
  const band = current.band;
  return band.status === 'resolved' ? current.policy.ranges.find(range => range.id === band.id) ?? { id: band.id, label: band.label, lower: null, upper: null } : null;
}
function hasBands(current) { return current.policy.ranges.length > 0; }
const basisOf = current => current.policy.basis?.kind ?? 'changed';
/** The unit a band's thresholds are stated in: Changed only when the effective policy bands Changed. */
function basisUnit(current) {
  const basis = current.policy.basis ?? { kind: 'changed' };
  if (basis.kind === 'changed') return 'included Changed';
  if (basis.kind === 'raw-churn') return 'raw churn';
  return basis.metric ? `by its ${code(basis.metric)} metric` : 'by its size value';
}
/** The proven lower bound of the value the band measures, when the brief carries that value. */
function basisLower(current) {
  const value = basisOf(current) === 'changed' ? interval(current.totals.changed) : basisOf(current) === 'raw-churn' ? interval(current.totals.raw.churn) : null;
  return value && value.lower > 0 ? value.lower : null;
}
/** How much of the provider's changed-file list arrived, when it is incomplete. */
function listedCount(current) {
  const listed = current.listed?.files ?? current.files.length + current.excluded.length;
  const total = current.listed?.total;
  return Number.isSafeInteger(total) && total > listed ? `${number(listed)} of ${number(total)} changed files listed` : `${number(listed)} changed ${listed === 1 ? 'file' : 'files'} listed`;
}

function headline(current, state) {
  const band = current.band.status === 'resolved' ? `Size ${current.band.label}` : 'Size unresolved';
  const count = current.files.length === 1 ? '1 included file' : `${number(current.files.length)} included files`;
  const parts = [];
  if (state === 'unavailable') return `**${hasBands(current) ? 'Size unresolved · ' : ''}file list unavailable**`;
  const total = interval(current.totals.changed);
  if (state === 'exact' || state === 'bounded') parts.push(`${amount(total)} Changed`);
  if (state === 'partial' && total) parts.push(`At least ${number(total.lower)} Changed`);
  if (hasBands(current)) parts.push(band);
  // An incomplete list never prints a whole-population count; it says how much of the list arrived.
  if (current.population === 'incomplete' && state !== 'partial') parts.push(listedCount(current));
  else if (state !== 'partial') parts.push(count);
  return `**${parts.join(' · ')}**`;
}

function excludedSentence(paths, { detail = false } = {}) {
  if (!paths.length) return null;
  const shown = paths.slice(0, BRIEF_LIMITS.listedExcluded).map(path => code(path));
  const rest = paths.length - shown.length;
  const named = rest ? `${shown.join(', ')} and ${number(rest)} more files` : list(shown);
  const verb = paths.length === 1 ? 'is' : 'are';
  return detail ? `${named} ${verb} excluded.` : `${named} ${verb} excluded by repository policy.`;
}

function fileTable(files, limit) {
  const rows = files.slice(0, limit).map(file => `| ${code(file.path, { cell: true })} | ${amount(file.changed)} |`);
  return ['| File | Changed |', '| :--- | :--- |', ...rows].join('\n');
}

/** The basic concentration observation: the fewest largest files (at most three) carrying at least half of Changed. */
function concentration(files, total) {
  if (files.length < 3 || !exact(total) || interval(total).lower <= 0) return null;
  let carried = 0;
  for (let count = 1; count <= 3; count++) {
    carried += interval(files[count - 1].changed).lower;
    const part = share(carried, total);
    if (part.lower >= 50 && count < files.length) return `**${part.text} of included Changed** is in ${list(files.slice(0, count).map(file => code(file.path)))}.`;
  }
  return null;
}

function stateLines(current, state, files) {
  if (state === 'exact') {
    const c = current.totals.composition;
    return c ? [`${number(c.modified)} modified · ${number(c.addedOnly)} added-only · ${number(c.deletedOnly)} deleted-only.`] : [];
  }
  if (state === 'bounded') {
    const bounded = files.filter(file => !exact(file.changed));
    const named = bounded.length === 1 ? `${code(bounded[0].path)} is bounded at ${amount(bounded[0].changed)} Changed.`
      : `${countWord(bounded.length).replace(/^./u, c => c.toUpperCase())} files are bounded: ${list(bounded.map(file => `${code(file.path)} (${amount(file.changed)})`))}.`;
    const band = bandFor(current);
    const labels = () => list(current.band.candidates.map(id => current.policy.ranges.find(range => range.id === id)?.label ?? id));
    // Only a Changed-banded policy places the Changed range; another basis is reported as the policy's own result.
    const changedBasis = basisOf(current) === 'changed';
    const placement = !hasBands(current) ? null
      : band ? (changedBasis ? `The full PR range falls within the repository’s ${band.label} band.` : `The repository’s size policy places this PR in its ${band.label} band.`)
      : changedBasis ? `The range spans the repository’s ${labels()} bands, so one size is not established.`
      : `The available evidence spans the repository’s ${labels()} bands, so one size is not established.`;
    return [[named, placement].filter(Boolean).join(' ')];
  }
  if (state === 'partial') {
    const missing = files.filter(file => !file.changed);
    if (current.population === 'incomplete') return ['The provider returned an incomplete file list, so these counts are lower bounds and no whole-PR share is claimed.'];
    const named = missing.length <= 3 ? list(missing.map(file => code(file.path))) : `${missing.slice(0, 3).map(file => code(file.path)).join(', ')} and ${number(missing.length - 3)} more`;
    return [`${number(files.length - missing.length)} of ${number(files.length)} included files measured. ${named} could not be measured.`];
  }
  if (state === 'unknown') return [current.population === 'incomplete' ? 'The provider returned an incomplete file list, and the diff data needed to measure Changed is unavailable.'
    : 'The file list is available; the diff data needed to measure Changed is unavailable.'];
  return ['The current comparison’s file list and diff data are unavailable.'];
}

function medianLine(history) {
  const recovered = history.recovered === history.knownMerged ? `**${number(history.knownMerged)} merged PRs**`
    : `**${number(history.recovered)} recovered of ${number(history.knownMerged)} merged PRs**`;
  return `Repository median: **${amount(history.medianChanged)} Changed** across ${recovered} over the last ${number(history.days)} days.`;
}

function coreFiles(current, state, files, covered) {
  const limit = BRIEF_LIMITS.visibleFiles;
  if (!files.length) return ['No changed file is included: repository policy excludes every changed file.'];
  if (!covered.size) {
    const remainder = files.length - Math.min(files.length, limit);
    return [fileTable(files, limit), ...(remainder ? [`${number(remainder)} more included ${remainder === 1 ? 'file is' : 'files are'} listed in the details below.`] : [])];
  }
  const others = files.filter(file => !covered.has(file.path));
  if (!others.length) return [];
  const shown = others.slice(0, limit), remainder = others.length - shown.length;
  const tail = remainder ? ` and ${number(remainder)} more` : '';
  if (state === 'unknown') return [`Also included: ${shown.map(file => code(file.path)).join(', ')}${tail}.`];
  return [`Other included files: ${shown.map(file => `${code(file.path)} (${amount(file.changed)})`).join(', ')}${tail}.`];
}

function comparisonDetail(current, state, snapshot, context) {
  const head = `${code(shortRevision(current.comparison.base))} → ${code(shortRevision(current.comparison.head))}`;
  if (state === 'unavailable') return `**Comparison requested:** ${head}.`;
  if (!snapshot?.synthetic) return `**Comparison:** ${head}.`;
  const when = instant(snapshot.observedAt);
  return context ? `**Comparison:** ${head}. Current comparison and open-PR file lists are from the same synthetic snapshot, ${when}.`
    : `**Comparison:** ${head}. The comparison is from the synthetic snapshot, ${when}.`;
}

function measurementDetail(current, state, files, notes, context) {
  const t = current.totals, total = interval(t.changed), raw = t.raw;
  if (state === 'exact') {
    const c = t.composition;
    const composed = c ? ` = ${number(c.modified)} modified + ${number(c.addedOnly)} added-only + ${number(c.deletedOnly)} deleted-only` : '';
    const churn = exact(raw.churn) && exact(raw.added) && exact(raw.deleted) ? ` Raw churn: ${amount(raw.churn)} = ${amount(raw.added)} raw additions + ${amount(raw.deleted)} raw deletions.` : ` Raw churn: ${amount(raw.churn)}.`;
    return `**Measurement:** ${amount(total)} included Changed${composed}.${churn} Replacement-aware Changed counts paired replacements once.${notes}`;
  }
  if (state === 'bounded') {
    const bounded = files.filter(file => !exact(file.changed)), others = files.filter(file => exact(file.changed));
    const parts = [`**Measurement:** ${amount(total)} included Changed.`];
    if (others.length) parts.push(`The other ${countWord(others.length)} ${others.length === 1 ? 'file contributes' : 'files contribute'} ${amount(sum(others.map(file => file.changed)))}.`);
    for (const file of bounded) {
      const rawPart = file.raw.added && file.raw.deleted && exact(file.raw.added) && exact(file.raw.deleted) ? `supplies ${amount(file.raw.added)} raw additions and ${amount(file.raw.deleted)} raw deletions without usable edit-block pairing, giving` : 'has no usable edit-block pairing, giving';
      parts.push(`${code(file.path)} ${rawPart} ${amount(file.changed)} Changed.`);
    }
    parts.push(exact(raw.churn) ? `Raw churn is exact at ${amount(raw.churn)}.` : `Raw churn: ${amount(raw.churn)}.`);
    return parts.join(' ') + notes;
  }
  if (state === 'partial') {
    const churn = interval(raw.churn);
    const plural = files.filter(file => !file.changed).length > 1;
    const lead = `**Measurement:** at least ${number(total?.lower ?? 0)} included Changed${churn ? ` and at least ${number(churn.lower)} raw churn` : ''}.`;
    return `${lead} ${current.population === 'incomplete' ? 'Files missing from the provider’s list are' : plural ? 'The unavailable files are' : 'The unavailable file is'} not counted as zero; no whole-PR share is claimed.${notes}`;
  }
  if (state === 'unknown') {
    const population = current.population === 'incomplete' ? 'The provider’s file list is incomplete, so the listed files are not the whole PR.' : null;
    return context ? ['**Measurement:** Changed and raw churn are unavailable.', population, 'Known file identities still support the independently available same-file and historical context.'].filter(Boolean).join(' ')
      : ['**Measurement:** Changed and raw churn are unavailable.', population ?? 'The included file list is complete.', 'No current Changed values are inferred from the known paths.'].join(' ');
  }
  return '**Measurement:** no file population, Changed total or raw churn is established. Unavailable evidence is not zero.';
}

function policyDetail(current, state, { terminal = false } = {}) {
  if (state === 'unavailable') return '**Repository policy:** the check reports the selected policy’s decision and current effect status. No band or applied effect is inferred here.';
  const name = current.policy.name ? `${code(current.policy.name)} defines` : 'the effective policy defines';
  // Terminal copy keeps exclusions in its visible core only.
  const excluded = terminal ? null : excludedSentence(current.excluded, { detail: true });
  const effects = terminal ? 'actual effects are reported in the check.' : 'applied GitHub effects are reported in the check.';
  const resolved = bandFor(current);
  // An unresolved band names the band its proven lower bound reaches, never an arbitrary one; that needs the banded value.
  const lower = basisLower(current);
  const reached = !resolved && lower !== null ? current.policy.ranges.find(range => lower >= (range.lower ?? -Infinity) && (range.upper === null || lower < range.upper)) : null;
  const shown = resolved ?? reached;
  const parts = ['**Repository policy:**'];
  if (!hasBands(current)) parts.push('the effective policy defines no size band.');
  else if (shown) parts.push(`${name} ${rangeText(shown)} ${basisUnit(current)}.`);
  if (excluded) parts.push(excluded);
  parts.push(resolved || !hasBands(current) ? (hasBands(current) ? `The shown band is the policy result; ${effects}` : `${effects.charAt(0).toUpperCase()}${effects.slice(1)}`)
    : 'The evidence cannot establish one numeric band. The check reports the repository policy’s decision and current effect status.');
  return parts.join(' ');
}

function filesDetail(files, limit, population) {
  if (!files.length) return null;
  const rows = files.slice(0, limit).map(file => `| ${code(file.path, { cell: true })} | ${amount(file.changed)} |`);
  const remainder = files.length - Math.min(files.length, limit);
  return [population === 'incomplete' ? '**Included files the provider listed**' : '**Included files**', '', ['| File | Changed |', '| :--- | :--- |', ...rows].join('\n'),
    ...(remainder ? ['', `${number(remainder)} more included ${remainder === 1 ? 'file is' : 'files are'} not listed here.`] : [])].join('\n');
}

function historyDetail(history) {
  const recovered = `${number(history.recovered)} of ${number(history.knownMerged)} known final comparisons recovered`;
  return `**Repository history:** ${number(history.knownMerged)} unique merged PRs in ${code(history.repository)}, ${dateRange(history.from, history.displayTo ?? history.to)}; ${recovered}. Same measurement version, effective policy and path exclusions. Median: **${amount(history.medianChanged)} Changed**.`;
}

function linksLine(links, state) {
  const items = [];
  if (links?.check) items.push(link(state === 'unavailable' ? 'Acquisition and effect status in the check' : 'Full measurement and effect status in the check', links.check));
  if (links?.app) items.push(link('Explore this PR in the App', links.app));
  return items.length ? items.join(' · ') : null;
}

/**
 * Compose the body. `contributions` are already-selected module results (see contract.mjs); `history` is the basic
 * repository-history fact or null; `options.limits` lets the budget loop request tighter detail caps.
 */
function render({ current, history, contributions, links, snapshot }, caps) {
  const state = measurementState(current);
  const files = sortedFiles(current.files);
  const shown = contributions.filter(item => item.visible || item.details);
  const bySlot = slot => shown.filter(item => item.slot === slot && item.visible).map(item => item.visible);
  const context = shown.some(item => item.tier === 'premium');
  const covered = new Set(shown.flatMap(item => item.coveredPaths ?? []));
  const activityShown = shown.some(item => item.slot === 'activity' && item.visible);
  const blocks = [...bySlot('lead'), ...bySlot('activity'), ...bySlot('companion')];

  const core = ['### This change', '', headline(current, state)];
  for (const line of stateLines(current, state, files)) core.push('', line);
  const historyNumber = state === 'exact' || state === 'bounded' || state === 'partial';
  if (history && historyNumber && !activityShown) core.push('', medianLine(history));
  if (state !== 'unavailable') {
    if (!covered.size && state === 'exact') { const line = concentration(files, current.totals.changed); if (line) core.push('', line); }
    for (const part of coreFiles(current, state, files, covered)) core.push('', part);
    const excluded = excludedSentence(current.excluded);
    if (excluded) core.push('', excluded);
  }
  blocks.push(core.join('\n'));

  const notes = shown.map(item => item.measurementNote).filter(Boolean).map(note => ` ${note}`).join('');
  const details = [comparisonDetail(current, state, snapshot, shown.some(item => item.slot === 'lead' && item.visible)), measurementDetail(current, state, files, notes, context), policyDetail(current, state)];
  if (state !== 'unavailable') { const table = filesDetail(files, caps.detailFiles, current.population); if (table) details.push(table); }
  if (history) details.push(historyDetail(history));
  const contextDetails = [];
  for (const key of DETAIL_ORDER.slice(1)) for (const item of shown) if (item.details?.[key]) contextDetails.push(item.details[key]);
  // A trailer qualifies the context as a whole, so it closes the last context paragraph whichever modules survived.
  const trailers = shown.map(item => item.details?.trailer).filter(Boolean);
  if (contextDetails.length && trailers.length) contextDetails[contextDetails.length - 1] += ` ${trailers.join(' ')}`;
  details.push(...contextDetails);
  const linkLine = linksLine(links, state);
  if (linkLine) details.push(linkLine);
  const summary = `${context ? 'Measurement and context details' : 'Measurement details'}${current.comparison.head ? ` · ${shortRevision(current.comparison.head)}` : ''}`;
  blocks.push(['<details>', `<summary>${summary}</summary>`, '', details.join('\n\n'), '', '</details>'].join('\n'));
  return blocks.join('\n\n');
}

/**
 * Trim the lowest-priority optional observations, never the core, until the body fits. Each step is honest: rows
 * become a counted remainder, and a dropped module is reported in `trimmed` for the preview and check.
 */
export function composeBrief(input, { limits = BRIEF_LIMITS, priority = ['neighbours', 'activity', 'companion'] } = {}) {
  const contributions = [...(input.contributions ?? [])];
  const trimmed = [];
  // The lowest-priority context module is the first to leave; the current-change core never does.
  const steps = [
    { caps: { detailFiles: limits.detailFiles } },
    { caps: { detailFiles: 10 }, note: 'detail-file-rows' },
    ...priority.toReversed().map(id => ({ caps: { detailFiles: 10 }, reduce: id })),
    { caps: { detailFiles: 0 }, note: 'detail-file-table' }
  ];
  let markdown;
  for (const step of steps) {
    if (step.reduce) {
      const index = contributions.findIndex(item => item.id === step.reduce);
      if (index >= 0) { trimmed.push(contributions[index].id); contributions.splice(index, 1); }
    }
    if (step.note) trimmed.push(step.note);
    markdown = render({ ...input, contributions }, step.caps);
    if (bytes(markdown) <= limits.bodyBytes) return { markdown, bytes: bytes(markdown), trimmed: trimmed.filter(Boolean) };
  }
  // Untrusted identities too long for any honest compact form: state the omission and point to complete evidence.
  const state = measurementState(input.current);
  markdown = ['### This change', '', headline({ ...input.current, files: input.current.files }, state), '',
    'The file identities in this PR are too long to show within the comment limit. The check carries the complete measurement.',
    ...(linksLine(input.links, state) ? ['', linksLine(input.links, state)] : [])].join('\n');
  return { markdown, bytes: bytes(markdown), trimmed: [...trimmed, 'oversized-identities'] };
}

/**
 * The optional terminal summary on merge (proposed copy, off by default): final measurement and policy facts only, from
 * established final-comparison evidence. “Merged” is printed only because the caller observed provider merge state;
 * no live neighbour or companion observation belongs in terminal copy.
 */
export function composeFinalSummary({ current, links }) {
  const state = measurementState(current);
  const files = sortedFiles(current.files);
  const identity = `${code(shortRevision(current.comparison.base))} → ${code(shortRevision(current.comparison.head))}`;
  const core = [`### Merged · final comparison ${identity}`, '', headline(current, state)];
  for (const line of stateLines(current, state, files)) core.push('', line);
  const excluded = state === 'unavailable' ? null : excludedSentence(current.excluded);
  if (excluded) core.push('', excluded);
  const t = current.totals, raw = t.raw;
  const measurement = state === 'exact' ? `**Measurement:** ${amount(t.changed)} included Changed. Raw churn: ${amount(raw.churn)} = ${amount(raw.added)} raw additions + ${amount(raw.deleted)} raw deletions.`
    : measurementDetail(current, state, files, '', false);
  const policy = policyDetail(current, state, { terminal: true });
  const linkItems = [];
  if (links?.check) linkItems.push(link('Final measurement and effect status in the check', links.check));
  if (links?.app) linkItems.push(link('Explore this PR in the App', links.app));
  const details = [`**Provider state:** merged. **Final comparison:** ${identity}.`, measurement, policy, ...(linkItems.length ? [linkItems.join(' · ')] : [])];
  return [core.join('\n'), ['<details>', '<summary>Final measurement details</summary>', '', details.join('\n\n'), '', '</details>'].join('\n')].join('\n\n');
}
