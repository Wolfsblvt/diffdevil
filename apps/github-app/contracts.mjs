// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0

export const WEBHOOK_BODY_LIMIT = 1024 * 1024;
export const WORKER_RESULT_LIMIT = 4 * 1024 * 1024;
export const APP_QUEUE_KIND = 'diffdevil.github-app-queue';
export const APP_QUEUE_VERSION = 1;

const pullRequestActions = new Set(['opened', 'reopened', 'synchronize', 'edited', 'closed', 'ready_for_review', 'converted_to_draft']);
const lifecycleEvents = new Set(['installation', 'installation_repositories']);

function integer(value, name) {
  if (!Number.isSafeInteger(value) || value < 1) throw new TypeError(`${name} must be a positive integer.`);
  return value;
}

function text(value, name, maximum = 200) {
  if (typeof value !== 'string' || value.length === 0 || value.length > maximum) throw new TypeError(`${name} must be a non-empty string within ${maximum} characters.`);
  return value;
}

/**
 * The installation's numeric GitHub account is the namespace a commercial subscription may fund. Its kind (a personal
 * account or an organisation) decides which allowance scope it belongs to; an unrecognised type stays unknown.
 */
const ACCOUNT_KINDS = Object.freeze({ User: 'user', Organization: 'organization' });
export const ACCOUNT_KIND_VALUES = Object.freeze(['user', 'organization']);
function accountIdentity(value, type) {
  if (!Number.isSafeInteger(value) || value <= 0) return {};
  return { accountId: value, ...(ACCOUNT_KINDS[type] ? { accountKind: ACCOUNT_KINDS[type] } : {}) };
}
/** Repository visibility counts against the private allowance; it is an identifier-level fact, not repository content. */
function visibility(repository) { return typeof repository?.private === 'boolean' ? { repositoryPrivate: repository.private } : {}; }

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
      installationId: integer(payload.installation?.id, 'installation ID'), ...accountIdentity(payload.installation?.account?.id, payload.installation?.account?.type), addedRepositories, removedRepositories, deliveryId: delivery, receivedAt };
  }
  const installationId = integer(payload.installation?.id, 'installation ID');
  const repositoryId = integer(payload.repository?.id, 'repository ID');
  // An installed repository's owner is the installation account.
  const account = { ...accountIdentity(payload.repository?.owner?.id, payload.repository?.owner?.type), ...visibility(payload.repository) };
  if (event === 'pull_request' && pullRequestActions.has(payload.action)) {
    return { kind: APP_QUEUE_KIND, version: APP_QUEUE_VERSION, type: 'pull-request', event, action: payload.action, installationId, ...account, repositoryId,
      pullRequest: integer(payload.pull_request?.number, 'pull request number'), deliveryId: delivery, receivedAt };
  }
  if (event === 'check_run' && payload.action === 'rerequested') {
    const pullRequest = payload.check_run?.pull_requests?.[0]?.number;
    if (!Number.isSafeInteger(pullRequest) || pullRequest < 1) return undefined;
    return { kind: APP_QUEUE_KIND, version: APP_QUEUE_VERSION, type: 'check-rerequest', event, action: payload.action, installationId, ...account, repositoryId,
      pullRequest, checkRun: integer(payload.check_run?.id, 'check run ID'), deliveryId: delivery, receivedAt };
  }
  // A direct default-branch push can change the trusted policy without a merged PR. Its refresh is keyed by the pushed
  // commit, which is also a merged PR's merge commit, so both routes to one change are one refresh.
  if (event === 'push' && typeof payload.repository?.default_branch === 'string' && payload.ref === `refs/heads/${payload.repository.default_branch}`
    && payload.deleted !== true && typeof payload.after === 'string' && commitSha.test(payload.after) && pushMayChangePolicy(payload)) {
    return briefRefreshEnvelope({ installationId, ...account, repositoryId, targets: 'open', cause: 'policy', causeId: `policy-${payload.after}`, receivedAt });
  }
  return undefined;
}

/** The repository file whose default-branch content is the trusted policy. */
export const POLICY_PATH = '.diffdevil.yml';
/** Why open PRs' briefs are evaluated again without their own provider event. */
export const BRIEF_REFRESH_CAUSES = Object.freeze(['neighbour', 'settings', 'policy']);
/** At most this many PRs are named by one refresh message; `open` enumerates every open PR through a cursor instead. */
export const BRIEF_REFRESH_TARGETS = 500;
const causeIdentity = /^[A-Za-z0-9._-]{1,120}$/u;

function refreshTargets(value) {
  if (value === 'open') return 'open';
  if (!Array.isArray(value) || value.length === 0 || value.length > BRIEF_REFRESH_TARGETS) throw new TypeError('Brief refresh targets must be "open" or a bounded list of pull requests.');
  return [...new Set(value.map(number => integer(number, 'pull request number')))].sort((a, b) => a - b);
}
function refreshPart(value) {
  // Parts are not capped: a chain ends when every due PR has settled, never because pacing made it long.
  if (!Number.isSafeInteger(value) || value < 0) throw new TypeError('Brief refresh part is out of range.');
  return value;
}
/** Where an `open` refresh stands: PRs numbered above `after` are still due, `carried` PRs at or below it are due again. */
function openCursor(targets, { after, page, carried }) {
  if (targets !== 'open') {
    if (after !== undefined || page !== undefined || carried !== undefined) throw new TypeError('Only an open brief refresh carries a cursor.');
    return {};
  }
  const cursor = {};
  if (after !== undefined && after !== 0) {
    if (!Number.isSafeInteger(after) || after < 0) throw new TypeError('Brief refresh cursor must be a pull request number.');
    cursor.after = after;
  }
  if (page !== undefined && page !== 1) cursor.page = integer(page, 'listing page');
  if (carried !== undefined) {
    if (!Array.isArray(carried) || carried.length > BRIEF_REFRESH_TARGETS) throw new TypeError('Carried brief refresh targets must be a bounded list.');
    if (carried.length) cursor.carried = [...new Set(carried.map(number => integer(number, 'pull request number')))].sort((a, b) => a - b);
  }
  return cursor;
}

/**
 * A request to evaluate open PRs' briefs again because something they describe changed elsewhere: a neighbouring PR,
 * the repository's settings or its trusted policy. It names the PRs, or every open PR (`open`), by identifier only.
 * Executing it evaluates a bounded run of them through the ordinary delivery path, each under its own derived delivery
 * identity and execution lease, sharing one in-memory read of the open PRs' files; the rest continue in the next
 * `part`. An `open` refresh walks every open PR in number order: `after` is the last number reached (`page` the listing
 * page it was on), and `carried` names reached PRs that must run again. Its identities are derived from the cause, so
 * a repeated cause is the same deliveries.
 */
export function briefRefreshEnvelope({ installationId, accountId, repositoryId, targets, cause, causeId, part = 0, after, page, carried, receivedAt = new Date().toISOString() }) {
  if (!BRIEF_REFRESH_CAUSES.includes(cause)) throw new TypeError('Brief refresh cause is not supported.');
  if (typeof causeId !== 'string' || !causeIdentity.test(causeId)) throw new TypeError('Brief refresh cause identity must be a bounded identifier.');
  integer(repositoryId, 'repository ID');
  const named = refreshTargets(targets);
  return { kind: APP_QUEUE_KIND, version: APP_QUEUE_VERSION, type: 'brief-refresh', event: 'brief-refresh', action: cause, installationId: integer(installationId, 'installation ID'),
    ...accountIdentity(accountId), repositoryId, targets: named, ...openCursor(named, { after, page, carried }), causeId, part: refreshPart(part),
    deliveryId: `brief-refresh-part:${cause}:${causeId}:${repositoryId}:${part}`, receivedAt };
}

/** The delivery identity of one PR's refresh within a cause: the same for every part and every repeat of that cause. */
export function briefRefreshTarget(envelope, pullRequest) {
  const { kind, version, type, event, action, installationId, accountId, repositoryId, causeId, receivedAt } = envelope;
  return { kind, version, type, event, action, installationId, ...accountIdentity(accountId), repositoryId, pullRequest: integer(pullRequest, 'pull request number'),
    deliveryId: `brief-refresh:${action}:${causeId}:${repositoryId}:${pullRequest}`, receivedAt };
}

/**
 * A request to capture the current default-branch sizes of the files a repository's retained history knows, caused
 * by one published analytical record (`causeId` is that delivery, `pullRequest` its PR). Part 0 pins the branch
 * `revision` it finds and the time `since` which the chain's observations follow; later parts carry both and capture
 * only the known paths still lacking an observation at that revision since then, so a part that runs again repeats
 * nothing. It carries identifiers only, never a path.
 */
export function historyCaptureEnvelope({ installationId, accountId, repositoryId, pullRequest, causeId, part = 0, revision, since, receivedAt = new Date().toISOString() }) {
  if (typeof causeId !== 'string' || !causeIdentity.test(causeId)) throw new TypeError('History capture cause identity must be a bounded identifier.');
  if (!Number.isSafeInteger(part) || part < 0) throw new TypeError('History capture part is out of range.');
  const pinned = revision !== undefined || since !== undefined;
  if (pinned !== part > 0 || (pinned && (typeof revision !== 'string' || !commitSha.test(revision)
    || typeof since !== 'string' || !Number.isFinite(Date.parse(since)) || new Date(since).toISOString() !== since))) throw new TypeError('A continued history capture carries exactly its revision and start.');
  integer(repositoryId, 'repository ID');
  return { kind: APP_QUEUE_KIND, version: APP_QUEUE_VERSION, type: 'history-capture', event: 'history-capture', action: 'capture', installationId: integer(installationId, 'installation ID'),
    ...accountIdentity(accountId), repositoryId, pullRequest: integer(pullRequest, 'pull request number'), causeId, part, ...(pinned ? { revision, since } : {}),
    deliveryId: `history-capture:${causeId}:${repositoryId}:${part}`, receivedAt };
}

const commitSha = /^[0-9a-f]{40,64}$/u;
/** GitHub's push payload lists at most this many commits; a longer push cannot show that it left the policy alone. */
const PUSH_COMMITS_LISTED = 2048;
/**
 * A push to the default branch that may have changed the trusted policy: one listed commit touches it, or the push
 * was forced or its commit list is incomplete, so absence cannot be shown. Only the decision leaves the payload.
 */
function pushMayChangePolicy(payload) {
  if (payload.forced === true || !Array.isArray(payload.commits) || payload.commits.length >= PUSH_COMMITS_LISTED) return true;
  return payload.commits.some(commit => ['added', 'modified', 'removed'].some(list => Array.isArray(commit?.[list]) && commit[list].includes(POLICY_PATH)));
}

/** The two kinds of durable background history work (docs/app-management.md#inspect-history-processing). */
export const HISTORY_JOB_KINDS = Object.freeze(['import', 'recalculate']);
const jobIdentity = /^[A-Za-z0-9-]{8,80}$/u;

/**
 * One step of a durable history job. The job's progress and cursor live in D1, never in the message: the message only
 * names the job and the step it continues, so a lost, delayed or duplicated message cannot replay or fork the work.
 */
export function historyJobEnvelope({ installationId, repositoryId, jobId, kind, sequence, receivedAt = new Date().toISOString() }) {
  if (!HISTORY_JOB_KINDS.includes(kind)) throw new TypeError('History job kind is not supported.');
  if (typeof jobId !== 'string' || !jobIdentity.test(jobId)) throw new TypeError('History job identity must be a bounded identifier.');
  if (!Number.isSafeInteger(sequence) || sequence < 0) throw new TypeError('History job sequence must be a non-negative integer.');
  return { kind: APP_QUEUE_KIND, version: APP_QUEUE_VERSION, type: 'history-job', event: 'history-job', action: kind, installationId: integer(installationId, 'installation ID'),
    repositoryId: integer(repositoryId, 'repository ID'), jobId, sequence, deliveryId: `history-job:${jobId}:${sequence}`, receivedAt };
}

/** Reject synthetic queue messages rather than promoting arbitrary JSON into a provider effect. */
export function readQueueEnvelope(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Queue message must be an object.');
  if (value.kind !== APP_QUEUE_KIND || value.version !== APP_QUEUE_VERSION) throw new TypeError('Queue message does not use the supported envelope.');
  const common = { kind: APP_QUEUE_KIND, version: APP_QUEUE_VERSION, type: text(value.type, 'type', 40), event: text(value.event, 'event', 80),
    action: text(value.action, 'action', 80), installationId: integer(value.installationId, 'installation ID'), deliveryId: text(value.deliveryId, 'delivery ID', 200), receivedAt: text(value.receivedAt, 'receivedAt', 40) };
  const permitted = common.type === 'lifecycle'
    ? new Set(['kind', 'version', 'type', 'event', 'action', 'installationId', 'accountId', 'accountKind', 'addedRepositories', 'removedRepositories', 'deliveryId', 'receivedAt'])
    : common.type === 'history-job'
      ? new Set(['kind', 'version', 'type', 'event', 'action', 'installationId', 'repositoryId', 'jobId', 'sequence', 'deliveryId', 'receivedAt'])
      : common.type === 'check-rerequest'
      ? new Set(['kind', 'version', 'type', 'event', 'action', 'installationId', 'accountId', 'accountKind', 'repositoryId', 'repositoryPrivate', 'pullRequest', 'checkRun', 'deliveryId', 'receivedAt'])
      : common.type === 'brief-refresh'
        ? new Set(['kind', 'version', 'type', 'event', 'action', 'installationId', 'accountId', 'accountKind', 'repositoryId', 'targets', 'after', 'page', 'carried', 'causeId', 'part', 'deliveryId', 'receivedAt'])
        : common.type === 'history-capture'
          ? new Set(['kind', 'version', 'type', 'event', 'action', 'installationId', 'accountId', 'accountKind', 'repositoryId', 'repositoryPrivate', 'pullRequest', 'causeId', 'part', 'revision', 'since', 'deliveryId', 'receivedAt'])
          : new Set(['kind', 'version', 'type', 'event', 'action', 'installationId', 'accountId', 'accountKind', 'repositoryId', 'repositoryPrivate', 'pullRequest', 'deliveryId', 'receivedAt']);
  if (Object.keys(value).some(key => !permitted.has(key))) throw new TypeError('Queue message contains a prohibited field.');
  if (value.accountId !== undefined) common.accountId = integer(value.accountId, 'account ID');
  if (value.accountKind !== undefined) {
    if (!ACCOUNT_KIND_VALUES.includes(value.accountKind)) throw new TypeError('Account kind is not supported.');
    common.accountKind = value.accountKind;
  }
  if (common.type === 'history-job') {
    if (common.event !== 'history-job' || !HISTORY_JOB_KINDS.includes(common.action)) throw new TypeError('History job message has an unsupported kind.');
    if (typeof value.jobId !== 'string' || !jobIdentity.test(value.jobId) || !Number.isSafeInteger(value.sequence) || value.sequence < 0) throw new TypeError('History job message has an invalid identity.');
    return { ...common, repositoryId: integer(value.repositoryId, 'repository ID'), jobId: value.jobId, sequence: value.sequence };
  }
  if (common.type === 'lifecycle') {
    const readRepositories = (value, name) => {
      const repositories = value === undefined ? [] : value;
      if (!Array.isArray(repositories) || repositories.length > 100) throw new TypeError(`${name} must be a bounded array.`);
      return [...new Set(repositories.map(value => integer(value, 'repository ID')))];
    };
    return { ...common, addedRepositories: readRepositories(value.addedRepositories, 'Added lifecycle repositories'), removedRepositories: readRepositories(value.removedRepositories, 'Removed lifecycle repositories') };
  }
  if (!['pull-request', 'check-rerequest', 'brief-refresh', 'history-capture'].includes(common.type)) throw new TypeError('Queue message has an unsupported type.');
  if (common.type === 'history-capture') {
    if (common.event !== 'history-capture' || common.action !== 'capture') throw new TypeError('History capture message has an unsupported action.');
    const rebuilt = historyCaptureEnvelope({ installationId: common.installationId, accountId: common.accountId, repositoryId: integer(value.repositoryId, 'repository ID'),
      pullRequest: value.pullRequest, causeId: value.causeId, part: value.part, revision: value.revision, since: value.since, receivedAt: common.receivedAt });
    if (rebuilt.deliveryId !== common.deliveryId) throw new TypeError('History capture delivery identity does not match its cause.');
    return rebuilt;
  }
  if (common.type === 'brief-refresh') {
    if (common.event !== 'brief-refresh' || !BRIEF_REFRESH_CAUSES.includes(common.action)) throw new TypeError('Brief refresh message has an unsupported cause.');
    // Rebuilt from its identifiers, so the delivery identity always matches the cause and part it names.
    const rebuilt = briefRefreshEnvelope({ installationId: common.installationId, accountId: common.accountId, repositoryId: integer(value.repositoryId, 'repository ID'),
      targets: value.targets, cause: common.action, causeId: value.causeId, part: value.part, after: value.after, page: value.page, carried: value.carried, receivedAt: common.receivedAt });
    if (rebuilt.deliveryId !== common.deliveryId) throw new TypeError('Brief refresh delivery identity does not match its cause.');
    return rebuilt;
  }
  if (value.repositoryPrivate !== undefined && typeof value.repositoryPrivate !== 'boolean') throw new TypeError('Repository visibility must be boolean.');
  const result = { ...common, repositoryId: integer(value.repositoryId, 'repository ID'), pullRequest: integer(value.pullRequest, 'pull request number'), ...(value.repositoryPrivate === undefined ? {} : { repositoryPrivate: value.repositoryPrivate }) };
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
