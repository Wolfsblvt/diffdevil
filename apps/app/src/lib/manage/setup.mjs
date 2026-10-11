// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Automatic setup (Business): what a newly granted repository gets, as the namespace's coordinators chose it. The
 * managed runtime calls this when a lifecycle delivery adds repositories to an installation; for each one whose
 * namespace is funded by Business and chose a setup, it links the named policy (writing the policy as the
 * repository's App settings), selects the repository, and enables labels and the check when the chooser declared the
 * one writer for new repositories. History and the pull-request message are never turned on here: each stays a
 * separate choice per repository. A repository that was operated before (re-added after removal) waits for a person,
 * as the admission contract requires. Every outcome is recorded in the administrative record with whose choice it
 * carried out.
 *
 * Who a choice belongs to follows the authority it was made under (D086):
 *
 * - A choice made by a current administrator of the namespace on GitHub (an organisation administrator, or the
 *   personal account itself) is the namespace's setting. It keeps applying after that person leaves the organisation
 *   or stops administering it, until a current administrator or Account administrator changes it or turns it off,
 *   like an organisation-level setting on GitHub. Their authority is read from GitHub again when they choose, change or
 *   turn it off, not at each repository; each repository is set up under the App's own current installation access.
 * - An Account administrator's choice acts for that person. It applies only while their delegation still coordinates
 *   this namespace and reaches the repository, whatever GitHub grants them there (repository administration on GitHub
 *   is a write ceiling, not a coordinating role), and then only where GitHub's calculated permission for them includes
 *   write. That permission is read through the App's own installation (`permissionOf`, Metadata read), looked up by
 *   the account id stored with the choice (so a rename follows the person and a recycled login cannot stand in) and
 *   accepted only when GitHub's answer names that same account. Anything else, including an answer GitHub could not
 *   give, holds that one repository for a person with the reason.
 */
import { validateRepositoryConfiguration } from '../../../../github-app/configuration.mjs';
import { delegationReaches, coordinates } from './people.mjs';
import { fmtDay } from './works.mjs';

/** The authority a choice of automatic setup was saved under. */
export const SETUP_ROLES = Object.freeze({ owner: 'administrator on GitHub', 'account-admin': 'Account administrator' });
/** Who a saved choice belongs to, by the role it was saved under: the namespace itself, or the person who chose it. */
export const SETUP_BELONGS = Object.freeze({ owner: 'namespace', 'account-admin': 'chooser' });
const WRITE = new Set(['admin', 'maintain', 'write']);
const ACCESS_WORDS = Object.freeze({ admin: 'administration', maintain: 'write', write: 'write', triage: 'triage access only', read: 'read access only', none: 'no access' });
const accessWords = permission => ACCESS_WORDS[permission] ?? 'an unrecognised permission';

/** The whole rule, in the words Policies shows under the setup rows. */
export const SETUP_RULE = 'A policy name never turns on history or publication by itself; each is its own choice here. Setup applies only while the namespace is on Business and the GitHub App can reach the new repository. A choice made by an administrator on GitHub is the namespace\'s setting: it keeps applying after they leave or stop administering, until a current administrator or Account administrator changes it or turns it off. A choice made by an Account administrator acts for them, only while they are one and only where GitHub gives them write. Otherwise that repository waits for a person, and Audit says why.';

/** What saving makes the choice, for someone choosing under `role`, in the words the setup form shows before they save. */
export function setupSavingWords(role) {
  return role === 'owner'
    ? 'Saving makes this the namespace\'s setting, shown as chosen by you. It keeps applying if you later leave or stop administering, until a current administrator or Account administrator changes it or turns it off.'
    : 'Saving makes this choice yours as Account administrator: it acts for you, on each new repository only while you are one and GitHub gives you write there.';
}

/**
 * How one coordinator sees a namespace's saved choice: whose it is, in words, and what changing it offers. `viewerRole`
 * is the role this person would choose under (`owner` or `account-admin`). The caller formats and adds the date.
 */
export function presentAutomaticSetup(setup, { viewerId = null, viewerRole = null } = {}) {
  const saving = setupSavingWords(viewerRole);
  if (!setup || (!setup.policyId && !setup.enableExecution)) return { on: false, belongs: null, yours: false, chooser: null, chosen: null, standing: 'Off. New repositories wait for you.', change: 'Set up', saving };
  const yours = Number.isSafeInteger(setup.actorId) && setup.actorId === viewerId;
  const chooser = yours ? 'you' : setup.actorLogin ?? (Number.isSafeInteger(setup.actorId) ? `GitHub user ${setup.actorId}` : 'someone no longer recorded');
  const belongs = SETUP_BELONGS[setup.actorRole] ?? null;
  const chosen = `Chosen by ${chooser}${SETUP_ROLES[setup.actorRole] ? ` as ${SETUP_ROLES[setup.actorRole]}` : ''}`;
  const standing = belongs === 'namespace' ? 'It is the namespace\'s setting: it stays until a current administrator or Account administrator changes it.'
    : belongs === 'chooser' ? `It acts for ${yours ? 'you' : 'them'}, only while ${yours ? 'you are' : 'they are'} Account administrator and can write to the new repository.`
      : 'Who it acts for was not recorded; choose it again.';
  // The button names where saving moves the choice: an Account administrator's save acts for them; an administrator's
  // save over a person-bound choice makes it the namespace's setting.
  const change = viewerRole === 'account-admin' ? (yours && belongs === 'chooser' ? 'Change' : belongs === 'namespace' ? 'Change (acts for you)' : 'Choose it again (acts for you)')
    : belongs === 'namespace' ? 'Change' : 'Choose it again for the namespace';
  return { on: true, belongs, yours, chooser, chosen, standing, change, saving };
}

/**
 * Whether this repository may be set up under the saved choice: `{ ok: true, login }` or `{ ok: false, reason, login }`,
 * with an Account administrator's current GitHub login when GitHub reported it for their account id. The namespace's
 * own setting needs no person's current access here. Never throws.
 */
export async function setupAuthority({ setup, accountId, installationId, repositoryId, manage, permissionOf }) {
  let who = setup.actorLogin ?? (Number.isSafeInteger(setup.actorId) ? `GitHub user ${setup.actorId}` : 'the person who chose it');
  let login = null;
  const held = reason => ({ ok: false, reason: `${reason} The repository waits for a person; nothing was set up.`, login });
  if (!Number.isSafeInteger(setup.actorId) || !Object.hasOwn(SETUP_ROLES, setup.actorRole)) return held('Automatic setup was saved without who chose it and under which role, so whose choice it is cannot be shown. Choose it again.');
  if (SETUP_BELONGS[setup.actorRole] === 'namespace') return { ok: true, login: null };
  const delegation = await manage.delegation(accountId, setup.actorId).catch(() => null);
  if (!coordinates(delegation) || !delegationReaches(delegation, repositoryId)) return held(`${who} chose automatic setup as Account administrator and is no longer one here. Choose it again.`);
  if (typeof permissionOf !== 'function') return held(`This deployment cannot ask GitHub whether ${who}, who chose automatic setup, may act on this repository.`);
  let answer;
  try { answer = await permissionOf({ installationId, repositoryId, userId: setup.actorId }); } catch { answer = { answer: 'unknown' }; }
  if (answer?.answer === 'no-user') return held(`GitHub no longer knows the account of ${who}, who chose automatic setup. Choose it again.`);
  if (answer?.answer === 'absent') return held(`GitHub does not confirm that ${who}, who chose automatic setup, has access to this repository.`);
  if (answer?.answer !== 'present') return held(`GitHub could not be asked whether ${who}, who chose automatic setup, may act on this repository${answer?.code ? ` (${answer.code})` : ''}.`);
  if (answer.user?.id !== setup.actorId) return held(`GitHub's answer names a different account than the one that chose automatic setup (${who}).`);
  login = answer.user.login;
  who = login;
  return WRITE.has(answer.permission) ? { ok: true, login } : held(`GitHub gives ${who}, who chose automatic setup as Account administrator, ${accessWords(answer.permission)} on this repository, not write.`);
}

/** Whose choice an applied setup carried out, in the record's words. */
function appliedAs(setup, login) {
  const who = login ?? setup.actorLogin ?? `GitHub user ${setup.actorId}`;
  return SETUP_BELONGS[setup.actorRole] === 'namespace' ? `It is the namespace's setting, chosen by ${who} as ${SETUP_ROLES.owner} on ${fmtDay(setup.savedAt) ?? 'an unrecorded date'}.`
    : `It acts for ${who} as Account administrator, who can write here on GitHub.`;
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
      const chosen = { belongs: SETUP_BELONGS[setup.actorRole] ?? null, chosenAs: setup.actorRole ?? null, chosenAt: setup.savedAt ?? null };
      const record = (result, reason, detail = null) => manage.recordEvent({ accountId, repositoryId, where, actor, what: 'Automatic setup of a newly granted repository', result, reason, detail }).catch(() => {});
      let plan;
      try { plan = await entitlement.planOfRepository(repositoryId, null); } catch { plan = 'unknown'; }
      if (plan !== 'business') { await record('failed', plan === 'unknown' ? 'The plan funding this namespace could not be established; the repository waits for you.' : 'Automatic setup needs Business; the repository waits for you.'); outcomes.push({ repositoryId, state: 'skipped' }); continue; }
      const admission = await appStore.repositoryAdmission(repositoryId);
      if (!admission || admission.reach.repository !== 'available' || admission.reach.installation !== 'active') { await record('failed', 'The repository is not reachable yet; nothing was set up.'); outcomes.push({ repositoryId, state: 'skipped' }); continue; }
      if (admission.execution.reason !== 'never-enabled') { await record('failed', 'This repository was operated before; it waits for you rather than restarting by itself.'); outcomes.push({ repositoryId, state: 'skipped' }); continue; }
      const authority = await setupAuthority({ setup, accountId, installationId, repositoryId, manage, permissionOf });
      // GitHub reported an Account administrator's current login for their account id: keep the name people see current.
      if (authority.login && authority.login !== setup.actorLogin) await manage.renameSetupChooser(accountId, setup.actorId, authority.login).catch(() => {});
      if (!authority.ok) { await record('failed', authority.reason, { installationId, held: 'chooser-authority', ...chosen }); outcomes.push({ repositoryId, state: 'held' }); continue; }
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
        await record('applied', `${did.join(', ')}. History and the pull-request message stay off until chosen. ${appliedAs(setup, authority.login)}`, { installationId, did, ...chosen });
        outcomes.push({ repositoryId, state: 'applied', did });
      } catch (error) {
        await record('failed', `Stopped after: ${did.join(', ') || 'nothing'} (${typeof error?.code === 'string' ? error.code : 'error'}).`, { installationId, did, ...chosen });
        outcomes.push({ repositoryId, state: 'failed', did });
      }
    }
    return outcomes;
  };
}
