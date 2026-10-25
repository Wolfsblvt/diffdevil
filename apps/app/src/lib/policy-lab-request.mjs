// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import { policyLab } from './policy-lab.mjs';
import { readViewState, periodOf } from './scope.mjs';

/** One authorized repository and its existing retained population, regardless of edition. */
export async function readPolicyLab({ locals, url, input = null }) {
  const runtime = locals.app, state = readViewState(url);
  const repository = locals.viewer.repositories.find(item => item.fullName.toLowerCase() === state.s.toLowerCase());
  if (!repository?.standing?.historyReadable) throw Object.assign(new Error('E_POLICY_LAB_ACCESS'), { code: 'E_POLICY_LAB_ACCESS' });
  const to = input?.basis?.to ?? runtime.now();
  const from = input?.basis?.from ?? new Date(Date.parse(to) - periodOf(state).days * 86_400_000).toISOString();
  // A carried basis pins a window; it never expands the selected period or reaches future observations.
  if (Date.parse(to) > Date.parse(runtime.now()) || Date.parse(to) - Date.parse(from) !== periodOf(state).days * 86_400_000) {
    throw Object.assign(new Error('E_POLICY_LAB_WINDOW'), { code: 'E_POLICY_LAB_WINDOW' });
  }
  const canRead = async () => {
    const [current, history] = await Promise.all([locals.session.reads.repository(repository.fullName),
      runtime.appStore.historySettings(repository.repositoryId, { independentExecution: true })]);
    return current?.repositoryId === repository.repositoryId && history?.readable === true;
  };
  return policyLab({ repository, from, to, policies: runtime.policies, store: runtime.appStore, input, canRead });
}
