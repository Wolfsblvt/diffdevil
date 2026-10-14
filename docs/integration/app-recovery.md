# Reapply later App obligations

## Meaning

This is the product-owned input, replay and checkpoint interface for an isolated
restored App database. It applies later deletion, expiry, history opt-out and
service/Works disconnect facts, then uses the existing current Works reconciliation.
The source consumer is implemented. An independently recoverable complete input
producer is **not** implemented or established by this interface. A configuration
export cannot supply missing later facts after loss of the same database.

## Preserve the original point and isolation

Keep the original archive, source, schema/migration ledger, compiled distribution,
configuration, seal and signing interpretation. `apps/github-app/recovery.mjs`
targets the App schema through migration `0016`; verify that compatibility before
use. Newer source does not reinterpret or replace the original point.

Run against a separate restored copy, before any HTTP reader, Queue, cron, import,
participation delivery or provider-capable processing starts. The entry is an offline
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
    from: point.capturedAt, through,
    sources: [/* actual independently recovered source boundaries */]
  },
  events: [/* complete later duties, ordered by original time */]
};
```

`coverage.sources` contains exactly one entry for each `duty`: `deletion-expiry`,
`history-consent`, `service-disconnect`, `works-disconnect`. Each entry names its
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

Every event has stable `id`, original ISO UTC `at`, and:

| `type` | Other fields | Consequence |
| --- | --- | --- |
| `history-deleted` | `repositoryId`, `reapplyUntil` | Existing complete history deletion and stopped history jobs; execution remains separate. |
| `repository-deleted` | `repositoryId`, `reapplyUntil` | Existing completed offboarding deletion of repository-owned state. |
| `history-disabled` | `repositoryId` | Existing opt-out: collection stops without selecting deletion. |
| `history-retention` | `repositoryId`, `retentionDays` (1–3660) | Clamp existing expiry to at most event time plus those days; never lengthen or enable collection. |
| `service-disconnected` | numeric `userId` | Existing account disconnect, revoke restored grant/sessions/artifacts. |
| `works-disconnected` | `linkId` | Existing permanent link end, remove bindings/grant/disclosure, supersede pending reports, preserve attempts. |
| `participation-answers-deleted` | `userId`, `campaign: { key, version }` | Existing answer deletion; retain the completion/reward event, delete empty drafts. |
| `account-closed` | `userId`, `repositoryIds`, `reapplyUntil` | Stop/deselect/delete the closure's personal repository targets, forget Manage/participation facts and grants; end stale restored personal Works links. Organisation history remains. |
| `sessions-revoked` | `userId` | Existing sign-out-everywhere revocation, independent of the service connection. |
| `free-organisation-disconnected` | `userId`, `repositoryIds` | Disconnect the Free organisation and stop its named execution targets while retaining selection and history. |

Deletion lifetimes are at least 37 days from the original event. Replay preserves
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
`E_RECOVERY_COMMERCIAL_UNAVAILABLE`. They never become current commercial answers.
Original link attempts are not replayed, replaced, renewed or deleted. Real
reconciliation can issue ordinary product reports and needs its own operating
authority; tests use local doubles only.

`phase: replayed` establishes application of the supplied input through its exact
barrier and resolved commercial holds. It does not prove independently complete
input, current GitHub authority, a compiled HTTP App encounter or serving recovery.
Reconcile duties after that barrier and exercise the matching App/current grants
before any separately authorized serving transition.

## What remains unavailable after database loss

The current App stores deletion tombstones, history choices and service disconnects
in D1. GitHub's current reach cannot reconstruct App-local deletion or opt-out.
Works' current-link pull independently answers commercial standing when the original
identity/grant/signing route remains usable, but not the other duties. A surviving
current D1 can answer its own state while it survives; a copy in the same lost
database/old point cannot answer post-point obligations. Zero captured rows are not
later absence evidence.

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
replay and real commercial hold state. Existing `commercial.test.mjs` separately
qualifies the signed Works consumer's current/ended/unavailable answers. Neither
proves independent production custody or a real restored HTTP App. Those remain
with the recovery operator and its original source/interpretation envelope.
