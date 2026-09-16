# Managed GitHub App architecture

## Meaning

This document defines the selected first hosted-automation architecture for the managed diffdevil GitHub App. The App removes workflow, runner, upgrade, and credential-management burden while preserving the same engine, repository-owned policy, reports, plans, managed labels, owned comments, freshness checks, and provider readback as the open package and Actions.

This is current product and architecture direction, not evidence that the App, Cloudflare resources, GitHub App registration, secrets, installation, billing, or public service already exist. Provider effects and release standing remain separately observable.

## Product contract

The managed App is an operating adapter around diffdevil, not another policy engine or a reduced hosted edition.

- Repository-owned policy remains authoritative over hosted defaults.
- The App reacquires current provider state rather than treating webhook payloads as write authority.
- Analysis, policy evaluation, desired effects, performed requests, and provider readback remain distinct facts.
- The App never executes pull-request code or configuration while holding privileged credentials.
- The same report, plan, policy, evidence, label, comment, and observation semantics serve CLI, library, Actions, and managed operation.
- Hosted value comes from operation, continuity, administration, history, scale, and support rather than capability removed from the open product.

The first useful result is one installed repository receiving selected diffdevil label and owned-comment behavior without maintaining a workflow or write token.

## Service separation

The write-capable App runtime is separate from the public read-only playground runtime.

- The playground accepts public pull-request URLs, has no provider credential, and performs no repository effect.
- The App holds webhook and GitHub App secrets, receives installation-scoped events, and may perform only policy-selected effects.
- Each service has separate deployment configuration, bindings, secrets, health, and rollback.
- Both consume the same portable engine and versioned contracts. Neither may carry a service-specific measurement, policy, or validation implementation.

A service boundary is not a repository or release split. Application code may remain in this repository and release lifecycle under the AGPL-3.0-only application boundary.

## First operating adapter

Cloudflare Workers, Queues, and D1 are the selected first managed operating adapter:

- a Worker verifies and admits GitHub webhook deliveries;
- a Queue separates the provider response deadline from analysis and effects;
- D1 owns delivery attempts, leases, terminal standing, and the bounded operational ledger;
- a dead-letter queue preserves bounded exhausted work for diagnosis rather than silently discarding it.

These provider primitives do not become diffdevil semantics. Webhook admission, queue publication/consumption, lease storage, and secret/configuration access remain application adapters around the shared engine. A later self-hosted or alternate managed runtime may replace those adapters without replacing measurement, policy, plans, effects, or provider reconciliation.

The first implementation does not build a generic hosting framework. It creates only the interfaces that the selected Worker, Queue, D1, and shared engine genuinely require.

## Delivery flow

One accepted delivery moves through this sequence:

1. Read the raw HTTPS request under a bounded byte limit.
2. Verify `X-Hub-Signature-256` over those exact bytes before parsing.
3. Require `X-GitHub-Delivery` and `X-GitHub-Event`; admit only selected event/action pairs.
4. Normalize a minimal queue envelope: delivery ID, event/action, installation ID, repository ID/name, pull-request number, and receipt time.
5. Publish the envelope to the Queue. Return `202` only after publication succeeds.
6. Atomically claim the delivery identity in D1.
7. Atomically claim the repository/pull-request execution lease.
8. Mint a short-lived installation token scoped to the one repository and required permissions.
9. Reacquire the current pull request, current base/head, trusted policy, and current managed provider state.
10. Compile, evaluate, plan, apply, and read back through the shared diffdevil engine and GitHub adapter.
11. Record the attributable result, release both leases, and acknowledge the queue message.

The queue envelope does not retain the complete webhook body. Current provider data is reacquired from GitHub because a delivered payload is event evidence, not current write authority.

## Webhook admission

The first ingress exposes `POST /webhooks/github` plus health and readiness readback.

- Validate the HMAC-SHA256 signature before JSON parsing and compare signatures without timing-dependent early exit.
- Reject missing delivery/event identity, malformed JSON, unsupported content type, oversized bodies, and unselected events/actions.
- Initially admit pull-request `opened`, `reopened`, `synchronize`, and `edited` actions.
- Installation and repository-access lifecycle events may update installation standing but never run diff policy themselves.
- A verified but unqueued delivery returns failure. GitHub does not make an unpersisted `202` safe by ceremony.
- Log only bounded identifiers and diagnostic codes. Never log secrets, tokens, raw webhook bodies, pull-request prose, or source content.

The App JWT is minted only when needed, remains within GitHub's ten-minute maximum, and includes deliberate clock-skew handling. Neither App JWTs nor installation tokens are stored.

## Permissions and repository confinement

The first App requests no broader repository permission than:

- **Contents: read**, for trusted base or immutable pinned policy and relative templates;
- **Pull requests: write**, for pull-request acquisition and selected label/comment effects.

It requests no Issues, Actions, Checks, Administration, user OAuth, or account permission in this tranche.

Each installation token is restricted to the repository named by the admitted delivery. Repository identity from GitHub is rechecked against the intended target before acquisition or effects. A token never turns a read-only product surface into a writer; the App's selected operation and policy still control mutation.

A removed installation or revoked repository grant is terminal for already queued work. That outcome is not retried as an outage, and the App performs no cleanup label/comment writes after access is removed.

## Delivery identity and per-PR serialization

Cloudflare Queues is at-least-once. The App therefore uses two distinct lease identities:

1. **Delivery lease:** keyed by `X-GitHub-Delivery`, deduplicating provider redelivery and queue duplicates of the same event.
2. **Pull-request lease:** keyed by `(repository ID, pull-request number)`, serializing distinct same-head deliveries that would otherwise race an owned-comment lifecycle.

Claims are one conditional SQL mutation or a transactional D1 `batch()`, never a read followed by an unprotected write.

- A completed delivery is acknowledged as a duplicate.
- An active delivery or pull-request lease prevents competing work.
- A crashed/expired attempt is reclaimable after its bounded lease.
- Each attempt and terminal result remains attributable.
- Bounded retries end in the dead-letter queue.

Labels already converge through current-state reconciliation, but comment creation can create two equally owned lifecycle sequences under concurrent same-head work. The pull-request lease prevents that unrecoverable provider state without adding a global coordinator or Durable Object.

## Trusted policy and freshness

The App reacquires current provider state before evaluation and effects.

- Pull-request head and base from a webhook are hints, not accepted comparison identity.
- Repository policy comes from the current PR base or an explicit immutable pin, never the PR head.
- The built-in `size@1` default applies only when repository-owned policy is absent.
- Relative policy templates use the same trusted policy source.
- Before every effect, the existing adapter verifies current target and policy identity.
- Retries begin from fresh provider reads. A possibly completed write is reconciled from provider state rather than repeated blindly.

A moved comparison, moved base policy, closed pull request, changed API host, untrusted saved plan/report, or contradictory current provider state refuses effects with the existing diffdevil diagnostics and observation journal.

## Comment identity and migration

The App supplies its exact bot author identity to the shared comment adapter.

- `X-GitHub-Delivery` is the stable `occasionId` for create-mode comments.
- Upsert and transition lifecycles retain their existing policy identity and marker checks.
- The App never adopts, edits, or deletes a comment owned by another actor.
- Migration from an Action disables the existing Action writer before App effects begin.
- Existing Action-authored comments remain historical comments; the App starts a new lifecycle under its own author identity.
- A repository never has two active diffdevil writers during migration or rollback.

The first installed journey must exercise the chosen migration and rollback explicitly. A successful fresh installation does not prove a safe existing-Action cutover.

## Operational state and history boundary

D1 keeps a seven-day operational ledger for delivery identity, lease recovery, manual redelivery, attempts, terminal standing, source/policy identities, selected result/effect summary, and bounded diagnostic codes.

The operational ledger does not retain:

- raw webhook bodies;
- complete diffs or source content;
- pull-request title, body, review prose, or user profile data;
- complete report/plan payloads;
- installation tokens, App JWTs, or secrets;
- a user-facing history projection.

Operational deduplication and product history are separate commitments. The product decision whether the first tranche also appends one minimal durable result row must be settled before production retention begins deleting the only early-result substrate. That row, when selected, contains only repository identity, pull-request number, source identity, policy identity, selected band/decision, evidence standing, effect summary, and timestamps. It creates no dashboard or public history API by itself.

## Resource profile

The managed App selects an explicit Worker-safe input and result profile rather than inheriting the engine's general 64 MiB result budget.

The selected limits must be exercised against:

- maximum admitted webhook body;
- GitHub pagination and changed-file ceilings;
- policy and relative-template bytes;
- normalized report and effect-plan size;
- queue envelope and D1 row size;
- Worker CPU and isolate memory;
- provider subrequest count.

A lower hosted limit preserves honest bounded/unknown evidence or returns a stable limit diagnostic. It never silently truncates an exact result or substitutes another measurement path.

## Failure and recovery

- Signature or admission failure: reject before enqueue and effects.
- Queue publication failure: return failure; do not claim success.
- Duplicate delivery: acknowledge the completed or active delivery identity.
- Pull-request lease conflict: retry with bounded delay rather than compete.
- Transient provider/queue/database failure: bounded retry, then dead-letter.
- Ambiguous provider write: reconcile current provider state before any new request.
- Removed installation or repository access: terminal non-retryable result, no cleanup effects.
- Partial effects: preserve the existing request/readback journal and continue only through its safe recovery semantics.
- Deployment regression: restore the preceding accepted Worker version and read back health and one representative journey.

No dashboard is required for first-tranche recovery, but provider logs, D1 operational rows, DLQ inspection, exact deployment version, and a documented operator procedure must make the state diagnosable.

## Qualification boundary

The first accepted implementation must prove:

- shared-engine Worker bundle and startup without a Worker-specific engine;
- raw-body signature rejection and accepted signature;
- event/action and body-size filtering;
- minimal queue envelope and enqueue-failure behavior;
- duplicate delivery and distinct same-PR delivery serialization;
- atomic lease claim, expiry recovery, retry, and DLQ behavior;
- repository-scoped installation token and exact permissions;
- trusted base and immutable pinned policy, including relative templates;
- hostile PR-head policy confinement and stale-comparison refusal;
- idempotent labels and one owned comment lifecycle;
- Action-to-App no-dual-writer migration;
- removed-installation terminal handling and no cleanup writes;
- secret/token masking, redaction, and non-retention;
- explicit resource-limit behavior;
- health/readiness and deployment rollback;
- one real installed canary repository.

Source tests, local emulation, preview deployment, production deployment, GitHub App registration, installation, permissions, provider spend, and lived repository use are separate evidence. Do not promote one boundary into another.

## Current standing

The local public-PR playground exists in source. The hosted playground and managed App are active product Work and are not yet deployed. The current engine's generated schema-validator load must become statically bundler-visible before either Worker runtime is accepted. The optional Action `policy-token` is separate release Work and is not a hidden prerequisite for the App, which mints its own installation-scoped credential.

Public release, Workers-plan standing, live Cloudflare resources, GitHub App registration, secrets, installation, production retention, and user-facing history remain unperformed or explicitly separate until their exact readbacks exist.

## Provider references

- [GitHub webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks)
- [Validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Generating an installation access token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
- [Cloudflare Queues delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/)
- [Cloudflare Queues retries and acknowledgements](https://developers.cloudflare.com/queues/configuration/batching-retries/)
- [Cloudflare dead-letter queues](https://developers.cloudflare.com/queues/configuration/dead-letter-queues/)
- [Cloudflare D1 Worker API and batches](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)
