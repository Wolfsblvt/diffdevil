# Analytical App data

## Meaning

This owns the source contract supporting Overview, Pull requests, History, Files,
PR detail and File detail. It separates final merged comparisons from PR development
and from the older pathless, latest-observed history API. The implementation is a
source candidate, not a deployed or adopted App. Named-history admission depends
on acceptance of the revised privacy and final-merged product contract before landing.
The older pathless export and query contracts retain their original meaning.

## Read it

`apps/github-app/analytical-data.mjs` exports
`createAnalyticalDataService({ store, authorize, entitlement, currentPolicy, now })`.
Its `query(input, actor)` accepts:

```json
{
  "version": 1,
  "surface": "overview",
  "repositoryIds": [17],
  "from": "2026-09-01T00:00:00.000Z",
  "to": "2026-10-01T00:00:00.000Z"
}
```

Surfaces are `overview`, `prs`, `history`, `files`, `pr`, and `file`. Detail requests
select exactly one repository and supply `pullRequest` or `path`, respectively.
The Files metric is `mergedPullRequests` (default), `changed`, `rawChurn`, or
`turnover`. Repository IDs and paths remain separate, including in multi-repository
results. Times are canonical UTC ISO timestamps; `to` is exclusive. History uses
daily, two-day, weekly or calendar-month buckets. Flow declares its separate
13-week window and co-change its separate 90-day window.

Results identify the requested and authorized repository counts, retained coverage,
merged and recovered merged populations, policy basis, generated time and intervals.
Coverage is never inferred complete from rows being present. A number has lower and
upper endpoints; a null upper endpoint is unbounded. Empty medians are unavailable
with zero samples. Median envelopes include every bounded or unrecovered PR rather
than selecting only exact measurements. Even sample medians average the two central
endpoints. Missing final comparisons count as non-negative, unbounded observations.
Unknown size bands remain separate from the smallest band.

The server's `currentPolicy({ repositoryId, actor })` returns `{ id, compiled }`
using the existing shared-engine compiled policy, or null while unavailable. Every
retained numeric file, including excluded files, is available to shared-engine
policy replay. `evaluatePolicy` produces current totals and size judgments without
replaying provider effects. When a current policy is unavailable, results explicitly
use unfiltered base facts and do not claim current-policy interpretation. Original
recorded policy/band, desired label and observed label remain separate PR-detail lanes.

File history exposes base numerical observations with explicit current-policy
inclusion. Its scope and co-change scope are `all-observed-file-facts`. A file's
`prChanged` comparison uses the same all-observed PR total; `prPolicyChanged` is
the distinct current-policy total. An excluded file's physical change must not be
compared as if it were included in the policy-filtered PR quantity.

`authorize` must check current repository visibility at every invocation. The service
checks before storage and again before returning data. `entitlement` returns the
server-selected `free`, `pro`, or `business` plan for a repository namespace; a null
repository requests the viewer's plan for cross-repository aggregates. Neither the
request nor the actor's repository ID list is sufficient authority. A shared paid
namespace keeps its paid feature access for an authorized Free reader, while a
Free viewer receives no premium aggregate assembled across paid namespaces.

`authorization.mjs` exposes `analyticalQuery({ session, query })`, using its existing
opaque session, current GitHub-user authorization and positive repository read
access. Administration is not required. `analytical-http.mjs` supplies POST
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
URLs, query strings, bodies or file paths. The visible File-detail route remains
an experience-owned boundary: if it places a path in its URL, browser history can
retain that name. The privacy/source reconciliation must document that surface or
select an opaque route identity. The no-referrer header prevents outbound GitHub
links from forwarding an App path; it does not erase browser history. Deployment
must exclude full URL/query/body capture from provider request logging too.

## Collect and retain it

`analytical-collection.mjs` exposes `collectAnalyticalPullRequest` with an admitted
read client and store. It checks history consent, resolves the numeric repository
identity, reacquires provider lifecycle facts, analyzes open work through the shared
GitHub acquisition engine and checks provider identity again before publication.
It retains no author, title, PR prose, source or patch. The Queue admits closed,
ready-for-review and converted-to-draft events in its existing minimized envelope.
Live effect execution precedes collection. Closed or execution-disabled PRs may still
collect under positive history consent; analytical failures retain a separate stable
`analytical-collection` repair in the existing recovery home. Collection recovery
does not replay completed provider effects. Ready-for-review time remains
unknown unless supplied by a recovered lifecycle observation; current ready state
does not invent a historical timestamp.

A multi-parent merged commit supplies its first-parent-to-merged-commit final
comparison. A single-parent squash/rebase result requires an explicitly recovered
`resolveFinalComparison` boundary; it never falls back to the PR's old head diff.
The comparison API must confirm the direct base. The numeric report retains
incomplete coverage when the provider's finite file listing reaches its 300-file
limit or disagrees with the parsed diff. Content reads are transient and supply line
counts at immutable before/after revisions; a 404 is unknown, except where a confirmed
creation/deletion itself establishes absence. Binary sizes remain unavailable.

`D1AppStore.recordAnalytical` atomically publishes one allowlisted version-1 PR record.
Development revisions are keyed by base/head; a separate `final` requires a direct
`final-merged-comparison`. `recordAnalyticalSize` stores independent default-branch
size observations. Migration `0009_analytical_app.sql` keeps both in separate tables,
under current opt-in consent, expiry, deletion tombstones and offboarding cleanup.
This new analytical path keeps collection independent of execution consent while
requiring current history consent and installation/repository access.
This does not relabel `history_records` or reinterpret pathless rows as named files.

Turnover is **Changed during the period divided by time-weighted average file size**.
Actual observations bracketing period boundaries and matching consecutive revision identities
can establish a finite denominator. Missing endpoints, mismatched revisions or size
discontinuities widen it. An unrecovered merged contribution may have touched any
file, so named totals and turnover widen too. Creation, deletion or rename in the
period is unavailable with that reason. The collector supplies before/after merge
sizes and then calls `captureDefaultBranchSizes` to observe the default branch's
known text files. It checks the branch again before publication and refuses a moved
revision. Retained snapshots immediately before/after a selected period can bracket
its endpoints; matching revision identities establish continuity, not interpolation
from churn. This candidate does not claim that collection or its observer is deployed.

Co-change uses one compatible population throughout: complete recovered final
comparisons from the same repository and declared window. `together`, `own` and `of`
are counts in that population, not precision claims over unrecovered history.
The cloud's default distinct-merged-PR frequency counts each PR once; partial file
coverage exposes a possible count range instead of hiding missing comparisons.

`exportAnalytical(repositoryId)` and `importAnalytical(value)` own the separate
version-1 named numerical export. Original expiry survives restore, current consent
and tombstones still govern import, and import triggers no provider effects. These
are protected operator-store methods; no public export endpoint is opened here.

## Qualification and remaining adoption

`node --test apps/github-app/analytical-data.test.mjs` qualifies derivations,
read-only collection against a provider double, disposable D1 publication/expiry/
deletion and the Worker HTTP entry. The authorization suite exercises the actual
session/OAuth service with a provider double and ordinary-reader denial/revocation.
This is local source/consumer evidence, not live GitHub, deployed D1 or real-user proof.

The integration owner must reconcile this candidate with the accepted pathless
foundation repair and revised privacy/final-merged contracts, select the real
authorization/entitlement/current-policy adapters and exercise the authenticated
App. Final squash/rebase
boundary recovery and incomplete import coverage remain explicit operating seams.
The analytical App, including its separately selected experience and chart design,
remains the complete destination; this backend candidate does not close it.
