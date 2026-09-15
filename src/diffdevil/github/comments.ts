import { fail } from '../errors.js';
import { canonicalJson } from '../inert.js';
import { DEFAULT_LIMITS, enforceBytes } from '../limits.js';
import type { EffectPlan } from '../model.js';
import type { CommentDefinition } from '../policy/types.js';
import { GitHubClient } from './client.js';
import { EffectSession } from './observation.js';
import { githubInteger, githubRecord, githubString, repositoryPath } from './values.js';

export interface CommentAuthor { readonly login: string; readonly id?: number }
interface CommentState {
  readonly v: 1; readonly repository: string; readonly pullRequest: number; readonly policyId: string;
  readonly rule: string; readonly sequence: number; readonly transition: number;
  readonly decision?: boolean; readonly band?: string; readonly occasion?: string;
}
interface OwnedComment { readonly id: number; readonly visibleBody: string; readonly state: CommentState }
const MARKER = /\n<!-- diffdevil:state=([A-Za-z0-9_-]+) -->$/u;
/** Ownership requires both a selected actor and a validated target/policy/rule marker. */
export async function readOwnedComments(client: GitHubClient, plan: EffectPlan, author: CommentAuthor): Promise<OwnedComment[]> {
  if (!author.login || author.id !== undefined && (!Number.isSafeInteger(author.id) || author.id < 1)) fail('E_CONFIG', 'Expected comment author requires a login and an optional positive numeric ID.', 'config');
  const result: OwnedComment[] = [];
  for (const value of (await client.list(`${repositoryPath(plan.target.repository)}/issues/${plan.target.pullRequest}/comments?per_page=100`)).items) {
    const row = githubRecord(value, 'comment'), user = row.user;
    if (!user || typeof user !== 'object' || Array.isArray(user)) continue;
    const actor = user as Record<string, unknown>;
    if (typeof actor.login !== 'string' || actor.login.toLowerCase() !== author.login.toLowerCase() || author.id !== undefined && actor.id !== author.id) continue;
    const body = typeof row.body === 'string' ? row.body : '', match = MARKER.exec(body);
    if (!match) {
      if (body.includes('<!-- diffdevil:state=')) fail('E_COMMENT_STATE', 'An expected-author comment has malformed diffdevil state. Its ownership cannot be reconciled automatically.', 'apply');
      continue;
    }
    if (match[1]!.length > 8192) fail('E_COMMENT_STATE', 'Owned comment state exceeds its metadata size bound.', 'apply');
    let state: Record<string, unknown>;
    try { state = githubRecord(JSON.parse(Buffer.from(match[1]!, 'base64url').toString('utf8')), 'comment state'); }
    catch { return fail('E_COMMENT_STATE', 'Owned comment metadata is not valid JSON.', 'apply'); }
    if (state.v !== 1 || state.repository !== plan.target.repository.toLowerCase() || state.pullRequest !== plan.target.pullRequest || state.policyId !== plan.policyId || typeof state.rule !== 'string' || !Object.hasOwn(plan.rules, state.rule)) continue;
    if (!Number.isSafeInteger(state.sequence) || (state.sequence as number) < 0 || !Number.isSafeInteger(state.transition) || (state.transition as number) < 0 || state.decision !== undefined && typeof state.decision !== 'boolean' || state.band !== undefined && typeof state.band !== 'string' || state.occasion !== undefined && typeof state.occasion !== 'string') fail('E_COMMENT_STATE', 'Owned comment metadata has invalid lifecycle fields.', 'apply');
    result.push({ id: githubInteger(row.id, 'comment ID', 1), visibleBody: body.slice(0, match.index), state: state as unknown as CommentState });
  }
  const keys = new Set<string>();
  for (const comment of result) {
    const key = `${comment.state.rule}/${comment.state.sequence}`;
    if (keys.has(key)) fail('E_COMMENT_CONFLICT', 'Multiple owned comments claim the same lifecycle sequence. No comment was deleted or selected arbitrarily.', 'apply');
    keys.add(key);
  }
  return result;
}
function bodyWithState(visible: string, state: CommentState): string {
  if (visible.includes('<!-- diffdevil:')) fail('E_TEMPLATE_OWNERSHIP', 'Templates cannot supply adapter-owned comment markers.', 'plan');
  const body = `${visible}\n<!-- diffdevil:state=${Buffer.from(canonicalJson(state)).toString('base64url')} -->`;
  enforceBytes(body, DEFAULT_LIMITS.stringBytes, 'Owned comment', 'format');
  return body;
}
export function prepareComments(plan: EffectPlan, definitions: Readonly<Record<string, CommentDefinition>>, current: readonly OwnedComment[], occasionId?: string): { rule: string; id?: number; body: string; state: CommentState }[] {
  const output: { rule: string; id?: number; body: string; state: CommentState }[] = [];
  const operations = new Map(plan.operations.filter(op => op.kind === 'comment.reconcile').map(op => [op.rule, op]));
  for (const [rule, definition] of Object.entries(definitions)) {
    const result = plan.rules[rule];
    if (!result || result.disposition === 'held' || result.disposition === 'fallback') continue;
    const owned = current.filter(comment => comment.state.rule === rule).sort((a, b) => b.state.sequence - a.state.sequence);
    const prior = owned[0];
    if (definition.mode === 'once' && prior) continue;
    const operation = operations.get(rule);
    const decision = result.decision?.status === 'resolved' ? result.decision.value : undefined;
    const band = result.band?.status === 'resolved' ? result.band.id : undefined;
    const transition = (prior?.state.transition ?? 0) + (decision === true && prior?.state.decision !== true ? 1 : 0);
    const state: CommentState = { v: 1, repository: plan.target.repository.toLowerCase(), pullRequest: plan.target.pullRequest, policyId: plan.policyId, rule,
      sequence: (prior?.state.sequence ?? 0) + 1, transition,
      ...(decision === undefined ? {} : { decision }), ...(band === undefined ? {} : { band }), ...(occasionId === undefined ? {} : { occasion: occasionId }) };
    if (!Number.isSafeInteger(state.sequence) || !Number.isSafeInteger(transition)) fail('E_LIMIT', 'Owned comment lifecycle counter exhausted its safe integer domain.', 'apply');
    if (!operation) {
      // Persist a false transition in existing owned metadata without adding a false-state comment.
      if (definition.mode === 'once-per-transition' && prior && decision === false && prior.state.decision !== false) output.push({ rule, id: prior.id, body: bodyWithState(prior.visibleBody, state), state });
      continue;
    }
    if (operation.trigger === 'matched' && decision !== true && band === undefined) continue;
    if (operation.trigger === 'band-changed' && prior?.state.band === band) continue;
    if (definition.mode === 'once-per-transition' && (decision !== true || prior?.state.decision === true)) continue;
    if (definition.mode === 'create') {
      if (!occasionId) fail('E_OCCASION_REQUIRED', 'Comment create mode requires a stable host occasion identity so retries do not duplicate comments.', 'apply');
      if (owned.some(comment => comment.state.occasion === occasionId)) continue;
    }
    if (definition.mode === 'upsert' && prior && prior.visibleBody === operation.body && prior.state.decision === decision && prior.state.band === band) continue;
    const id = definition.mode === 'upsert' && prior ? prior.id : undefined;
    output.push({ rule, ...(id === undefined ? {} : { id }), body: bodyWithState(operation.body, state), state });
  }
  return output;
}
export async function reconcileComments(client: GitHubClient, plan: EffectPlan, author: CommentAuthor, prepared: ReturnType<typeof prepareComments>, session: EffectSession): Promise<void> {
  const root = repositoryPath(plan.target.repository);
  for (const comment of prepared) {
    await session.write({ kind: comment.id === undefined ? 'comment.create' : 'comment.update', subject: comment.rule,
      perform: async () => { await client.json(comment.id === undefined ? `${root}/issues/${plan.target.pullRequest}/comments` : `${root}/issues/comments/${comment.id}`,
        { method: comment.id === undefined ? 'POST' : 'PATCH', body: { body: comment.body }, phase: 'apply' }); },
      verify: async () => {
        const current = await readOwnedComments(client, plan, author);
        const matches = current.filter(item => item.state.rule === comment.rule && item.state.sequence === comment.state.sequence);
        return matches.length === 1 && (comment.id === undefined || matches[0]!.id === comment.id) && bodyWithState(matches[0]!.visibleBody, matches[0]!.state) === comment.body;
      } });
  }
}
