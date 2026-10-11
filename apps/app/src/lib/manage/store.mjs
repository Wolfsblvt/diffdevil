// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * D1 access for the Manage console's own product facts (migration 0012): explicit repository selection, the Free
 * account's one connected organisation, the short-lived departure behind the return from Wolfsblvt Works, the choice
 * of what stays when a paid plan reduces, the Pro namespace default, and the browser-session facts the Account page
 * shows; and the Business coordination facts (migration 0013): named linked policies with their links and
 * publications, automatic setup, delegated administration and the administrative record. Provider reach, execution
 * consent and history consent stay in the managed App's own store; nothing here changes them.
 */

const DEPARTURE_MS = 2 * 60 * 60_000;
const parse = text => { try { return JSON.parse(text); } catch { return undefined; } };

export class D1ManageStore {
  constructor(database, { now = () => new Date().toISOString() } = {}) {
    this.database = database;
    this.now = now;
  }
  statement(sql, ...values) { return this.database.prepare(sql).bind(...values); }

  /** Selecting a reachable repository holds an allowance slot before execution is enabled; it writes nothing to GitHub. */
  async select(repositoryId, actorId = null) {
    await this.statement('INSERT INTO repository_selections (repository_id, selected_at, actor_id) VALUES (?, ?, ?) ON CONFLICT(repository_id) DO NOTHING', repositoryId, this.now(), actorId).run();
  }
  async deselect(repositoryId) { await this.statement('DELETE FROM repository_selections WHERE repository_id=?', repositoryId).run(); }
  async selection(repositoryId) { return this.statement('SELECT selected_at, actor_id FROM repository_selections WHERE repository_id=?', repositoryId).first(); }

  /** A Free account connects one organisation to its pooled allowance; an organisation is connected on one account at a time. */
  async freeConnection(userId) {
    const row = await this.statement('SELECT organisation_id, since FROM free_connections WHERE user_id=?', userId).first();
    return row ? { organisationId: row.organisation_id, since: row.since } : null;
  }
  async freeConnectionOf(organisationId) {
    const row = await this.statement('SELECT user_id, since FROM free_connections WHERE organisation_id=?', organisationId).first();
    return row ? { userId: row.user_id, since: row.since } : null;
  }
  async connectFree(userId, organisationId) {
    const taken = await this.freeConnectionOf(organisationId);
    if (taken && taken.userId !== userId) return false;
    await this.statement('INSERT INTO free_connections (user_id, organisation_id, since) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET organisation_id=excluded.organisation_id, since=excluded.since', userId, organisationId, this.now()).run();
    return true;
  }
  async disconnectFree(userId) { await this.statement('DELETE FROM free_connections WHERE user_id=?', userId).run(); }

  /** What the person was doing when they left for Works, kept for two hours so the return can say what it is waiting for. */
  async recordDeparture(userId, { purpose, fromPath = null, snapshot = null }) {
    const now = this.now();
    await this.statement('INSERT INTO works_departures (user_id, purpose, from_path, snapshot_json, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET purpose=excluded.purpose, from_path=excluded.from_path, snapshot_json=excluded.snapshot_json, created_at=excluded.created_at, expires_at=excluded.expires_at',
      userId, purpose, fromPath, snapshot === null ? null : JSON.stringify(snapshot), now, new Date(Date.parse(now) + DEPARTURE_MS).toISOString()).run();
  }
  async departure(userId) {
    const row = await this.statement('SELECT purpose, from_path, snapshot_json, created_at FROM works_departures WHERE user_id=? AND expires_at > ?', userId, this.now()).first();
    return row ? { purpose: row.purpose, fromPath: row.from_path, snapshot: row.snapshot_json ? parse(row.snapshot_json) ?? null : null, at: row.created_at } : null;
  }
  async clearDeparture(userId) { await this.statement('DELETE FROM works_departures WHERE user_id=?', userId).run(); }

  /** The administrator's choice of what stays on the lower plan; applied by the lifecycle, never guessed. */
  async planChoice(userId) {
    const row = await this.statement('SELECT choice_json, saved_at, applied_at, outcome_json FROM plan_change_choices WHERE user_id=?', userId).first();
    return row ? { ...(parse(row.choice_json) ?? {}), savedAt: row.saved_at, appliedAt: row.applied_at ?? null, outcome: row.applied_at ? parse(row.outcome_json) ?? null : null } : null;
  }
  /** Saving a new choice replaces an earlier one, including one already applied: it applies at the next reduction. */
  async savePlanChoice(userId, choice) {
    await this.statement('INSERT INTO plan_change_choices (user_id, choice_json, saved_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET choice_json=excluded.choice_json, saved_at=excluded.saved_at, applied_at=NULL, outcome_json=NULL', userId, JSON.stringify(choice), this.now()).run();
  }
  /** The reduction took effect and the choice became durable state; what it did is kept so Plan & funding can say so. */
  async markPlanChoiceApplied(userId, outcome) {
    await this.statement('UPDATE plan_change_choices SET applied_at=?, outcome_json=? WHERE user_id=? AND applied_at IS NULL', this.now(), JSON.stringify(outcome), userId).run();
  }
  async clearPlanChoice(userId) { await this.statement('DELETE FROM plan_change_choices WHERE user_id=?', userId).run(); }

  /** One reusable default per namespace (Pro): the account layer of the effective policy. Saving is compare-and-set on its revision. */
  async namespaceDefault(accountId) {
    const row = await this.statement('SELECT revision, configuration_json, policy_id, saved_at, actor_id FROM namespace_defaults WHERE account_id=?', accountId).first();
    return row ? { accountId, revision: row.revision, configuration: parse(row.configuration_json) ?? {}, policyId: row.policy_id ?? null, savedAt: row.saved_at, actorId: row.actor_id ?? null } : null;
  }
  async namespaceDefaults(accountIds) {
    const out = new Map();
    for (const accountId of accountIds) { const value = await this.namespaceDefault(accountId); if (value) out.set(accountId, value); }
    return out;
  }
  async saveNamespaceDefault(accountId, { configuration, policyId = null, actorId = null, expectedRevision }) {
    const now = this.now();
    if (expectedRevision === 0) {
      const result = await this.statement('INSERT INTO namespace_defaults (account_id, revision, configuration_json, policy_id, saved_at, actor_id) VALUES (?, 1, ?, ?, ?, ?) ON CONFLICT(account_id) DO NOTHING', accountId, JSON.stringify(configuration), policyId, now, actorId).run();
      return (result.meta?.changes ?? 0) === 1 ? 1 : undefined;
    }
    const result = await this.statement('UPDATE namespace_defaults SET revision=revision + 1, configuration_json=?, policy_id=?, saved_at=?, actor_id=? WHERE account_id=? AND revision=?', JSON.stringify(configuration), policyId, now, actorId, accountId, expectedRevision).run();
    return (result.meta?.changes ?? 0) === 1 ? expectedRevision + 1 : undefined;
  }
  async removeNamespaceDefault(accountId) { await this.statement('DELETE FROM namespace_defaults WHERE account_id=?', accountId).run(); }

  /** A repository's explicit adoption of its namespace's Pro default: which revision, when and by whom. */
  async adoption(repositoryId) {
    const row = await this.statement('SELECT account_id, default_revision, applied_at, actor_id FROM repository_default_adoptions WHERE repository_id=?', repositoryId).first();
    return row ? { accountId: row.account_id, revision: row.default_revision, appliedAt: row.applied_at, actorId: row.actor_id ?? null } : null;
  }
  async recordAdoption(repositoryId, { accountId, revision, actorId = null }) {
    await this.statement('INSERT INTO repository_default_adoptions (repository_id, account_id, default_revision, applied_at, actor_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT(repository_id) DO UPDATE SET account_id=excluded.account_id, default_revision=excluded.default_revision, applied_at=excluded.applied_at, actor_id=excluded.actor_id',
      repositoryId, accountId, revision, this.now(), actorId).run();
  }

  /**
   * Facts the administrator's own GitHub reads establish and the runtime's allowance check needs without a viewer:
   * a repository's visibility and an installation account's kind. Only a recorded value that differs is rewritten.
   */
  async recordVisibility(repositoryId, isPrivate) {
    if (typeof isPrivate !== 'boolean') return;
    await this.statement("UPDATE repositories SET visibility=? WHERE repository_id=? AND (visibility IS NULL OR visibility<>?)", isPrivate ? 'private' : 'public', repositoryId, isPrivate ? 'private' : 'public').run();
  }
  async recordAccountKind(accountId, kind) {
    if (!['user', 'organization'].includes(kind)) return;
    await this.statement('UPDATE installations SET account_kind=? WHERE account_id=? AND account_kind IS NULL', kind, accountId).run();
  }

  /** Browser sessions of one account: the Account page says how many exist and can end them all. */
  async sessionCount(userId) {
    const row = await this.statement('SELECT COUNT(*) AS sessions FROM browser_sessions WHERE user_id=? AND revoked_at IS NULL AND expires_at > ?', userId, this.now()).first();
    return row?.sessions ?? 0;
  }
  async revokeUserSessions(userId) {
    await this.statement('UPDATE browser_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL', this.now(), userId).run();
  }

  /** A closed account keeps no disconnect preference either; the row exists only to keep service checks off for a living account. */
  async forgetPreference(userId) { await this.statement('DELETE FROM user_service_connections WHERE user_id=?', userId).run(); }

  /** Closing an account removes its own Manage facts; repositories and organisations keep theirs (including the record of what this person did there). */
  async forgetAccount(userId) {
    const personal = (await this.statement('SELECT policy_id FROM linked_policies WHERE account_id=?', userId).all()).results ?? [];
    await this.database.batch([
      this.statement('DELETE FROM free_connections WHERE user_id=?', userId),
      this.statement('DELETE FROM works_departures WHERE user_id=?', userId),
      this.statement('DELETE FROM plan_change_choices WHERE user_id=?', userId),
      this.statement('DELETE FROM namespace_defaults WHERE account_id=?', userId),
      this.statement('DELETE FROM delegations WHERE user_id=? OR account_id=?', userId, userId),
      this.statement('DELETE FROM automatic_setup WHERE account_id=?', userId),
      ...personal.flatMap(row => [this.statement('DELETE FROM policy_links WHERE policy_id=?', row.policy_id), this.statement('DELETE FROM policy_publication_results WHERE publication_id IN (SELECT publication_id FROM policy_publications WHERE policy_id=?)', row.policy_id), this.statement('DELETE FROM policy_publications WHERE policy_id=?', row.policy_id)]),
      this.statement('DELETE FROM linked_policies WHERE account_id=?', userId),
      this.statement('DELETE FROM administrative_events WHERE account_id=?', userId)
    ]);
  }

  // ── Business: named linked policies (migration 0013) ──

  /** The named policies of one namespace, oldest first. */
  async linkedPolicies(accountId) {
    const rows = (await this.statement('SELECT * FROM linked_policies WHERE account_id=? ORDER BY created_at, name', accountId).all()).results ?? [];
    return rows.map(policyRow);
  }
  async linkedPolicy(policyId) {
    const row = await this.statement('SELECT * FROM linked_policies WHERE policy_id=?', policyId).first();
    return row ? policyRow(row) : null;
  }
  /** Create a named policy as revision 1; `undefined` when the namespace already has a policy of that name. */
  async createLinkedPolicy({ accountId, name, configuration, enginePolicyId = null, actorId = null }) {
    const now = this.now(), policyId = opaqueId();
    const result = await this.statement('INSERT INTO linked_policies (policy_id, account_id, name, revision, configuration_json, engine_policy_id, created_at, saved_at, actor_id) SELECT ?, ?, ?, 1, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM linked_policies WHERE account_id=? AND name=?)', policyId, accountId, name, JSON.stringify(configuration), enginePolicyId, now, now, actorId, accountId, name).run();
    return (result.meta?.changes ?? 0) === 1 ? policyId : undefined;
  }
  /** Save the next revision, compare-and-set on the revision the editor loaded; `undefined` when it moved. */
  async saveLinkedPolicy(policyId, { configuration, enginePolicyId = null, actorId = null, expectedRevision, name }) {
    const result = name === undefined
      ? await this.statement('UPDATE linked_policies SET revision=revision + 1, configuration_json=?, engine_policy_id=?, saved_at=?, actor_id=? WHERE policy_id=? AND revision=?', JSON.stringify(configuration), enginePolicyId, this.now(), actorId, policyId, expectedRevision).run()
      : await this.statement('UPDATE linked_policies SET revision=revision + 1, configuration_json=?, engine_policy_id=?, saved_at=?, actor_id=?, name=? WHERE policy_id=? AND revision=? AND NOT EXISTS (SELECT 1 FROM linked_policies other WHERE other.account_id=linked_policies.account_id AND other.name=? AND other.policy_id<>?)', JSON.stringify(configuration), enginePolicyId, this.now(), actorId, name, policyId, expectedRevision, name, policyId).run();
    return (result.meta?.changes ?? 0) === 1 ? expectedRevision + 1 : undefined;
  }
  /** Removing a policy unlinks its repositories (their current settings stay as plain repository settings) and forgets its publications. */
  async removeLinkedPolicy(policyId) {
    await this.database.batch([
      this.statement('DELETE FROM policy_links WHERE policy_id=?', policyId),
      this.statement('DELETE FROM policy_publication_results WHERE publication_id IN (SELECT publication_id FROM policy_publications WHERE policy_id=?)', policyId),
      this.statement('DELETE FROM policy_publications WHERE policy_id=?', policyId),
      this.statement('UPDATE automatic_setup SET policy_id=NULL WHERE policy_id=?', policyId),
      this.statement('DELETE FROM linked_policies WHERE policy_id=?', policyId)
    ]);
  }
  async policyLink(repositoryId) {
    const row = await this.statement('SELECT policy_id, linked_at, actor_id, applied_revision FROM policy_links WHERE repository_id=?', repositoryId).first();
    return row ? { policyId: row.policy_id, linkedAt: row.linked_at, actorId: row.actor_id ?? null, appliedRevision: row.applied_revision ?? null } : null;
  }
  /** The revision a linked repository's settings last took from its policy; a later revision waits for publishing. */
  async markApplied(repositoryId, policyId, revision) { await this.statement('UPDATE policy_links SET applied_revision=? WHERE repository_id=? AND policy_id=?', revision, repositoryId, policyId).run(); }
  /** `Map<repositoryId, { policyId, linkedAt }>` for many repositories at once. */
  async policyLinksFor(repositoryIds) {
    const out = new Map();
    for (const repositoryId of repositoryIds) { const link = await this.policyLink(repositoryId); if (link) out.set(repositoryId, link); }
    return out;
  }
  async policyLinks(policyId) {
    const rows = (await this.statement('SELECT repository_id, linked_at, actor_id, applied_revision FROM policy_links WHERE policy_id=? ORDER BY linked_at', policyId).all()).results ?? [];
    return rows.map(row => ({ repositoryId: row.repository_id, linkedAt: row.linked_at, actorId: row.actor_id ?? null, appliedRevision: row.applied_revision ?? null }));
  }
  async linkRepository(repositoryId, policyId, actorId = null) {
    await this.statement('INSERT INTO policy_links (repository_id, policy_id, linked_at, actor_id, applied_revision) VALUES (?, ?, ?, ?, NULL) ON CONFLICT(repository_id) DO UPDATE SET policy_id=excluded.policy_id, linked_at=excluded.linked_at, actor_id=excluded.actor_id, applied_revision=NULL', repositoryId, policyId, this.now(), actorId).run();
  }
  async unlinkRepository(repositoryId) { await this.statement('DELETE FROM policy_links WHERE repository_id=?', repositoryId).run(); }

  /** One publication of one revision to its linked repositories; every repository starts as `requested`. */
  async createPublication({ policyId, revision, actorId = null, repositoryIds }) {
    const now = this.now(), publicationId = opaqueId();
    await this.database.batch([
      this.statement('INSERT INTO policy_publications (publication_id, policy_id, revision, requested_at, actor_id) VALUES (?, ?, ?, ?, ?)', publicationId, policyId, revision, now, actorId),
      ...repositoryIds.map(repositoryId => this.statement("INSERT INTO policy_publication_results (publication_id, repository_id, state, attempts, updated_at) VALUES (?, ?, 'requested', 0, ?)", publicationId, repositoryId, now))
    ]);
    return publicationId;
  }
  async saveResult(publicationId, repositoryId, { state, reason = null, detail = null }) {
    await this.statement('UPDATE policy_publication_results SET state=?, reason=?, detail_json=?, attempts=attempts + 1, updated_at=? WHERE publication_id=? AND repository_id=?', state, reason, detail === null ? null : JSON.stringify(detail), this.now(), publicationId, repositoryId).run();
  }
  async publication(publicationId) {
    const row = await this.statement('SELECT * FROM policy_publications WHERE publication_id=?', publicationId).first();
    if (!row) return null;
    const results = (await this.statement('SELECT * FROM policy_publication_results WHERE publication_id=? ORDER BY repository_id', publicationId).all()).results ?? [];
    return { publicationId, policyId: row.policy_id, revision: row.revision, requestedAt: row.requested_at, actorId: row.actor_id ?? null,
      results: results.map(result => ({ repositoryId: result.repository_id, state: result.state, reason: result.reason ?? null, detail: result.detail_json ? parse(result.detail_json) ?? null : null, attempts: result.attempts, updatedAt: result.updated_at })) };
  }
  /** The latest publication of a policy, with its per-repository results. */
  async latestPublication(policyId) {
    const row = await this.statement('SELECT publication_id FROM policy_publications WHERE policy_id=? ORDER BY requested_at DESC, publication_id DESC LIMIT 1', policyId).first();
    return row ? this.publication(row.publication_id) : null;
  }

  /** What a newly granted repository of this namespace gets (Business), or null when nothing was chosen. */
  async automaticSetup(accountId) {
    const row = await this.statement('SELECT * FROM automatic_setup WHERE account_id=?', accountId).first();
    return row ? { accountId, policyId: row.policy_id ?? null, enableExecution: row.enable_execution === 1, writerDeclared: row.writer_declared === 1, savedAt: row.saved_at, actorId: row.actor_id ?? null, actorLogin: row.actor_login ?? null, actorRole: row.actor_role ?? null } : null;
  }
  async saveAutomaticSetup(accountId, { policyId = null, enableExecution = false, writerDeclared = false, actorId = null, actorLogin = null, actorRole = null }) {
    await this.statement('INSERT INTO automatic_setup (account_id, policy_id, enable_execution, writer_declared, saved_at, actor_id, actor_login, actor_role) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(account_id) DO UPDATE SET policy_id=excluded.policy_id, enable_execution=excluded.enable_execution, writer_declared=excluded.writer_declared, saved_at=excluded.saved_at, actor_id=excluded.actor_id, actor_login=excluded.actor_login, actor_role=excluded.actor_role', accountId, policyId, enableExecution ? 1 : 0, writerDeclared ? 1 : 0, this.now(), actorId, actorLogin, actorRole).run();
  }
  /** Keep the chooser's shown login current when GitHub reports a rename for the same account id. */
  async renameSetupChooser(accountId, actorId, login) { await this.statement('UPDATE automatic_setup SET actor_login=? WHERE account_id=? AND actor_id=?', login, accountId, actorId).run(); }
  /** The repositories the saved choice held since it was saved (the chooser's authority did not reach them): the count and the newest reason. */
  async setupHeld(accountId, since) {
    const row = await this.statement("SELECT COUNT(*) AS held, MAX(at) AS latest FROM administrative_events WHERE account_id=? AND at>=? AND json_extract(detail_json, '$.held')='chooser-authority'", accountId, since).first();
    if (!row?.held) return { count: 0, latestAt: null, reason: null };
    const latest = await this.statement("SELECT reason FROM administrative_events WHERE account_id=? AND at=? AND json_extract(detail_json, '$.held')='chooser-authority' ORDER BY event_id DESC LIMIT 1", accountId, row.latest).first();
    return { count: row.held, latestAt: row.latest, reason: latest?.reason ?? null };
  }
  async removeAutomaticSetup(accountId) { await this.statement('DELETE FROM automatic_setup WHERE account_id=?', accountId).run(); }

  // ── Business: delegated administration ──

  async delegations(accountId) {
    const rows = (await this.statement('SELECT * FROM delegations WHERE account_id=? ORDER BY granted_at, login', accountId).all()).results ?? [];
    return rows.map(delegationRow);
  }
  /** Every namespace in which this person is a delegate. */
  async delegationsOf(userId) {
    const rows = (await this.statement('SELECT * FROM delegations WHERE user_id=? ORDER BY granted_at', userId).all()).results ?? [];
    return rows.map(delegationRow);
  }
  async delegation(accountId, userId) {
    const row = await this.statement('SELECT * FROM delegations WHERE account_id=? AND user_id=?', accountId, userId).first();
    return row ? delegationRow(row) : null;
  }
  async grantDelegation({ accountId, userId, login, role, repositories = null, grantedBy = null }) {
    await this.statement('INSERT INTO delegations (account_id, user_id, login, role, repositories_json, granted_at, granted_by) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(account_id, user_id) DO UPDATE SET login=excluded.login, role=excluded.role, repositories_json=excluded.repositories_json, granted_at=excluded.granted_at, granted_by=excluded.granted_by', accountId, userId, login, role, repositories === null ? null : JSON.stringify(repositories), this.now(), grantedBy).run();
  }
  async revokeDelegation(accountId, userId) { await this.statement('DELETE FROM delegations WHERE account_id=? AND user_id=?', accountId, userId).run(); }

  // ── Business: the administrative record ──

  /** One administrative event as it happened. `actor` is `{ kind: 'person' | 'automation' | 'github', id?, login? }`; an unknown actor is recorded as such. */
  async recordEvent({ at = this.now(), accountId = null, repositoryId = null, where, actor, what, result, reason = null, detail = null }) {
    await this.statement('INSERT INTO administrative_events (at, account_id, repository_id, where_text, actor_kind, actor_id, actor_login, what, result, reason, detail_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      at, accountId, repositoryId, where, actor?.kind ?? 'unknown', actor?.id ?? null, actor?.login ?? null, what, result, reason, detail === null ? null : JSON.stringify(detail)).run();
  }
  /** The newest events of these namespaces, newest first. */
  async events({ accountIds, limit = 200 }) {
    if (!accountIds.length) return [];
    const marks = accountIds.map(() => '?').join(', ');
    const rows = (await this.statement(`SELECT * FROM administrative_events WHERE account_id IN (${marks}) ORDER BY at DESC, event_id DESC LIMIT ?`, ...accountIds, limit).all()).results ?? [];
    return rows.map(row => ({ eventId: row.event_id, at: row.at, accountId: row.account_id, repositoryId: row.repository_id, where: row.where_text, actor: { kind: row.actor_kind, id: row.actor_id ?? null, login: row.actor_login ?? null }, what: row.what, result: row.result, reason: row.reason ?? null, detail: row.detail_json ? parse(row.detail_json) ?? null : null }));
  }

  /**
   * Whether the runtime is working on this repository: an active delivery lease, claimed repair or open history job.
   * A policy publication queues behind that work so live pull requests keep priority; it never interrupts it.
   */
  async repositoryBusy(repositoryId) {
    const now = this.now();
    const delivery = await this.statement("SELECT 1 AS busy FROM deliveries WHERE repository_id=? AND state='active' AND lease_until > ? LIMIT 1", repositoryId, now).first();
    if (delivery?.busy) return { busy: true, reason: 'a pull request is being evaluated' };
    const repair = await this.statement("SELECT repair_kind FROM repairs WHERE repository_id=? AND state='active' LIMIT 1", repositoryId).first();
    if (repair) return { busy: true, reason: repair.repair_kind === 'history-publication' ? 'history is being re-read' : 'a repair is running' };
    const job = await this.statement("SELECT 1 AS busy FROM history_jobs WHERE repository_id=? AND state IN ('queued', 'running', 'paused') LIMIT 1", repositoryId).first();
    if (job?.busy) return { busy: true, reason: 'a history job is in progress' };
    return { busy: false, reason: null };
  }
}

function policyRow(row) { return { policyId: row.policy_id, accountId: row.account_id, name: row.name, revision: row.revision, configuration: parse(row.configuration_json) ?? {}, enginePolicyId: row.engine_policy_id ?? null, createdAt: row.created_at, savedAt: row.saved_at, actorId: row.actor_id ?? null }; }
function delegationRow(row) { return { accountId: row.account_id, userId: row.user_id, login: row.login, role: row.role, repositories: row.repositories_json ? parse(row.repositories_json) ?? null : null, grantedAt: row.granted_at, grantedBy: row.granted_by ?? null }; }
function opaqueId() { return crypto.randomUUID().replaceAll('-', '').slice(0, 24); }
