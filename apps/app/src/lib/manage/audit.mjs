// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The administrative record: what an administrator (or the automation they chose) requested, where, and what came of
 * it, kept as it happened. Every Manage action records one event through `recordAction`; the Business Audit page
 * presents them through `presentEvent`. Results use one vocabulary: `requested`, `queued`, `applied`, `partly`,
 * `failed`, and `observed` for a fact seen only on GitHub, which has no diffdevil actor and says so. This is not
 * contributor activity and names no retention term: what is recorded is kept until one is settled.
 */
import { fmtDay } from './works.mjs';

export const RESULT_WORDS = Object.freeze({
  requested: { label: 'Requested', tone: 'info', icon: 'clock' },
  queued: { label: 'Queued', tone: 'warn', icon: 'clock' },
  applied: { label: 'Applied', tone: 'ok', icon: 'check' },
  partly: { label: 'Applied, partly', tone: 'warn', icon: 'check' },
  failed: { label: 'Failed', tone: 'err', icon: 'circle-alert' },
  observed: { label: 'Observed', tone: '', icon: undefined }
});

/** The audit words for a Manage message code: a refused action is a failed request, kept with its reason. */
export function resultOfMessage(messages, code) {
  const message = messages[code];
  if (!message) return { result: 'failed', reason: code };
  return message.tone === 'err' ? { result: 'failed', reason: message.text } : { result: 'applied', reason: null };
}

/**
 * Record one action of the signed-in person. `namespace` carries the account the event belongs to; a repository
 * event also names the repository. Recording never fails the action it describes.
 */
export async function recordAction(runtime, { viewer, accountId = null, repositoryId = null, where, what, result, reason = null, detail = null, actor = null }) {
  try {
    await runtime.manage.recordEvent({ accountId, repositoryId, where, actor: actor ?? { kind: 'person', id: viewer.userId, login: viewer.login }, what, result, reason, detail });
  } catch { /* the record is evidence, not the effect */ }
}

/** The time of an event in the console's words: day and time, in UTC like every other date here. */
export function fmtWhen(iso) {
  if (!iso) return 'unknown';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${fmtDay(iso)} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`;
}

/** One event as the Audit page shows it. `logins` maps user IDs to logins the viewer knows; others read as `GitHub user N`. */
export function presentEvent(event, { logins = new Map(), viewerId = null } = {}) {
  const words = RESULT_WORDS[event.result] ?? { label: event.result, tone: '', icon: undefined };
  const actor = event.actor ?? { kind: 'unknown' };
  const who = actor.kind === 'person' ? (actor.login ?? (Number.isSafeInteger(actor.id) ? logins.get(actor.id) ?? `GitHub user ${actor.id}` : 'unknown'))
    : actor.kind === 'automation' ? `automatic setup${actor.login ? ` (chosen by ${actor.login})` : Number.isSafeInteger(actor.id) ? ` (chosen by ${logins.get(actor.id) ?? `GitHub user ${actor.id}`})` : ''}`
      : actor.kind === 'github' ? 'GitHub' : 'unknown';
  return { when: fmtWhen(event.at), who, you: actor.kind === 'person' && actor.id === viewerId, unknown: who === 'unknown', where: event.where, what: event.what, result: words.label, tone: words.tone, icon: words.icon, reason: event.reason ?? null, detail: event.detail ?? null };
}
