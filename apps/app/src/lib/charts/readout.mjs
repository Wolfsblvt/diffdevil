// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The F1 readout and the equivalent table for every chart model, as text. The server renders
 * the default readout (nothing focused) and the table from here; the browser renders every
 * focused state from the same functions, so what a pointer, the keyboard or a screen reader
 * reaches is one grammar. A readout is `{ when, tags, vals }`: line 1 names what is focused
 * plus tags; line 2 lists values, the decisive one marked `sum`. `unknown` is a state, not `0`.
 */
import { n0, esc, fmtDur, rangeText, signed, percent, agoText, dateText, describeBound } from './format.mjs';

export const plural = (count, one, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;
export const boundText = value => (!value ? 'unknown' : value.status === 'unknown' && !value.lower ? 'unknown' : value.upper === null ? `≥ ${n0(value.lower)}` : rangeText(value.lower, value.upper));
export const chip = (color, text) => `<span class="fr-chip" style="--c:${esc(color)}">${esc(text)}</span>`;

/**
 * Chart kinds another module adds to the frame: the premium extension's file charts register their readout, teach
 * line, table and skeleton shape here, on the server when its page bodies load and in the browser from its entry
 * script. A kind nobody registered reads as empty rather than failing.
 * @type {Map<string, { readout?: (model: any, i: number | null) => any, teach?: (model: any) => string, table?: (model: any) => any, skeleton?: 'bars' | 'rows' | ((kind: string) => string) }>}
 */
const KINDS = new Map();
export function registerChartKinds(kinds) {
  for (const [kind, parts] of Object.entries(kinds)) KINDS.set(kind, { ...KINDS.get(kind), ...parts });
}

/** Values of one mosaic bucket (or of the totals) under its coverage. */
function mosaicVals(row, coverage) {
  const q = value => (coverage === 'none' ? 'unknown' : (coverage === 'partial' ? '≥ ' : '') + value);
  const bounded = row.boundedLow > 0;
  return [
    { key: 'mod', label: '~ modified', value: q(n0(row.modified)) }, { key: 'add', label: '+ added-only', value: q(n0(row.added)) }, { key: 'del', label: '− deleted-only', value: q(n0(row.deleted)) },
    ...(bounded ? [{ key: 'unres', label: 'bounded', value: row.boundedHigh === null ? `≥ ${n0(row.boundedLow)}` : rangeText(row.boundedLow, row.boundedHigh) }] : []),
    { cls: 'sum', label: 'Changed', value: coverage === 'none' ? 'unknown' : coverage === 'partial' ? `≥ ${n0(row.proven)}` : bounded ? (row.boundedHigh === null ? `≥ ${n0(row.proven)}` : rangeText(row.proven, row.exact + row.boundedHigh)) : n0(row.exact) },
    { key: 'raw', label: 'raw churn', value: q(n0(row.rawChurn)) }
  ];
}

const READOUT = {
  mosaic(model, i) {
    const { rows, totals } = model;
    if (i === null) {
      const span = model.unit === 'merged PR' ? plural(rows.length, 'merged PR') : `${model.period} · ${rows.length} ${model.unit === '2 days' ? '2-day buckets' : `${model.unit}s`}`;
      return { when: span, tags: [{ text: `${totals.recovered} of ${totals.count} ${model.population} PRs recovered` }, ...(totals.boundedCount ? [{ text: `${totals.boundedCount} bounded` }] : [])], vals: mosaicVals(totals, totals.coverage) };
    }
    const row = rows[i];
    const tags = [{ text: plural(row.count, `${model.population} PR`) }];
    if (row.coverage === 'partial') tags.push({ cls: 'warn', text: `partial · ${row.recovered}/${row.count} recovered` });
    if (row.coverage === 'none') tags.push({ cls: 'warn', text: `0 of ${row.count} recovered` });
    if (row.boundedCount) tags.push({ text: `${row.boundedCount} bounded` });
    if (row.band) tags.push({ cls: 'raw', html: chip(row.band.color, row.band.short) });
    if (row.mergedAgo) tags.push({ text: `merged ${row.mergedAgo}` });
    const vals = mosaicVals(row, row.coverage);
    if (model.strip && i !== null) {
      const after = model.strip.values[i], before = i ? model.strip.values[i - 1] : model.strip.start;
      if (after !== null && after !== undefined) vals.push({ label: model.strip.label, value: before === null || before === undefined ? n0(after) : `${n0(after)} (${signed(after - before)})` });
    }
    return { when: row.name, tags, vals: vals.filter(value => !(model.strip && value.key === 'unres')) };
  },
  flow(model, i) {
    const vals = (row, end) => [{ key: 'opened', label: 'opened', value: n0(row.opened) }, { key: 'merged', label: 'merged', value: n0(row.merged) }, { key: 'closed', label: 'closed unmerged', value: n0(row.closed) }, { cls: 'sum', label: 'net', value: signed(row.net) }, { key: 'openline', label: end ? 'open now' : 'open at week end', value: n0(row.openAtEnd) }];
    if (!model.lifecycle) {
      if (i === null) return { when: '13 weeks', tags: [{ text: 'analysed pull requests by analysis time' }], vals: [{ cls: 'sum', label: 'analysed', value: n0(model.rows.reduce((total, row) => total + row.analysed, 0)) }] };
      return { when: model.rows[i].name, tags: [], vals: [{ cls: 'sum', label: 'analysed', value: n0(model.rows[i].analysed) }] };
    }
    if (i === null) return { when: '13 weeks', tags: [{ text: `backlog ${signed(model.totals.net)}` }], vals: vals({ ...model.totals, openAtEnd: model.totals.openNow }, true) };
    const row = model.rows[i];
    return { when: row.name, tags: row.covered ? [] : [{ cls: 'warn', text: 'before the first retained observation · lower bounds' }], vals: vals(row) };
  },
  ttm(model, i) {
    const all = model.rows[0];
    if (!all || model.n === 0) return { when: 'no merged PRs', tags: [], vals: [{ cls: 'sum', label: 'usually', value: 'n/a' }] };
    if (i === null) {
      return { when: plural(model.n, 'merged PR'), tags: model.slowerSmall ? [{ cls: 'warn', text: `${model.slowerSmall.label} ${fmtDur(model.slowerSmall.med)} · only ${plural(model.slowerSmall.n, 'PR')}` }] : [],
        vals: [{ cls: 'sum', label: 'usually', value: all.n >= 3 ? `${fmtDur(all.q1)} – ${fmtDur(all.q3)}` : fmtDur(all.med) }, { label: 'median', value: fmtDur(all.med) }, ...(model.slowest ? [{ label: 'slowest size · ≥3 PRs', value: `${model.slowest.label} · ${fmtDur(model.slowest.med)}` }] : [])] };
    }
    const row = model.rows[i];
    return { when: row.key === 'all' ? 'All merged PRs' : row.label, tags: [{ text: plural(row.n, 'PR') }, ...(row.n < 3 ? [{ cls: 'warn', text: 'few PRs · read loosely' }] : [])],
      vals: [{ cls: 'sum', label: 'usually', value: row.n >= 3 ? `${fmtDur(row.q1)} – ${fmtDur(row.q3)}` : fmtDur(row.med) }, { label: 'median', value: fmtDur(row.med) }, { label: 'vs all', value: row.key === 'all' ? '–' : row.med >= all.med ? `${(row.med / Math.max(all.med, 1e-6)).toFixed(1)}× longer` : `${(all.med / Math.max(row.med, 1e-6)).toFixed(1)}× shorter` }, { label: 'fastest · slowest', value: `${fmtDur(row.min)} · ${fmtDur(row.max)}` }] };
  },
  mix(model, i) {
    if (model.n === 0) return { when: 'no measured PRs', tags: model.lost ? [{ cls: 'warn', text: `${model.lost} not recovered · not counted` }] : [], vals: [{ cls: 'sum', label: 'most common', value: '–' }] };
    if (i === null || i === 0) {
      return { when: plural(model.n, 'merged PR'), tags: model.lost ? [{ cls: 'warn', text: `${model.lost} not recovered · not counted` }] : [],
        vals: [{ cls: 'sum', label: 'most common', value: model.most ? `${model.most.short} · ${percent(model.most.share)}` : '–' }, { label: 'XS or S', value: model.smallShare === null ? '–' : percent(model.smallShare) }, { label: 'median Changed', value: describeBound(model.medianChanged) }] };
    }
    const row = model.rows[i];
    return { when: row.label, tags: row.unknown ? [{ cls: 'warn', text: 'range crosses a boundary' }] : [],
      vals: [{ cls: 'sum', label: 'merged PRs', value: n0(row.count) }, { label: 'share', value: row.share === null ? 'not in share' : percent(row.share) }, { label: 'median Changed', value: describeBound(row.medianChanged) }, { label: 'smallest · largest', value: row.smallest === null ? '–' : `${n0(row.smallest)} · ${describeBound(row.largest)}` }] };
  },
  lifecycle(model, i) {
    const vals = row => [{ label: 'started as draft', value: percent(row.draftShare) }, { label: 'typical draft', value: row.dMed === null ? '–' : fmtDur(row.dMed) }, { label: 'typical review', value: row.rMed === null ? '–' : fmtDur(row.rMed) }, { cls: 'sum', label: 'median total', value: row.tMed === null ? 'n/a' : fmtDur(row.tMed) }];
    if (!model.rows.length) return { when: 'no merged PRs', tags: [], vals: [{ cls: 'sum', label: 'median total', value: 'n/a' }] };
    if (i === null || i === 0) return { when: plural(model.n, 'merged PR'), tags: [], vals: vals(model.rows[0]) };
    const row = model.rows[i];
    return { when: row.label, tags: [{ text: plural(row.n, 'PR') }, ...(row.n < 3 ? [{ cls: 'warn', text: 'few PRs · read loosely' }] : [])], vals: vals(row) };
  },
  lanes(model, i) {
    if (i === null) return { when: plural(model.rows.length, 'merged PR'), tags: model.range ? [{ text: 'band = selected bucket' }] : [], vals: model.bands.map(band => ({ label: band.short, value: n0(band.count) })) };
    const row = model.rows[i];
    const band = model.bands.find(candidate => candidate.id === row.bandId);
    return { when: `#${row.number}${row.title ? ` ${row.title}` : ''}`, tags: [...(row.repo ? [{ text: row.repo }] : []), ...(band ? [{ cls: 'raw', html: chip(band.color, band.short) }] : [])],
      vals: [{ cls: 'sum', label: 'Changed', value: row.changed === null ? 'not recovered' : boundText(row.changed) }, { label: 'merged', value: dateText(row.mergedAt) }, { label: 'opened → merged', value: fmtDur(row.elapsed) }] };
  },
  development(model, i) {
    const k = i === null ? model.rows.length - 1 : i, row = model.rows[k];
    if (!row) return { when: 'no analysed head', tags: [], vals: [{ cls: 'sum', label: 'Changed', value: 'n/a' }] };
    const tags = [];
    if (row.color) tags.push({ cls: 'raw', html: chip(row.color, row.bandShort) });
    if (k === model.rows.length - 1) tags.push({ text: 'current' });
    if (row.transition) tags.push({ cls: 'warn', text: `${row.transition} here` });
    return { when: `head ${k + 1} · ${row.sha} · ${agoText(row.at, model.now)}`, tags, vals: [{ cls: 'sum', label: 'Changed', value: boundText({ status: row.status, lower: row.changed, upper: row.upper }) }, { label: 'vs previous', value: row.changedFrom === null ? '–' : signed(row.changedFrom) }, { label: 'since opened', value: signed(row.sinceOpened) }] };
  },
};

/**
 * The readout for a model with row `i` focused, or the window summary with `null`.
 * @param {any} model
 * @param {number | null} [i]
 * @returns {{ when: string, tags: { text?: string, html?: string, cls?: string }[], vals: { label: string, value: string, key?: string, cls?: string }[], mono?: boolean }}
 */
export function readoutOf(model, i = null) {
  const build = READOUT[model.kind] ?? KINDS.get(model.kind)?.readout;
  if (!build) return { when: '', tags: [], vals: [] };
  return build(model, i);
}

/**
 * Readout as HTML. `pinned` adds the pin and the drill button; `clearable` the clear control.
 * @param {ReturnType<typeof readoutOf>} readout
 * @param {{ pinned?: boolean, clearable?: boolean, drill?: { href: string, label: string, swap?: string } | null, hint?: boolean }} [options]
 */
export function readoutHtml(readout, { pinned = false, clearable = false, drill = null, hint = true } = {}) {
  const tags = readout.tags.map(tag => `<span class="fr-tag ${tag.cls ?? ''}">${tag.html ?? esc(tag.text)}</span>`).join('');
  const when = `<div class="fr-when">${pinned ? '<span class="fr-pin" aria-label="pinned">' + PIN + '</span>' : ''}<b class="${readout.mono ? 'mono' : ''}">${esc(readout.when)}</b>${tags}${pinned && clearable ? '<button class="fr-clear" type="button" title="Clear (Esc)">clear</button>' : !pinned && hint ? '<span class="fr-hint">hover or ← → to inspect</span>' : ''}</div>`;
  const vals = readout.vals.map(value => `<div class="${value.cls ?? ''}"><dt>${value.key ? `<i class="sw ${value.key}" aria-hidden="true"></i>` : ''}${esc(value.label)}</dt><dd class="${/^unknown/u.test(String(value.value)) || value.value === 'n/a' ? 'unk' : ''}">${esc(value.value)}</dd></div>`).join('');
  const button = pinned && drill ? `<a class="fr-drill" href="${esc(drill.href)}"${drill.swap ? ` data-swap="${esc(drill.swap)}"` : ''}>${esc(drill.label)} →</a>` : '';
  return `${when}<dl class="fr-vals">${vals}${button}</dl>`;
}

/** The readout as one plain sentence for the live region: what is focused, then its values. */
export function readoutText(readout) {
  return [readout.when, ...readout.tags.map(tag => tag.text).filter(Boolean), ...readout.vals.map(value => `${value.label} ${value.value}`)].join(' · ');
}

const PIN = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/></svg>';

/** The teach line under each chart: the encoding in words. */
export function teachOf(model) {
  switch (model.kind) {
    case 'mosaic': return model.strip ? 'bar height = Changed · colour area = composition · outline = raw churn · hatch = bounded · strip below = file size after each merged PR' : 'bar height = Changed · colour area = composition · outline = raw churn · hatch = bounded, drawn at its proven minimum';
    case 'flow': return model.lifecycle ? 'bars = opened beside merged + closed unmerged · number = net · line = open at week end · strip below = the backlog over the context; drag its handles to choose the weeks shown' : 'bars = analysed pull requests per week, by analysis time';
    case 'ttm': return `capsule = usual range (middle half) · bright tick = median · dots = single PRs · dashed = fewer than 3 PRs. The time axis is logarithmic: the ruler marks equal ${model.hi > 1 ? 'days' : 'hours'}${model.lo < 1 && model.hi > 1 ? ' (3 h blocks below a day)' : ''}; later ones take less room.`;
    case 'mix': return 'capsule = number of merged PRs · share leaves Unknown out · Unknown = proven Changed range crosses a label boundary';
    case 'lifecycle': return 'dotted = typical draft time · solid = typical time from ready to merged · bright tick = median total (stage medians do not add up). Elapsed time between observed transitions. Not effort, not anyone’s speed.';
    case 'lanes': return 'one dot per merged PR at its merge time · hollow = bounded or not recovered' + (model.range ? ' · band = the selected bucket' : '');
    case 'development': return 'point = Changed at that head · tinted zone = the size label that amount earns · chip = label changed here';
    default: return KINDS.get(model.kind)?.teach?.(model) ?? '';
  }
}

const bandCell = row => ({ html: row.color ? chip(row.color, row.short) : esc(row.label) });

/** The equivalent table: columns and rows of the same model. Cells are `{ text }` or `{ html }`; `num` right-aligns. */
export function tableOf(model) {
  const num = label => ({ label, num: true });
  switch (model.kind) {
    case 'mosaic': return { caption: 'Change volume', columns: [{ label: model.unit === 'merged PR' ? 'pull request' : model.unit }, num(`${model.population}`), num('~ mod'), num('+ add'), num('− del'), num('Changed'), num('raw churn'), { label: 'coverage' }, ...(model.strip ? [num(model.strip.label)] : [])],
      rows: model.rows.map((row, index) => [{ text: row.name }, { text: n0(row.count) }, { text: n0(row.modified) }, { text: n0(row.added) }, { text: n0(row.deleted) }, { text: row.coverage === 'none' ? 'unknown' : row.boundedCount ? (row.boundedHigh === null ? `≥ ${n0(row.proven)}` : rangeText(row.proven, row.exact + row.boundedHigh)) : `${row.coverage === 'partial' ? '≥ ' : ''}${n0(row.exact)}`, strong: true }, { text: n0(row.rawChurn) }, { text: row.coverage === 'partial' ? `partial ${row.recovered}/${row.count}` : row.coverage === 'none' ? 'none recovered' : 'complete' }, ...(model.strip ? [{ text: model.strip.values[index] === null ? '—' : n0(model.strip.values[index]) }] : [])]) };
    case 'flow': return { caption: 'Weekly flow', columns: [{ label: 'week of' }, ...(model.lifecycle ? [num('opened'), num('merged'), num('closed unmerged'), num('net'), num('open at end')] : []), num('analysed')],
      rows: model.rows.map(row => [{ text: row.label }, ...(model.lifecycle ? [{ text: n0(row.opened) }, { text: n0(row.merged) }, { text: n0(row.closed) }, { text: signed(row.net) }, { text: n0(row.openAtEnd) }] : []), { text: n0(row.analysed) }]) };
    case 'ttm': return { caption: 'Time to merge by size', columns: [{ label: 'size' }, num('PRs'), num('usually (middle half)'), num('median'), num('slowest')],
      rows: model.rows.map(row => [bandCell(row), { text: n0(row.n) }, { text: row.n >= 3 ? `${fmtDur(row.q1)} – ${fmtDur(row.q3)}` : fmtDur(row.med) }, { text: fmtDur(row.med), strong: true }, { text: fmtDur(row.max) }]) };
    case 'mix': return { caption: 'PR size mix', columns: [{ label: 'size' }, num('merged PRs'), num('share'), num('median Changed')],
      rows: model.rows.slice(1).map(row => [bandCell(row), { text: n0(row.count) }, { text: row.share === null ? '–' : percent(row.share) }, { text: describeBound(row.medianChanged) }]) };
    case 'lifecycle': return { caption: 'PR lifecycle by size', columns: [{ label: 'size' }, num('PRs'), num('started as draft'), num('typical draft'), num('typical review'), num('median total')],
      rows: model.rows.map(row => [bandCell(row), { text: n0(row.n) }, { text: percent(row.draftShare) }, { text: row.dMed === null ? '–' : fmtDur(row.dMed) }, { text: row.rMed === null ? '–' : fmtDur(row.rMed) }, { text: row.tMed === null ? 'n/a' : fmtDur(row.tMed), strong: true }]) };
    case 'lanes': return { caption: 'Merged PRs by size', columns: [{ label: 'PR' }, { label: 'size' }, num('Changed'), num('merged')],
      rows: model.rows.slice().reverse().map(row => { const band = model.bands.find(candidate => candidate.id === row.bandId); return [{ text: `#${row.number}${row.title ? ` ${row.title}` : ''}`, href: row.href }, band ? { html: chip(band.color, band.short) } : { text: '—' }, { text: row.changed === null ? '–' : boundText(row.changed) }, { text: dateText(row.mergedAt) }]; }) };
    case 'development': return { caption: 'Development', columns: [{ label: 'head' }, { label: 'sha' }, num('Changed'), { label: 'label' }, num('analysed')],
      rows: model.rows.map(row => [{ text: String(row.index + 1) }, { text: row.sha, mono: true }, { text: boundText({ status: row.status, lower: row.changed, upper: row.upper }), strong: true }, row.color ? { html: chip(row.color, row.bandShort) } : { text: '—' }, { text: agoText(row.at, model.now) }]) };
    default: return KINDS.get(model.kind)?.table?.(model) ?? { caption: '', columns: [], rows: [] };
  }
}

/** The table as HTML. */
export function tableHtml(table) {
  const head = table.columns.map(column => `<th${column.num ? ' class="num"' : ''}>${esc(column.label)}</th>`).join('');
  const body = table.rows.map(cells => `<tr>${cells.map((cell, index) => { const content = cell.html ?? (cell.strong ? `<b>${esc(cell.text)}</b>` : esc(cell.text)); const inner = cell.href ? `<a href="${esc(cell.href)}">${content}</a>` : content; return `<td class="${table.columns[index]?.num ? 'num' : ''}${cell.mono ? ' mono' : ''}">${inner}</td>`; }).join('')}</tr>`).join('');
  return `<table class="fr-tbl"><caption class="visually-hidden">${esc(table.caption)}</caption><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/** The skeleton in each chart's own shape, drawn at the final height. */
export function skeletonHtml(kind) {
  const r = k => [0.42, 0.66, 0.5, 0.82, 0.58, 0.9, 0.36, 0.72, 0.64, 0.48, 0.78, 0.54, 0.4][k % 13];
  const registered = KINDS.get(kind)?.skeleton;
  if (typeof registered === 'function') return registered(kind);
  if (registered === 'bars' || ['mosaic', 'flow', 'development', 'hero'].includes(kind)) return `<div class="sk sk-bars" aria-hidden="true">${Array.from({ length: 13 }, (_, k) => `<i style="height:${18 + r(k) * 78}%"></i>`).join('')}</div>`;
  return `<div class="sk sk-rows" aria-hidden="true">${Array.from({ length: 6 }, (_, k) => `<div><b></b><i style="margin-left:${k ? 8 + r(k) * 30 : 0}%;width:${k ? 20 + r(k + 5) * 40 : 100}%"></i></div>`).join('')}</div>`;
}
