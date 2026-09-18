// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Query parameters are the playground state; the page is shareable and reloadable.
 *   pr=owner/repo/123    public PR input; presence selects mode `pr`
 *   example=<id>         fixture or curated snapshot; selects mode `examples`
 *   head=snapshot|live   curated PRs: teaching snapshot or dynamic analysis of the current head
 *   view=terminal|agent|github|explain
 *   cfg=controls|policy
 *   policy=<base64url>   edited .diffdevil.yml; absent = the example's own policy
 * Theme is never a URL parameter.
 */
export type View = 'terminal' | 'agent' | 'github' | 'explain';
export type ConfigMode = 'controls' | 'policy';
export type Mode = 'pr' | 'examples';

export interface PlaygroundState {
  readonly mode: Mode;
  readonly pr?: { owner: string; repo: string; number: number } | undefined;
  readonly example?: string | undefined;
  readonly variant?: string | undefined;
  readonly head: 'snapshot' | 'live';
  readonly view: View;
  readonly cfg: ConfigMode;
  readonly policy?: string | undefined;
}

const VIEWS: readonly View[] = ['terminal', 'agent', 'github', 'explain'];

export function parsePr(value: string | null | undefined): PlaygroundState['pr'] {
  const match = /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9._-]+)\/([1-9]\d*)$/u.exec(value ?? '');
  return match ? { owner: match[1]!, repo: match[2]!, number: Number(match[3]) } : undefined;
}

export function parsePullRequestUrl(input: string): PlaygroundState['pr'] {
  const match = /^https:\/\/github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9._-]+)\/pull\/([1-9]\d*)(?:[/?#].*)?$/u.exec(input.trim());
  return match ? { owner: match[1]!, repo: match[2]!, number: Number(match[3]) } : undefined;
}

export function prUrl(pr: NonNullable<PlaygroundState['pr']>): string { return `https://github.com/${pr.owner}/${pr.repo}/pull/${pr.number}`; }
export function prParam(pr: NonNullable<PlaygroundState['pr']>): string { return `${pr.owner}/${pr.repo}/${pr.number}`; }

export function readState(search: string, defaultExample: string): PlaygroundState {
  const params = new URLSearchParams(search);
  const pr = parsePr(params.get('pr'));
  const example = params.get('example') ?? undefined;
  const view = params.get('view') as View | null;
  const head = params.get('head');
  const cfg = params.get('cfg');
  return {
    mode: pr ? 'pr' : 'examples',
    pr,
    example: pr ? undefined : example ?? defaultExample,
    variant: pr ? undefined : params.get('variant') ?? undefined,
    head: head === 'live' ? 'live' : 'snapshot',
    view: view && VIEWS.includes(view) ? view : 'terminal',
    cfg: cfg === 'policy' ? 'policy' : 'controls',
    policy: params.get('policy') ?? undefined,
  };
}

export function writeState(state: PlaygroundState, defaultExample: string): string {
  const params = new URLSearchParams();
  if (state.mode === 'pr' && state.pr) params.set('pr', prParam(state.pr));
  else if (state.example && state.example !== defaultExample) params.set('example', state.example);
  if (state.mode === 'examples' && state.variant) params.set('variant', state.variant);
  if (state.head === 'live') params.set('head', 'live');
  if (state.view !== 'terminal') params.set('view', state.view);
  if (state.cfg !== 'controls') params.set('cfg', state.cfg);
  if (state.policy) params.set('policy', state.policy);
  const text = params.toString();
  return text ? `?${text}` : '';
}

export function encodePolicy(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}
export function decodePolicy(value: string): string | undefined {
  try {
    const binary = atob(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4));
    return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
  } catch { return undefined; }
}
