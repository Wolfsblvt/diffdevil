# Wirt commercial link and entitlement consumer

## Meaning

This document owns the managed App's product side of the Wolfsblvt Works (Wirt) commercial interface: the customer-authorized link between a diffdevil GitHub account and a Works account, the signed benefit-projection receiver, ordered and idempotent application with its product report, unlink, organisation-capacity bindings with their observed GitHub authority, restore reconciliation, and the entitlement adapter the analytical backend consumes. Wirt's adopted producer contract — commercial projection and its runtime guide at `04e253a8`, plus its later product restore rule at `9502c4b` — owns the payload, signing grammar and producer behaviour. The App plan and management design owns the product offer and customer experience once accepted. This is source behaviour, not a deployed receiver, a configured Works client, an active subscription or observed provider adoption.

The service-connection lifecycle below separates actual funded purpose, browser grants and a durable disconnect preference. Its route-neutral disconnect/reconnect and logout facts are supporting backend contracts for the held Account design.

The environment selection below owns the production/staging relationship. It
separates that settled model from source support, a configured TEST consumer and
admitted live commercial operation.

## Signed TEST commercial time

Unadvanced and production producers retain `wirt.benefit-projection/v1`, with no
`commercial_clock` field and zero offset. An advanced TEST producer uses
`wirt.benefit-projection/v2`, adding the signed top-level object
`commercial_clock: { offset_seconds, effective_at }`. It has exactly those two
keys: a safe integer offset of at least one second and a real UTC instant ending
in `Z`. Missing, additional or invalid clock fields refuse the entire projection
with `E_COMMERCIAL_SHAPE`; they never select zero. A v1 message carrying a clock
is also refused rather than silently discarding that time basis.

The full applied projection remains the only durable clock source. Existing
stream order, lineage, replay and restore protections apply unchanged. Commercial
now is the current real instant plus the latest applied offset, running at normal
speed between deliberate producer steps. `effective_at` is diagnostic and does
not reinterpret historical observations. A fresh service reads the offset from
the same stored projection; there is no clock ledger or second ordering scheme.

The account-owned status exposes `commercialClock` for the existing Manage
presentation. Advanced context shows commercial and real UTC time beside plan
and reward dates, preserving current and queued coverage. Discount claim and
validity presentation compares against commercial now. Exercise/application and
other commercial dates retain their producer values; their authoritative state
and actions remain at Works. Quote expiry dates are commercial, while cached
preview creation/expiry records are real instants. A later applied offset can
also lapse a displayed preview before its previously stored real expiry.

Survey campaign windows, genuine invitation/reminder delays, recorded use and raw
completion occurrences remain real. No historical offset is inferred for a
retained operation from the latest projection or `effective_at`. Security/session
clocks, HMAC skew, nonces, record/retry/cache timing, provider observations and
`generated_at`/`ended_at` keep real time. Entitlement still trusts Wirt's funded
or grace standing; passing a commercial term date does not create a local billing
or entitlement transition. `wirt.link-ended/v1` is unchanged.

This is paired source support for the settled producer interface, not evidence
that the producer is installed, a TEST clock was advanced, or the two installed
services agree. [D092](../DECISIONS.md#d092-advance-only-the-test-commercial-calendar)
preserves the selected tradeoff and genuine-use boundary.

**Unresolved producer consequence:** the current two-field clock cannot map a
retained real operation to its historical commercial beta-access date or establish
the real start of genuine invitation delay after a prior step. The existing
`qualifyingUse`/`betaAccessWindows` comparison is unchanged; this candidate does
not claim it works across advanced history. Wirt retains the bounded authoritative
time/access facts and amended signed contract. That interpretation remains
incomplete, rather than selecting permanent unresolved eligibility, a general App
history interpreter or a smaller invitation capability.

## Wirt environment selection

Each App deployment selects **one complete Wirt environment at a time**.
Production Wirt is the shared commercial service for active payments and products;
a product's own maturity does not require another production Wirt server. Persistent
Wirt staging mirrors the service for development, fixes, tests and new integrations
without changing production commercial data.

| App deployment | Ordinary Wirt target | Deliberate qualification |
| --- | --- | --- |
| Production diffdevil | Production Wirt, when that commercial service is admitted | An explicitly admitted single TEST target may serve a bounded test; it is not the future production topology |
| Internal development staging | Wirt staging | One production target may be selected when qualification requires its actual production consequences |

An exception still selects one target. There is no simultaneous attachment,
fan-out, common report cursor or fallback to a historical registration. A staging
label does not make a request to production Wirt a test-only effect. Neither a
source configuration edit nor this contract admits a live target change, payment,
consent or customer operation. [D089](../DECISIONS.md#d089-select-one-complete-wirt-environment-per-app-deployment)
preserves the decision and its reason.

Treat the selected origin, public OAuth client, registered App callback and
projection receiver, customer continuation, signing interpretation and mediated
key custody as one consumer configuration. Its link/grant/application state,
projection order, outbox and report acknowledgements belong to that relationship
in that deployment's `APP_DB`. Recognisable account or product names across
environments do not make those records, commercial benefits or payments shared.
The [staging handoff](app-staging.md) owns the concrete source assignments and
operating qualification; [recovery](app-recovery.md) preserves their interpretation.

### Implemented boundary and delivery sequencing

`commercialFromEnv()` constructs one client from the configured `WIRT_ORIGIN`,
OAuth callback/client and signing set. `createWirtClient()` sends its requests to
that exact origin and refuses redirects; neither chooses a second environment.
The source supplies no automatic target-switch or cross-environment transfer of
stored links, grants, orders or report cursors. Changing configuration alone does
not reconcile those records with a different producer.

The complete paid-capable App may be delivered before production Works activation.
Until a complete production target is admitted, absent/refused consumer configuration
is reported as unavailable/unconfigured through the existing App behavior. It must
not silently select Wirt staging or be described as replacing the selected program
with a Free-only build. Existing local Free behavior is distinct from the contents
of a Community or premium-composed program and from actual Works-funded entitlement.
The loopback Works stand-in is local fixture behavior, not a hosted fallback.

The current staging TEST consumer and its A/B links, applied orders and report
history remain with their admitted staging relationship. The original
production-origin TEST registration, callbacks, valuable history and compatibility
obligations remain preserved evidence; their existence neither selects an active
production target nor proves App-held links. Any actual retained relationship
receives the [existing preservation and admission disposition](app-staging.md#recovery-and-retained-test-state)
before its target or interpretation changes. None of this documentation switches
the functioning staging consumer or admits production Wirt/live commerce.

## Trust boundary

The native Manage link form initiates through an Origin-checked POST to the App.
The client validates the returned intent ID, exact Works origin and consent path
before creating the browser-bound local attempt. A successful initiation commits
a private, no-store 200 HTML document with an immediate native refresh and a
fallback link to that validated consent URL. It adds no routine click and works
without JavaScript. Refusals keep their existing local redirects and messages.

Committing the document ends the form-submission redirect chain before navigating
to Works. Chromium otherwise applies `form-action` to later authentication hops
and can block a legitimate Works sign-in on another origin. After the handoff,
Works owns its authentication redirects, as with an ordinary top-level link; the
App does not constrain those later destinations. The exact first consent-origin
and path validation, state, browser binding, PKCE and callback protections remain.
App document `form-action` still admits only self, GitHub and the single configured
`WIRT_ORIGIN` from a successfully composed consumer. No request parameter or
provider-returned URL selects that allowlist. Missing/refused configuration adds
no external form destination; the local stand-in stays same-origin.

Refused Manage link, funding and connection requests append a failed-request event
through the existing administrative Audit path before returning their visible message. A retained pending
link remains unfinished; its retry does not record an applied link. These events carry
the authenticated actor and fixed product reason, never exception text, arbitrary
provider codes, authorization destinations or raw payloads. The existing best-effort
Audit write does not change the commercial result if the record store is unavailable.
Account-level link and connection events belong to the authenticated account;
submitted repository or namespace selectors cannot redirect their record.
Funding and release events use an organisation target only when the commercial
service established its identity and the relevant authority. Names are server-owned.
Failures before that point stay on the signed-in account. A release with no binding
keeps its existing response and records no applied effect. A funder can still
withdraw their own funding after losing GitHub administration. That performed release
stays in the organisation's Audit even when its name is no longer retained: the record
uses `organisation N` with its established numeric identity, without fetching or
restoring the protected name. These server-only effect facts do not change the
commercial HTTP response.

New link intents include `product_account_label` in the existing signed
`POST /api/wirt/diffdevil/link-intents` JSON alongside `product_account`, `challenge`
and `state`. The commercial service uses the authorization service's existing
session-bound `read`/`profile` route to fetch the current GitHub handle without the
dashboard's profile cache. The profile's numeric ID must match the authenticated
initiator; a missing, malformed, mismatched or unavailable profile returns
`503 E_COMMERCIAL_UNAVAILABLE` before creating an intent or local attempt. Browser
body/query labels are not read. The raw handle (without an added `@`) is display
meaning only; the numeric product account remains authority. The accepted handle
envelope includes letters, digits, hyphens and underscores, with at most 39
characters in the whole handle. This includes GitHub's
[Enterprise Managed User shortcode suffix](https://docs.github.com/en/enterprise-cloud@latest/admin/managing-iam/iam-configuration-reference/username-considerations-for-external-authentication).
The exact JSON body, including this label, uses the existing signature grammar,
keys and client.
No local schema, stored handle, permission or login method is added.

This sender must be paired with Wirt's recognizable-consent consumer, which retains
the authenticated label on that exact intent. The original consumer validates the
numeric account, challenge and state, then stores only those known fields. It
accepts but discards the added label, so request acceptance there does not establish
recognizable consent. Conversely, a sender without the field cannot supply recognizable
consent to the repaired consumer, and a browser label is no substitute. The paired
consumer can accept an unlabelled intent with a null label and return 201, while
refusing its approval with 409; intent acceptance is separate from approvable
consent. diffdevil's wire double qualifies intent creation, not Wirt's native
consent or approval handlers. New consent therefore needs the accepted matching
producer/consumer cut before customer use;
source and doubled-provider checks do not prove that installed pairing. Existing
attempts are neither rewritten nor relabelled. An approved pending establishment
still resumes its original intent and retained owner grant before any new profile
read, preserving its existing recovery path without another consent.

A link departure references its server-owned attempt in the existing departure
snapshot. The signed-in account's status read derives only public lifecycle
standing from that exact account/attempt; an older departure without a reference
reads the account's sole retained unfinished attempt; absent or ambiguous candidates
stay unknown rather than selecting another attempt. Before consent, an open attempt is
recognised only in its initiating browser. An expired attempt needs no live cookie;
an approved retained grant is pending until establishment finishes, including after
the callback cleared the browser cookie. Missing or unreadable evidence is unknown,
not a completed external step. No state hash, verifier, browser binding or grant
is sent in the status body. The existing expiry, denial, pending and retry copy is
used on Manage; an open/unknown return has no completed-Works timeline. The existing
unavailable banner owns a refused read, and a confirmed active link stays finished
even when a spent callback is replayed. Rendering never consumes, resumes or starts
an attempt; explicit retry keeps the existing same-intent recovery semantics.

Commercial standing selects capability; it never grants GitHub authority. Repository and analytical reads still check current GitHub access through the existing authorization service at every use. A paid namespace keeps its plan for any authorized reader, and a paying viewer gains nothing in a namespace their subscription does not fund.

The product account is the signed-in GitHub user's numeric ID from the existing opaque session. A namespace is the numeric GitHub account of the repository's installation, captured from webhook identities (`installation.account.id`, or `repository.owner.id` on pull-request events). An organisation becomes a funded namespace only through a binding to a purchased capacity slot, made by a funder who currently administers that organisation on GitHub. One organisation has at most one funder. The authorization service's `organisationAuthority` checks administration through the viewer's own GitHub authorization; its provider adapter's `checkOrganisationAdministration` must confirm that the numeric account is an organisation the user currently administers, never merely an account they can see.

The adapter first uses [`GET /user/memberships/orgs`](https://docs.github.com/en/rest/orgs/members#list-organization-memberships-for-the-authenticated-user), which supports GitHub App user tokens without Members-read. Each membership carries the organisation's numeric ID and login together with role and state; only `active` / `admin` establishes administration. Lookup continues through pagination until the requested membership or the complete list. A returned membership keeps this working permission-free route; a provider refusal, incomplete failed read or malformed response remains unknown.

A complete list is the App user token's view, not proof that a person is not a member. GitHub limits [user-to-server access](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user) by the person's access, the App's permissions and where it is installed. When the list omits the target, the adapter uses the documented [`GET /user/memberships/orgs/{org}`](https://docs.github.com/en/rest/orgs/members#get-an-organization-membership-for-the-authenticated-user) with the same user grant. Numeric funding authority first resolves the organisation through that person's reachable installation, checks the exact installation admission, then matches the returned numeric organisation and user IDs. Manage's login read checks the returned login and user ID. Only a valid target response supplies a role. Refusals, including 403/404, remain unknown with their actual HTTP status. If no reachable admitted numeric target is found, the adapter raises `E_GITHUB_MEMBERSHIP_UNCONFIRMED`. Funding withholds its organisation display label, and Manage preserves authorised repository reading without caching a false non-admin role.

The targeted endpoint requires Members-read. The registration source currently requests no such permission; this source fallback does not grant it or change any installed permission, credential or authorization. Its live success under the current registration is not claimed. A list omission alone neither diagnoses a permission failure nor authorizes changing permissions. An operator must judge the App registration, exact installation and user authorization separately before selecting a provider change. Effective permission is a prerequisite for the documented targeted route, not evidence of a successful response or current administration. Local doubles qualify the response handling, not a real provider grant or live administration. Namespace-owned automatic setup and fresh authority checks for delegation remain unchanged.

There is a request cost even when the target read refuses: each uncached login-based organisation-role encounter that exhausts the list adds one targeted call. Numeric funding authority first pages the person's installation list and attempts the target read only for a reachable admitted organisation. Failed authority reads are not cached, so later ordinary encounters retry and incur that latency and rate-limit cost again. This source does not add a cache or suppress those calls under the current registration.

Membership identity and state are validated independently of the provider's role vocabulary. An active non-admin role, including `billing_manager`, maps to the App's non-administrating `member` role; pending membership maps to `none`. Those are positively observed non-administration. List omission, a refused target read or lost reachable installation does not establish removal or nonmembership; it leaves authority `unknown`. Both `absent` and `unknown` withhold organisation premium use and its display label while funding remains intact, as described below. A billing role in an unrelated organisation does not invalidate current administration of another organisation. This is an App authority projection, not a grant of GitHub repository membership or read/write access: those still come from the person's currently accessible installation repositories.

## Funding and observed authority

Funding and GitHub authority are separate facts. A binding is commercial: it stays until the funder releases it or rebinds the slot, the applied capacity no longer contains its slot, or the link ends. The funder's organisation administration is a provider fact recorded on the binding as `authority_observed` (`present`, `absent` or `unknown`) with `authority_checked_at`; it is an observation at that time, not durable truth.

It is observed again where it matters:

- binding or rebinding a funded slot, identifying the funder through their session and checking the enabled service connection;
- each status read by the funder, through the enabled service connection;
- each organisation entitlement encounter, through the funder's retained authorization;
- sending an organisation-bearing report to Wirt, before disclosing its label;
- an organisation administrator's disconnect, through that administrator's session; and
- scheduled maintenance, for observations older than a day and for every `unknown` one, through the authorization the funder still retains with this product (`observeOrganisationAuthority`).

Every check records its result. A check that cannot observe authority — the funder's service connection is disconnected, authorization is revoked or expired, or GitHub does not answer — records `unknown` with its time, so an earlier `present` never stands in for current authority. Service checks and sessionless grant retention require a bound organisation, an enabled connection and an active-link projection whose tier is Pro/Business and standing is `funded` or `renewal-in-grace`. An ended or `first-payment-pending` projection may still carry capacity and bindings; those do not earn retention or provider calls. A new binding in that state refuses with `E_COMMERCIAL_NOT_FUNDED`, preserving existing bindings for recovery. Logout, account switching and browser-session expiry release browser access, not an enabled funded service purpose. Removing the last binding (by unbind, capacity removal or link ending), ending funded standing or disabling the connection releases that purpose; ordinary authorization cleanup deletes a grant with no remaining purpose, browser session or pending sign-in. Explicit grant revocation and expiry still take precedence. No new provider permission, credential copy or recurring sign-in is introduced. A changed observation re-reports the bindings to Wirt; a confirmed one only moves its time. Report transport re-observes before disclosure and selects the replacement report if the queued observation changed.

A restore hold retains only the last applied funded purpose while Wirt reconciliation is pending. It still returns unknown entitlement and suppresses service observations; a restore flag never earns retention for an ended/pending projection. The existing authenticated current-answer reconciliation releases the hold. Live historical restore of user grants and disconnect preferences, including preserving a later disconnect against an older database snapshot, remains a recovery qualification boundary before operating that route.

The provider contract's explicit `verifyUserAuthorization` answer `{ valid: false }` means definite invalidation: the authorization store atomically clears that exact sealed grant and invalidates its sessions/artifacts. The material compare-and-set prevents an older invalid answer from revoking a concurrently renewed grant. A thrown transient/rate-limit failure or missing validity answer withholds use without selecting revocation. A real provider adapter must preserve that distinction; no provider webhook or remote revoke is introduced here.

The GitHub adapter treats [token-check HTTP 404](https://docs.github.com/en/rest/apps/oauth-applications#check-a-token) and a confirmed different numeric user as definite invalidation. Other HTTP failures (including App-credential failure), transport/cancellation, malformed or missing identity evidence remain unavailable. On refresh, only the documented [`bad_refresh_token`](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app#bad-refresh-token) answer in a successful or HTTP 400 OAuth response establishes invalid/expired stored refresh material. Server failures and other OAuth errors remain unavailable. A successful rotation must carry both replacement tokens and positive expiry values before the service replaces the sealed grant through its existing compare-and-set. No automatic retry or new consent policy is introduced; a later ordinary encounter can recover after a transient failure. Explicit disconnect/revocation remains independent of provider availability. Synthetic provider/local-D1 evidence is not a live GitHub grant qualification.

Absent or unknown authority withholds the organisation's premium use and its display label, but does not unbind the slot or change the subscription: funding exists, and GitHub authority needs attention. The funder's own plan is unaffected. The funder may release their slot even after losing authority, and a current organisation administrator may disconnect the product from that organisation; these are different authorities with different consequences. No GitHub organisation-membership event is subscribed today, so a loss is observed at the next encounter or maintenance pass rather than as it happens.

A fully applied order is reported as `applied` whatever the bindings' authority. The lapse travels as `bindings[].authority` (`absent` or `unknown`, with no label); Wirt treats `partially-applied` as a disagreement and opens a case, so the product reserves it for an order it applied only in part.

## Independent GitHub connection revocation

The route-neutral `commercial.revokeFundingAuthorization({ session, method, origin })` is the backend action for the future designed Account experience. It accepts only a usable opaque browser session belonging to the caller and an allow-listed, non-GET origin/method through `authorization.revokeAuthorization`. The session establishes whose connection may be disconnected even if GitHub no longer answers; a browser-supplied user ID cannot choose another account.

The authorization service clears that user's locally protected GitHub material, invalidates all its browser sessions and pending one-time sign-in artifacts, and records its disconnected service preference in one D1 transaction. The commercial service then records `unknown` authority and drops labels for that user's bound organisations, queuing the corresponding report through the ordinary outbox. It does not change the Works link, its owner grant, paid projection, funded slots or bindings. It returns private/no-store headers and a clearing session cookie. The preference survives grant cleanup, expiry and later ordinary sign-ins: browser access can resume while funding authority stays unknown. A new binding or dashboard status read does not bypass that preference.

`commercial.reconnectFundingAuthorization({ session, method, origin })` delegates the deliberate same-origin, non-GET action to `authorization.reconnectService`. The usable session supplies its owner; the current provider-verified same-scope grant supplies a material lease for committing the enabled preference. It grants no additional scope and changes no funding/binding. The commercial service re-observes bindings through the ordinary observation/outbox path. Its receipt is `{ ok: true, result: 'service-reconnected', authorityReconciliation: 'recorded' }`, or `ok: false` with `authorityReconciliation: 'required'` and a bounded code if that later stage fails. Enabling service is not a claim of present administration or delivered Wirt reports. Current-authority checks still gate every premium encounter. A failed reconnect lease refuses with `E_SERVICE_RECONNECT_UNCONFIRMED`; the caller must read connection standing before retrying an unconfirmed write.

`authorization.serviceConnection({ session })` returns an authenticated local disclosure fact. `authorization.logout({ session, method, origin })` returns that fact after session revocation as `body.serviceConnection`: `retained` means an enabled funded purpose and nonexpired, unrevoked protected material remain locally; `disconnected` means the preference is off; `not-retained` means no retained funded grant; `unavailable` means a funded row has unusable material; `unknown` means an unusable cookie or unreadable post-logout fact. These are local retention facts, not a live provider-validity assertion. Logout remains committed when the later fact read fails; unknown must stay unknown in disclosure. Both results use private/no-store headers, and logout clears the session cookie.

After the authorization service confirms revocation, the commercial receipt distinguishes that performed effect from authority/report reconciliation. Normal completion is `{ ok: true, result: 'authorization-revoked', authorityReconciliation: 'recorded' }`; this acknowledges local grant removal and committed observations/outbox state, not delivery to Wirt. If the grant committed but the subsequent observation or outbox write failed, the receipt is `{ ok: false, result: 'authorization-revoked', authorityReconciliation: 'required', code }`. The Account caller must preserve that performed effect and expose the reconciliation remainder, rather than ask the now-disconnected session to repeat revocation. A later entitlement/report encounter or eligible existing maintenance can reconcile after the underlying store failure is repaired; current entitlement checks cannot use the revoked grant. Wirt report delivery remains `flushReports()` or existing maintenance. If the authorization store cannot confirm its own transaction, the service instead refuses with `E_AUTHORIZATION_REVOKE_UNCONFIRMED`; the caller must not claim either completed revocation or unchanged authorization from that error.

This is removal of the product's locally retained authorization; it makes no claim that GitHub's provider-side OAuth permission was remotely revoked. No Account URL or screen is selected here. Before customer adoption, the designed account experience must disclose same-scope retention at bind, explicit reconnect and logout, preserve/show disconnected standing at sign-in, provide independent disconnect/reconnect with their use-versus-funding consequence, clear browser state from the returned cookie, and distinguish recorded authority from report delivery. [Account access](../dashboard-access.md#browser-access-and-the-funding-service-connection) and [privacy/data](../PRIVACY-AND-DATA.md#distinct-purposes-and-lifetimes) own those selected requirements.

## Routes

All routes live on the App Worker. The receiver needs only D1 and the signing keys; the browser routes also need the installed authorization adapter, a protector and the dashboard origins, and otherwise answer `503 E_COMMERCIAL_UNAVAILABLE`.

| Route | Caller | Effect |
| --- | --- | --- |
| `POST /integrations/wirt/projection` | Wirt scheduler, signed | Verify, apply in order, answer 2xx, then send the report |
| `POST /integrations/wirt/link` | Same-origin signed-in browser | Resume an interrupted establishment, or create a Wirt intent with S256 PKCE and return Wirt's consent URL, binding the browser |
| `GET /integrations/wirt/link/callback` | Wirt's redirect | Exchange the code, establish the stream, seed from the pull fallback; `303` to the continuation with `works-link=<outcome>` |
| `POST /integrations/wirt/unlink` | Same-origin signed-in browser | Revoke at Wirt with the owner token; benefits stop on its `204` |
| `POST /integrations/wirt/bindings` | Same-origin signed-in browser | JSON `{action: bind|unbind, slot, organisationId}` |
| `GET /integrations/wirt/status` | Signed-in browser | The viewer's own plan, standing, applied order, capacity and bindings with observed authority and its time, plus the display-only grants, price protection and link date the Manage console presents; re-observes that authority |

Callback outcomes are `linked`, `pending`, `denied`, `expired`, `conflict`, `ended`, `invalid`, `session-required` and `failed`. `pending` means Wirt's answer was lost or unavailable after consent; the next link request resumes the same intent. The continuation URL is deployment configuration; the App defaults it to its one admitted manage-plan destination, `/manage/plan`, where [Plan & funding](../../apps/app/README.md) reads the outcome and the departure it recorded before the person left.

## Closure and in-flight establishment

Personal account closure refuses an active link and an unfinished consumed link
attempt. Consuming a callback and creating its attempt both compare the initiating
browser session at their D1 commit. If closure commits first, it retires unconsumed
attempts and ends sessions; the delayed continuation cannot exchange/establish
through that attempt. If callback consumption wins, closure remains unchanged
while code exchange and establishment resolve. An expired attempt with no retained
exchanged grant can be retired; a delayed exchange then cannot retain its result
or proceed to establishment through the retired attempt.

An exchanged owner grant is persisted before the remote establishment call. That
attempt and grant remain until an authoritative outcome, including across the old
retry expiry, maintenance, a lost remote response or a failed local link commit.
Retry resumes the same intent and association. A refused refresh alone cannot
prove that the remote association never existed: its fact remains pending, holds
closure and does not silently begin another consent. Such an unrecoverable grant
needs authoritative remote association reconciliation; this source does not invent
a provider action or claim that local erasure ended it. Definite intent refusal
or an authoritative ended answer can still finish the attempt normally.

The local established-link commit compares the consumed unfinished attempt and
moves its retained grant to the active link while finishing that attempt atomically.
These are the existing session/attempt/link boundaries, without a command journal,
new recurring worker or whole-App lock. New sign-in and deliberate later consent
remain ordinary new operations. Source fixtures qualify the local conflict and
independent wire double; actual Wirt/customer adoption remains separate.

### Queued paid coverage in Manage

The optional `commercial.paid_continuation` is read from Wirt's public projection
contract: `state` (`paid-awaiting-start`, `benefit-awaiting-start`, or
`needs-reconciliation`), `confirmed_on`, `funding` (`paid` or `benefit`), `tier`
(`pro`), `cadence`, and the half-open commercial-date `period` (`started_on`,
`ends_on`). The account's authenticated status exposes only these fields as
`commercial.paidContinuation`, with `confirmedOn`; private financial identifiers
and provenance are excluded. Missing legacy data remains unknown. Malformed
continuations refuse a new projection, preserving the last applied state.

Manage places the queued period beside current coverage and the producer's
`next_renewal`. It does not compute an anchor, amount, payment result or entitlement,
and does not activate a future period from the App's clock. Wirt supplies the
following renewal and performs activation. A reconciliation state stays explicit;
Works' existing plan and benefits pages retain detail and confirmation. Local
signed-message/D1 and browser qualification establish this consumer boundary,
separately from installed Wirt/App compatibility or real commercial use.

## Configuration

The [single-target environment model](#wirt-environment-selection) governs this
configuration. Select its fields together for the same admitted producer and App
deployment; a matching origin alone does not establish client, key, callback or
stored-state compatibility. Source templates and historical registrations do not
supply missing protected inputs or a live target selection.

| Binding | Meaning |
| --- | --- |
| `WIRT_SIGNING_KEY_CURRENT` | Shared HMAC key, at least 32 bytes, mediated by Ops; enables the receiver |
| `WIRT_SIGNING_KEY_PREVIOUS` | Optional overlap key during a rotation |
| `WIRT_ACTIVE_KEY_ID` | `current` or `previous` for outbound signing; default `current` |
| `WIRT_ORIGIN` | Wirt's HTTPS origin; enables outbound intents, tokens, pull, reports and unlink |
| `WIRT_OAUTH_CLIENT_ID` | The public authorization-code client Wirt registered for diffdevil |
| `WIRT_LINK_CALLBACK_URL` | The exact registered callback, e.g. `https://app.diffdevil.dev/integrations/wirt/link/callback` |
| `WIRT_LINK_CONTINUATION_URL` | Where the callback returns the customer |

Wirt's `WIRT_DIFFDEVIL_PROJECTION_PUSH` must name the exact receiver URL: its path is part of the signed bytes.

## Receiving and applying

The receiver reads at most 65,536 bytes, refuses a query, and verifies `X-Wirt-*` HMAC-SHA256 over the exact method, path, account header, timestamp, nonce and body hash before reading the payload. More than five minutes of skew, an unknown key ID or a reused nonce (retained ten minutes) is refused. The signed account header must equal the stream's product account, and the link must be known for that account; otherwise the answer is an indistinguishable `404`.

Ordering follows the contract: an equal `(epoch, version)` is a no-op that re-reports the same applied order; a lower one is not applied and reports what was applied; a greater one replaces the whole commercial state. A different Works account on the same link re-keys only when the recorded account is in `account_lineage`; anything else is reported as `rejected`. Premium needs `funded` or `renewal-in-grace`. A slot missing from the applied capacity unbinds its organisation without touching repository data.

Explicit `commercial: null` in `wirt.benefit-projection/v1` has two accepted meanings, both with empty capacity/grants/pending and null protection. A reward-only answer carries at least one readable funded component, each queued or expired. A confirmed-empty answer instead carries explicit empty `funded_components`, `beta_grants` and `participation_rewards` arrays: the linked account has no Works-provided coverage or benefits. Missing or unreadable component facts, empty components without explicit absence in the other benefit families, other-state components (including active-without-base), and missing or malformed commercial objects remain invalid producer input. Rejection does not replace the last applied state or report a new applied order. Ordinary full commercial projections retain their wider component-state vocabulary. Both null branches use the same receiver, pull, ordering, outbox, restore hold and terminal-link rules, applying and reporting the real supplied order. Replacing a funded projection with either state removes its slots and funded service purpose, without ending the Works link or altering repository data. Neither grants a base subscription, GitHub access, organisation slot or price protection; diffdevil's local Free behavior remains available under its own rules. A source-unavailable `409` is still unavailable, never confirmed empty, and a signed terminal `410` still ends the link. Later higher-order funded or reward-only answers can use the same active relationship.

Manage presents confirmed empty coverage as a linked Free account with no Works-funded benefits, its actual local Free allowances and the existing Works destinations. It does not claim rewards or keep waiting for a first answer after an order was applied. This is distinct from the reward-only presentation below and from a restore reconciliation hold. Source and disposable provider evidence do not establish installed pairing or live application/reporting.

After the matching App build, `npm run qa:app:works-entry -- --empty-coverage` exercises the native consent/callback journey with a confirmed-empty provider double, the applied order and queued report, and the rendered Plan & funding and Manage overview states. It preserves the ordinary harness's refusal and same-intent recovery cases; results and captures are under the target's `qa/works-entry/empty-coverage/` output.

Status exposes an allow-listed, display-only `fundedComponents` view of Wirt's optional `benefits.funded_components`: identity, public name/reason, state and supplied dates. Absent or unreadable component facts are unknown (`null`), distinct from an explicit empty list. These facts select no entitlement, capacity or binding; Wirt retains their management. Manage distinguishes an applied reward-only answer (Free, with its queued/expired benefits and Works exits) from an unseeded link waiting for its first answer, and from a restore reconciliation hold. Overview names the linked benefits in information tone. Queued rows explain automatic start with compatible Pro or Business coverage before the supplied deadline, without an Apply action. The linked Free capacity card follows the actual allowances: a finite Free pool or explicitly unlimited repository capacity on this deployment. A slot matched to a component reward uses finite-term ending copy and the existing Works benefits destination; it does not imply customer removal or automatic renewal, and an open slot is not presented as funding an organisation. Paid-slot removal retains its ordinary renewal presentation. The existing beta-survey campaign and its discount/time reader remain unchanged; no component campaign or binding product is introduced. Source and local doubled-provider qualification do not establish installed-producer, live consumer or private composition adoption.

Every link change compares and advances the link's revision and writes its own unique transition token; each binding, refusal and report written with it requires that exact token. A transaction that lost the race, including to a terminal unlink or a grant rotation, leaves nothing behind and is decided again.

A link-ended notice, or a signed `410` answer to a pull or report, ends the link permanently: benefits, bindings, owner grant and unsent reports stop together, and no later report is sent. A projection for an ended link is refused.

## Reports and recovery

Every application, binding change, refusal or changed authority observation writes one report to a D1 outbox in the same transaction as the state it describes. It leaves after the push answer, because Wirt holds that stream's lock until it receives one; a lost report is recovered by Wirt's own redelivery, by the next local change, or by scheduled maintenance. The report version is clock-derived — the later of the previous version plus one and the current time in milliseconds — so a report after a store restore still exceeds every version Wirt already holds. Transport failures, `429`, `5xx` and a `401` (a signature or clock-skew refusal, not an established permanent one) back off over 60, 300, 900, 3,600 and 14,400 seconds and then remain `failed`. A Wirt divergence `409` or other refusal is retained as `failed` evidence rather than resent.

The native Manage `Fund`, `Release`, funding-connection `Disconnect` and `Reconnect` actions use the same outbox after their local mutation commits. Each passes only the affected link ID to `flushReports()` through Cloudflare's response-lifetime `waitUntil`; the browser receives its ordinary redirect without waiting for Wirt. A failed attempt keeps the committed funding or connection result and the existing pending/retry or supersession state. Disconnect/reconnect can also return this server-only ID when authority reconciliation needs another attempt, so a report already committed before that failure can still leave.

Stored report bodies never hold a display label. A pending report carries the labels it may disclose separately and sends them only for bindings whose authority was last observed present; when the report is sent, superseded, failed or its link ends, those labels are dropped. Retained report evidence keeps order, delivery and refusal facts, not labels.

The PKCE verifier and owner access/refresh grant are sealed by the injected protector. A rotated grant is persisted before its next use. If the establishment response is lost after Wirt committed it, the exchanged grant and original intent remain for reconciliation beyond the old one-day retry expiry. The next link request re-establishes that same intent without a second consent: an expired access token is refreshed and durably stored first, and a `401` forces one refresh. While Wirt's outcome stays unknown the link request answers `503 E_COMMERCIAL_LINK_PENDING` and starts no new intent. Definite intent refusal (`403`, `409`) or an authoritative terminal answer can finish the attempt. A refused refresh alone cannot establish the remote association's state, so its retained attempt stays pending. The row preserves the latest typed outcome (`outcome-unknown`, `grant-unavailable`, `grant-refreshed`, `grant-refused` or `status-<code>`) until authoritative reconciliation finishes it.

## Restore occasion

Restoring or importing the App database to an earlier point makes its commercial state stale: a link the customer ended after the restore point would come back funded, and Wirt sends no further notices for an ended link. **After any restore or import of the App database, and before the Worker serves traffic again, the operator invokes `commercial.reconcileAfterRestore()` through the authorized operating adapter**, alongside the tombstone and opt-out restoration the [self-hosting guide](../manual/use/managed-app/self-hosting.md#back-up-export-restore-and-update) already requires.

The seam holds every active link, supersedes the restored pending reports, and pulls Wirt's current answer for each link: a signed *link ended* answer ends it, and a projection is applied under the ordinary rules and releases the hold. A held link's plan is `unknown`, so no Works-funded benefit is served from restored state; its status reports `reconciling: true`. A link Wirt cannot answer for stays held, and each scheduled maintenance pass retries it. No routine reconfirmation, recurring customer consent or new backup platform follows from this.

Product-owned bindings and refusals return to the restore point with the rest of the product's state and are re-reported from it; authority observations keep their recorded times and are re-observed by the ordinary encounters above.

## Entitlement adapter

`commercial.entitlement({ repositoryId, actor })` returns `free`, `pro` or `business`, or `unknown` when the namespace has not been observed, its link awaits restore reconciliation, or an organisation's funder authority cannot currently be observed. A null repository asks for the viewer's own plan. An organisation encounter re-observes its funder's authority before returning the plan; absence is `free`, and an unanswered check is `unknown`. If the binding changes funder during that check, the new binding is checked separately. Failure to persist the observation refuses the encounter instead of serving a stale plan. This is the source-owned adapter for the developing analytical application; this checkout does not yet wire a premium analytical consumer to it, and `unknown` must remain non-premium in that join.

## Participation reward campaigns

Wirt owns participation reward campaigns: registration, the commercial reward, its issuance, choice, reservation, application, expiry and correction. diffdevil owns the survey, its answers and their privacy (see [the App](../../apps/app/README.md#participation-reward-campaigns) and [privacy and data](../PRIVACY-AND-DATA.md#participation-survey-responses)). The consumer carries three signed calls over the same link and `wirt-http/v1` grammar as reports, with the link's product account in the signed header. They follow the joined contract selected on #796 and Wirt's repaired producer as it stood in its working source (PR #96 after `5ae403e`, unlanded and still under repair); they are qualified against a double of that contract and must be re-qualified against the landed producer.

| Call | Request | Typed outcome |
| --- | --- | --- |
| `commercial.deliverParticipation({ userId, completion })` | `POST /api/wirt/diffdevil/links/{link}/participation-completions` with exactly `{ campaign, version, event_id, completion_id, completed_at }` (`completed_at` in whole UTC seconds) | Wirt's stated `accepted` or `replayed` for that exact `event_id`, with its reward facts (`wirt.participation-result/v1`); `reconciled` when Wirt refuses this completion but its current rewards already hold the campaign's reward for the linked Works account; `refused` for a definite refusal (closed window, an event or completion identity owned by another fact, a campaign the account already earned); `unavailable` (429, 503, signature 401) when Wirt did not process it; `unknown` (a transport failure or another 5xx) when it may have; `unreadable` for a 2xx that does not state `accepted` or `replayed` for this event, which stays pending and is retried rather than inferred; `link-required` when the account has no active link, including after a signed `410`, which also ends the link |
| `commercial.rewardStanding({ session })` | `GET /api/wirt/diffdevil/links/{link}/rewards` | The account's reward facts and Wirt's next-charge lines (`next_charge`: date, amount, underlying total and discount lines), or `{ available: false, reason }` |
| `commercial.rewardQuote({ session, cadence })`, called only from the App's Origin-checked `reward-preview` POST | `POST /api/wirt/diffdevil/links/{link}/reward-quotes` with `{ tier: 'Pro', cadence }` | Wirt's own quote (`wirt.participation-quote/v1`): charges, discount lines, amount due, post-reward total and a review URL kept only on Wirt's origin; `not-quotable` on `409`. A preview reserves nothing |

The completion carries no answer, free text or product context. It carries two distinct identities: `completion_id`, the opaque product-owned response, and `event_id`, the durable business event created once with the completion in the same D1 batch and kept unchanged across every retry and a restore of that row. Each request's transport nonce is separate and fresh. Wirt replays the identical fact for the same event, refuses the same event with a different fact, refuses a completion already owned by another event, and issues once per Works account and campaign key across its versions. diffdevil records Wirt's stated result and never infers a replay from an HTTP acknowledgement, a nonce or a matching reward; the delivery row and the account export keep the event, the completion and Wirt's reward identity, so which product event earned which reward stays explainable without copying answers into Wirt.

Reward facts are read from Wirt's customer-visible shape (`RewardFacts::visible`): the public campaign name and reason, typed standing, selected alternative, claim and validity deadlines, and confirmed applications. The reader preserves completion-earned time (including `queued`, promised units, actual access dates and an optional **Expected start** forecast), finite discounts (charge scope, count and remaining uses, including a null application end), continuous discounts (explicit frequency and actual or null application end), protected-price options (line kind, exercise clocks, reservation and public acquisition facts), funded components (reward identity/reason/term separately from binding and usability), and the existing finite monthly/annual choice. Earning or reviewing a price option is distinct from reserving it and from acquiring protection. No heterogeneous discount/time/component choice is inferred. Operation identities, actors and correction evidence stay in Wirt.

Both the GET-rewards response and the applied projection isolate unreadable members. A member with a validated public campaign envelope remains matchable as explicitly unavailable; an invalid envelope cannot match a campaign. Other valid members survive, and a readable matching reward takes precedence over an unreadable one. The page discloses partial lists and offers no inferred choice or price for a refused member. A missing projection field remains `null`, never an invented empty list. The contextual App card uses the actual typed facts; finite reward wording preserves its charge classes, and a quote preview is offered only when its first-purchase quote class is covered. Thus renewal-only rewards are described as renewals and never paired with an ineligible first-purchase quote. The existing first-purchase monthly/annual choice keeps both previews. Commercial selection, price-option exercise, payment and correction remain in Works.

`apps/app/tests/reward-forms.test.mjs` exercises all six source-derived synthetic forms, including the exact six-use renewal-only discount separately from the first-purchase monthly/annual choice, matching, malformed/unsupported mixed lists, the actual GET-rewards client and receipt presentation. The existing built-Worker participation journey additionally reads those specimens through the shared decoder and actual Plan & funding page, including the renewal-only preview refusal, reserved/acquired price options, partial lists and narrow-screen rendering. These specimens establish local consumer behavior, not native producer execution, private composition, campaign activation, deployment or real customer adoption.

### Current participation producer boundary

The joined completion and reward consumer was reconciled against Wirt's accepted executable participation contract at `b17c75ebdb7ebe40b6b795468151ec6777d70082`. Native source candidate `c33d5d9566eff8aa0e73ddfa912c86afb1e85a04` supplies `benefits.beta_grants` and its companion `benefits.commercial_timezone`. Native identity, beta/product/tier, original promise, actual access windows, current access, remaining units and the configured IANA calendar are preserved through the authenticated receiver. Customer-facing reads copy the declared public beta fields, excluding private admission basis. These are source candidates and local wire/D1 fixtures, not PHP execution here or installed delivery/application.

Maintenance preserves one campaign-scoped qualifying-use timestamp before operational pruning, considering any finished managed operation in a funded namespace. A page visit does not establish this observation. Retained UTC instants are converted to dates in the projected `commercial_timezone`, then matched against any actual `access_windows` segment with inclusive start and exclusive end. Missing or invalid calendar data stays unknown; no browser, operator, UTC, Berlin or fixed-offset fallback is selected. The local fixture declares its calendar explicitly; the native-shaped receiver/D1 tests qualify midnight, DST, missing/invalid companion and before-prune behavior. This does not reinterpret date-unit funding as an hour-based entitlement. The invitation delay counts commercial calendar days after actual access first began, not funded units. An original promised window, unbegun/queued time, paid/grace term, link age or price protection does not qualify an operation. Missing legacy `beta_grants` remains unknown; an explicit empty array with a known calendar establishes no beta fact. The manual survey remains reachable for the admitted Pro relationship.

The producer's early-paid-conversion promise fork and final source/commercial acceptance remain with Wirt's responsible Leads. This consumer reads their actual window values and performs no billing workaround. Actual accepted producer/consumer application, commercial-date alignment and campaign dates/cohort/timing remain pre-activation dependencies. No campaign activation follows.

## Qualification and remaining adoption

`node --test apps/github-app/commercial.test.mjs` exercises the real handlers and D1 storage against an independent Wirt double that verifies the byte grammar with `node:crypto`, PKCE S256, expiring owner tokens and Wirt's report history, and signs terminal answers. It covers the link journey including a lost establishment response and its recovery after the access token expired, push ordering, replay and refusal paths, re-keying, the terminal notice, report retry/conflict/terminal handling, lost compare-and-set interleavings (terminal unlink, grant rotation and a newer projection), bindings with observed authority loss, unobservable (`unknown`) checks and recovery, an `applied` report under lapsed authority, retained-label scrubbing, premium-encounter and queued-report rechecks, real authorization-service/D1 logout and account switching, sessionless grant retention and its release on unbind/capacity removal/link ending, grant revocation and expiry, the session-owned independent disconnect and reconnect without rebinding, invalidation of pre-disconnect artifacts, performed-revocation receipts after reconciliation failure, a disposable restore of the commercial tables with reconciliation, and unlink with token rotation. It is local source evidence, not Wirt or provider adoption, and not a live D1 restore.

The lifecycle repairs additionally exercise ended/pending standing with retained capacity, no funding-purpose provider calls in those states, funded-only retention through restore holds, a disconnect preference surviving ordinary sign-in and dormant-grant deletion, deliberate reconnect and its method/origin/owner refusals, stale invalidation against a newer grant, definite versus unknown provider failures, logout-standing read failure, and performed-reconnect receipts after later reconciliation failure. The original transaction/restore/report protections remain in the ordinary suite.

Remaining: the actual Wirt/Ops join (registered client, shared keys, receiver URL, test host), the real protector and authorization adapter installation with provider budget/latency and concurrent-refresh qualification at the joined premium encounter, the manage/settings/subscription experience's qualification against real Works (its source and the manage-plan destination with disclosure/disconnect/reconnect exist in the App and are qualified against a loopback stand-in), the organisation-agreement experience beyond current administrator authority, the `awaiting-product-action` and pending-slot-end customer choice, a GitHub organisation-membership event route, historical restore preserving later disconnect choices, and deployment with migrations 0010/0011. No freshness window, grace policy, global scheduler or refresh controller is selected from provider hypotheses.
