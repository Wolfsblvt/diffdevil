// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Operating continuity: the selected allowances as the runtime itself applies them, and the saved choice of what stays
 * becoming the actual consequence of a plan reduction.
 *
 * `standing(repositoryId)` answers, without a signed-in viewer, whether a repository may execute and collect history
 * now. It resolves the repository's allowance scope from recorded facts (the installation account and its kind, the
 * funding relationship, the Free connection), counts that scope with the same `capacityOf` the console renders, and
 * applies the scope owner's saved choice. Unknown is not false: an unestablished plan, account or visibility leaves the
 * repository operating unchanged, because "nothing is changed until it is" (states.mjs). A Community deployment
 * without allowances is never limited here; its operator keeps that control.
 *
 * `applyDueChoice(userId)` turns a saved choice into durable state once the authoritative plan has actually moved
 * below the plan the choice was made on: the Free connection, unchosen private repositories stopped and released, an
 * unchosen organisation's repositories stopped, while already-published Business settings stay intact. It never picks for the administrator; without a choice the
 * operating standing simply holds whatever is over the limit.
 */
import { capacityOf } from './states.mjs';

const RANK = Object.freeze({ free: 0, pro: 1, business: 2 });
const PLAN_LABEL = Object.freeze({ free: 'Free', pro: 'Pro', business: 'Business' });
const ALLOWED = Object.freeze({ execution: 'allowed', history: 'allowed' });

const limited = allowances => allowances.free.private !== null || allowances.free.publicHistory !== null || allowances.proOrganisation.private !== null;
const allow = reason => ({ ...ALLOWED, reason });
const hold = (reason, history = 'held') => ({ execution: 'held', history, reason });

export function createOperating({ database, store, appStore, manage, entitlement, commercial, namespaceOf, allowances, now }) {
  const statement = (sql, ...values) => database.prepare(sql).bind(...values);
  const accountKind = async accountId => (await statement('SELECT account_kind FROM installations WHERE account_id=? AND account_kind IS NOT NULL LIMIT 1', accountId).first())?.account_kind ?? null;
  /** A Free organisation pending its connection: the organisation a reduced Free account chose to keep. */
  const chosenFreeConnection = async organisationId => {
    const row = await statement("SELECT user_id FROM plan_change_choices WHERE json_extract(choice_json, '$.organisation')=? LIMIT 1", organisationId).first();
    if (!row) return null;
    return (await entitlement.planOfViewer({ userId: row.user_id })) === 'free' ? row.user_id : null;
  };
  const repositoriesOf = async accountIds => {
    if (!accountIds.length) return [];
    const rows = await statement(`SELECT r.repository_id, r.full_name FROM repositories r JOIN installations i ON i.installation_id=r.installation_id WHERE i.account_id IN (${accountIds.map(() => '?').join(', ')})`, ...accountIds).all();
    const ids = (rows.results ?? []).map(row => row.repository_id);
    const standings = await store.repositoryStandings(ids);
    return (rows.results ?? []).filter(row => standings.has(row.repository_id)).map(row => {
      const standing = standings.get(row.repository_id);
      const [owner = '', name = ''] = String(row.full_name ?? '').split('/');
      // Unknown visibility is not counted as private: the runtime cannot hold what it cannot establish.
      return { repositoryId: row.repository_id, fullName: row.full_name ?? String(row.repository_id), owner, name, private: standing.visibility === 'private', visibilityKnown: standing.visibility !== null, standing };
    });
  };
  const freeOrganisationOf = async userId => (await manage.freeConnection(userId))?.organisationId ?? null;

  /** The allowance scope of one account: `{ plan, kind, accounts, owner }`, or `{ unknown }` / `{ noPlan }`. */
  async function scopeOf(accountId, plan) {
    const funding = commercial?.fundingScope ? await commercial.fundingScope({ accountId }) : { kind: 'none' };
    if (plan === 'pro' || plan === 'business') {
      if (funding.kind === 'organisation') return { plan, kind: 'org', accounts: [accountId], owner: funding.subscriber };
      if (funding.kind === 'personal') return { plan, kind: 'user', accounts: [accountId], owner: accountId };
      return { unknown: 'funding-unestablished' };
    }
    // Free: the personal account pools with its one connected organisation; an organisation joins the pool of the account that connected it.
    const connected = await manage.freeConnectionOf(accountId);
    const owner = connected?.userId ?? await chosenFreeConnection(accountId);
    if (owner) return { plan, kind: 'user', pooled: true, accounts: [owner, accountId], owner };
    const kind = funding.kind === 'personal' ? 'user' : await accountKind(accountId);
    // Before the saved choice is persisted, the organisation it keeps already pools with the reduced account.
    if (kind === 'user') { const organisation = await freeOrganisationOf(accountId) ?? (await manage.planChoice(accountId))?.organisation ?? null; return { plan, kind: 'user', pooled: true, accounts: organisation ? [accountId, organisation] : [accountId], owner: accountId }; }
    if (kind === 'organization') return { noPlan: true };
    return { unknown: 'account-unestablished' };
  }

  /** Whether one repository may execute and collect history under its scope's allowance right now. */
  async function standing(repositoryId) {
    if (!limited(allowances)) return allow('not-limited');
    const accountId = await namespaceOf({ repositoryId });
    if (!Number.isSafeInteger(accountId) || accountId <= 0) return allow('account-unestablished');
    const plan = await entitlement.planOfRepository(repositoryId, null);
    if (!(plan in RANK)) return allow('plan-unestablished');
    const scope = await scopeOf(accountId, plan);
    if (scope.unknown) return allow(scope.unknown);
    if (scope.noPlan) return hold('no-plan');
    const repositories = await repositoriesOf([...new Set(scope.accounts)]);
    const subject = repositories.find(repository => repository.repositoryId === repositoryId);
    if (!subject || !subject.visibilityKnown) return allow('visibility-unestablished');
    const choice = scope.owner ? await manage.planChoice(scope.owner) : null;
    const capacity = capacityOf({ plan: PLAN_LABEL[plan], kind: scope.kind, pooled: scope.pooled === true, repositories }, { allowances, keep: choice?.keep ?? null });
    if (subject.private && capacity.waiting.some(repository => repository.repositoryId === repositoryId)) return hold(capacity.chosen ? 'not-chosen' : 'over-allowance-unchosen');
    if (!subject.private && capacity.publicHistory.over) return { execution: 'allowed', history: 'held', reason: 'public-history-over' };
    return allow('within-allowance');
  }

  /** Apply a saved choice once the authoritative plan has moved below the plan it was made on. Returns the outcome, or null. */
  async function applyDueChoice(userId) {
    const choice = await manage.planChoice(userId);
    if (!choice || choice.appliedAt || !(choice.from in RANK)) return null;
    const plan = await entitlement.planOfViewer({ userId });
    if (!(plan in RANK) || RANK[plan] >= RANK[choice.from]) return null;
    const outcome = { plan, kept: [], stopped: [], released: [], connected: null, at: now() };
    const keep = new Set(choice.keep ?? []);
    if (plan === 'free' && Number.isSafeInteger(choice.organisation)) outcome.connected = await manage.connectFree(userId, choice.organisation) ? choice.organisation : null;
    const accounts = [...new Set([userId, ...(choice.accounts ?? [])])];
    const inFreePool = account => account === userId || account === outcome.connected;
    const stop = async repository => { await appStore.setRepositoryExecution(repository.repositoryId, { enabled: false, origin: 'plan-change' }); outcome.stopped.push(repository.repositoryId); };
    const limit = plan === 'free' ? allowances.free.private : allowances.proOrganisation.private;
    // Private repositories counted per lower-plan scope: the Free pool, or each organisation on Pro (Pro personal has no limit).
    const scopes = new Map();
    for (const repository of await repositoriesOf(accounts)) {
      const standingNow = repository.standing;
      if (!(standingNow.selected || standingNow.executionActive)) continue;
      const account = standingNow.accountId;
      if (plan === 'free' && !inFreePool(account)) { if (standingNow.executionActive) await stop(repository); continue; }
      if (!repository.private || limit === null || (plan !== 'free' && account === userId)) continue;
      const key = plan === 'free' ? 'pool' : account;
      scopes.set(key, [...(scopes.get(key) ?? []), repository]);
    }
    // The choice decides only where the lower plan is actually exceeded; a scope that fits keeps running untouched.
    for (const counted of scopes.values()) {
      if (counted.length <= limit) continue;
      for (const repository of counted) {
        if (keep.has(repository.repositoryId)) { outcome.kept.push(repository.repositoryId); continue; }
        if (repository.standing.executionActive) await stop(repository);
        await manage.deselect(repository.repositoryId);
        outcome.released.push(repository.repositoryId);
      }
    }
    // Published policy bytes already are repository settings and survive a reduction unchanged.
    await manage.markPlanChoiceApplied(userId, outcome);
    return outcome;
  }

  /** The scheduled maintenance: every saved choice whose reduction has taken effect. */
  async function maintain() {
    const rows = await statement('SELECT user_id FROM plan_change_choices WHERE applied_at IS NULL').all();
    let applied = 0;
    for (const row of rows.results ?? []) { try { if (await applyDueChoice(row.user_id)) applied += 1; } catch { /* the next pass or the person's next visit tries again */ } }
    return { applied };
  }

  return { standing, applyDueChoice, maintain, limited: limited(allowances) };
}
