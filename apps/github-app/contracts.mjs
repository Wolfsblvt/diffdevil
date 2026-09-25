// SPDX-License-Identifier: AGPL-3.0-only

export const WEBHOOK_BODY_LIMIT = 1024 * 1024;
export const WORKER_RESULT_LIMIT = 4 * 1024 * 1024;
export const APP_QUEUE_KIND = 'diffdevil.github-app-queue';
export const APP_QUEUE_VERSION = 1;

const pullRequestActions = new Set(['opened', 'reopened', 'synchronize', 'edited']);
const lifecycleEvents = new Set(['installation', 'installation_repositories']);

function integer(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer.`);
  return value;
}

function text(value, name, maximum = 200) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) throw new TypeError(`${name} must be a non-empty string within ${maximum} characters.`);
  return value;
}

/** Parse only identifiers needed after webhook admission. Everything else stays transient. */
export function normalizeWebhookEvent(event, payload, receivedAt = new Date().toISOString(), deliveryId) {
  text(event, 'event', 80);
  const delivery = text(deliveryId, 'delivery ID', 200);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new TypeError('Webhook payload must be an object.');
  if (lifecycleEvents.has(event)) {
    const added = event === 'installation_repositories' ? payload.repositories_added ?? [] : payload.repositories ?? [];
    const removed = event === 'installation_repositories' ? payload.repositories_removed ?? [] : [];
    const addedRepositories = [...new Set(added.map(item => integer(item?.id, 'repository ID')))];
    const removedRepositories = [...new Set(removed.map(item => integer(item?.id, 'repository ID')))];
    return { kind: APP_QUEUE_KIND, version: APP_QUEUE_VERSION, type: 'lifecycle', event, action: text(payload.action ?? 'unknown', 'action', 80),
      installationId: integer(payload.installation?.id, 'installation ID'), addedRepositories, removedRepositories, deliveryId: delivery, receivedAt };
  }
  const installationId = integer(payload.installation?.id, 'installation ID');
  const repositoryId = integer(payload.repository?.id, 'repository ID');
  if (event === 'pull_request' && pullRequestActions.has(payload.action)) {
    return { kind: APP_QUEUE_KIND, version: APP_QUEUE_VERSION, type: 'pull-request', event, action: payload.action, installationId, repositoryId,
      pullRequest: integer(payload.pull_request?.number, 'pull request number'), deliveryId: delivery, receivedAt };
  }
  if (event === 'check_run' && payload.action === 'rerequested') {
    const pullRequest = payload.check_run?.pull_requests?.[0]?.number;
    if (!Number.isSafeInteger(pullRequest) || pullRequest < 1) return undefined;
    return { kind: APP_QUEUE_KIND, version: APP_QUEUE_VERSION, type: 'check-rerequest', event, action: payload.action, installationId, repositoryId,
      pullRequest, checkRun: integer(payload.check_run?.id, 'check run ID'), deliveryId: delivery, receivedAt };
  }
  return undefined;
}

/** Reject synthetic queue messages rather than promoting arbitrary JSON into a provider effect. */
export function readQueueEnvelope(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Queue message must be an object.');
  if (value.kind !== APP_QUEUE_KIND || value.version !== APP_QUEUE_VERSION) throw new TypeError('Queue message does not use the supported envelope.');
  const common = { kind: APP_QUEUE_KIND, version: APP_QUEUE_VERSION, type: text(value.type, 'type', 40), event: text(value.event, 'event', 80),
    action: text(value.action, 'action', 80), installationId: integer(value.installationId, 'installation ID'), deliveryId: text(value.deliveryId, 'delivery ID', 200), receivedAt: text(value.receivedAt, 'receivedAt', 40) };
  const permitted = common.type === 'lifecycle'
    ? new Set(['kind', 'version', 'type', 'event', 'action', 'installationId', 'addedRepositories', 'removedRepositories', 'deliveryId', 'receivedAt'])
    : common.type === 'check-rerequest'
      ? new Set(['kind', 'version', 'type', 'event', 'action', 'installationId', 'repositoryId', 'pullRequest', 'checkRun', 'deliveryId', 'receivedAt'])
      : new Set(['kind', 'version', 'type', 'event', 'action', 'installationId', 'repositoryId', 'pullRequest', 'deliveryId', 'receivedAt']);
  if (Object.keys(value).some(key => !permitted.has(key))) throw new TypeError('Queue message contains a prohibited field.');
  if (common.type === 'lifecycle') {
    const readRepositories = (value, name) => {
      const repositories = value === undefined ? [] : value;
      if (!Array.isArray(repositories) || repositories.length > 100) throw new TypeError(`${name} must be a bounded array.`);
      return [...new Set(repositories.map(value => integer(value, 'repository ID')))];
    };
    return { ...common, addedRepositories: readRepositories(value.addedRepositories, 'Added lifecycle repositories'), removedRepositories: readRepositories(value.removedRepositories, 'Removed lifecycle repositories') };
  }
  if (common.type !== 'pull-request' && common.type !== 'check-rerequest') throw new TypeError('Queue message has an unsupported type.');
  const result = { ...common, repositoryId: integer(value.repositoryId, 'repository ID'), pullRequest: integer(value.pullRequest, 'pull request number') };
  return common.type === 'check-rerequest' ? { ...result, checkRun: integer(value.checkRun, 'check run ID') } : result;
}

export function historyProjection(report, effects) {
  const read = measurement => measurement && typeof measurement === 'object' ? {
    status: measurement.status, ...(Number.isFinite(measurement.value) ? { value: measurement.value } : {}),
    ...(Number.isFinite(measurement.minimum) ? { minimum: measurement.minimum } : {}), ...(Number.isFinite(measurement.maximum) ? { maximum: measurement.maximum } : {})
  } : { status: 'unknown' };
  const reference = value => typeof value === 'string' && /^[A-Za-z0-9._-]{1,80}$/u.test(value) ? value : undefined;
  const numericMap = values => Object.entries(values ?? {}).flatMap(([key, value]) => reference(key) === undefined ? [] : [{ ref: key, result: read(value) }]);
  const scopeResults = Object.entries(report.scopes ?? {}).flatMap(([key, scope]) => reference(key) === undefined ? [] : [{ ref: key,
    fileSet: { complete: scope.fileSet?.complete === true, total: read(scope.fileSet?.total) },
    totals: { raw: { churn: read(scope.totals?.raw?.churn) }, lines: { changed: read(scope.totals?.lines?.changed) }, files: { included: read(scope.totals?.files?.included) } } }]);
  const bandResults = Object.entries(report.bands ?? {}).flatMap(([key, band]) => reference(key) === undefined ? [] : [{ ref: key, status: band?.status === 'resolved' ? 'resolved' : 'unknown', id: reference(band?.id) }]);
  const ruleResults = Object.entries(report.rules ?? {}).flatMap(([key, rule]) => reference(key) === undefined ? [] : [{ ref: key,
    disposition: ['matched', 'unmatched', 'held', 'fallback'].includes(rule?.disposition) ? rule.disposition : 'held',
    decision: rule?.decision?.status === 'exact' ? rule.decision.value === true : undefined,
    band: reference(rule?.band?.id) }]);
  return {
    schemaVersion: 4,
    engineVersion: 'diffdevil-engine-v1',
    reportVersion: 'diffdevil-report-v1',
    metricVersion: 'diffdevil-metrics-v1',
    source: { base: reference(report.source?.base), head: reference(report.source?.head), comparison: reference(report.source?.comparisonId) },
    evidence: report.measurement?.status ?? 'unknown',
    fileSet: { complete: report.fileSet?.complete === true, total: read(report.fileSet?.total), observed: read(report.totals?.files?.observed), included: read(report.totals?.files?.included), excluded: read(report.totals?.files?.excluded), omitted: read(report.totals?.files?.omitted), binary: read(report.totals?.files?.binary), unmeasurable: read(report.totals?.files?.unmeasurable) },
    totals: { raw: { added: read(report.totals?.raw?.added), deleted: read(report.totals?.raw?.deleted), churn: read(report.totals?.raw?.churn) },
      lines: { added: read(report.totals?.lines?.added), deleted: read(report.totals?.lines?.deleted), modified: read(report.totals?.lines?.modified), changed: read(report.totals?.lines?.changed) } },
    configuredResults: numericMap(report.metrics).map(value => ({ metric: value.ref, result: value.result })),
    scopes: scopeResults, bands: bandResults, rules: ruleResults,
    gaps: [report.fileSet?.complete === true ? null : 'file-set-incomplete', report.measurement?.status === 'exact' ? null : 'measurement-not-exact'].filter(Boolean),
    files: Array.isArray(report.files) ? report.files.map((file, ordinal) => ({ ordinal, changeType: reference(file?.changeType) ?? 'unknown', material: file?.kind === 'text' ? 'text' : file?.kind === 'binary' ? 'binary' : 'other', applicability: reference(file?.applicability) ?? 'unknown', inclusion: file?.included === true ? 'included' : file?.included === false ? 'excluded' : 'unknown', evidence: reference(file?.measurement?.status) ?? 'unknown', raw: { added: read(file?.raw?.added), deleted: read(file?.raw?.deleted), churn: read(file?.raw?.churn) }, lines: { added: read(file?.lines?.added), deleted: read(file?.lines?.deleted), modified: read(file?.lines?.modified), changed: read(file?.lines?.changed) } })) : [],
    effects: effects.map(effect => ({ kind: reference(effect.kind) ?? 'unknown', rule: reference(effect.rule), band: reference(effect.band), desired: reference(effect.desired), outcome: reference(effect.outcome) ?? 'unknown', request: reference(effect.request) ?? 'unknown', readback: reference(effect.readback) ?? 'unknown' })),
    publication: { state: 'complete' }
  };
}
