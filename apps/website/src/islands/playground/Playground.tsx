// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The playground island. One acquired report (fixture, curated snapshot, or a public
 * PR from the playground API) is evaluated locally against one policy text; every view
 * renders the same result. URL parameters are the state.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { copy } from '../../data/copy';
import { PLAYGROUND_API } from '../../data/site';
import { evaluate, readSavedReport, type Evaluation, type EvaluationFailure, type Report } from './engine';
import { decodePolicy, encodePolicy, prUrl, readState, writeState, type PlaygroundState, type View } from './state';
import { Rail, type ExampleCard } from './Rail';
import { Result } from './Result';
import { announce } from '../../lib/clipboard';

export interface ExamplePayload {
  readonly kind: 'diffdevil.playground-example'; readonly group: 'fixture' | 'curated';
  readonly id: string; readonly glyph?: string; readonly title: string; readonly hook?: string; readonly teaches: string; readonly reason?: string; readonly focus?: string;
  readonly repository?: string; readonly pullRequest?: number; readonly url?: string;
  readonly source?: { kind: string; path: string };
  readonly snapshot?: { head: string; base: string; analyzedAt: string; engine: { package: string; reportSchema: string; replacementLines: string; policy: string }; evidence: string; note?: string };
  readonly policy: { kind: 'file' | 'preset'; path?: string; name: string; text: string };
  readonly commentPolicy?: { path: string; name: string; text: string } | undefined;
  readonly report: Report;
}

export interface Acquired {
  readonly kind: 'fixture' | 'snapshot' | 'live' | 'pr';
  readonly report: Report;
  readonly example?: ExamplePayload | undefined;
  readonly pr?: { owner: string; repo: string; number: number } | undefined;
  readonly policyName: string;
  readonly basePolicy: string;
  readonly liveHead?: string | undefined;
  readonly acquiredAt: number;
}

export type ApiError = { code: string; message: string; retryMinutes?: number | undefined };

interface Props { readonly fixtures: readonly ExampleCard[]; readonly curated: readonly ExampleCard[]; readonly defaultExample: string }

const PRESET_POLICY = 'version: 1\npresets: [size@1]\n';

async function fetchApi(path: string, url: string): Promise<{ ok: true; value: any } | { ok: false; error: ApiError }> {
  let response: Response;
  try { response = await fetch(`${PLAYGROUND_API}${path}?url=${encodeURIComponent(url)}`, { headers: { accept: 'application/json' } }); }
  catch { return { ok: false, error: { code: 'UNREACHABLE', message: copy.playground.states.unreachable } }; }
  let body: any;
  try { body = await response.json(); } catch { return { ok: false, error: { code: 'UPSTREAM_ERROR', message: copy.playground.states.upstream } }; }
  if (body?.ok) return { ok: true, value: body };
  const retryAfter = response.headers.get('retry-after');
  const reset = response.headers.get('x-ratelimit-reset');
  const retryMinutes = retryAfter ? Math.ceil(Number(retryAfter) / 60) : reset ? Math.max(1, Math.ceil((Number(reset) * 1000 - Date.now()) / 60000)) : undefined;
  return { ok: false, error: { code: body?.error?.code ?? 'UPSTREAM_ERROR', message: body?.error?.message ?? copy.playground.states.upstream, retryMinutes } };
}

export default function Playground({ fixtures, curated, defaultExample }: Props) {
  const [state, setState] = useState<PlaygroundState>(() => readState(typeof location === 'undefined' ? '' : location.search, defaultExample));
  const [acquired, setAcquired] = useState<Acquired | undefined>();
  const [previous, setPrevious] = useState<Acquired | undefined>();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<ApiError | undefined>();
  const [policyText, setPolicyText] = useState<string>('');
  const [newerHead, setNewerHead] = useState<string | undefined>();
  const examples = useRef(new Map<string, ExamplePayload>());
  const abort = useRef<AbortController | undefined>(undefined);

  // Reflect state into the URL (shareable, reloadable) without adding history entries per keystroke.
  useEffect(() => {
    const next = writeState(state, defaultExample);
    if (location.search !== next) history.replaceState(null, '', `${location.pathname}${next}${location.hash}`);
  }, [state, defaultExample]);

  const loadExample = useCallback(async (id: string): Promise<ExamplePayload | undefined> => {
    const cached = examples.current.get(id);
    if (cached) return cached;
    try {
      const response = await fetch(`/playground/examples/${id}.json`);
      if (!response.ok) return undefined;
      const payload = await response.json() as ExamplePayload;
      const report = readSavedReport(payload.report);
      if (!report.ok) return undefined;
      const value = { ...payload, report: report.value };
      examples.current.set(id, value);
      return value;
    } catch { return undefined; }
  }, []);

  // Acquisition: fixtures and snapshots from static JSON, live and PR input from the API.
  useEffect(() => {
    let cancelled = false;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    (async () => {
      if (state.mode === 'pr' && state.pr) {
        setWorking(true); setError(undefined);
        announce(copy.playground.working);
        const result = await fetchApi('/api/report', prUrl(state.pr));
        if (cancelled) return;
        setWorking(false);
        if (!result.ok) { setError(result.error); return; }
        const report = readSavedReport(result.value.report);
        if (!report.ok) { setError({ code: 'UPSTREAM_ERROR', message: copy.playground.states.upstream }); return; }
        const next: Acquired = { kind: 'pr', report: report.value, pr: state.pr, policyName: '.diffdevil.yml', basePolicy: PRESET_POLICY, acquiredAt: Date.now() };
        setAcquired(current => { if (current) setPrevious(current); return next; });
        setPolicyText(state.policy ? decodePolicy(state.policy) ?? PRESET_POLICY : PRESET_POLICY);
        announce(copy.playground.done);
        return;
      }
      const id = state.example ?? defaultExample;
      const example = await loadExample(id);
      if (cancelled) return;
      if (!example) { setError({ code: 'NOT_FOUND', message: `No example named "${id}".` }); return; }
      setError(undefined);
      const pr = example.repository && example.pullRequest ? { owner: example.repository.split('/')[0]!, repo: example.repository.split('/')[1]!, number: example.pullRequest } : undefined;
      if (example.group === 'curated' && state.head === 'live' && pr) {
        setWorking(true);
        announce(copy.playground.working);
        const result = await fetchApi('/api/report', prUrl(pr));
        if (cancelled) return;
        setWorking(false);
        if (!result.ok) { setError(result.error); setAcquired({ kind: 'snapshot', report: example.report, example, pr, policyName: example.policy.name, basePolicy: example.policy.text, acquiredAt: Date.now() }); return; }
        const report = readSavedReport(result.value.report);
        if (!report.ok) { setError({ code: 'UPSTREAM_ERROR', message: copy.playground.states.upstream }); return; }
        setAcquired({ kind: 'live', report: report.value, example, pr, policyName: example.policy.name, basePolicy: example.policy.text, liveHead: report.value.source.head, acquiredAt: Date.now() });
        announce(copy.playground.done);
      } else {
        setAcquired({ kind: example.group === 'curated' ? 'snapshot' : 'fixture', report: example.report, example, pr, policyName: example.policy.name, basePolicy: example.policy.text, acquiredAt: Date.now() });
      }
      setPolicyText(state.policy ? decodePolicy(state.policy) ?? example.policy.text : example.policy.text);
      // Freshness: once per snapshot per page load; a failed check shows nothing rather than a false "current".
      if (example.group === 'curated' && pr && example.snapshot) {
        const key = `diffdevil.head.${example.id}`;
        const cachedHead = sessionStorage.getItem(key);
        if (cachedHead !== null) { setNewerHead(cachedHead && cachedHead !== example.snapshot.head ? cachedHead : undefined); }
        else {
          fetchApi('/api/head', prUrl(pr)).then(result => {
            if (cancelled) return;
            if (result.ok) { sessionStorage.setItem(key, result.value.head.head); setNewerHead(result.value.head.head !== example.snapshot!.head ? result.value.head.head : undefined); }
          });
        }
      } else setNewerHead(undefined);
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [state.mode, state.pr?.owner, state.pr?.repo, state.pr?.number, state.example, state.head, defaultExample, loadExample]);

  const evaluation = useMemo<Evaluation | EvaluationFailure | undefined>(() => {
    if (!acquired || !policyText) return undefined;
    return evaluate(policyText, acquired.policyName, acquired.report, acquired.example?.focus);
  }, [acquired, policyText]);
  // The last valid evaluation stays visible while the editor holds an invalid policy.
  const lastValid = useRef<Evaluation | undefined>(undefined);
  if (evaluation?.ok) lastValid.current = evaluation;

  const update = useCallback((patch: Partial<PlaygroundState>) => setState(current => ({ ...current, ...patch })), []);
  const changePolicy = useCallback((text: string) => {
    setPolicyText(text);
    setState(current => ({ ...current, policy: acquired && text === acquired.basePolicy ? undefined : encodePolicy(text) }));
  }, [acquired]);

  const selectExample = useCallback((id: string) => setState(current => ({ ...current, mode: 'examples', example: id, head: 'snapshot', pr: undefined, policy: undefined })), []);
  const analyzePr = useCallback((pr: { owner: string; repo: string; number: number }) => setState(current => ({ ...current, mode: 'pr', pr, example: undefined, head: 'snapshot', policy: undefined })), []);
  const cancel = useCallback(() => { abort.current?.abort(); setWorking(false); }, []);

  return (
    <div className="pg">
      <Rail
        state={state} fixtures={fixtures} curated={curated} acquired={acquired} evaluation={evaluation} lastValid={lastValid.current}
        working={working} error={error} policyText={policyText}
        onSelectExample={selectExample} onAnalyzePr={analyzePr} onCancel={cancel} onMode={(mode) => update({ mode })} onCfg={(cfg) => update({ cfg })} onPolicy={changePolicy}
      />
      <Result
        state={state} acquired={acquired} previous={previous} evaluation={evaluation} lastValid={lastValid.current} working={working} error={error} newerHead={newerHead} policyText={policyText}
        onView={(view: View) => update({ view })} onHead={(head) => update({ head })}
      />
    </div>
  );
}
