// SPDX-License-Identifier: AGPL-3.0-only
import { SETTINGS, DEFAULTS, advancedChanges, searchSettings, type Setting, type Settings, type SettingValue } from '../shared/catalogue.js';
import { bands, overrides, personalYaml, repositoryKey } from '../shared/settings.js';
import { request, type Diagnostics } from '../shared/protocol.js';
import { productIcon, GLYPH_STATUS } from '../shared/icons.js';
import { node, button, isDark } from '../shared/dom.js';
const byId = <T extends HTMLElement>(id: string): T => { const result = document.getElementById(id); if (!result) throw new Error(`Missing options control ${id}.`); return result as T; };
let settings: Settings = { ...DEFAULTS };
let view: 'basic' | 'advanced' = 'basic';
let modifiedOnly = false;
const revealed = new Set<string>();
// Unsaved editor content survives changing views and searching. Only Save writes it.
const drafts = new Map<string, string>();
const search = byId<HTMLInputElement>('settings-search');
const content = byId('settings-content');
let announcementTimer: ReturnType<typeof setTimeout> | undefined;
function announce(message: string, error = false): void {
  const status = byId('save-status'); status.textContent = message; status.hidden = false; status.classList.toggle('is-error', error);
  clearTimeout(announcementTimer); if (!error) announcementTimer = setTimeout(() => { status.hidden = true; }, 6000);
}
const humanBytes = (value: number): string => value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KiB` : `${(value / 1024 / 1024).toFixed(2)} MiB`;
function theme(): void {
  const choice = String(settings['appearance.theme']);
  if (choice === 'system') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = choice;
  try { localStorage.setItem('diffdevil.options.theme', choice); } catch { /* Applied without persistent early-paint state. */ }
  byId<HTMLImageElement>('wordmark').src = chrome.runtime.getURL(`assets/diffdevil-wordmark-${isDark(document) ? 'dark' : 'light'}.svg`);
  for (const option of document.querySelectorAll<HTMLButtonElement>('#theme-control button')) option.setAttribute('aria-pressed', String(option.dataset.theme === choice));
  // Previews update in place; changing theme must not discard a policy draft.
  for (const preview of document.querySelectorAll<HTMLElement>('[data-icon-preview]')) {
    preview.replaceChildren(); const mark = productIcon(preview.dataset.iconPreview!, isDark(document), chrome.runtime.getURL);
    if (mark) preview.append(mark); preview.append(node('span', '', 'Changed'), node('strong', '', '178'));
  }
}
function indicators(): void {
  const count = advancedChanges(settings).length; const badge = byId('advanced-badge'); badge.textContent = String(count); badge.hidden = count === 0;
  const active = byId<HTMLButtonElement>('show-changed'); active.hidden = count === 0 || view === 'advanced'; active.textContent = `${count} advanced ${count === 1 ? 'setting' : 'settings'} active`;
  for (const option of document.querySelectorAll<HTMLButtonElement>('#view-control button')) option.setAttribute('aria-pressed', String(option.dataset.view === view));
}
function defaultText(item: Setting): string {
  if (typeof item.default === 'boolean') return item.default ? 'On' : 'Off';
  if (item.kind === 'bands') return 'Five size bands';
  if (item.kind === 'yaml') return 'Guided policy';
  if (item.kind === 'overrides') return 'No overrides';
  return item.default === '' ? 'Empty' : String(item.default);
}
const origin = (item: Setting): string => `Default: ${defaultText(item)} · ${settings[item.id] === item.default ? 'Default' : 'Modified'} · ${item.group === 'Policy' ? 'Personal layer; effective repository provenance is shown in the report' : 'Personal preference'}`;
async function save(item: Setting, value: SettingValue, error?: HTMLElement): Promise<boolean> {
  try {
    settings = await request<Settings>({ type: 'settings.save', patch: { [item.id]: value } }); drafts.delete(item.id);
    if (error) error.textContent = ''; indicators(); theme();
    const card = document.getElementById(item.id); card?.classList.toggle('is-modified', settings[item.id] !== item.default);
    const status = card?.querySelector('.setting-origin'); if (status) status.textContent = origin(item);
    announce('Saved. Open GitHub pull requests refresh their local projection.'); return true;
  } catch (exception) {
    const message = exception instanceof Error ? exception.message : 'The setting could not be saved.';
    if (error) error.textContent = message; announce(message, true); return false;
  }
}
function label(text: string, field: HTMLElement): HTMLElement { const result = node('label', 'field-label', text); result.append(field); return result; }
function bandEditor(item: Setting, error: HTMLElement): HTMLElement {
  const host = node('div', 'band-editor');
  // In-progress invalid rows need to remain editable without passing validation.
  let values = JSON.parse(drafts.get(item.id) ?? String(settings[item.id])) as ReturnType<typeof bands>;
  const retain = (): void => { drafts.set(item.id, JSON.stringify(values)); };
  const render = (): void => {
    host.replaceChildren(); const table = node('table'); const caption = node('caption', 'visually-hidden', 'Personal band thresholds and existing-label mappings'); table.append(caption);
    const head = node('thead'); const headings = node('tr'); for (const text of ['ID', 'Name', 'Below', 'Label mapping', 'Colour', '']) { const th = node('th', '', text); th.scope = 'col'; headings.append(th); } head.append(headings); table.append(head);
    const body = node('tbody');
    values.forEach((band, index) => {
      const row = node('tr');
      for (const key of ['id', 'name', 'lt', 'label', 'color'] as const) {
        const cell = node('td'); const input = node('input'); input.setAttribute('aria-label', `${band.name || `Band ${index + 1}`} ${key}`); input.value = band[key] === null ? '' : String(band[key]);
        if (key === 'lt') { input.type = 'number'; input.min = '1'; input.step = '1'; input.disabled = index === values.length - 1; input.placeholder = 'Otherwise'; }
        if (key === 'color') { input.maxLength = 6; input.placeholder = 'Auto'; input.className = 'colour-field'; }
        input.addEventListener('input', () => { values = values.map((value, at) => at === index ? { ...value, [key]: key === 'lt' ? Number(input.value) : input.value } : value); retain(); });
        cell.append(input); row.append(cell);
      }
      const controls = node('td'); const remove = button('×', () => { if (values.length < 2) return; values.splice(index, 1); values[values.length - 1]!.lt = null; retain(); render(); }, 'icon-button'); remove.disabled = values.length < 2; remove.setAttribute('aria-label', `Remove ${band.name}`); controls.append(remove); row.append(controls); body.append(row);
    });
    table.append(body); const overflow = node('div', 'table-overflow'); overflow.append(table); host.append(overflow);
    const actions = node('div', 'button-row');
    actions.append(button('Save bands', () => { void save(item, JSON.stringify(values), error); }, 'primary-button'), button('Add band', () => {
      if (values.length >= 20) return; const lower = values.at(-2)?.lt ?? 10; values[values.length - 1]!.lt = Math.max(lower + 1, lower * 2);
      let id = `band_${values.length + 1}`; while (values.some(value => value.id === id)) id += '_new'; values.push({ id, name: `Band ${values.length + 1}`, lt: null, label: '', color: '' }); retain(); render();
    }), button('Discard edits', () => { drafts.delete(item.id); values = bands(String(settings[item.id])); error.textContent = ''; render(); }));
    host.append(actions, node('p', 'control-note', 'One cell per range. No upper limit on the final range. Empty label mappings remain virtual; only declared existing-label mappings can open the native picker.'));
  }; render(); return host;
}
function overrideEditor(item: Setting, error: HTMLElement): HTMLElement {
  const host = node('div', 'override-editor'); const existing = node('div', 'repository-list');
  const repository = node('input'); repository.placeholder = 'owner/repository'; repository.setAttribute('aria-label', 'Repository identifier');
  const mode = node('select'); mode.setAttribute('aria-label', 'Repository policy mode');
  for (const [value, title] of [['inherit', 'Use global mode'], ['composed', 'Composed'], ['repository', 'Repository'], ['personal-only', 'Personal only']]) { const option = node('option', '', title!); option.value = value!; mode.append(option); }
  const yaml = node('textarea', 'code-editor'); yaml.rows = 9; yaml.spellcheck = false; yaml.setAttribute('aria-label', 'Repository override YAML'); yaml.placeholder = 'version: 1\n# Explicit personal overrides for this repository.';
  const draftKey = `${item.id}:editor`; const draft = drafts.get(draftKey);
  if (draft) { const parsed = JSON.parse(draft) as { repository: string; mode: string; yaml: string }; repository.value = parsed.repository; mode.value = parsed.mode; yaml.value = parsed.yaml; }
  const retain = (): void => { drafts.set(draftKey, JSON.stringify({ repository: repository.value, mode: mode.value, yaml: yaml.value })); };
  for (const field of [repository, mode, yaml]) field.addEventListener('input', retain);
  const list = (): void => { existing.replaceChildren(); for (const name of Object.keys(overrides(String(settings[item.id]))).sort()) existing.append(button(name, () => { const entry = overrides(String(settings[item.id]))[name]!; repository.value = name; mode.value = entry.mode ?? 'inherit'; yaml.value = entry.yaml ?? ''; retain(); }, 'repository-chip')); };
  const update = async (remove: boolean): Promise<void> => {
    try {
      const name = repositoryKey(repository.value.trim()); const values = overrides(String(settings[item.id]));
      if (remove) delete values[name]; else values[name] = { ...(mode.value !== 'inherit' ? { mode: mode.value as 'composed' | 'repository' | 'personal-only' } : {}), ...(yaml.value.trim() ? { yaml: yaml.value } : {}) };
      if (await save(item, JSON.stringify(values), error)) { if (remove) { mode.value = 'inherit'; yaml.value = ''; } drafts.delete(draftKey); list(); }
    } catch (exception) { error.textContent = exception instanceof Error ? exception.message : 'The repository override is invalid.'; }
  };
  const actions = node('div', 'button-row'); actions.append(button('Save repository override', () => { void update(false); }, 'primary-button'), button('Remove override', () => { void update(true); }, 'danger-button'));
  host.append(existing, label('Repository', repository), label('Mode', mode), label('Explicit YAML', yaml), actions); list(); return host;
}
function control(item: Setting, error: HTMLElement): HTMLElement {
  const host = node('div', 'setting-control'); const value = settings[item.id] ?? item.default; const id = `control-${item.id}`;
  if (item.kind === 'boolean') {
    const wrapper = node('label', 'switch'); const input = node('input'); input.type = 'checkbox'; input.id = id; input.checked = Boolean(value); input.setAttribute('aria-labelledby', `name-${item.id}`); input.setAttribute('aria-describedby', `description-${item.id}`);
    input.addEventListener('change', () => { void save(item, input.checked, error).then(ok => { if (!ok) input.checked = Boolean(settings[item.id]); }); });
    wrapper.append(input, node('span', 'switch-track'), node('span', 'switch-label', 'On')); host.append(wrapper); return host;
  }
  if (item.id === 'display.brandIcon') {
    const group = node('fieldset', 'icon-choices'); group.id = id; group.append(node('legend', 'visually-hidden', item.name));
    for (const [value, title] of item.choices ?? []) {
      const wrapper = node('label', 'icon-choice'); const input = node('input'); input.type = 'radio'; input.name = item.id; input.value = value; input.checked = settings[item.id] === value;
      input.addEventListener('change', () => { void save(item, value, error).then(ok => { if (!ok) for (const radio of group.querySelectorAll<HTMLInputElement>('input')) radio.checked = radio.value === settings[item.id]; }); });
      const preview = node('span', 'icon-preview'); preview.dataset.iconPreview = value; const mark = productIcon(value, isDark(document), chrome.runtime.getURL); if (mark) preview.append(mark); preview.append(node('span', '', 'Changed'), node('strong', '', '178'));
      wrapper.append(input, node('span', 'choice-title', title), preview); group.append(wrapper);
    }
    host.append(group, node('p', 'control-note', 'The monochrome default is the accepted centre-seam diffdevil/brand glyph from the shared Wolfsblvt icon system. Full colour uses the accepted micro identity symbol.')); return host;
  }
  if (item.kind === 'choice') {
    const select = node('select'); select.id = id; select.setAttribute('aria-labelledby', `name-${item.id}`);
    for (const [value, title] of item.choices ?? []) { const option = node('option', '', title); option.value = value; select.append(option); } select.value = String(value);
    select.addEventListener('change', () => { void save(item, select.value, error).then(ok => { if (!ok) select.value = String(settings[item.id]); }); }); host.append(select); return host;
  }
  if (item.kind === 'number') {
    const input = node('input'); input.type = 'number'; input.id = id; input.min = '4'; input.max = '128'; input.step = '1'; input.value = String(value); input.setAttribute('aria-labelledby', `name-${item.id}`);
    input.addEventListener('change', () => { void save(item, Number(input.value), error).then(ok => { if (!ok) input.value = String(settings[item.id]); }); }); host.append(input, node('span', 'input-unit', 'MiB')); return host;
  }
  if (item.kind === 'bands') return bandEditor(item, error);
  if (item.kind === 'overrides') return overrideEditor(item, error);
  if (item.kind === 'action') { host.append(button(item.name, () => { void manage(item, error); }, item.destructive ? 'danger-button' : 'secondary-button')); return host; }
  const text = node('textarea', item.kind === 'yaml' ? 'code-editor' : 'path-editor'); text.id = id; text.rows = item.kind === 'yaml' ? 14 : 3; text.spellcheck = false; text.value = drafts.get(item.id) ?? String(value); text.setAttribute('aria-labelledby', `name-${item.id}`); text.setAttribute('aria-describedby', `description-${item.id}`);
  text.placeholder = item.kind === 'yaml' ? 'version: 1\npresets: [size@1]\n# Leave empty to use guided controls.' : '**/generated/**'; text.addEventListener('input', () => drafts.set(item.id, text.value));
  const actions = node('div', 'button-row'); actions.append(button(item.kind === 'yaml' ? 'Validate and save' : 'Save paths', () => { void save(item, text.value, error); }, 'primary-button'), button('Discard edits', () => { text.value = String(settings[item.id]); drafts.delete(item.id); error.textContent = ''; }));
  if (item.kind === 'yaml') {
    const file = node('input'); file.type = 'file'; file.accept = '.yaml,.yml'; file.hidden = true;
    file.addEventListener('change', () => { void (async () => { try { const entry = file.files?.[0]; if (!entry) return; if (entry.size > 256 * 1024) throw new Error('A personal policy must be at most 256 KiB.'); text.value = await entry.text(); drafts.set(item.id, text.value); announce('Imported into the editor. Validate and save to apply.'); } catch (exception) { error.textContent = exception instanceof Error ? exception.message : 'Import failed.'; } finally { file.value = ''; } })(); });
    actions.append(button('Import YAML', () => file.click()), button('Export YAML', () => download('diffdevil.yml', text.value.trim() ? text.value : personalYaml(settings), 'application/yaml')), file);
  }
  host.append(text, actions); return host;
}
function card(item: Setting): HTMLElement {
  const section = node('section', `setting${item.kind !== 'action' && settings[item.id] !== item.default ? ' is-modified' : ''}`); section.id = item.id; section.setAttribute('aria-labelledby', `name-${item.id}`);
  const anchorRow = node('div', 'setting-anchor'); const anchor = node('a', '', `#${item.id}`); anchor.href = `#${item.id}`;
  anchorRow.append(anchor, button('Copy link', () => { void navigator.clipboard.writeText(`${location.href.split('#')[0]}#${item.id}`).then(() => announce(`Copied #${item.id}`), () => announce('Clipboard access was declined.', true)); }, 'copy-link')); if (item.advanced) anchorRow.append(node('span', 'advanced-tag', 'Advanced'));
  const title = node('div', 'setting-title'); const name = node('h3', '', item.name); name.id = `name-${item.id}`; title.append(name);
  if (item.kind !== 'action') title.append(button('Reset', () => { void save(item, item.default).then(ok => { if (ok) { drafts.delete(`${item.id}:editor`); render(); document.getElementById(item.id)?.querySelector<HTMLButtonElement>('.reset-setting')?.focus({ preventScroll: true }); } }); }, 'reset-setting'));
  const description = node('p', 'setting-description', item.description); description.id = `description-${item.id}`;
  const error = node('p', 'validation-message'); error.setAttribute('role', 'alert'); section.append(anchorRow, title, description);
  if (item.kind !== 'action') section.append(node('p', 'setting-origin', origin(item)));
  section.append(control(item, error), error);
  if (String(settings['policy.advancedYaml']).trim() && ['policy.preset', 'policy.primaryMetric', 'policy.bands', 'policy.includeOnly', 'policy.exclude', 'policy.forceInclude'].includes(item.id)) section.append(node('p', 'control-note', 'Advanced personal YAML is active. This guided value is preserved but not applied.'));
  return section;
}
function render(): void {
  content.replaceChildren(); const categories = byId('categories'); categories.replaceChildren(); const query = search.value.trim();
  let visible = query ? searchSettings(query, settings) : SETTINGS.filter(item => view === 'advanced' || !item.advanced || revealed.has(item.id));
  if (modifiedOnly && !query) visible = advancedChanges(settings);
  for (const group of ['Display', 'Policy', 'Integration', 'Appearance', 'Data']) {
    const items = visible.filter(item => item.group === group); if (!items.length) continue;
    const section = node('section', 'settings-group'); section.id = `category-${group.toLowerCase()}`; section.append(node('h2', 'category-heading', group));
    for (const item of items) section.append(card(item)); content.append(section);
    const link = node('a', '', group); link.href = `#${section.id}`; link.append(node('span', '', String(items.length))); categories.append(link);
  }
  if (!visible.length) content.append(node('p', 'empty-search', 'No matching settings. Try a name, description or #identifier.'));
  byId('search-summary').textContent = query || modifiedOnly ? `${visible.length} ${visible.length === 1 ? 'result' : 'results'}${query && view === 'basic' && visible.some(item => item.advanced) ? ' · includes Advanced' : ''}` : '';
  indicators(); theme();
}
function revealFragment(): void {
  let id: string; try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  if (SETTINGS.some(item => item.id === id)) { revealed.add(id); search.value = ''; modifiedOnly = false; render(); }
  const target = document.getElementById(id); if (!target) return;
  requestAnimationFrame(() => { target.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' }); target.classList.add('is-targeted'); target.querySelector<HTMLElement>('.setting-control input, .setting-control select, textarea, .band-editor input, .override-editor input, .setting-control button')?.focus({ preventScroll: true }); });
}
async function showDiagnostics(): Promise<void> {
  const host = byId('diagnostics');
  try {
    const info = await request<Diagnostics>({ type: 'diagnostics.get' }); const list = node('dl', 'metadata-grid');
    for (const [key, value] of [['Extension', info.version], ['Engine', info.engine], ['Report schema', info.schema], ['Presenter', info.presenter], ['Measurement', info.measurement], ['Icon resolver', GLYPH_STATUS], ['Report cache', `${info.cache.reportEntries} entries · ${humanBytes(info.cache.reportBytes)}`], ['Policy cache', `${info.cache.policyEntries} entries · ${humanBytes(info.cache.policyBytes)}`], ['Cache capacity', `${humanBytes(info.cache.bytes)} / ${humanBytes(info.cache.maximumBytes)}`], ['Settings storage', `${humanBytes(info.syncBytes)} synchronized · ${humanBytes(info.localBytes)} local`], ['Advanced settings', `${advancedChanges(settings).length} modified`]]) list.append(node('dt', '', key!), node('dd', '', value!));
    host.replaceChildren(list);
    if (info.last) host.append(node('p', 'last-source', `Last analysis: ${info.last.repository} #${info.last.pullRequest} · ${info.last.base.slice(0, 12)} → ${info.last.head.slice(0, 12)} · ${new Date(info.last.at).toLocaleString()}`));
    host.append(node('p', 'control-note', 'Raw diffs are processed in memory and discarded. Cached reports can contain private paths and numeric facts; cached repository policy contains configuration text. These caches are not browser-synchronized.'));
    if (info.errors.length) { const details = node('details', 'recent-errors'); details.append(node('summary', '', `${info.errors.length} recent diagnostic codes`)); for (const item of info.errors) details.append(node('p', '', `${new Date(item.at).toLocaleString()} · ${item.code}`)); host.append(details); }
  } catch (exception) { host.textContent = exception instanceof Error ? exception.message : 'Extension details are unavailable.'; }
}
async function manage(item: Setting, error: HTMLElement): Promise<void> {
  if (item.destructive && !confirm(`${item.name}? This deletes the selected extension data. Export your configuration first to keep a copy.`)) return;
  try {
    const result = await request<unknown>({ type: 'data.action', action: item.id, confirmed: true });
    if (item.id === 'diagnostics.copySupportSnapshot') { await navigator.clipboard.writeText(JSON.stringify(result, null, 2)); announce('Copied a support snapshot without source, private paths or policy text.'); }
    else { settings = await request<Settings>({ type: 'settings.get' }); if (item.id === 'data.resetAll') drafts.clear(); if (item.id === 'data.clearRepositoryOverrides') drafts.delete('policy.repositoryOverrides:editor'); render(); announce(`${item.name}: complete.`); }
    await showDiagnostics();
  } catch (exception) { error.textContent = exception instanceof Error ? exception.message : 'The operation failed.'; announce(error.textContent, true); }
}
function download(name: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type })); const link = node('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
for (const [value, title] of [['dark', 'Dark'], ['system', 'Auto'], ['light', 'Light']]) { const option = button(title!, () => { void save(SETTINGS.find(item => item.id === 'appearance.theme')!, value!); }); option.dataset.theme = value; option.setAttribute('aria-pressed', 'false'); byId('theme-control').append(option); }
for (const option of document.querySelectorAll<HTMLButtonElement>('#view-control button')) option.addEventListener('click', () => { view = option.dataset.view as 'basic' | 'advanced'; revealed.clear(); modifiedOnly = false; render(); });
search.addEventListener('input', () => { modifiedOnly = false; render(); window.scrollTo({ top: 0, behavior: 'instant' }); });
byId('show-changed').addEventListener('click', () => { modifiedOnly = true; search.value = ''; render(); });
byId('refresh-details').addEventListener('click', () => { void showDiagnostics(); });
byId('export-settings').addEventListener('click', () => download('diffdevil-settings.json', JSON.stringify({ kind: 'diffdevil.settings', version: 1, settings }, null, 2), 'application/json'));
const importFile = byId<HTMLInputElement>('import-file'); byId('import-settings').addEventListener('click', () => importFile.click());
importFile.addEventListener('change', () => { void (async () => {
  try {
    const file = importFile.files?.[0]; if (!file) return; if (file.size > 2 * 1024 * 1024) throw new Error('A settings export must be at most 2 MiB.');
    const parsed = JSON.parse(await file.text()) as Record<string, unknown>; if (parsed.kind !== 'diffdevil.settings' || parsed.version !== 1) throw new Error('This is not a supported diffdevil settings export.');
    if (!confirm('Replace your extension settings with this export? Rebuildable reports are not imported.')) return;
    settings = await request<Settings>({ type: 'settings.save', patch: parsed.settings, replace: true }); drafts.clear(); render(); await showDiagnostics(); announce('Imported and validated settings.');
  } catch (exception) { announce(exception instanceof Error ? exception.message : 'Import failed.', true); } finally { importFile.value = ''; }
})(); });
window.addEventListener('hashchange', revealFragment); matchMedia('(prefers-color-scheme: dark)').addEventListener('change', theme);
void (async () => { try { settings = await request<Settings>({ type: 'settings.get' }); render(); revealFragment(); await showDiagnostics(); } catch (exception) { content.textContent = exception instanceof Error ? exception.message : 'Settings could not be loaded.'; announce('Stored data has not been overwritten. Reload or inspect the browser console before resetting.', true); } })();
