// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Delegated administration (Business): a namespace's current GitHub administrators name other GitHub users as
 * diffdevil administrators here. An Account administrator manages diffdevil across the namespace; a Repository
 * administrator manages the repositories named for them. Either one acts on a repository only while their own current
 * GitHub access to it includes write: the authorization service proves it at every action, and a delegate GitHub has
 * narrowed to read is refused there, never carried by the App's own access. Automatic setup an Account administrator
 * chose acts for them and checks that same ceiling at each repository it sets up; one an administrator on GitHub chose
 * is the namespace's setting. Naming and removing people stay with the namespace's
 * GitHub administrators. Funding a plan makes nobody an administrator, and a delegate never funds, changes the plan or
 * sees invoices.
 */

/** The rule every delegate meets, in the words People and Audit use. */
export const WRITE_CEILING = 'A named administrator manages diffdevil on a repository only while they can write to it on GitHub.';

export const ROLES = Object.freeze({
  'account-admin': Object.freeze({ label: 'Account administrator', scope: 'the whole namespace',
    can: 'policies, publishing, automatic setup, repositories, history, export, deletion, on each repository they can write to on GitHub',
    cannot: 'act where GitHub gives them read access only, name or remove people, fund, change the plan, or see invoices' }),
  'repository-admin': Object.freeze({ label: 'Repository administrator', scope: 'the repositories named for them',
    can: 'configure, preview, enable, stop, turn history on or off, export, delete history, on those of them they can write to on GitHub',
    cannot: 'act where GitHub gives them read access only, publish policies, choose automatic setup, name or remove people, fund, change the plan, or see invoices' })
});
export const ROLE_KEYS = Object.freeze(Object.keys(ROLES));

/** Whether a delegation reaches one repository: an Account administrator reaches every repository of the namespace, a Repository administrator the named ones. */
export function delegationReaches(delegation, repositoryId) {
  if (!delegation) return false;
  if (delegation.role === 'account-admin') return true;
  return Array.isArray(delegation.repositories) && delegation.repositories.includes(repositoryId);
}

/** Whether a delegation covers namespace-level coordination (policies, publishing, automatic setup). People stay with GitHub administrators. */
export const coordinates = delegation => delegation?.role === 'account-admin';

/** The GitHub login grammar; a delegate is named by login and resolved to the numeric account GitHub reports. */
export const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/u;

/** The delegations of one namespace as the People page lists them, newest last, with what each one reaches. */
export function presentDelegations(delegations, { repositories = [], viewerId = null, logins = new Map() } = {}) {
  const names = new Map(repositories.map(repository => [repository.repositoryId, repository.name]));
  return delegations.map(delegation => {
    const role = ROLES[delegation.role] ?? { label: delegation.role, scope: '', can: '', cannot: '' };
    const named = Array.isArray(delegation.repositories) ? delegation.repositories.map(id => names.get(id) ?? `repository ${id}`) : null;
    return { ...delegation, you: delegation.userId === viewerId, roleLabel: role.label, scope: named ? named.join(', ') || 'no repository named yet' : role.scope, can: role.can, cannot: role.cannot,
      grantedByLogin: delegation.grantedBy === viewerId ? 'you' : Number.isSafeInteger(delegation.grantedBy) ? logins.get(delegation.grantedBy) ?? `GitHub user ${delegation.grantedBy}` : 'unknown' };
  });
}
