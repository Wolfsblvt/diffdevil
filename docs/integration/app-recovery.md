# Reapply later App obligations

## Meaning

This is the product-owned input, replay and checkpoint interface for an isolated
restored App database. It applies later deletion, expiry, history opt-out and
service/Works disconnect facts, then uses the existing current Works reconciliation.
The consumer and a one-time healthy-source input adapter are implemented. Recovery
after loss of the authoritative current source still has no independently complete
input producer. A configuration export cannot supply missing later facts after loss
of the same database. A coordinated healthy-source rollback is a separate claim.

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

The complete protected input is recoverable before target mutation. If publication
is interrupted after table deletion or insertion, keep the target isolated and
repeat with that same complete input. This route is not atomic across all target
tables and cannot run alongside target consumers. Subsequent source changes need a
new complete barrier before serving. `coverage.mode: healthy-source-rollback` stays
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
Existing `commercial.test.mjs` separately
qualifies the signed Works consumer's current/ended/unavailable answers. Neither
proves independent production custody or a real restored HTTP App. Those remain
with the recovery operator and its original source/interpretation envelope.
