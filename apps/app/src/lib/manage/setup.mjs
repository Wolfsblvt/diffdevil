// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Automatic setup (Business): what a newly granted repository gets, as the namespace's administrator chose it. The
 * managed runtime calls this when a lifecycle delivery adds repositories to an installation; for each one whose
 * namespace is funded by Business and chose a setup, it links the named policy (writing the policy as the
 * repository's App settings), selects the repository, and enables labels and the check when the administrator chose
 * that and declared the one writer. History and the pull-request message are never turned on here: each stays a
 * separate choice per repository. A repository that was operated before (re-added after removal) waits for a person,
 * as the admission contract requires. Every outcome is recorded in the administrative record.
 *
 * The setup acts for the person who chose it, under the authority they chose it with, so it checks that authority over
 * each repository it is about to change, at that moment:
 *
 * - An Account administrator's choice acts only while their delegation still coordinates this namespace and reaches
 *   the repository, whatever GitHub grants them there: repository administration on GitHub is a write ceiling, not a
 *   coordinating role, and a removed Account administrator could not link a namespace policy by hand.
 * - Then GitHub's calculated permission for them on that repository, read through the App's own installation
 *   (`permissionOf`, Metadata read), looked up by the account id stored with the choice (so a rename follows the person
 *   and a recycled login cannot stand in for them) and accepted only when GitHub's answer names that same account. An
 *   owner's choice needs administration of the repository; an Account administrator's needs write.
 *
 * Anything else, including an answer GitHub could not give, holds that one repository for a person with the reason.
 * Known limit: the installation's Metadata read shows repository permission, not organisation membership, so an owner
 * whom GitHub demoted in the organisation but who still administers the new repository itself still passes. The
 * saved role says what the choice was made as; it is never presented as proof of current organisation administration.
 */
import { validateRepositoryConfiguration } from '../../../../github-app/configuration.mjs';
import { delegationReaches, coordinates } from './people.mjs';

/** The authority a choice of automatic setup was saved under. */
export const SETUP_ROLES = Object.freeze({ owner: 'administrator on GitHub', 'account-admin': 'Account administrator' });
const WRITE = new Set(['admin', 'maintain', 'write']);
const ACCESS_WORDS = Object.freeze({ admin: 'administration', maintain: 'write', write: 'write', triage: 'triage access only', read: 'read access only', none: 'no access' });
const accessWords = permission => ACCESS_WORDS[permission] ?? 'an unrecognised permission';

/**
 * Whether the chooser may still set this repository up: `{ ok: true, login }` or `{ ok: false, reason, login }`, with
 * the chooser's current GitHub login when GitHub reported it for their account id. Never throws.
 */
export async function chooserAuthority({ setup, accountId, installationId, repositoryId, manage, permissionOf }) {
  let who = setup.actorLogin ?? (Number.isSafeInteger(setup.actorId) ? `GitHub user ${setup.actorId}` : 'the person who chose it');
  let login = null;
  const held = reason => ({ ok: false, reason: `${reason} The repository waits for a person; nothing was set up.`, login });
  if (!Number.isSafeInteger(setup.actorId) || !Object.hasOwn(SETUP_ROLES, setup.actorRole)) return held('Automatic setup was saved without who chose it and under which role, so their authority here cannot be checked. Choose it again.');
  if (setup.actorRole === 'account-admin') {
    const delegation = await manage.delegation(accountId, setup.actorId).catch(() => null);
    if (!coordinates(delegation) || !delegationReaches(delegation, repositoryId)) return held(`${who} chose automatic setup as Account administrator and is no longer one here. Choose it again.`);
  }
  if (typeof permissionOf !== 'function') return held(`This deployment cannot ask GitHub whether ${who}, who chose automatic setup, may act on this repository.`);
  let answer;
  try { answer = await permissionOf({ installationId, repositoryId, userId: setup.actorId }); } catch { answer = { answer: 'unknown' }; }
  if (answer?.answer === 'no-user') return held(`GitHub no longer knows the account of ${who}, who chose automatic setup. Choose it again.`);
  if (answer?.answer === 'absent') return held(`GitHub does not confirm that ${who}, who chose automatic setup, has access to this repository.`);
  if (answer?.answer !== 'present') return held(`GitHub could not be asked whether ${who}, who chose automatic setup, may act on this repository${answer?.code ? ` (${answer.code})` : ''}.`);
  if (answer.user?.id !== setup.actorId) return held(`GitHub's answer names a different account than the one that chose automatic setup (${who}).`);
  login = answer.user.login;
  who = login;
  if (setup.actorRole === 'owner') return answer.permission === 'admin' ? { ok: true, login }
    : held(`${who} chose automatic setup as an administrator of this namespace on GitHub, and GitHub gives them ${accessWords(answer.permission)} on this repository, not administration.`);
  return WRITE.has(answer.permission) ? { ok: true, login } : held(`GitHub gives ${who}, who chose automatic setup as Account administrator, ${accessWords(answer.permission)} on this repository, not write.`);
}

export function createAutomaticSetup({ appStore, manage, namespaceOf, entitlement, permissionOf }) {
  return async ({ installationId, repositoryIds }) => {
    const outcomes = [];
    for (const repositoryId of repositoryIds) {
      let accountId;
      try { accountId = await namespaceOf({ repositoryId }); } catch { accountId = undefined; }
      if (!Number.isSafeInteger(accountId) || accountId <= 0) continue;
      const setup = await manage.automaticSetup(accountId);
      if (!setup || (!setup.policyId && !setup.enableExecution)) continue;
      const actor = { kind: 'automation', id: setup.actorId, login: setup.actorLogin ?? null };
      const where = `repository ${repositoryId}`;
      const record = (result, reason, detail = null) => manage.recordEvent({ accountId, repositoryId, where, actor, what: 'Automatic setup of a newly granted repository', result, reason, detail }).catch(() => {});
      let plan;
      try { plan = await entitlement.planOfRepository(repositoryId, null); } catch { plan = 'unknown'; }
      if (plan !== 'business') { await record('failed', plan === 'unknown' ? 'The plan funding this namespace could not be established; the repository waits for you.' : 'Automatic setup needs Business; the repository waits for you.'); outcomes.push({ repositoryId, state: 'skipped' }); continue; }
      const admission = await appStore.repositoryAdmission(repositoryId);
      if (!admission || admission.reach.repository !== 'available' || admission.reach.installation !== 'active') { await record('failed', 'The repository is not reachable yet; nothing was set up.'); outcomes.push({ repositoryId, state: 'skipped' }); continue; }
      if (admission.execution.reason !== 'never-enabled') { await record('failed', 'This repository was operated before; it waits for you rather than restarting by itself.'); outcomes.push({ repositoryId, state: 'skipped' }); continue; }
      const authority = await chooserAuthority({ setup, accountId, installationId, repositoryId, manage, permissionOf });
      // GitHub reported the chooser's current login for their account id: keep the name people see current.
      if (authority.login && authority.login !== setup.actorLogin) await manage.renameSetupChooser(accountId, setup.actorId, authority.login).catch(() => {});
      if (!authority.ok) { await record('failed', authority.reason, { installationId, held: 'chooser-authority' }); outcomes.push({ repositoryId, state: 'held' }); continue; }
      const did = [];
      try {
        let revision = admission.revision;
        const policy = setup.policyId ? await manage.linkedPolicy(setup.policyId) : null;
        if (setup.policyId && !policy) { await record('failed', 'The chosen policy no longer exists; nothing was linked.'); }
        if (policy) {
          const validated = validateRepositoryConfiguration({ repository: policy.configuration });
          const after = await appStore.updateRepositoryAdmission(repositoryId, { revision, configuration: { value: validated.value, policyId: validated.policyId }, origin: 'automatic-setup' });
          if (!after) throw Object.assign(new Error('stale'), { code: 'E_ADMISSION_STALE' });
          revision = after.revision;
          await manage.linkRepository(repositoryId, policy.policyId, setup.actorId);
          await manage.markApplied(repositoryId, policy.policyId, policy.revision);
          did.push(`linked to ${policy.name} (revision ${policy.revision})`);
        }
        await manage.select(repositoryId, setup.actorId);
        did.push('selected');
        if (setup.enableExecution && setup.writerDeclared) {
          const after = await appStore.updateRepositoryAdmission(repositoryId, { revision, execution: true, writer: { confidence: 'administrator-declared' }, origin: 'automatic-setup', actorId: setup.actorId, executionConsentChanged: true });
          if (!after) throw Object.assign(new Error('stale'), { code: 'E_ADMISSION_STALE' });
          did.push('labels and the check enabled');
        } else if (setup.enableExecution) did.push('not enabled: the one-writer declaration is missing');
        await record('applied', `${did.join(', ')}. History and the pull-request message stay off until chosen.`, { installationId, did });
        outcomes.push({ repositoryId, state: 'applied', did });
      } catch (error) {
        await record('failed', `Stopped after: ${did.join(', ') || 'nothing'} (${typeof error?.code === 'string' ? error.code : 'error'}).`, { installationId, did });
        outcomes.push({ repositoryId, state: 'failed', did });
      }
    }
    return outcomes;
  };
}
