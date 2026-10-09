# Wirt commercial link and entitlement consumer

## Meaning

This document owns the managed App's product side of the Wolfsblvt Works (Wirt) commercial interface: the customer-authorized link between a diffdevil GitHub account and a Works account, the signed benefit-projection receiver, ordered and idempotent application with its product report, unlink, organisation-capacity bindings with their observed GitHub authority, restore reconciliation, and the entitlement adapter the analytical backend consumes. Wirt's adopted producer contract — [commercial projection](https://github.com/Wolfsblvt/wirt/blob/04e253a8ae30ce32351c67c778f009447f3d2673/docs/commercial-projection.md) and its [runtime guide](https://github.com/Wolfsblvt/wirt/blob/04e253a8ae30ce32351c67c778f009447f3d2673/docs/commercial-projection-runtime.md) at `04e253a8`, plus its later [product restore rule](https://github.com/Wolfsblvt/wirt/blob/9502c4b/docs/commercial-projection.md#consumption-rules) at `9502c4b` — owns the payload, signing grammar and producer behaviour. The App plan and management design owns the product offer and customer experience once accepted. This is source behaviour, not a deployed receiver, a configured Works client, an active subscription or observed provider adoption.

## Trust boundary

Commercial standing selects capability; it never grants GitHub authority. Repository and analytical reads still check current GitHub access through the existing authorization service at every use. A paid namespace keeps its plan for any authorized reader, and a paying viewer gains nothing in a namespace their subscription does not fund.

The product account is the signed-in GitHub user's numeric ID from the existing opaque session. A namespace is the numeric GitHub account of the repository's installation, captured from webhook identities (`installation.account.id`, or `repository.owner.id` on pull-request events). An organisation becomes a funded namespace only through a binding to a purchased capacity slot, made by a funder who currently administers that organisation on GitHub. One organisation has at most one funder. The authorization service's `organisationAuthority` checks administration through the viewer's own GitHub authorization; its provider adapter's `checkOrganisationAdministration` must confirm that the numeric account is an organisation the user currently administers, never merely an account they can see.

## Funding and observed authority

Funding and GitHub authority are separate facts. A binding is commercial: it stays until the funder releases it or rebinds the slot, the applied capacity no longer contains its slot, or the link ends. The funder's organisation administration is a provider fact recorded on the binding as `authority_observed` (`present`, `absent` or `unknown`) with `authority_checked_at`; it is an observation at that time, not durable truth.

It is observed again where it matters:

- binding or rebinding a slot, through the funder's session;
- each status read by the funder, through their session;
- an organisation administrator's disconnect, through that administrator's session; and
- scheduled maintenance, for observations older than a day and for every `unknown` one, through the authorization the funder still retains with this product (`observeOrganisationAuthority`).

Every check records its result. A check that cannot observe authority — the funder's authorization is no longer retained, or GitHub does not answer — records `unknown` with its time, so an earlier `present` never stands in for current authority. Signing out of the dashboard changes nothing commercial by itself; once the product no longer retains the funder's authorization, the next maintenance check records `unknown`, and the funder's next visit observes authority again. A changed observation re-reports the bindings to Wirt; a confirmed one only moves its time.

Absent or unknown authority withholds the organisation's premium use and its display label, but does not unbind the slot or change the subscription: funding exists, and GitHub authority needs attention. The funder's own plan is unaffected. The funder may release their slot even after losing authority, and a current organisation administrator may disconnect the product from that organisation; these are different authorities with different consequences. No GitHub organisation-membership event is subscribed today, so a loss is observed at the next encounter or maintenance pass rather than as it happens.

A fully applied order is reported as `applied` whatever the bindings' authority. The lapse travels as `bindings[].authority` (`absent` or `unknown`, with no label); Wirt [treats `partially-applied` as a disagreement](https://github.com/Wolfsblvt/wirt/blob/e370ae6/docs/commercial-projection.md#joined-states-in-the-subscription-area) and opens a case, so the product reserves it for an order it applied only in part.

## Routes

All routes live on the App Worker. The receiver needs only D1 and the signing keys; the browser routes also need the installed authorization adapter, a protector and the dashboard origins, and otherwise answer `503 E_COMMERCIAL_UNAVAILABLE`.

| Route | Caller | Effect |
| --- | --- | --- |
| `POST /integrations/wirt/projection` | Wirt scheduler, signed | Verify, apply in order, answer 2xx, then send the report |
| `POST /integrations/wirt/link` | Same-origin signed-in browser | Resume an interrupted establishment, or create a Wirt intent with S256 PKCE and return Wirt's consent URL, binding the browser |
| `GET /integrations/wirt/link/callback` | Wirt's redirect | Exchange the code, establish the stream, seed from the pull fallback; `303` to the continuation with `works-link=<outcome>` |
| `POST /integrations/wirt/unlink` | Same-origin signed-in browser | Revoke at Wirt with the owner token; benefits stop on its `204` |
| `POST /integrations/wirt/bindings` | Same-origin signed-in browser | JSON `{action: bind|unbind, slot, organisationId}` |
| `GET /integrations/wirt/status` | Signed-in browser | The viewer's own plan, standing, capacity and bindings with observed authority and its time; re-observes that authority |

Callback outcomes are `linked`, `pending`, `denied`, `expired`, `conflict`, `ended`, `invalid`, `session-required` and `failed`. `pending` means Wirt's answer was lost or unavailable after consent; the next link request resumes the same intent. The continuation URL is deployment configuration; the designed manage-plan destination does not exist yet.

## Configuration

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

Every link change compares and advances the link's revision and writes its own unique transition token; each binding, refusal and report written with it requires that exact token. A transaction that lost the race, including to a terminal unlink or a grant rotation, leaves nothing behind and is decided again.

A link-ended notice, or a signed `410` answer to a pull or report, ends the link permanently: benefits, bindings, owner grant and unsent reports stop together, and no later report is sent. A projection for an ended link is refused.

## Reports and recovery

Every application, binding change, refusal or changed authority observation writes one report to a D1 outbox in the same transaction as the state it describes. It leaves after the push answer, because Wirt holds that stream's lock until it receives one; a lost report is recovered by Wirt's own redelivery, by the next local change, or by scheduled maintenance. The report version is clock-derived — the later of the previous version plus one and the current time in milliseconds — so a report after a store restore still exceeds every version Wirt already holds. Transport failures, `429`, `5xx` and a `401` (a signature or clock-skew refusal, not an established permanent one) back off over 60, 300, 900, 3,600 and 14,400 seconds and then remain `failed`. A Wirt divergence `409` or other refusal is retained as `failed` evidence rather than resent.

Stored report bodies never hold a display label. A pending report carries the labels it may disclose separately and sends them only for bindings whose authority was last observed present; when the report is sent, superseded, failed or its link ends, those labels are dropped. Retained report evidence keeps order, delivery and refusal facts, not labels.

The PKCE verifier and owner access/refresh grant are sealed by the injected protector. A rotated grant is persisted before its next use. If the establishment response is lost after Wirt committed it, the exchanged grant is kept for a day and the next link request re-establishes the same intent without a second consent: an expired access token is refreshed and durably stored first, and a `401` forces one refresh. While Wirt's outcome stays unknown the link request answers `503 E_COMMERCIAL_LINK_PENDING` and starts no new intent. Only a definite refusal — a refused refresh grant, `403`, `409` or a terminal answer — finishes the attempt and lets a fresh consent begin. The attempt row keeps the latest typed outcome (`outcome-unknown`, `grant-unavailable`, `grant-refreshed`, `grant-refused` or `status-<code>`) until it expires.

## Restore occasion

Restoring or importing the App database to an earlier point makes its commercial state stale: a link the customer ended after the restore point would come back funded, and Wirt sends no further notices for an ended link. **After any restore or import of the App database, and before the Worker serves traffic again, the operator invokes `commercial.reconcileAfterRestore()` through the authorized operating adapter**, alongside the tombstone and opt-out restoration the [self-hosting guide](../manual/use/managed-app/self-hosting.md#back-up-export-restore-and-update) already requires.

The seam holds every active link, supersedes the restored pending reports, and pulls Wirt's current answer for each link: a signed *link ended* answer ends it, and a projection is applied under the ordinary rules and releases the hold. A held link's plan is `unknown`, so no Works-funded benefit is served from restored state; its status reports `reconciling: true`. A link Wirt cannot answer for stays held, and each scheduled maintenance pass retries it. No routine reconfirmation, recurring customer consent or new backup platform follows from this.

Product-owned bindings and refusals return to the restore point with the rest of the product's state and are re-reported from it; authority observations keep their recorded times and are re-observed by the ordinary encounters above.

## Entitlement adapter

`commercial.entitlement({ repositoryId, actor })` returns `free`, `pro` or `business`, or `unknown` when the namespace has not been observed, its link awaits restore reconciliation, or an organisation's funder authority is unobserved. A null repository asks for the viewer's own plan. An organisation whose funder's authority was last observed absent is `free`. It matches the analytical service's `entitlement` adapter; `unknown` is non-premium there.

## Qualification and remaining adoption

`node --test apps/github-app/commercial.test.mjs` exercises the real handlers and D1 storage against an independent Wirt double that verifies the byte grammar with `node:crypto`, PKCE S256, expiring owner tokens and Wirt's report history, and signs terminal answers. It covers the link journey including a lost establishment response and its recovery after the access token expired, push ordering, replay and refusal paths, re-keying, the terminal notice, report retry/conflict/terminal handling, lost compare-and-set interleavings (terminal unlink, grant rotation and a newer projection), bindings with observed authority loss, unobservable (`unknown`) checks and recovery, an `applied` report under lapsed authority, retained-label scrubbing, a disposable restore of the commercial tables with reconciliation, and unlink with token rotation. It is local source evidence, not Wirt or provider adoption, and not a live D1 restore.

Remaining: the actual Wirt/Ops join (registered client, shared keys, receiver URL, test host), the real protector and authorization adapter installation, the manage/settings/subscription experience and manage-plan destination, the organisation-agreement experience beyond current administrator authority, the `awaiting-product-action` and pending-slot-end customer choice, a GitHub organisation-membership event route, a live restore qualification, and deployment with its migration.
