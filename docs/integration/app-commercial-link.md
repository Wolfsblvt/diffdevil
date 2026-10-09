# Wirt commercial link and entitlement consumer

## Meaning

This document owns the managed App's product side of the Wolfsblvt Works (Wirt) commercial interface: the customer-authorized link between a diffdevil GitHub account and a Works account, the signed benefit-projection receiver, ordered and idempotent application with its product report, unlink, organisation-capacity bindings, and the entitlement adapter the analytical backend consumes. Wirt's adopted producer contract — [commercial projection](https://github.com/Wolfsblvt/wirt/blob/04e253a8ae30ce32351c67c778f009447f3d2673/docs/commercial-projection.md) and its [runtime guide](https://github.com/Wolfsblvt/wirt/blob/04e253a8ae30ce32351c67c778f009447f3d2673/docs/commercial-projection-runtime.md) at `04e253a8` — owns the payload, signing grammar and producer behaviour. The App plan and management design owns the product offer and customer experience once accepted. This is source behaviour, not a deployed receiver, a configured Works client, an active subscription or observed provider adoption.

## Trust boundary

Commercial standing selects capability; it never grants GitHub authority. Repository and analytical reads still check current GitHub access through the existing authorization service at every use. A paid namespace keeps its plan for any authorized reader, and a paying viewer gains nothing in a namespace their subscription does not fund.

The product account is the signed-in GitHub user's numeric ID from the existing opaque session. A namespace is the numeric GitHub account of the repository's installation, captured from webhook identities (`installation.account.id`, or `repository.owner.id` on pull-request events). An organisation becomes a funded namespace only through a binding to a purchased capacity slot, made by a funder who currently administers that organisation on GitHub. One organisation has at most one funder; the funder may withdraw it and a current organisation administrator may disconnect it. The authorization service's `organisationAuthority` checks this through the viewer's own GitHub authorization; its provider adapter's `checkOrganisationAdministration` must confirm that the numeric account is an organisation the user currently administers, never merely an account they can see.

## Routes

All routes live on the App Worker. The receiver needs only D1 and the signing keys; the browser routes also need the installed authorization adapter, a protector and the dashboard origins, and otherwise answer `503 E_COMMERCIAL_UNAVAILABLE`.

| Route | Caller | Effect |
| --- | --- | --- |
| `POST /integrations/wirt/projection` | Wirt scheduler, signed | Verify, apply in order, answer 2xx, then send the report |
| `POST /integrations/wirt/link` | Same-origin signed-in browser | Create a Wirt intent with S256 PKCE; returns Wirt's consent URL and binds the browser |
| `GET /integrations/wirt/link/callback` | Wirt's redirect | Exchange the code, establish the stream, seed from the pull fallback; `303` to the continuation with `works-link=<outcome>` |
| `POST /integrations/wirt/unlink` | Same-origin signed-in browser | Revoke at Wirt with the owner token; benefits stop on its `204` |
| `POST /integrations/wirt/bindings` | Same-origin signed-in browser | JSON `{action: bind|unbind, slot, organisationId}` |
| `GET /integrations/wirt/status` | Signed-in browser | The viewer's own plan, standing, capacity and bindings |

Callback outcomes are `linked`, `denied`, `expired`, `conflict`, `ended`, `invalid`, `session-required` and `failed`. The continuation URL is deployment configuration; the designed manage-plan destination does not exist yet.

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

A link-ended notice, or a signed `410` answer to a pull or report, ends the link permanently: benefits, bindings, owner grant and unsent reports stop together, and no later report is sent. A projection for an ended link is refused.

## Reports and recovery

Every application, binding change or refusal writes one versioned report to a D1 outbox in the same transaction as the state it describes. It leaves after the push answer, because Wirt holds that stream's lock until it receives one; a lost report is recovered by Wirt's own redelivery, by the next local change, or by scheduled maintenance. Transport failures back off over 60, 300, 900, 3,600 and 14,400 seconds and then remain `failed`. A Wirt divergence `409` or other refusal is retained as `failed` evidence rather than resent. Display labels are sent only while authority is present.

The PKCE verifier and owner access/refresh grant are sealed by the injected protector. A rotated grant is persisted before its next use. If the establishment response is lost after Wirt committed it, the exchanged grant is kept for a day and the next link request re-establishes the same intent without a second consent.

## Entitlement adapter

`commercial.entitlement({ repositoryId, actor })` returns `free`, `pro`, `business`, or `unknown` when the namespace has not been observed. A null repository asks for the viewer's own plan. It matches the analytical service's `entitlement` adapter; `unknown` is non-premium there.

## Qualification and remaining adoption

`node --test apps/github-app/commercial.test.mjs` exercises the real handlers and D1 storage against an independent Wirt double that verifies the byte grammar with `node:crypto`, PKCE S256 and owner tokens, and signs terminal answers. It covers the link journey including a lost establishment response, push ordering, replay and refusal paths, re-keying, the terminal notice, report retry/conflict/terminal handling, bindings and unlink with token rotation. It is local source evidence, not Wirt or provider adoption.

Remaining: the actual Wirt/Ops join (registered client, shared keys, receiver URL, test host), the real protector and authorization adapter installation, the manage/settings/subscription experience and manage-plan destination, the organisation-agreement experience beyond current administrator authority, the `awaiting-product-action` and pending-slot-end customer choice, and deployment with its migration.
