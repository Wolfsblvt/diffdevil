# Reapply later App obligations

## Meaning

This is the product-owned input, replay and checkpoint interface for an isolated
restored App database. It applies later deletion, expiry, history opt-out and
service/Works disconnect facts, then uses the existing current Works reconciliation.
The consumer and a one-time healthy-source input adapter are implemented. Recovery
after loss of the authoritative current source still has no independently complete
input producer. A configuration export cannot supply missing later facts after loss
of the same database. A coordinated healthy-source rollback is a separate claim.
Its honest occasions are a drill of the real off-host point while a truthful healthy
source still exists, or a logical rollback of corrupted measurements/state. Neither
fulfills independent whole-D1 recovery after loss of the current source.

## Preserve the original point and isolation

Keep the original archive, source, schema/migration ledger, compiled distribution,
configuration, seal and signing interpretation. `apps/github-app/recovery.mjs`
targets the App schema through migration `0016`; verify that compatibility before
use. Newer source does not reinterpret or replace the original point.

Run against a separate restored copy, before any HTTP reader, Queue, cron, import
or participation delivery starts. Isolation prohibits inbound serving and unrelated
processing; the explicitly supplied commercial reconciliation can make outbound
Works calls and reports under the operator's actual grant. The entry is an offline
product API, not a public endpoint or an automatic serving interlock. It neither
imports a point nor starts a Worker. A failed or incomplete replay stays isolated.

## History deletion at the database boundary

History deletion commits repository-scoped measurement/child removal, owned check
and repair removal, history withdrawal, stopped open history jobs and its deletion
tombstone in one D1 batch transaction. Completed repository offboarding likewise
joins its measurement removal to its existing final deletion batch. A failed
statement rolls back that whole transition; a capture can retain the unchanged
state or the completed deletion, rather than partially erased history with no
deletion fact. This uses D1's [transactional batch contract](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch).
It does not make external provider effects transactional.

The ordinary history-deletion form carries the displayed settings revision.
Deletion checks that revision on every destructive statement and advances it only
within the same commit. Repeating that same form recognises the immediately
preceding committed deletion and returns success without changing its time,
lifetime, revision or later rows. Any later settings commit, including explicit
history reconsent, keeps the old form stale and untouched. A caller retrying a
completed deletion without a new revision also reuses the completed event. Recovery
replay supplies the original `deletedAt` and `reapplyUntil`, preserves any longer
retained lifetime and does not overwrite a known later explicit positive choice.
A fresh current-revision form can still deliberately delete again.
The existing deletion-consent origin records the live submitted revision, so a
different settings commit cannot impersonate that request even at the same time.
Ordinary admission, consent and App readbacks project the `history-deletion`
category. Raw configuration exports and recovery snapshots retain the exact
request identity for retry and replay.

No schema, recovery-input format or original-point interpretation changes here.
Migration-0016 points remain compatible. An old source's capture from between its
separate deletion commits still has the diagnosed missing-intent gap; newer source
cannot invent that lost request. Account closure benefits at its history-deletion
leg, but its other local and authorization steps remain separate commits with an
ordinary incomplete/retry response. This is not durable continuation of an entire
closure, nor unconditional recovery of every in-flight App command.

## Complete input through an exact barrier

The trusted recovery custodian supplies this versioned contract:

```js
const point = {
  id: 'immutable-point-coordinate',
  capturedAt: '2026-10-01T00:00:00.000Z',
  supportedUntil: '2026-10-31T00:00:00.000Z'
};
const through = '2026-10-05T00:00:00.000Z';
const input = {
  kind: 'diffdevil.app-recovery-input', version: 1, point,
  coverage: {
    from: point.capturedAt, through, tombstoneRetentionDays: 37,
    sources: [/* actual independently recovered source boundaries */]
  },
  events: [/* complete later duties, ordered by original time */]
};
```

`coverage.sources` contains exactly one entry for each `duty`: `deletion-expiry`,
`history-consent`, `service-disconnect`, `works-disconnect`, `execution-selection`
and `delegation-setup`. Each entry names its
actual `authority`, complete-read `checkpoint`, independently retrieved
`recoveryEvidence` coordinate, and the same `through`. Those are trusted evidence
references, not a certificate manufactured by the consumer. Shape validation cannot
authenticate them, discover omitted events, prove external custody or certify an
empty interval. Establish those facts through the actual source/transport first.
Never fill missing facts with invented absence statements.

Coverage starts inclusively at the point timestamp (same-time commit ordering may
be unknown), ends at the selected barrier and cannot exceed the original supported
lifetime. `readRecoveryInput(input, point, through)` refuses mismatched points,
missing duties, stale boundaries, invalid identities/times, duplicate event IDs,
unordered streams and unsupported events before target writes. Input is copied and
its SHA-256 binds the checkpoint. This does not authenticate the artifact.

The actual declared `tombstoneRetentionDays` guarantee must cover the full original
supported restore window **plus seven days**. Each deletion event must carry that
same window-plus-margin lifetime from its original time. The healthy-source exporter
uses the actual App's37-day tombstone guarantee, which supports a30-day window;
it refuses a longer unsupported horizon. Other inputs need their actual guarantee,
not an invented longer deadline. Validation is not independent custody proof.

Every event has stable `id`, original ISO UTC `at`, and:

| `type` | Other fields | Consequence |
| --- | --- | --- |
| `history-deleted` | `repositoryId`, `reapplyUntil` | Existing complete history deletion and stopped history jobs; execution remains separate. |
| `repository-deleted` | `repositoryId`, `reapplyUntil` | Existing completed offboarding deletion of repository-owned state. |
| `history-disabled` | `repositoryId`, boolean `deselect` | Actual history-off `stopCollecting` pause: retain consent reason, apply its actual policy/settings meaning, and deselect only when the original action did. Retained data is not deleted. |
| `history-retention` | `repositoryId`, `retentionDays` (1–3660) | Reapply only the future-record setting. Existing rows retain their original expiry. |
| `service-disconnected` | numeric `userId` | Existing account disconnect, revoke restored grant/sessions/artifacts. |
| `works-disconnected` | `linkId` | Existing permanent link end, remove bindings/grant/disclosure, supersede pending reports, preserve attempts. |
| `participation-answers-deleted` | `userId`, `campaign: { key, version }` | Existing answer deletion; retain the completion/reward event, delete empty drafts. |
| `account-closed` | `userId`, `repositoryIds`, `reapplyUntil` | Stop/deselect/delete the closure's personal repository targets, forget Manage/participation facts and grants; end stale restored personal Works links. Organisation history remains. |
| `sessions-revoked` | `userId` | Existing sign-out-everywhere revocation, independent of the service connection. |
| `free-organisation-disconnected` | `userId`, `repositoryIds` | Disconnect the Free organisation and stop its named execution targets while retaining selection and history. |
| `repository-stopped` | `repositoryId` | Actual execution-consent withdrawal and deselection; history is not deliberately deleted. |
| `repository-released` | `repositoryId` | Actual deselection/in-grace release; do not invent completed offboarding or another consent withdrawal. |
| `delegation-removed` | `accountId`, `userId` | Revoke the existing delegation. Automatic setup chosen under that delegation loses its authority through the ordinary runtime check. |
| `automatic-setup-disabled` | `accountId` | Remove the existing automatic-setup choice. |

Deletion lifetimes cover the supported window plus seven days from the original event. Replay preserves
those times and never shortens a longer retained tombstone. Ordinary measurement
expiry runs at `through` without pruning unrelated delivery/attempt evidence.
Include historical deletion events even when the deleted row no longer exists.
The consumer only restricts or erases state; it never grants consent or reconnects
service. Later explicit reconsent and current authority use their ordinary routes.

The deletion source includes answer deletion and account closure; the service source
includes session revocation and Free organisation disconnect. Closure's personal
targets and Free disconnect's affected targets come from the actual operation, not
inference from stale restored reach. A closure establishes that no personal Works
link was active when admitted, so stale restored links for that account end too.
An unsupported duty must not silently disappear from an input.

## Invoke, checkpoint and retry

```js
import { replayRecoveryObligations } from '../../apps/github-app/recovery.mjs';
const receipt = await replayRecoveryObligations({
  database: isolatedRestoredD1, input, point, through,
  checkpoint: commitProtectedCheckpoint,
  commercial: configuredAppCommercialService
});
```

The awaited `checkpoint` writer durably commits the supplied object or rejects.
Use the recovery operation's admitted protected output route, not stdout, a public
log or this disposable checkout. A first `applying` checkpoint commits before any
target mutation; each applied event commits its ID. A failure records an
`incomplete` prefix and throws `E_RECOVERY_REPLAY`. If output itself fails, the last
committed prefix remains; retain isolation, repair the cause and rerun the same
input. Replay does not accept a checkpoint as authority to skip effects.

Checkpoint kind is `diffdevil.app-recovery-checkpoint`, version 1, with `point`,
`inputSha256`, `coverage`, `phase`, applied event IDs, `commercial` counts and a
product `code`. Preserve its privacy boundary: numeric identities and custody
coordinates are not automatically public. No grant/source contents are emitted.

Every active restored link is held before replay. The existing
`commercial.reconcileAfterRestore()` applies current authenticated Works answers;
the consumer also checks actual D1 hold state. Unavailable answers or an absent
commercial service with active links return `incomplete` /
`E_RECOVERY_COMMERCIAL_UNAVAILABLE`, including the service's thrown
`E_COMMERCIAL_UNAVAILABLE`. They never become current commercial answers.
Original link attempts are not replayed, replaced, renewed or deleted. Real
reconciliation can issue ordinary product reports and needs its own operating
authority; tests use local doubles only.

`phase: replayed` establishes application of the supplied input through its exact
barrier and resolved commercial holds. It does not prove independently complete
input, current GitHub authority, a compiled HTTP App encounter or serving recovery.
Reconcile duties after that barrier and exercise the matching App/current grants
before any separately authorized serving transition.

## One-time input from a healthy current source

`apps/github-app/recovery-input.mjs: exportHealthyRecoveryInput` supplies the
coordinated rollback route. The operator first establishes actual current App health
and identity, then uses the existing native consistent whole-D1 capture and
isolated-import route to produce an **immutable current copy**. Keep its writers
stopped while reading it. An old point, a merely existing database, or independent
GitHub/Works answers are not that source. The API does not perform provider capture
or prove health from a caller's description.

For a serving cutover, **live App writers remain stopped from the immutable
current-source capture through restored cutover**. If the live source changes before
cutover, discard that input and export a new complete barrier. Immutability of the
captured copy does not establish continuity of the live App after capture. The
operator must prove the held writer window or the newer complete export before
serving; the supplied evidence strings and a green replay do not prove either.
For an isolated, non-serving drill, the original service may resume after its
bounded consistent capture. That drill remains as-of the capture barrier and gives
no authority to serve the restored copy later.

```js
import { exportHealthyRecoveryInput } from '../../apps/github-app/recovery-input.mjs';
const input = await exportHealthyRecoveryInput({
  database: immutableCurrentD1,
  point: { ...originalPoint, databaseId: originalDatabaseId },
  source: {
    mode: 'immutable-current-copy', databaseId: originalDatabaseId,
    capturedAt: currentSnapshotTime, snapshotId: currentSnapshotCoordinate,
    healthEvidence: actualAppHealthAndIdentityReceipt,
    consistencyEvidence: nativeCaptureAndIsolatedImportReceipt,
    interpretation: compatibleSourceSchemaAndOriginalSealReceipt
  },
  checkpoint: commitProtectedInput
});
```

These references name actual operating evidence; they do not certify themselves.
Database identity must match the original point, timestamp is the exact `through`
boundary, and the original supported window still applies. This route transfers
actual complete current state and logical observation membership through that
boundary, without guessing historical event times.

The exporter commits `diffdevil.healthy-source-export-checkpoint` / `phase: reading`
before credential-bearing reads. Each selected table is read completely and checked
against its actual count in the immutable copy. A D1 error, limit or count mismatch
refuses; it never silently truncates or paginates a moving live database. Only after
all reads does the complete versioned recovery input commit and return. An initial
reading checkpoint is not an input and the consumer refuses it. This API belongs
inside an admitted protected operator process: do not invoke it through a
value-returning agent tool, print its return, or put it in a public artifact/log.

`currentState` includes complete current repository/installation,
authorization/session/service, Manage/Business configuration/audit, history-job/lens,
participation and commercial tables. It contains sensitive account data, survey
answers and existing **sealed** grants/verifiers, rather than only non-secret event
coordinates. Preserve existing protected capture/input custody and seal
interpretation. It creates no new grant, credential, permission or recurring archive.
The operator qualifies source/current interpretation and matching seal; column
parity alone cannot prove them.

Replay validates every selected table/column/count and logical membership shape
against the target before its first write. It removes old numerical history
records/size observations absent from the actual current source, then copies current
privacy/control state in foreign-key order. Current numerical observations are not
imported: retained old comparisons keep the original point's interpretation, subject
to actual current removal and expiry. Original commercial attempts remain; current
rows supersede matching attempt identities. This carries current positive choices
and still-protected grants from their actual authority rather than inventing
replacement consent or forcing routine reconfirmation. Every restored active
commercial link is then held for current Works reconciliation.

Current membership also reconciles all six point-retained operational tables:
`app_checks`, `repairs`, `execution_attempts`, `operational_results`,
`execution_leases` and `deliveries`. Child attempts are removed before deliveries.
This preserves the actual live history-deletion and repository-deletion boundaries,
including privacy-bearing repair projections, while retaining point rows still
present in the current source. It imports no post-point operational payload.
History file/effect children follow their retained history record; unreferenced size
facts are removed. The focused schema test requires every migrated product table
to have one explicit copied, membership-reconciled or child-cleanup disposition.

Current history-job **purpose, scope, selected policy and request provenance survive**;
cursor, counts, lease and completion cannot vouch for observations absent from the
point. Replay resets cursor/progress for every current job and advances its sequence
to refuse old step messages. A narrower safe rewind cannot be established from the
current page/index and point membership, so imports restart at page one within their
original scope; recalculation rediscovers targets and capture from the restored data.
Retained comparisons are skipped by ordinary duplicate-safe acquisition.

The latest queued/running request returns to the ordinary queue; current person or
service pauses remain. A latest completed request becomes `paused` with reason
`recovery-rollback`, explained in Manage, and can use ordinary Resume. Recovery does
not automatically start a completed unbounded import again. Older completed runs
become stopped; older requests still open after a retry keep their current control
state. Existing failed/stopped requests keep their terminal control state.
All unsupported progress is cleared. Current history-off/deletion, repository Stop,
selection and access still govern whether a request may run. No request is fabricated
when none exists, and replay sends no Queue messages or provider reads for rebuilding
history. Ordinary admitted continuation rechecks consent, plan/allowance and access.

The complete protected input is recoverable before target mutation. If publication
is interrupted after table deletion or insertion, keep the target isolated and
repeat with that same complete input. This route is not atomic across all target
tables and cannot run alongside target consumers. The live-writer cutover rule above
still applies after a successful replay. `coverage.mode: healthy-source-rollback` stays
in the replay receipt and never becomes source-loss recovery proof.

## What remains unavailable after database loss

The current App stores deletion tombstones, history choices and service disconnects
in D1. GitHub's current reach cannot reconstruct App-local deletion or opt-out.
Works' current-link pull independently answers commercial standing when the original
identity/grant/signing route remains usable, but not the other duties. A surviving
current D1 can answer its own state while it survives; a copy in the same lost
database/old point cannot answer post-point obligations. Zero captured rows are not
later absence evidence.

A pull of links known to an old point cannot discover a link established only after
that point. The healthy-source input carries actual current links; independent
source-loss recovery of that later relation remains an App/Works interface
consequence, not numeric-only funding, new consent or an invented current answer.

This consumer does not complete database-loss recovery. Selecting external duty
capture, custody, retention and persistence-failure behavior is a separate retained
operating consequence. No new journal service, writer, scheduler, recurring capture,
credential, storage or retention is activated here. Its future selected source must
deliver a real complete boundary and qualify database loss and interrupted external
persistence, rather than simply generating this JSON shape.

## Qualification

After dependency restore and `npm run build`:

```sh
node --test apps/github-app/recovery.test.mjs apps/github-app/d1-state.test.mjs
```

Sanitized local D1 tests exercise actual migrations/stores, input refusals before
writes, deletion/opt-out/expiry, revocation, preserved attempts, checkpoint failure,
replay and real commercial hold state. The twin-copy healthy-source specimen also
exercises complete input commit, partial projection refusal, interrupted metadata
publication and recovery, output refusal before source reads and count mismatch.
Additional twin-copy regressions seed every operational table, compare actual live
history/repository deletion with restored membership, classify the migrated schema,
and exercise advanced import/recalculation progress over omitted post-point
measurements. The rewound import reacquires a missing numerical comparison through
the ordinary job/collection path; current pauses, off/deletion and scoped requests
remain distinct. Provider traffic is synthetic and all D1 copies are disposable.
Existing `commercial.test.mjs` separately
qualifies the signed Works consumer's current/ended/unavailable answers. Neither
proves independent production custody or a real restored HTTP App. Those remain
with the recovery operator and its original source/interpretation envelope.
