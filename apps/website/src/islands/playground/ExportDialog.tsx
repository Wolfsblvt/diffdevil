// SPDX-License-Identifier: AGPL-3.0-only
/** Export: CLI · Action step · Complete workflow · .diffdevil.yml · report.json / plan.json. Each states its read/write meaning before the code. Focus trapped by <dialog>. */
import { useEffect, useRef, useState } from 'react';
import { copy } from '../../data/copy';
import { PACKAGE_VERSION, paths } from '../../data/site';
import { json, planJson, type Evaluation } from './engine';
import type { Acquired } from './Playground';
import { copyText } from '../../lib/clipboard';
import { encodePolicy } from './state';

interface Props { evaluation: Evaluation; acquired: Acquired; policyText: string; onClose: () => void }
type Tab = 'cli' | 'step' | 'workflow' | 'policy' | 'data';

export function ExportDialog({ evaluation, acquired, policyText, onClose }: Props) {
  const c = copy.playground;
  const dialog = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<Tab>('cli');
  useEffect(() => { const d = dialog.current; d?.showModal(); const close = () => onClose(); d?.addEventListener('close', close); return () => d?.removeEventListener('close', close); }, [onClose]);

  const isPreset = policyText === acquired.basePolicy && acquired.example?.policy.kind === 'preset';
  const writes = !!evaluation.plan?.operations.length;
  const sourceNote = acquired.kind === 'pr' && acquired.pr
    ? `Source: GitHub pull request ${acquired.pr.owner}/${acquired.pr.repo}#${acquired.pr.number} (playground read it through the public API)`
    : acquired.kind === 'fixture' ? `Source: local Git, base origin/main (playground used a frozen fixture, ${acquired.example?.source?.path})` : `Source: local Git, base origin/main (playground used a curated snapshot of ${acquired.example?.repository}#${acquired.example?.pullRequest})`;
  const policyFlag = isPreset ? '' : ' --config .diffdevil.yml';
  const cli = acquired.kind === 'pr' && acquired.pr
    ? `npx @wolfsblvt/diffdevil analyze --repo ${acquired.pr.owner}/${acquired.pr.repo} --pr ${acquired.pr.number}${policyFlag} --format human\n# reads only; GH_TOKEN raises the unauthenticated read limit, it does not enable writes`
    : `npx @wolfsblvt/diffdevil analyze --base origin/main${policyFlag} --format human\nnpx @wolfsblvt/diffdevil query --metric changed --format value${policyFlag}\nnpx @wolfsblvt/diffdevil plan --base origin/main${policyFlag} --target-repo OWNER/REPO --target-pr 123 --format human`;
  const step = writes
    ? `- uses: Wolfsblvt/diffdevil@v1\n  # writes labels from the policy in the PR base; needs pull-requests: write on pull_request_target`
    : `- uses: Wolfsblvt/diffdevil/actions/analyze@v1\n  id: diff\n  # read-only facts and outputs; needs pull-requests: read`;
  const workflow = writes
    ? `name: Pull-request size\non:\n  pull_request_target:\n    types: [opened, reopened, synchronize, edited]\npermissions:\n  pull-requests: write\nconcurrency:\n  group: diffdevil-size-\${{ github.event.pull_request.number }}\n  cancel-in-progress: false\njobs:\n  size:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: Wolfsblvt/diffdevil@v1${isPreset ? '' : '\n        with:\n          config: .diffdevil.yml\n          policy-source: base'}\n`
    : `name: Analyze pull-request diff\non:\n  pull_request:\n    types: [opened, reopened, synchronize]\npermissions:\n  pull-requests: read\njobs:\n  analyze:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: Wolfsblvt/diffdevil/actions/analyze@v1\n        id: diff${isPreset ? '' : '\n        with:\n          config: .diffdevil.yml'}\n      - run: echo "changed=\${{ steps.diff.outputs.lines-changed }} (\${{ steps.diff.outputs.lines-changed-status }})"\n`;
  const tabs: [Tab, string][] = [['cli', 'CLI'], ['step', 'Action step'], ['workflow', 'Complete workflow'], ['policy', '.diffdevil.yml'], ['data', 'report.json / plan.json']];
  const text = tab === 'cli' ? cli : tab === 'step' ? step : tab === 'workflow' ? workflow : tab === 'policy' ? policyText : json(evaluation.report) + (evaluation.plan ? `\n\n// plan.json\n${planJson(evaluation.plan)}` : '');

  return (
    <dialog ref={dialog} className="sheet" aria-labelledby="export-h">
      <div className="sheet-head"><h2 id="export-h">{c.export}</h2><span className="spacer" /><button type="button" className="btn btn-quiet" onClick={() => dialog.current?.close()}>Close</button></div>
      <div className="sheet-body">
        <div className="sheet-tabs" role="tablist">{tabs.map(([id, label]) => <button key={id} type="button" role="tab" className="chip" aria-selected={tab === id} aria-checked={tab === id} onClick={() => setTab(id)}>{label}</button>)}</div>
        {(tab === 'step' || tab === 'workflow') && <div className={writes ? 'notice-proposed' : 'panel'}><strong>{writes ? 'This workflow writes labels.' : 'Reads only.'}</strong> {writes ? c.exportPermission.replace('This workflow writes labels. ', '') : c.exportReadOnly.replace('Reads only. ', '')}</div>}
        {tab === 'cli' && <div className="panel"><strong>Reads only.</strong> {c.exportReadOnly.replace('Reads only. ', '')}</div>}
        <figure className="machine code">
          <figcaption className="code-head"><span>{tabs.find(t => t[0] === tab)?.[1]}</span><span className="spacer" /><button type="button" onClick={() => copyText(text)}>Copy</button></figcaption>
          <pre className="code-body"><code>{text}</code></pre>
        </figure>
        <div className="panel">
          <p className="label">{c.exportAssumptions}</p>
          <ul className="small pg-assumptions">
            <li>{sourceNote}</li>
            <li>Policy: {isPreset ? 'the size@1 preset (no file needed)' : 'the current editor content, saved as .diffdevil.yml at the repository root'}</li>
            <li>Versions: CLI {PACKAGE_VERSION} · report {evaluation.report.schemaVersion} · {evaluation.report.semantics.replacementLines}</li>
          </ul>
        </div>
        <div className="panel">
          <p className="label">{c.exportApp}</p>
          <p className="small">{c.exportAppBody}</p>
          <a className="btn btn-secondary" href={`${paths.app}?policy=${encodePolicy(policyText)}`}>{c.exportAppCta}</a>
        </div>
      </div>
    </dialog>
  );
}
