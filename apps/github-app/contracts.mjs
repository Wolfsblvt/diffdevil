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
    const repositories = event === 'installation_repositories'
      ? (payload.repositories_added ?? []).concat(payload.repositories_removed ?? []).map(item => integer(item?.id, 'repository ID'))
      : [];
    return { kind: APP_QUEUE_KIND, version: APP_QUEUE_VERSION, type: 'lifecycle', event, action: text(payload.action ?? 'unknown', 'action', 80),
      installationId: integer(payload.installation?.id, 'installation ID'), repositories: [...new Set(repositories)], deliveryId: delivery, receivedAt };
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
    ? new Set(['kind', 'version', 'type', 'event', 'action', 'installationId', 'repositories', 'deliveryId', 'receivedAt'])
    : common.type === 'check-rerequest'
      ? new Set(['kind', 'version', 'type', 'event', 'action', 'installationId', 'repositoryId', 'pullRequest', 'checkRun', 'deliveryId', 'receivedAt'])
      : new Set(['kind', 'version', 'type', 'event', 'action', 'installationId', 'repositoryId', 'pullRequest', 'deliveryId', 'receivedAt']);
  if (Object.keys(value).some(key => !permitted.has(key))) throw new TypeError('Queue message contains a prohibited field.');
  if (common.type === 'lifecycle') {
    const repositories = value.repositories === undefined ? [] : value.repositories;
    if (!Array.isArray(repositories) || repositories.length > 100) throw new TypeError('Lifecycle repositories must be a bounded array.');
    return { ...common, repositories: [...new Set(repositories.map(value => integer(value, 'repository ID')))] };
  }
  if (common.type !== 'pull-request' && common.type !== 'check-rerequest') throw new TypeError('Queue message has an unsupported type.');
  const result = { ...common, repositoryId: integer(value.repositoryId, 'repository ID'), pullRequest: integer(value.pullRequest, 'pull request number') };
  return common.type === 'check-rerequest' ? { ...result, checkRun: integer(value.checkRun, 'check run ID') } : result;
}

export function historyProjection(report, effects) {
  const read = measurement => measurement && typeof measurement === 'object' ? {
    status: measurement.status, ...(Number.isSafeInteger(measurement.value) ? { value: measurement.value } : {}),
    ...(Number.isSafeInteger(measurement.minimum) ? { minimum: measurement.minimum } : {}), ...(Number.isSafeInteger(measurement.maximum) ? { maximum: measurement.maximum } : {})
  } : { status: 'unknown' };
  return {
    schemaVersion: 2,
    evidence: report.measurement?.status ?? 'unknown',
    fileSet: { complete: report.fileSet?.complete === true, total: read(report.fileSet?.total) },
    totals: { raw: { added: read(report.totals?.raw?.added), deleted: read(report.totals?.raw?.deleted), churn: read(report.totals?.raw?.churn) },
      lines: { added: read(report.totals?.lines?.added), deleted: read(report.totals?.lines?.deleted), modified: read(report.totals?.lines?.modified), changed: read(report.totals?.lines?.changed) } },
    files: Array.isArray(report.files) ? report.files.slice(0, 5000).map((file, ordinal) => ({ ordinal, raw: { added: read(file?.raw?.added), deleted: read(file?.raw?.deleted), churn: read(file?.raw?.churn) }, lines: { added: read(file?.lines?.added), deleted: read(file?.lines?.deleted), modified: read(file?.lines?.modified), changed: read(file?.lines?.changed) } })) : [],
    effects: effects.map(effect => ({ kind: effect.kind, outcome: effect.outcome, request: effect.request, readback: effect.readback })).slice(0, 100)
  };
}
