# Analytical App data

## Meaning

This owns the source contract supporting Overview, Pull requests, History, Files,
PR detail and File detail. It separates final merged comparisons from PR development
and from the older pathless, latest-observed history API. The accepted pathless
foundation and revised privacy/final-merged contracts are now on current `main`.
This implementation remains a source candidate, not a deployed or adopted App;
the older pathless export and query contracts retain their original meaning.

## Read it

`apps/github-app/analytical-data.mjs` exports
`createAnalyticalDataService({ store, authorize, entitlement, namespace, currentPolicy, premium, now })`.
`premium` is the optional premium file extension described under [Community service and premium extension](#community-service-and-premium-extension); without it the service is the Community service.
Its `query(input, actor)` accepts:

```json
{
  "version": 1,
  "surface": "overview",
  "scope": { "kind": "all" },
  "repositoryIds": [17],
  "from": "2026-09-01T00:00:00.000Z",
  "to": "2026-10-01T00:00:00.000Z"
}
```

Surfaces are `overview`, `prs`, `history`, `files`, `pr`, and `file`. Detail requests
select `{ kind: "repository", repositoryId }` and supply `pullRequest` or `path`.
`repositoryIds` can carry the viewer's complete requested inventory: authorization
filters it before namespace selection or funded-namespace pointers. An inaccessible
repository cannot change which plan governs the selected scope.
The Files metric is `mergedPullRequests` (default), `changed`, `rawChurn`, or
`turnover`. Repository IDs and paths remain separate, including in multi-repository
results. Times are canonical UTC ISO timestamps; `to` is exclusive. History uses
daily, two-day, weekly or calendar-month buckets. Flow declares its separate
13-week window and co-change its separate 90-day window.

Results identify the requested and authorized repository counts, retained coverage,
merged and recovered merged populations, policy basis, generated time and intervals.
Coverage is never inferred complete from rows being present. Lifecycle counts
describe observed lower bounds, not a complete
repository inventory; open/draft states are last observed rather than freshly read.
Overview, every History/flow bucket and both comparison periods carry their own
retained-population coverage. Median and band distributions describe that retained
population. `comparison.delta` is null while complete period populations are
unestablished; consumers must not turn retained-count differences into precise
repository-wide trend claims. A numerical amount has lower and
upper endpoints; a null upper endpoint is unbounded. Empty medians are unavailable
with zero samples. Median envelopes include every bounded or unrecovered PR rather
than selecting only exact measurements. Even sample medians average the two central
endpoints. Missing final comparisons count as non-negative, unbounded observations.
Unknown size bands remain separate from the smallest band. PRs, buckets and period
summaries expose engine-derived added-only, deleted-only and modified composition,
with raw-added/raw-deleted facts and the replacement-line semantic version. PR
measurement metadata distinguishes report quality and partial file-set acquisition
from overall retained-window coverage; chart renderers must not infer composition
by subtracting independently bounded Changed and raw-churn endpoints.

The server's `currentPolicy({ repositoryId, actor })` returns `{ id, compiled }`
using the existing shared-engine compiled policy, or null while unavailable. Every
retained numeric file, including excluded files, is available to shared-engine
policy replay. `evaluatePolicy` produces current totals and size judgments without
replaying provider effects. When a current policy is unavailable, results explicitly
use unfiltered base facts and do not claim current-policy interpretation. Original
recorded policy/band, desired label and observed label remain separate PR-detail lanes.
Each PR response identifies its measurement's actual before/after revisions,
observation time and final-merged-versus-development basis. Development freshness
compares the latest analyzed PR head with the observed current PR head; it does not
rename a final merge comparison into a current development revision.

File history exposes base numerical observations with explicit current-policy
inclusion. Its scope and co-change scope are `all-observed-file-facts`. A file's
`prChanged` comparison uses the same all-observed PR total; `prPolicyChanged` is
the distinct current-policy total. An excluded file's physical change must not be
compared as if it were included in the policy-filtered PR quantity.

`namespace({ repositoryId, actor })` resolves the current GitHub namespace account ID
from server-owned repository metadata, not from the request. It can bind the existing
commercial store's `repositoryNamespace(repositoryId)` method. It returns a positive
account ID, or null when that identity is unestablished; no namespace is invented.

`authorize` must check current repository visibility at every invocation. The service
checks before storage and again before returning data. `entitlement` returns the
server-selected `free`, `pro`, or `business` plan for a repository namespace; a null
repository requests the viewer's plan for cross-repository aggregates. Neither the
request nor the actor's repository ID list is sufficient authority. A shared paid
namespace keeps its paid feature access for an authorized Free reader, while a
Free viewer receives no premium aggregate assembled across paid namespaces.
Scope is explicit: `{ kind: "all" }`, `{ kind: "namespace", namespaceId }`, or
`{ kind: "repository", repositoryId }`. Aggregate requests default to All; a single-
repository PR/file detail defaults to its repository. Namespace features follow the
namespace's plan even when it contains several repositories. Only All uses the
viewer plan. Within any premium aggregate, only funded Pro/Business repositories
contribute; exclusion counts distinguish Free and unknown-plan repositories. Basic
activity and numeric aggregates still include authorized Free repositories.
Free Files responses are useful page context, not a `plan-required` refusal: they
include authorized `fundedNamespaces` and a `historyScope` for the History route.
The consumer should request its complete inventory when it needs pointers to shared
funded namespaces outside the selected scope. Unknown entitlement or namespace
standing stays explicit rather than being renamed Free.
Responses expose these server-selected namespace and aggregate plans as
`entitlements`, so the experience need not infer feature access from missing panels.

`authorization.mjs` exposes `analyticalQuery({ session, query })`, using its existing
opaque session, current GitHub-user authorization and positive repository read
access. Administration is not required.
Responses carry `repositoryIdentities` from the current authorized provider read,
so names and GitHub drill-down links do not depend on retained repository-name data.
These names are transient response context, not persisted history.

`analytical-http.mjs` supplies POST
`/api/analytics` with an `application/json` query body, the `__Host-diffdevil-session`
cookie and same-origin `Origin`. Path-free queries may also use GET
`/api/analytics?query=<URL-encoded JSON>`; file paths are refused in GET queries.
Every success and refusal is private/no-store with `Referrer-Policy: no-referrer`.
`createGitHubAppWorker({ authorization })`
serves that route when its protected adapter is installed. The default Worker refuses
the route as unavailable: this candidate does not manufacture a live OAuth/provider
adapter or deploy one. The HTTP route neither trusts a caller-supplied principal nor
changes GitHub state.

Private paths belong in request bodies, not API URLs. The App does not log request
URLs, query strings, bodies or file paths. The signed-in App's File-detail route
addresses a file by an opaque locator: an HMAC of the repository and path under the
operator's seal key, resolved server-side against the files the reader is entitled
to see. The address and the document title carry no path, so local browser history
retains a handle, not a name. App documents carry a `same-origin` referrer policy
(their same-origin form posts need an `Origin`); the JSON routes keep `no-referrer`.
Deployment must exclude full URL/query/body capture from provider request logging too.

## Collect and retain it

`analytical-collection.mjs` exposes `collectAnalyticalPullRequest` with an admitted
read client and store. It checks history consent, resolves the numeric repository
identity, reacquires provider lifecycle facts, analyzes open work through the shared
GitHub acquisition engine and checks provider identity again before publication.
It retains no author, title, PR prose, source or patch. The Queue admits closed,
ready-for-review and converted-to-draft events in its existing minimized envelope.
Live effect execution precedes collection. Closed, failed or execution-disabled PRs may still
collect under positive history consent; analytical failures retain a separate stable
`analytical-collection` repair in the existing recovery home. Collection recovery
does not replay completed provider effects. Ready-for-review time remains
unknown unless supplied by a recovered lifecycle observation; current ready state
does not invent a historical timestamp.

A comparison-acquisition failure retains the independently observed PR lifecycle
after the provider freshness check. Its missing final measurement remains in the
merged population as an unbounded observation, with a separate stable recovery code.

A multi-parent merged commit supplies its first-parent-to-merged-commit final
comparison. A single-parent squash/rebase result uses the
[GitHub commit introducer contract](https://docs.github.com/en/rest/commits/commits#list-pull-requests-associated-with-a-commit):
first establish that the merged commit is on the current default branch, then follow
its first parents while GitHub identifies this merged PR as their introducer. The
first non-member supplies the before-revision. The original PR commit count bounds
the contribution, and the default-branch revision is checked again. A trusted caller
may supply an explicit `resolveFinalComparison` instead. Missing or contradictory
evidence remains unrecovered; it never falls back to the PR's old head diff.
The comparison API must confirm the direct base. The numeric report retains
incomplete coverage when the provider's finite file listing reaches its 300-file
limit or disagrees with the parsed diff. Content reads are transient and supply line
counts at immutable before/after revisions; a 404 is unknown, except where a confirmed
creation/deletion itself establishes absence. Binary sizes remain unavailable.

`D1AppStore.recordAnalytical` atomically publishes one allowlisted version-1 PR record.
Development revisions are keyed by base/head; a separate `final` requires a direct
`final-merged-comparison`. `recordAnalyticalSize` stores independent default-branch
size observations. Migration `0009_analytical_app.sql` introduced the separate
numerical history; `0016_shared_size_observations.sql` shares identical bounded
sets of path/size facts while retaining a marker for **every** original observation
time, immutable revision and expiry. The sharing applies across unchanged captures
and across revisions with the same facts. It is physical normalization, not
coalescing observations or inferring file continuity. All remain under current
opt-in consent, expiry, deletion tombstones and offboarding cleanup.
This new analytical path keeps collection independent of execution consent while
requiring current history consent and installation/repository access.
This does not relabel `history_records` or reinterpret pathless rows as named files.

Turnover is **Changed during the period divided by time-weighted average file size**.
Actual observations bracketing period boundaries and observed file continuity between
them can establish a finite denominator. Continuity is a fact about the file, not about
branch adjacency: each retained complete final comparison is one atomic default-branch
transition, so a chain of them from one observed revision to the next that never names
the path (including as a rename source) shows the file kept its size while unrelated
pull requests merged. A net comparison of the two endpoints is not used, because a
change and revert inside the gap leaves the same endpoint tree with a different
time-weighted size. Direct pushes, unrecovered or incomplete comparisons, history-off
time and expired records leave no link, so those gaps widen the denominator and count
as discontinuities. Missing endpoints and size mismatches widen it too. A period that
ends after the latest continuous observation keeps that unobserved tail: its observed
span still bounds the upper ratio, while the lower ratio stays 0. Every Turnover result
names `observedThrough`, the end of its observed closing span; a consumer may offer the
as-of window ending there as an explicitly named view, but the service never moves the
requested period. An unrecovered merged
contribution may have touched any file, so named totals and turnover widen too.
Creation or deletion in the period is unavailable with that reason. The collector
supplies before/after merge sizes; each published record then enqueues a capture of the
default branch's known text files through `captureDefaultBranchSizes`, which runs in
queue parts after basic operation. The first part pins the branch revision and its start;
each part reads, in chunks of 100, the known paths still lacking an observation at that
revision since the start, checks the branch again before publishing each chunk and
refuses a moved revision, and continues the rest in the next part. A size already
retained at the same immutable revision is reused rather than read again. A moved branch
or an unavailable read ends the capture with the PR's analytical repair; sizes already
published remain true observations. Retained snapshots before, inside or after a selected
period can anchor it; continuity comes from observed transitions, never interpolation
from churn. Known paths have deterministic ordering so ordinary repeated chunks
share their facts. The invocation retains its previous per-path processing allowance
alongside actual D1 accounting: fewer writes do not silently increase one part's
provider or CPU work. Parts still continue without truncation.

`analyticalSizesAt` preserves its complete logical observation result by default.
Capture requests `{ latest: true }`, which uses a revision-led index and supplies
the latest retained marker per path for both immutable-size reuse and continuation.
`analyticalSizes` returns every observation in the window and the nearest retained
anchors before/after it, including equal-time observations at distinct revisions.
It pages indexed markers, fetches each shared fact set once, and reconstructs the
same array consumed by Turnover and the premium `sizeHistory`; no intermediate
timestamp is discarded. Its logical response and Worker memory still grow with
the requested full history. Sharing reduces D1 storage, row reads and repeated
transfer of facts, not the size of the selected analytical response.

Writes retain the first observation at a path/time/revision identity, including
overlapping captures; an atomic batch refuses an overlap that raced its initial
read and retries the remaining paths. Consent and tombstones guard the fact set
and its marker in the same batch. Expiry is immediate on reads. Physical expiry
drains indexed queries of at most 1,000 markers each, removing a fact set only
after its last marker is gone. Deletion/offboarding remove both representations.

A window ending now always outlives the latest capture. The premium extension's
server-owned current-size observer closes that tail at the read encounter, with no scheduler.
It runs only for Overview, History, Files and File detail when a returned premium file
has an open tail (File detail asks only for its own path). It reads the repository and
its current default-branch revision. It is asked only for paths whose retained complete
transitions from the tail's revision to that head never name them, so a fresh read never
substitutes for continuity, and a direct push or uncollected merge keeps the tail open.
A size retained at the same immutable revision is reused; other accepted paths are read
transiently as line counts. When any size is supplied, a second branch read brackets
the observation time and a moved branch refuses it. Only newly read sizes are retained,
under current history consent; a retained revision is not written again. A read that
contradicts the carried size cannot close the tail.

Each premium file-surface response carries `sizeObservation`, one entry per represented
repository: `not-needed`, `unconfigured`, `unavailable` with a stable code, or `observed`
with its revision, `observedAt`, open and closed tails, path counts (`reused`, `read`,
`notContinuous`, `persisted`) and `providerReads`. Per repository with an open tail, the
cost is one repository read, one or two branch reads and one content read per accepted
path not already observed at that revision. Normally that is none, because the collector
captures after every merge. `app.mjs` exports `createAnalyticalPremiumHost(env, { store,
installationOf })`, which supplies the extension's `clientFor`: a credential limited to
Contents read for the one repository, minted when an observation is needed; that adds one
installation-token request.
An unavailable observation keeps the open tail, `observedThrough` and the existing
freshness; it never fails the read. This candidate does not claim that collection or
its observer is deployed or composed into a live App.

Co-change uses one compatible population throughout: complete recovered final
comparisons from the same repository and declared window. `samples` is that full
eligible population. `subjectPullRequests` counts its comparisons containing the
selected subject file. Each companion has `together` (eligible comparisons containing
both files), `subjectPullRequests` (the subject-file denominator) and
`partnerPullRequests` (comparisons containing the companion). The chart meter is
`together / subjectPullRequests`: the share of the subject file's merged PRs that also
touched this companion. These counts describe the recovered population and do not
claim precision over unrecovered history. Consumers must use the named subject count
for the meter; partner frequency is a separate fact. The premium service's PR and
file surfaces compute these counts in one derivation (`cochange` in
`premium/service/index.mjs`) over their declared window; the App's cloud reads the
same fields from each Overview and Files row's `partners` (the strongest four companions over the selected
window) rather than computing its own.
The cloud's default distinct-merged-PR frequency counts each PR once; partial file
coverage exposes a possible count range instead of hiding missing comparisons.

`exportAnalytical(repositoryId)` and `importAnalytical(value)` own the separate
version-1 named numerical export. Original expiry survives restore, current consent
and tombstones still govern import, and import triggers no provider effects. These
are protected operator-store methods; no public export endpoint is opened here.
The version-1 export still expands every exact observation; import restores shared
timestamps in bounded sets, obeys the original expiry and retains the first-writer
identity. The `analytical_file_sizes` SQL view preserves the logical diagnostic
projection. It is not a writable legacy table.

Migration 0016 preserves already retained rows, including unknown/zero sizes and
their original expiry, by sharing their bounded fact sets before dropping the old
physical table. Old collectors cannot write that view. Operator rollout must stop
old writers and apply the schema together with this runtime; no mixed-writer
compatibility, deployed migration, reset or accepted data loss is claimed here.

## Qualification and remaining adoption

`node --test apps/github-app/analytical-data.test.mjs` qualifies derivations,
read-only collection against a provider double, disposable D1 publication/expiry/
deletion and the Worker HTTP entry. The authorization suite exercises the actual
session/OAuth service with a provider double and ordinary-reader denial/revocation.
This is local source/consumer evidence, not live GitHub, deployed D1 or real-user proof.

`node --test apps/github-app/analytical-size-storage.test.mjs` compares the actual
old/new D1 window queries and Turnover, checks retained-row migration, full export,
duplicate identity, capture reuse and multi-batch expiry. The existing capture
invocation suite exercises actual queued collection and recalculation with D1's
query ceiling. The storage tests use authored numerical populations; they are not
a forecast of service capacity or charges.

The current base supplies the accepted pathless foundation and revised
privacy/final-merged contracts. Remaining adoption work is to select the real
authorization/entitlement/current-policy adapters and exercise the authenticated
App. Final squash/rebase boundary recovery and incomplete import coverage remain
explicit operating seams.
The analytical App, including its separately selected experience and chart design,
remains the complete destination; this backend candidate does not close it.

## Community service and premium extension

The public service answers every surface from the common facts: the populations, the final merged comparisons,
current-policy interpretation, coverage, scope and entitlement, the pull-request surface's own named files, and the
period buckets. The rich file implementation is a separate extension joined through one optional argument,
`premium`: `{ files, file, pr }`, which the service calls only for an entitled reader.

- `files({ query, merged, all, premiumIds, store })` returns `{ files, sizeObservation }` for the Overview, History,
  Files and File detail surfaces: per-file Changed per merged PR, growth and shrinkage, observed sizes, turnover-v1
  per file, and the read-time tail observation. On the Overview and Files surfaces each row also carries `partners`:
  its four strongest co-change companions over the query window, from the same derivation as `cochange`.
- `file({ query, files, all, authorized, factsOf })` returns one file's detail with its 90-day co-change, or
  `undefined` for a file the reader has none of.
- `pr({ record, query, all, active, effective, prRow, factsOf, paths })` returns `alsoInProgress`,
  `recentFileActivity` and `cochange` for the pull-request surface; each `recentFileActivity` row names the files of
  this pull request it touched, with that file's Changed.

The extension is composed from a host, `{ kit, github, store, clientFor }`, so it imports nothing from the public tree:
`kit` is `analyticalKit` (interval arithmetic, `fileContinuity` and `turnoverEvidence`, validation helpers). The
turnover-v1 definition and its evidence rules stay public in `turnover-v1.mjs`; the file rows and exploration built
on them are the extension's.

Without the extension an entitled reader's Files and File detail answer `standing: "premium-not-provided"` with
`entitlements.premium.provided: false` and no files, never an empty list standing in for a computation; the
pull-request surface returns `alsoInProgress: null` and omits `recentFileActivity` and `cochange`. A Free reader's
answers are unchanged (`standing: "free"`).
