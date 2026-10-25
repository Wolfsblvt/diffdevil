// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Each mounted Lab owns its transient edits and request generation. Late answers cannot commit. */
type Model = any;
const wired = new WeakSet<HTMLElement>();
function element(tag: string, text?: string, className?: string): HTMLElement {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
function button(text: string, action: () => void): HTMLButtonElement {
  const node = element('button', text, 'btn btn-quiet') as HTMLButtonElement;
  node.type = 'button'; node.addEventListener('click', action); return node;
}
function format(value: any): string {
  if (!value) return 'unavailable';
  if (value.status === 'exact') return `${value.value} · exact`;
  if (value.status === 'bounded') return `${value.lower}–${value.upper ?? '∞'} · bounded`;
  return value.status;
}
function mount(): void {
  for (const root of document.querySelectorAll<HTMLElement>('[data-policy-lab]')) {
    if (wired.has(root)) continue;
    wired.add(root);
    const find = <T extends HTMLElement = HTMLElement>(name: string) => root.querySelector<T>(`[data-lab-${name}]`)!;
    const form = find<HTMLFormElement>('editor'), decisionSelect = form.elements.namedItem('decision') as HTMLSelectElement;
    const metricSelect = form.elements.namedItem('metric') as HTMLSelectElement;
    const status = find('status'), result = find('result'), retry = find<HTMLButtonElement>('retry');
    let model: Model, sequence = 0, controller: AbortController | null = null, lastInput: any = null;
    let filter: (row: any) => boolean = row => row.standing === 'changed';

    function edit(decision: any, metrics: string[], proposal?: any): void {
      metricSelect.replaceChildren(...[...new Set([decision.metric, ...metrics])].map(metric => {
        const option = document.createElement('option'); option.value = metric; option.textContent = metric; return option;
      }));
      metricSelect.value = proposal?.metric ?? decision.metric;
      find('fields').replaceChildren();
      const number = (name: string, label: string, value: number) => {
        const input = document.createElement('input'); input.name = name; input.type = 'number'; input.step = 'any'; input.required = true; input.value = String(value);
        const wrapper = element('label', label); wrapper.append(input); find('fields').append(wrapper);
      };
      if (decision.kind === 'rule') number('threshold', `${decision.id}: current ${decision.operator} ${decision.threshold} → proposed ${decision.operator}`, proposal?.threshold ?? decision.threshold);
      else decision.ranges.forEach((range: any, index: number) => {
        if (range.otherwise) find('fields').append(element('p', `${range.id}: remaining values`, 'a-mini'));
        else number(`limit-${index}`, `${range.id}: current < ${range.lt} → proposed <`, proposal?.limits?.[index] ?? range.lt);
      });
      const path = `/${decision.kind === 'band' ? 'bands' : 'rules'}/${decision.id}`;
      find('origin').textContent = `Current origin: ${model.basis.provenance[path] ?? 'preset'} · ${model.basis.source}. Stable classification IDs stay unchanged.`;
    }
    function requestInput(): any {
      const decision = model.decisions.find((item: any) => item.key === decisionSelect.value);
      const value = (name: string) => (form.elements.namedItem(name) as HTMLInputElement).valueAsNumber;
      return { basis: model.basis, decision: decision.key, metric: metricSelect.value,
        ...(decision.kind === 'rule' ? { threshold: value('threshold') } : { limits: decision.ranges.filter((range: any) => !range.otherwise).map((_: any, index: number) => value(`limit-${index}`)) }) };
    }
    function evidence(): void {
      const table = element('table'), header = element('tr');
      for (const title of ['Pull request', 'Current → proposed', 'Retained metric', 'Evidence / compatibility']) header.append(element('th', title));
      const head = element('thead'); head.append(header); table.append(head);
      const body = element('tbody');
      for (const row of model.results.filter(filter)) {
        const tr = element('tr'), cell = element('td'), link = element('a', `#${row.pullRequest}`) as HTMLAnchorElement;
        link.href = `/pr/${model.basis.repository}/${row.pullRequest}?s=${encodeURIComponent(model.basis.repository)}&per=${new URL(root.dataset.endpoint!, location.origin).searchParams.get('per')}`;
        cell.append(link); tr.append(cell, element('td', row.reason ? 'Couldn’t evaluate' : `${row.previous} → ${row.proposed}`), element('td', format(row.metric)), element('td', row.reason ?? 'compatible with both policy identities'));
        body.append(tr);
      }
      table.append(body); find('evidence').replaceChildren(table);
      if (!body.children.length) find('evidence').append(element('p', 'No retained pull requests in this selection.', 'a-mini'));
    }
    function select(predicate: (row: any) => boolean, label: string): void {
      filter = predicate; evidence();
      status.textContent = `${label}. ${model.basis.population} retained merged pull requests; current ${model.basis.policyId}, candidate ${model.candidateId}.`;
    }
    function render(next: Model, initial: boolean): void {
      model = next;
      if (!next.basis) {
        status.textContent = 'Policy or retained history could not load. Retry to establish the actual basis.';
        retry.hidden = false; return;
      }
      find('basis').textContent = `${next.basis.repository} · ${next.basis.from} to ${next.basis.to} (exclusive) · ${next.basis.population} retained merged PRs · ${next.basis.recovered} comparisons recovered · ${next.basis.coverage} · reports ${next.basis.reportVersions?.join(', ') || 'unavailable'} · measurements ${next.basis.measurementVersions?.join(', ') || 'unavailable'} · current ${next.basis.policyId ?? 'unavailable'} · ${next.basis.source ?? next.reason} · trusted head ${next.basis.trustedHead ?? 'unobserved'}`;
      if (next.standing !== 'ready') {
        form.hidden = true;
        status.textContent = `${next.standing}: ${next.reason}${next.code ? ` (${next.code})` : ''}. Retained History remains readable. Retry resolves the actual current basis.`;
        result.replaceChildren(element('p', 'No current transition answer is available.'));
        find('adoption').replaceChildren(element('p', 'Adoption needs a valid current experiment.'));
        find('evidence').replaceChildren(); find('filters').replaceChildren(); retry.hidden = false;
        return;
      }
      if (initial) {
        form.hidden = false;
        decisionSelect.replaceChildren(...next.decisions.map((decision: any) => {
          const option = document.createElement('option'); option.value = decision.key; option.textContent = `${decision.kind === 'band' ? 'Band set' : 'Rule'}: ${decision.id}`; return option;
        }));
        decisionSelect.value = next.decision.key; edit(next.decision, next.metrics, next.proposal);
      }
      result.replaceChildren();
      result.append(element('p', `Candidate ${next.candidateId}`, 'a-mini'));
      const summary = element('div', undefined, 'pl-summary');
      for (const [count, label] of [[next.changed, 'Would change'], [next.same, 'Same'], [next.unavailable, 'Couldn’t evaluate']]) {
        const item = element('div'); item.append(element('strong', String(count)), element('span', label)); summary.append(item);
      }
      result.append(summary, element('p', `${next.changed + next.same} compatible with both policies / ${next.basis.population} retained merged PRs. Nothing interpolated.`, 'a-mini'));
      const matrix = element('div', undefined, 'pl-scroll pl-matrix'), table = element('table');
      table.append(element('caption', 'Current classification (rows) → proposed classification (columns)'));
      const head = element('thead'), titles = element('tr'); titles.append(element('th', 'Current / proposed'));
      for (const id of next.classes) titles.append(element('th', id)); head.append(titles); table.append(head);
      const body = element('tbody');
      const transitionButton = (transition: any) => {
        const node = button(String(transition.count), () => select(row => row.previous === transition.previous && row.proposed === transition.proposed, `${transition.previous} → ${transition.proposed}`));
        node.setAttribute('aria-label', `${transition.previous} to ${transition.proposed}: ${transition.count} pull requests`); return node;
      };
      for (const previous of next.classes) {
        const tr = element('tr'); tr.append(element('th', previous));
        for (const proposed of next.classes) { const td = element('td'); td.append(transitionButton(next.transitions.find((t: any) => t.previous === previous && t.proposed === proposed))); tr.append(td); }
        body.append(tr);
      }
      table.append(body); matrix.append(table); result.append(matrix);
      const linear = element('div', undefined, 'pl-linear'), linearTable = element('table');
      linearTable.append(element('caption', 'Equivalent transition account'));
      for (const transition of next.transitions.filter((t: any) => t.count)) {
        const tr = element('tr'), td = element('td'); td.append(transitionButton(transition)); tr.append(element('th', `${transition.previous} → ${transition.proposed}`), td); linearTable.append(tr);
      }
      linear.append(linearTable); result.append(linear);
      for (const reason of next.reasons) result.append(button(`Couldn’t evaluate: ${reason.reason} · ${reason.count}`, () => select(row => row.reason === reason.reason, reason.reason)));
      find('filters').replaceChildren(...([['changed', 'Would change'], ['same', 'Same'], ['unavailable', 'Couldn’t evaluate']] as const).map(([standing, title]) => button(title, () => select(row => row.standing === standing, title))));
      filter = row => row.standing === 'changed'; evidence();
      const adoption = find('adoption'); adoption.replaceChildren(element('p', `Adopt in .diffdevil.yml · candidate ${next.candidateId} · ${next.adoption.path} · current origin ${next.adoption.origin}. Merge the declaration below into the trusted file; it becomes authoritative only after you commit it and real analysis observes that head. If the existing file uses size.thresholds, replace that shorthand with the proposed bands.size declaration rather than keeping both.`));
      adoption.append(element('p', 'Focused declaration diff against the effective policy. This is not a patch of unobserved original file text.', 'a-mini'), element('pre', next.adoption.patch));
      const actions = element('div', undefined, 'pl-actions'), copy = button('Copy focused patch', () => {
        void navigator.clipboard.writeText(next.adoption.patch).then(() => { status.textContent = 'Focused patch copied.'; }, () => { status.textContent = 'Clipboard unavailable. Select and copy the visible patch.'; });
      });
      if (next.adoption.origin !== 'trusted-base') {
        adoption.append(element('p', 'No trusted file was observed. For a new file, copy the full effective candidate context so custom metric dependencies remain defined. Review it under the repository’s normal authority before committing.', 'a-mini'));
        actions.append(button('Copy full candidate context', () => {
          void navigator.clipboard.writeText(next.adoption.context).then(() => { status.textContent = 'Full candidate context copied.'; }, () => { status.textContent = 'Clipboard unavailable. Expand and copy the full candidate context.'; });
        }));
      }
      const link = element('a', next.adoption.origin === 'trusted-base' ? 'Open trusted policy on GitHub' : 'Create policy file on GitHub', 'btn') as HTMLAnchorElement;
      link.href = next.adoption.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; actions.append(copy, link); adoption.append(actions);
      const details = element('details'); details.append(element('summary', 'Show full effective candidate context'), element('pre', next.adoption.context)); adoption.append(details);
      status.textContent = `${next.basis.population ? 'Experiment ready' : 'No retained merged PRs in this period'}. Current policy remains active. Candidate ${next.candidateId}.`;
    }

    async function evaluate(input: any = null): Promise<void> {
      controller?.abort(); controller = new AbortController(); const generation = ++sequence;
      lastInput = input; retry.hidden = true; result.setAttribute('aria-busy', 'true');
      status.textContent = model?.candidateId ? `Evaluating replacement. Previous answer ${model.candidateId} remains displayed; it does not describe the pending edit.` : 'Resolving current policy and retained history…';
      try {
        const response = await fetch(root.dataset.endpoint!, { method: input ? 'POST' : 'GET', credentials: 'same-origin',
          headers: input ? { 'Content-Type': 'application/json' } : {}, ...(input ? { body: JSON.stringify(input) } : {}), signal: controller.signal });
        if (!root.isConnected || generation !== sequence) return;
        if (response.status === 403 || response.redirected) {
          root.replaceChildren(element('p', 'Current access or retained history is no longer available. Protected experiment data has been removed. Return to History to establish current access.'));
          return;
        }
        const next = await response.json();
        if (!root.isConnected || generation !== sequence) return;
        if (!response.ok) throw new Error(next.code ?? 'E_POLICY_LAB_UNAVAILABLE');
        render(next, !input);
      } catch (error) {
        if (!root.isConnected || generation !== sequence || (error as Error).name === 'AbortError') return;
        status.textContent = `The pending experiment could not be evaluated (${(error as Error).message}). Check numeric boundaries and ordering, or retry. Any displayed answer belongs only to its named previous candidate.`;
        retry.hidden = false;
      } finally { if (generation === sequence) result.setAttribute('aria-busy', 'false'); }
    }
    form.addEventListener('submit', event => { event.preventDefault(); if (form.reportValidity()) void evaluate(requestInput()); });
    decisionSelect.addEventListener('change', () => { controller?.abort(); ++sequence; edit(model.decisions.find((d: any) => d.key === decisionSelect.value), model.metrics); status.textContent = 'Decision changed. Preview to replace the previous named answer.'; });
    form.addEventListener('input', () => { controller?.abort(); ++sequence; result.setAttribute('aria-busy', 'false'); status.textContent = `Edits have not been evaluated. Previous answer ${model.candidateId} remains displayed.`; });
    find('reset').addEventListener('click', () => { controller?.abort(); ++sequence; const decision = model.decisions.find((d: any) => d.key === decisionSelect.value); edit(decision, model.metrics); void evaluate(requestInput()); });
    retry.addEventListener('click', () => void evaluate(model?.standing === 'superseded' || model?.standing === 'unavailable' ? null : lastInput));
    const initial = root.querySelector('[data-lab-initial]');
    if (initial) render(JSON.parse(initial.textContent!), true); else void evaluate();
  }
}
document.addEventListener('diffdevil:page', mount);
mount();
