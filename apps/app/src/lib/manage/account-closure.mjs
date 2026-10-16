// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import { D1AppStore, APP_TOMBSTONE_DAYS } from '../../../../github-app/storage.mjs';
import { D1AuthorizationStore } from '../../../../github-app/authorization-storage.mjs';
import { D1ManageStore } from './store.mjs';
import { D1ParticipationStore } from '../participation/store.mjs';

/**
 * Commit the already-authorized personal closure on the shared APP_DB. No destructive prefix is visible without
 * the corresponding history withdrawal, account erasure and ended authorization. The statement count is fixed:
 * JSON-bound numeric targets avoid a provider parameter/statement limit proportional to repository or policy count.
 * D1 rejection, including its resource limits, leaves the entire transition unchanged; never split this batch.
 */
export async function closeLocalAccount({ database, userId, repositories, sessionHash, now }) {
  const at = now(), until = new Date(Date.parse(at) + APP_TOMBSTONE_DAYS * 86_400_000).toISOString();
  const targets = JSON.stringify(repositories);
  const closureOrigin = `history-deletion-account-${crypto.randomUUID()}`;
  const selected = { sql: "SELECT json_extract(value,'$.repositoryId') FROM json_each(?)", values: [targets] };
  // The admission revisions remain unchanged until the joined repository update. A new setting/reconsent, changed ownership
  // or a newly linked plan refuses the whole set, rather than deleting the other repositories first.
  const guardFor = completed => ({ sql: `NOT EXISTS (SELECT 1 FROM json_each(?) t
      LEFT JOIN repositories r ON r.repository_id=json_extract(t.value,'$.repositoryId')
      LEFT JOIN installations i ON i.installation_id=r.installation_id
      WHERE r.repository_id IS NULL OR r.settings_revision<>json_extract(t.value,'$.revision')${completed ? '+1' : ''}
        ${completed ? 'OR r.history_consent_origin IS NOT ?' : ''} OR i.account_id IS NOT ?
        OR r.access_state<>'available' OR r.state IN ('removed','offboarding') OR i.state<>'active'
        OR EXISTS (SELECT 1 FROM deletion_tombstones WHERE scope='repository:' || r.repository_id AND reapply_until>?))
    AND NOT EXISTS (SELECT 1 FROM commercial_links WHERE product_account=? AND state='active')
    AND EXISTS (SELECT 1 FROM browser_sessions WHERE session_hash=? AND user_id=? AND revoked_at IS NULL AND expires_at>?)`,
    values: [targets, ...(completed ? [closureOrigin] : []), userId, at, userId, sessionHash, userId, at] });
  const guard = guardFor(false);
  const app = new D1AppStore(database, { now: () => at });
  const manage = new D1ManageStore(database, { now: () => at });
  const participation = new D1ParticipationStore(database, { now: () => at });
  const auth = new D1AuthorizationStore(database, { now: () => at });
  // Keep the initiating session live as the transaction's admission lease until the final statement. The final
  // guard proves this request advanced every target, including when another request had already changed a revision.
  const [endSessions, ...endAuthorization] = auth.revokeAuthorizationStatements(userId, { guard, sessionGuard: guardFor(true) });
  const statement = (sql, ...values) => database.prepare(`${sql} AND (${guard.sql})`).bind(...values, ...guard.values);
  const results = await database.batch([
    database.prepare(`SELECT (${guard.sql}) AS admitted`).bind(...guard.values),
    ...app.historyRemovalStatementsForRepositories(selected, guard),
    statement(`DELETE FROM app_checks WHERE repository_id IN (${selected.sql})`, targets),
    statement(`DELETE FROM repairs WHERE repository_id IN (${selected.sql})`, targets),
    statement(`UPDATE history_jobs SET state='stopped', reason='history-deleted', lease_until=NULL, wake_at=NULL,
      updated_at=?, finished_at=? WHERE repository_id IN (${selected.sql}) AND state IN ('queued','running','paused')`, at, at, targets),
    statement(`DELETE FROM repository_selections WHERE repository_id IN (${selected.sql})`, targets),
    database.prepare(`INSERT INTO deletion_tombstones(scope,deleted_at,reapply_until)
      SELECT 'history:' || repository_id, ?, ? FROM repositories WHERE repository_id IN (${selected.sql}) AND (${guard.sql})
      ON CONFLICT(scope) DO UPDATE SET deleted_at=excluded.deleted_at, reapply_until=MAX(deletion_tombstones.reapply_until,excluded.reapply_until)
      WHERE excluded.deleted_at>=deletion_tombstones.deleted_at`).bind(at, until, targets, ...guard.values),
    ...manage.forgetAccountStatements(userId, guard),
    ...participation.forgetAccountStatements(userId, guard),
    ...endAuthorization,
    statement('DELETE FROM user_service_connections WHERE user_id=?', userId),
    // One settings commit withdraws both consents; ordinary later explicit consent remains a newer revision.
    database.prepare(`WITH admitted AS MATERIALIZED (SELECT json_extract(value,'$.repositoryId') AS repository_id
      FROM json_each(?) WHERE (${guard.sql}))
      UPDATE repositories SET state='pending-enable', execution_consent_origin='dashboard',
      execution_consent_reason='explicitly-disabled', execution_consent_actor_id=?, history_enabled=0,
      history_consent_origin=?, history_consent_reason='explicitly-disabled', history_consent_actor_id=NULL,
      settings_revision=settings_revision+1, updated_at=? WHERE repository_id IN (SELECT repository_id FROM admitted)`)
      .bind(targets, ...guard.values, userId, closureOrigin, at),
    endSessions
  ]);
  if (results[0]?.results?.[0]?.admitted !== 1) throw Object.assign(new Error('Account closure admission changed.'), { code: 'E_ADMISSION_STALE' });
}
