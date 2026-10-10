// SPDX-License-Identifier: AGPL-3.0-only
/** The settings page's local-data surfaces: the first-use section, paused repositories and what the browser holds, by scope. */
import { EXAMPLE_PULL_REQUEST, type Setting, type Settings } from '../shared/catalogue.js';
import { pausedRepositories, repositoryKey } from '../shared/repository.js';
import { request, type Inventory } from '../shared/protocol.js';
import { node, button } from '../shared/dom.js';
export interface DataHost {
  readonly settings: () => Settings;
  /** Reload settings from the worker and draw the page again. */
  readonly reload: () => Promise<void>;
  readonly announce: (message: string, error?: boolean) => void;
  readonly details: () => Promise<void>;
}
const humanBytes = (value: number): string => value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KiB` : `${(value / 1024 / 1024).toFixed(2)} MiB`;
const short = (sha: string): string => sha.slice(0, 7);
const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;
const failure = (error: unknown, fallback: string): string => error instanceof Error ? error.message : fallback;
function policyLine(settings: Settings): string {
  const preset = settings['policy.preset'] === 'none' ? 'no size policy' : String(settings['policy.preset']);
  const mode = String(settings['policy.mode']);
  if (mode === 'repository') return `repository · trusted repository policy, else personal ${preset}`;
  if (mode === 'personal-only') return `personal only · ${preset}`;
  return `composed · personal ${preset} + trusted repository policy`;
}
/** The one truthful explanation of what the extension is doing and where to change it. Opens at #ready on the first install only. */
export function readySection(host: HTMLElement, settings: Settings, review: () => void): void {
  const heading = node('h2', '', 'Ready on GitHub pull requests.'); heading.id = 'ready-heading'; heading.tabIndex = -1;
  const defaults = node('dl', 'ready-defaults');
  for (const [key, value] of [
    ['policy', policyLine(settings)],
    ['cache', `${settings['cache.maximumSize']} MiB rebuildable local reports/policy`],
    ['analysis', `up to ${plural(Number(settings['analysis.maximumFiles']), 'file')} measured automatically per pull request`],
    ['native churn', settings['display.nativeChurn'] === 'faint' ? 'faint after Changed is known' : 'hidden after Changed is known'],
  ] as const) defaults.append(node('dt', '', key), node('dd', '', value));
  const example = node('a', 'primary-button', 'Open the public example PR'); example.href = EXAMPLE_PULL_REQUEST; example.target = '_blank'; example.rel = 'noopener noreferrer';
  const links = node('p', 'ready-links');
  for (const [label, target] of [['Data controls', '#data.controls'], ['Pause repositories', '#repositories.paused'], ['Privacy', 'privacy.html']] as const) { if (links.childElementCount) links.append(' · '); const link = node('a', '', label); link.href = target; links.append(link); }
  host.replaceChildren(heading, node('p', 'ready-lede', 'Changed appears beside GitHub’s own diff statistics.'),
    node('p', '', 'Analysis runs in this browser. No account, personal token, telemetry or source upload.'),
    node('p', 'ready-label', 'In effect now'), defaults, node('div', 'button-row ready-actions'), links);
  host.querySelector('.ready-actions')!.append(example, button('Review settings', review, 'secondary-button'));
}
/** Paused repositories: one local state per host and repository, reversible here and from the report. */
export function pausedEditor(item: Setting, error: HTMLElement, data: DataHost): HTMLElement {
  const host = node('div', 'override-editor'); const list = node('div', 'paused-list'); const field = node('input'); field.placeholder = 'owner/repository'; field.setAttribute('aria-label', 'Repository to pause');
  const change = async (repository: string, paused: boolean): Promise<void> => {
    try { await request({ type: 'repository.pause', repository, paused }); error.textContent = ''; await data.reload(); data.announce(paused ? `Paused ${repository}. GitHub’s own counters are back.` : `Resumed ${repository}.`); }
    catch (exception) { error.textContent = failure(exception, 'The repository could not be changed.'); data.announce(error.textContent, true); }
  };
  const entries = Object.entries(pausedRepositories(String(data.settings()[item.id]))).sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) list.append(node('p', 'control-note', 'No repository is paused.'));
  for (const [key, pause] of entries) {
    const name = key.slice('github.com/'.length); const row = node('div', 'paused-row'); row.append(node('span', 'paused-name', name), node('span', 'paused-since', `since ${new Date(pause.at).toLocaleDateString()}`), button('Resume', () => { void change(name, false); }, 'secondary-button'));
    list.append(row);
  }
  const add = button('Pause repository', () => { try { void change(repositoryKey(field.value.trim()), true); } catch (exception) { error.textContent = failure(exception, 'Use owner/repository.'); } }, 'primary-button');
  const form = node('div', 'button-row'); form.append(field, add);
  host.append(list, form, node('p', 'control-note', 'Pausing aborts work in progress, removes diffdevil from every open pull request of that repository and returns GitHub’s own counters. It does not delete cached data or your policy; clear those separately under Local data.'));
  return host;
}
/** What this browser holds, repository by repository and pull request by pull request, each with its own clear. */
export function inventoryEditor(_item: Setting, error: HTMLElement, data: DataHost): HTMLElement {
  const host = node('div', 'inventory'); host.append(node('p', 'control-note', 'Reading what this browser holds…'));
  const clear = async (label: string, message: string, parameters: { action: string; repository: string; pullRequest?: number }): Promise<void> => {
    if (!confirm(`${label}? ${message}`)) return;
    try { await request({ type: 'data.action', confirmed: true, ...parameters }); error.textContent = ''; await load(); await data.details(); data.announce(`${label}: complete.`); }
    catch (exception) { error.textContent = failure(exception, 'The data could not be cleared.'); data.announce(error.textContent, true); }
  };
  async function load(): Promise<void> {
    let inventory: Inventory;
    try { inventory = await request<Inventory>({ type: 'data.inventory' }); } catch (exception) { host.replaceChildren(node('p', 'validation-message', failure(exception, 'Stored data could not be listed.'))); return; }
    const { info } = inventory; const summary = node('p', 'inventory-summary', `Reports ${info.reportEntries} · ${humanBytes(info.reportBytes)} — policy ${info.policyEntries} · ${humanBytes(info.policyBytes)} — ${humanBytes(info.bytes)} of ${humanBytes(info.maximumBytes)} used`);
    const rows: HTMLElement[] = [];
    for (const repository of inventory.repositories) {
      const name = repository.repository.slice('github.com/'.length); const wrap = node('details', 'inventory-repository'); const head = node('summary'); const title = node('span', 'inventory-name', name);
      head.append(title, node('span', 'inventory-size', `${plural(repository.pullRequests.length, 'pull request')} · ${humanBytes(repository.bytes)}`)); wrap.append(head);
      for (const pull of repository.pullRequests) {
        const row = node('div', 'inventory-pull'); const scope = `${name} #${pull.pullRequest}`;
        row.append(node('span', 'inventory-name', `#${pull.pullRequest}`), node('span', 'inventory-detail', `${short(pull.base)} → ${short(pull.head)} · measured ${pull.measured} · bounded ${pull.bounded} · provider-declined ${pull.declined} · ${plural(pull.files, 'file')} · ${humanBytes(pull.bytes)} · last used ${new Date(pull.touched).toLocaleString()}`),
          button('Clear this PR', () => { void clear(`Clear ${scope}`, 'This deletes its stored report from this browser. The repository’s policy, your settings and GitHub are untouched.', { action: 'data.clearPullRequest', repository: name, pullRequest: pull.pullRequest }); }, 'secondary-button'));
        wrap.append(row);
      }
      const all = button('Clear this repository', () => { void clear(`Clear ${name}`, `This deletes everything stored for ${name} (${plural(repository.pullRequests.length, 'pull request')} and its trusted policy) from this browser. Your settings, policy overrides and pause state stay, and GitHub is untouched.`, { action: 'data.clearRepository', repository: name }); }, 'danger-button');
      const footer = node('div', 'button-row'); footer.append(all); wrap.append(footer); rows.push(wrap);
    }
    host.replaceChildren(summary, ...(rows.length ? rows : [node('p', 'control-note', 'Nothing is stored for any pull request.')]),
      node('p', 'control-note', 'Local only and rebuildable. Reports hold normalized counts, file paths and revision identities, which can reveal private repository names to anyone with access to this browser profile. Raw patches, page HTML and credentials are never stored.'));
  }
  void load(); return host;
}
