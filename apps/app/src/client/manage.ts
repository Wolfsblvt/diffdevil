// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The repository settings page's one scripted convenience: the pull-request message preview. The form posts the
 * proposed bounded settings to the read-only preview route and renders the synthetic specimen in every reading state
 * (exact, bounded, partial, unknown, context unavailable, file population unavailable), compact or expanded, with
 * the exact Markdown. Nothing is stored or posted; the page works without this script (the controls still save).
 * Imported by the App shell's one client entry (a script inside a page's slot is not hoisted into the bundle).
 */
function wirePreview(): void {
  const host = document.querySelector<HTMLElement>('[data-brief-preview]');
  const form = document.querySelector<HTMLFormElement>('[data-brief-form]');
  const button = document.querySelector<HTMLButtonElement>('[data-brief-preview-button]');
  if (!host || !form || !button || button.dataset.wired) return;
  button.dataset.wired = '1';
  button.disabled = false;
  button.title = 'Render the message over synthetic evidence; nothing is posted';
  const repositoryId = Number(host.dataset.repositoryId);
  const states = ['exact', 'bounded', 'partial', 'unknown', 'context-unavailable', 'file-population-unavailable'];
  let preview: any = null, state = 'exact';
  const render = () => {
    if (!preview) return;
    const chosen = preview.states?.[state];
    const facts = host.querySelector<HTMLElement>('[data-preview-facts]')!;
    facts.textContent = '';
    const fact = (label: string, value: string) => { const span = document.createElement('span'); span.textContent = `${label}: ${value}`; facts.appendChild(span); };
    fact('route', `${preview.route?.effective ?? '—'} (${preview.route?.reason ?? ''})`);
    fact('policy', preview.evaluation?.kind === 'effective-policy' ? `effective · ${String(preview.source?.identity ?? preview.source?.policyId ?? '')}` : `design specimen · ${preview.evaluation?.reason ?? ''}`);
    fact('writer', `${preview.writer?.login ?? '—'} (${preview.writer?.confidence ?? ''})`);
    fact('final summary', preview.finalSummary ?? '—');
    for (const module of preview.modules ?? []) fact(module.id, `${module.standing}${module.reason ? ` · ${module.reason}` : ''}`);
    const markdown = host.querySelector<HTMLElement>('[data-preview-markdown]')!;
    markdown.textContent = chosen?.markdown ?? (preview.route?.effective === 'off' ? 'Comments are off: nothing would be posted.' : preview.route?.effective === 'advanced' ? 'The repository\'s own comment rules are the route; the standard brief is not composed.' : 'No specimen for this state.');
    host.querySelector<HTMLElement>('[data-preview-bytes]')!.textContent = chosen ? `${chosen.bytes} bytes` : '';
    for (const link of host.querySelectorAll<HTMLButtonElement>('[data-preview-state]')) link.setAttribute('aria-current', link.dataset.previewState === state ? 'true' : 'false');
  };
  host.querySelector('[data-preview-states]')!.addEventListener('click', event => {
    const target = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-preview-state]');
    if (!target) return;
    state = target.dataset.previewState!;
    render();
  });
  button.addEventListener('click', async event => {
    event.preventDefault();
    const data = new FormData(form);
    const settings = { mode: data.get('mode'), modules: data.getAll('modules'), historyWindowDays: Number(data.get('historyWindowDays')), finalSummary: data.get('finalSummary') === 'on', ...(data.get('priority') ? { priority: String(data.get('priority')).split(',').map(value => value.trim()).filter(Boolean) } : {}) };
    host.hidden = false;
    host.querySelector<HTMLElement>('[data-preview-notice]')!.textContent = 'Rendering over synthetic evidence…';
    try {
      const response = await fetch('/api/brief/preview', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ repositoryId, settings }) });
      const body = await response.json();
      if (!response.ok) { host.querySelector<HTMLElement>('[data-preview-notice]')!.textContent = `The preview was refused (${body?.code ?? response.status}). Nothing was changed.`; return; }
      preview = body;
      host.querySelector<HTMLElement>('[data-preview-notice]')!.textContent = `${preview.notice} Effects: ${preview.effects}.`;
      const list = host.querySelector<HTMLElement>('[data-preview-states]')!;
      list.textContent = '';
      for (const name of states) { const item = document.createElement('button'); item.type = 'button'; item.dataset.previewState = name; item.textContent = name.replaceAll('-', ' '); list.appendChild(item); }
      state = 'exact';
      render();
    } catch { host.querySelector<HTMLElement>('[data-preview-notice]')!.textContent = 'The preview did not answer. Nothing was changed.'; }
  });
}

wirePreview();
document.addEventListener('diffdevil:page', wirePreview);
