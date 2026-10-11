// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Export what the signed-in person administers, as files usable without diffdevil: per repository the stored App
 * settings and its effective policy over the preset, the namespace defaults, and the retained numeric history where
 * history is on. One repository with `?repository=owner/name`, or everything. Administration is proved per repository
 * through the authorization service; a repository the person cannot administer right now is named, not exported.
 */
import type { APIRoute } from 'astro';
import { protectedHeaders } from '../../../../github-app/authorization.mjs';
import { DEFAULT_SIZE_POLICY, resolveEffectivePolicy } from '../../../../github-app/configuration.mjs';
import { loadManage } from '../../lib/manage/model.mjs';
import { SURVEYS, describeAnswers, surveyOf } from '../../lib/participation/survey.mjs';

export const GET: APIRoute = async ({ url, locals }) => {
  const runtime = locals.app, viewer = locals.viewer, session = locals.session!;
  const model = await loadManage({ viewer, session, runtime });
  const only = url.searchParams.get('repository');
  const repositories = model.namespaces.flatMap((namespace: any) => namespace.repositories.filter((repository: any) => repository.standing && (!only || repository.fullName === only)).map((repository: any) => ({ repository, namespace })));
  const out: any[] = [], refused: string[] = [];
  const defaults: any[] = [];
  for (const namespace of model.namespaces) {
    const namespaceDefault = namespace.accountId === null ? null : await runtime.manage.namespaceDefault(namespace.accountId);
    if (namespaceDefault) defaults.push({ namespace: namespace.login, revision: namespaceDefault.revision, savedAt: namespaceDefault.savedAt, policy: { version: 1, ...namespaceDefault.configuration } });
  }
  for (const { repository, namespace } of repositories) {
    let admission;
    try { admission = (await runtime.auth.readAdmission({ session: session.session, repositoryId: repository.repositoryId })).body; } catch { refused.push(repository.fullName); continue; }
    const stored = admission.configuration.value ?? {};
    let effective: any = null;
    try { effective = resolveEffectivePolicy({ preset: DEFAULT_SIZE_POLICY, ...(stored.repository ? { repository: stored.repository } : {}) }); } catch { effective = null; }
    const history = repository.standing.historyEnabled ? await runtime.appStore.exportHistory(repository.repositoryId) : null;
    const analytical = repository.standing.historyEnabled ? await runtime.appStore.exportAnalytical(repository.repositoryId) : null;
    out.push({ repository: repository.fullName, repositoryId: repository.repositoryId, settings: { revision: admission.revision, execution: admission.execution, history: admission.history, writer: admission.writer, configuration: stored },
      effectivePolicy: effective ? { version: 1, ...effective.document, note: 'App layers over the size@1 preset; the repository\'s own .diffdevil.yml, read on GitHub at execution time, still wins for what it sets.' } : null,
      retainedHistory: history, analyticalRecords: analytical });
  }
  // Business: the named policies, who is named, what new repositories get, and the administrative record of every coordinated namespace.
  const business: any[] = [];
  for (const namespace of model.businessScopes ?? []) {
    if (namespace.accountId === null) continue;
    const policies = (await runtime.manage.linkedPolicies(namespace.accountId)).map((policy: any) => ({ policyId: policy.policyId, name: policy.name, revision: policy.revision, savedAt: policy.savedAt, policy: { version: 1, ...policy.configuration } }));
    const setup = await runtime.manage.automaticSetup(namespace.accountId);
    const people = (await runtime.manage.delegations(namespace.accountId)).map((delegation: any) => ({ login: delegation.login, role: delegation.role, repositories: delegation.repositories, grantedAt: delegation.grantedAt }));
    const record = only ? [] : await runtime.manage.events({ accountIds: [namespace.accountId], limit: 1000 });
    business.push({ namespace: namespace.login, policies, automaticSetup: setup ? { policy: policies.find((policy: any) => policy.policyId === setup.policyId)?.name ?? null, policyId: setup.policyId, enableExecution: setup.enableExecution, writerDeclared: setup.writerDeclared, savedAt: setup.savedAt, chosenBy: { userId: setup.actorId, login: setup.actorLogin, as: setup.actorRole } } : null, people, record });
  }
  // The whole-account export also carries the person's own survey answers and the completion facts diffdevil sent.
  const participation = only ? undefined : (await runtime.participationStore.exportAccount(viewer.userId)).map((entry: any) => ({ ...entry,
    answers: entry.answers ? (SURVEYS[entry.survey as keyof typeof SURVEYS] ? describeAnswers(surveyOf(entry.survey), entry.answers) : entry.answers) : null }));
  const body = { kind: 'diffdevil.manage-export', version: 1, exportedAt: runtime.now(), account: viewer.login, defaults, repositories: out, notAdministered: refused, ...(participation ? { participation } : {}), ...(business.length ? { business } : {}) };
  const name = only ? `diffdevil-${only.replace('/', '-')}-export.json` : `diffdevil-${viewer.login}-export.json`;
  return new Response(JSON.stringify(body, null, 2), { status: 200, headers: { ...protectedHeaders(), 'content-type': 'application/json; charset=utf-8', 'content-disposition': `attachment; filename="${name}"` } });
};
