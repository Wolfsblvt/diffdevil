# Managed GitHub App architecture

## Meaning

This document owns the selected experience and operating architecture of diffdevil's optional managed GitHub App. diffdevil remains an open-source CLI, TypeScript library, and workflow Actions tool. The App operates that same product for repositories that prefer installation and a dashboard over maintaining workflows, credentials, runners, and upgrades.

The complete selected App includes repository-aware configuration, labels, owned comments, native GitHub check summaries, account/organization administration, and opt-in quantitative history. A narrow installed canary proves part of that result; it does not remove the remaining functionality. This document describes selected product and architecture, not an implemented or deployed App. [Direction](../DIRECTION.md) owns current availability.

## Product and adoption contract

- CLI, library, and Actions remain useful and fully capable without a diffdevil account.
- The App is an optional managed operating adapter, not the primary product or a second policy engine.
- Repository-owned settings override hosted defaults only where explicitly supplied.
- Facts, policy, desired effects, performed requests, and provider readback remain distinct.
- The App never executes PR-head code or trusts PR-head policy to authorize automatic writes.
- A useful free hosted allowance coexists with paid usage and team conveniences. Reusable engine or policy features are not removed to manufacture an upgrade.
- History is opt-in. Labels, comments, native checks, and recovery do not require persistent history.

A normal adoption journey is: install the App on selected repositories, accept or choose a preset, inspect the planned behavior, and enable the selected automation. No workflow file or personal write token is required. The default managed setup uses size labels plus one native check summary, with comments and persistent history off; users can explicitly change these effects. Existing Action writers are handled through the explicit migration boundary below.

## Configuration and dashboard

The [presets and shortcuts contract](presets-and-shortcuts.md#configuration-layering) owns policy composition. The App resolves:

```text
selected bundled preset
    -> account/organization dashboard defaults
    -> explicitly supplied repository settings
    -> one validated ordinary diffdevil policy
```

The sole conventional repository file remains `.diffdevil.yml` at repository root. Do not add automatic fallback locations under `.github/`, and do not look in an account's `<owner>/.github` repository. The file is optional for installation defaults, and authoritative for settings it supplies. Deliberate explicit policy-source features remain available; no hidden hosted configuration is injected into Actions.

The dashboard shows the effective settings, their origins, validation failures, enabled effects, and which values are inherited or overridden. It exports the resolved ordinary policy, not a new hosted language. The user can return to CLI/Actions without reconstructing their policy.

Required dashboard journeys are:

- GitHub sign-in and selection of an accessible personal or organization installation;
- selected repositories, installation/access standing, presets, and account/organization defaults;
- effective repository configuration, preview, validation, and export;
- clear history opt-in, retention, coverage, numeric history, statistics, and contextual detail;
- usage and entitlement visibility, with paid-plan administration when commercial billing is released.

GitHub sign-in authenticates a person; it does not by itself prove authority over an installation. Every repository read, configuration edit, history access/export/delete, and billing administration operation checks current applicable access. Installation credentials never reach the browser.

Dashboard identity and authorization are separate from the webhook's installation identity. The dashboard may use GitHub App user authorization without turning that token into the background execution credential. Sign-in does not enable private-PR playground input.

## Native GitHub checks are selected functionality

Native check-run summaries are part of the complete App, not a speculative later feature and not removed by a labels-only canary.

A check reports the exact analyzed head/comparison, evidence standing, raw and replacement-aware measurements, included/excluded file counts, relevant policy results, and observed effects. It links to available details without exposing protected history to an unauthorized viewer. Terminal/data output and checks derive from the same report and policy result.

Manage one recognizable App-owned check for the intended PR/revision/policy execution identity. Duplicate deliveries or retries update/reconcile that check rather than flooding the PR with duplicates. A new revision must not inherit the old revision's success. Re-request handling verifies App ownership and the current repository/comparison before starting another operation.

Default size classification does not fail a check for being large. A check conclusion describes analysis/policy execution and its explicitly configured consequence, not code quality, risk, or merge approval. Unavailable evidence is explained rather than published as a proven zero or false policy result. Installation does not modify branch protection or make this check required.

The Checks API receives only supported summary fields and bounded content. Fork-PR association, stale-head handling, re-requests, duplicate events, and partial failure require real provider qualification, not merely a successful API request.

## Service and repository boundaries

The public playground and managed App are separate experiences and permission boundaries:

| Surface | Input and authority | Persistent product state |
| --- | --- | --- |
| Playground | Public PR URL or curated specimen; analysis and effect preview only | No account or App history |
| Managed App | Verified installation event; repository-scoped credentials and trusted policy | Configuration, operational ledger, and opted-in history |
| Dashboard | Authenticated user with current installation/repository authorization | Administration of the App's state |

They may reuse the engine, report presenters, configuration controls, and website components. They do not share private credentials, authorization, or visitor-history collection. Each runtime has its own deployment configuration, bindings, secrets, health, and rollback.

Keep application, website, documentation, and service source in this repository. Reusable software remains MIT; application/service software is AGPL-3.0-only. The [licence map](../../LICENSES/README.md) keeps documentation, runnable examples, and reserved branding distinct.

Self-hosting is intentional. Document supported operation and its costs, required GitHub App registration, credentials, provider bindings, and updates in the operator material. The first supported managed adapter does not imply that a Docker production adapter already exists. Do not hide source availability, claim another operator may not host it, or use official branding to imply endorsement of an independent service. Self-hosting belongs in discoverable documentation, not as a fourth primary homepage sales route.

## First operating adapter and portability

Target Cloudflare Workers, Queues, and D1 directly for the first managed operating adapter. This avoids deliberately building a temporary VPS-specific App and then migrating the selected service. A conventional Node/Docker host remains a valid alternate adapter, not an automatically cheaper operating model or the predetermined next scaling step.

Provider responsibilities are narrow:

- Worker ingress verifies and admits webhooks.
- Queues separates the webhook response deadline from evaluation and effects.
- D1 carries configuration, atomic delivery/PR leases, recovery records, and selected history.
- A DLQ preserves exhausted admitted work for bounded diagnosis.

Keep provider bindings, queue acknowledgement/retry, storage calls, clock/secret access, and ingress outside the shared engine and application use cases. Prefer ordinary request/response and data contracts with explicit operations at the boundaries. Do not grow a generic hosting framework, provider registry, or parallel service implementation.

Portable means more than an interface with one implementation:

- the shared engine must bundle and execute on the selected Worker runtime without a hosted fork;
- Node package, CLI, Actions, and the existing local playground remain qualified;
- persisted application meaning, identifiers, retention, and analysis identities are not encoded as Cloudflare resource names;
- D1-specific calls stay in storage adapters, with ordinary SQL/SQLite-compatible data where it fits;
- an operator can export/import material configuration and quantitative history, preserving identities, versions, evidence, consent, expiry, and deletion meaning;
- moving providers replaces operating adapters and requires ordinary qualification, not rewriting measurement, policy, presentation, or all retained data.

D1 SQL import/export is a transport capability, not proof of a working application migration. Queue contents and active leases require explicit drain/reconciliation at cutover; do not replay old effects blindly. An alternate provider is not complete until one genuine operation and its material data survive that route.

## Shared-engine Worker prerequisite

The inspected source loads generated Ajv validators through module-top-level `createRequire(...schemas.cjs)`. That is not a qualified Worker bundle/startup route.

Use one static, bundler-visible generated validator import, or an equivalent injected shared validator boundary. Preserve the same schemas and semantics on every host. A Worker-specific validator implementation or a second hosted engine is rejected.

The hosted playground and App consume that same portability result. They do not commission independent repairs to the engine. Bundle inspection, Worker startup, one contract-valid analysis, and unaffected package/CLI/Action behavior are the necessary distinct evidence.

## Delivery flow

1. Read the raw HTTPS request under the selected byte budget.
2. Verify `X-Hub-Signature-256` over the exact bytes before JSON parsing.
3. Require delivery/event identity and admit selected event/action pairs.
4. Normalize only delivery ID, event/action, installation ID, numeric repository ID, PR/check reference needed for dispatch, and receipt time.
5. Publish that minimal envelope durably; return `202` only after enqueue succeeds.
6. Atomically claim the delivery identity, then the repository/PR execution lease.
7. Mint an installation token scoped to the target repository and needed permissions.
8. Reacquire current repository coordinates, PR/base/head, trusted policy, and managed provider state.
9. Resolve configuration, analyze, evaluate, plan, apply, and read back through the shared engine and GitHub adapter, including the selected check lifecycle.
10. Write the minimized operational result and, only under current opt-in, the quantitative history projection.
11. Complete the operation, release its leases, and acknowledge the message.

Repository slugs and other contextual data are resolved transiently from verified IDs. The queue does not retain repository names, file names, authors, the raw webhook body, PR prose, or source contents.

## Webhook admission and authentication

Expose `POST /webhooks/github` plus health/readiness paths. Validate HMAC-SHA256 with a constant-time comparison, enforce selected content/body limits, and reject malformed identity or input before work or effects. Document the treatment of valid unselected events without enqueuing them.

Admit PR `opened`, `reopened`, `synchronize`, and `edited` actions for the initial automation path. Add the concrete check re-request event needed by the selected Checks experience; do not subscribe to unrelated events. Installation/access lifecycle events update standing and collection eligibility, not arbitrary diff effects.

App JWTs stay within GitHub's ten-minute maximum with explicit skew handling. Installation tokens are minted as needed and expire on GitHub's one-hour boundary. Store neither JWTs nor installation tokens; do not infer their string format. Secrets remain in the supported secret store.

## Permissions and current access

The complete selected App requests:

- **Contents: read**, for trusted repository policy and relative templates;
- **Pull requests: write**, for PR acquisition and selected label/comment effects;
- **Checks: write**, for native check summaries and their lifecycle.

Do not request Issues, Actions, Administration, or broader repository write permissions without a concrete selected operation. Dashboard user authorization is a separately explained identity boundary, not a reason to expand background repository tokens.

Each background token is restricted to the admitted repository. Recheck repository identity and current installation access before acquisition/effects. Removed or revoked access makes queued work terminal and non-retryable. Never attempt cleanup writes after the installation loses access.

Repository access for background automation and access for a signed-in dashboard viewer are separate checks. A successful webhook analysis does not authorize every organization member to inspect protected results.

## Delivery identity and per-PR serialization

Use two atomic leases: delivery ID for redelivery/queue duplicates, and `(repository ID, PR number)` for distinct events at the same head. Claim with one conditional SQL mutation or transactional D1 `batch()`, not read-then-write.

A completed duplicate is acknowledged without another effect. An active lease delays competing work; expired crashed work can be reclaimed. Lease duration/renewal must cover the effect operation, and an attempt that loses its execution lease must not continue issuing new writes. Qualify recovery around in-flight and ambiguous writes rather than treating a timestamp as a proof of serialization.

Bounded retries end in the DLQ. The per-PR lease prevents two creates claiming the same owned-comment lifecycle sequence. This concrete consequence earns serialization, not a global coordinator or a generic Durable Object layer.

## Trusted policy and freshness

Read `.diffdevil.yml` from the current PR base or an explicit immutable trusted source, never the PR head. Relative templates follow the same trusted source. Apply the host-specific layering from [presets and shortcuts](presets-and-shortcuts.md#configuration-layering); the bundled default fills only undeclared settings.

Repository access errors, invalid policy, and an unavailable configured source are not proof that no policy exists. Do not silently apply the default instead. Proposed PR-head policy can be previewed as data, not used as automatic write authority.

Before every effect, verify current target, comparison, and policy identity. Retries reacquire provider state. Moved source/base policy, closed PRs, changed API hosts, contradictory state, or untrusted saved plans refuse affected effects through the existing diagnostics and observation model.

## Comment ownership and migration

Pass the exact App bot author and stable delivery GUID as `occasionId` to the shared adapter. Preserve marker, policy identity, upsert, create, and transition semantics.

The App never adopts, edits, or deletes another actor's comments. Migration disables the old Action writer before enabling overlapping App effects. Old Action-authored comments remain historical; the App begins its own lifecycle. Rollback reverses writer ownership deliberately. A fresh installation does not prove migration, and a canary must exercise an actual cutover before that claim is made.

## Data, history, and commercial boundaries

[Privacy and data](../PRIVACY-AND-DATA.md) is the normative retention/projection home:

- seven-day minimized operational recovery records;
- no permanent analysis history before explicit opt-in;
- opted-in aggregate and pathless per-file numeric measurements;
- thirty-day rolling free history;
- paid history with no automatic age expiry while its entitlement/service is active, subject to user deletion and disclosed limits.

The old unresolved minimal-history-row alternative is superseded. Default no-history is now an intentional product choice; it is not an accidental result of a lease TTL. Opt-in collection starts prospectively. A dashboard is not permission to persist filenames, authors, patches, or PR prose.

Commercial plans charge for managed usage and team/service convenience, not access to the open engine. Duplicate webhook deliveries and internal retries do not create extra billable analyses. Exact public prices and quotas are not established by this architecture.

## Resource, cost, and failure boundaries

Qualify an explicit Worker input/result profile; do not inherit the engine's general 64 MiB result budget without evidence. Cover webhook size, GitHub pagination, policy/templates, report/plan size, Worker CPU/memory, subrequests, queue payloads, and D1 row/database limits.

A hosted limit returns an honest bounded/unknown result or actionable limit diagnostic, never silently truncated exactness. Paid included usage is not a technical ceiling: metered overages, hard runtime limits, database limits, and the service's own allowance are distinct. Observe all material cost drivers before announcing prices or capacity.

D1 currently caps one paid database at 10 GB; unbounded-age history must not assume that one database grows indefinitely. Bounded per-file rows, efficient access by tenant/repository/time, retention, export, and an explicit later scale-out or alternative-store path are sufficient initial design. Do not prebuild a sharding platform.

GitHub does not automatically redeliver failed webhooks. A queue recovers accepted work, not events that never reached ingress. The operating procedure must include missed-delivery detection/redelivery within provider availability, plus ordinary retry/DLQ repair.

For partial or ambiguous GitHub writes, reconcile observed provider state before repeating. If optional history persistence fails after effects, preserve the separate failure and recover the record without repeating effects. A deployment regression uses the preceding qualified version and a representative readback. Stateful rollback must account for schema/data compatibility; a code rollback alone is not a restored database.

## Qualification and completion

A canary can qualify an installed path before the complete public App experience exists. It cannot close the complete App outcome. Preserve separate evidence for:

- shared engine bundle/startup and Node/Action parity;
- signature/event/input admission and enqueue failure;
- delivery duplicates, same-PR serialization, lost/expired leases, retries, and DLQ repair;
- token/repository confinement, revocation, trusted policy, and stale comparisons;
- label/comment idempotency, check lifecycle/re-request/fork behavior, and no-dual-writer migration;
- onboarding, sign-in, current authorization, effective configuration origins, and export;
- history opt-in, numeric allowlist, per-file evidence, statistics, expiration, deletion, and recovery;
- limits, operational diagnostics, deployment/rollback, and an actual installed user journey.

Source, emulation, preview, production, registration, permission grants, installation, retention, billing, and ordinary use are separate observations. A narrower permission set may describe a canary only when its missing selected capability remains explicit; it is not the public App registration contract.

## Current standing

The repository contains the local public-PR playground and shared engine. The portable Worker engine, managed App runtime, dashboard, native App checks, quantitative history, and commercial service described here still require implementation and qualification. This design does not create cloud resources, install an App, grant permissions, spend money, collect data, or publish a service.

## Provider references

Provider facts were checked on 2026-09-17. Recheck current limits and account-specific standing at deployment.

- [GitHub webhook best practices](https://docs.github.com/en/webhooks/using-webhooks/best-practices-for-using-webhooks)
- [Validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
- [Handling failed webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/handling-failed-webhook-deliveries)
- [Generating an installation access token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app)
- [Native check runs](https://docs.github.com/en/rest/checks/runs)
- [Cloudflare Queues delivery guarantees](https://developers.cloudflare.com/queues/reference/delivery-guarantees/)
- [Cloudflare retries and acknowledgement](https://developers.cloudflare.com/queues/configuration/batching-retries/)
- [Cloudflare dead-letter queues](https://developers.cloudflare.com/queues/configuration/dead-letter-queues/)
- [D1 transactional batches](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch)
- [Workers pricing and metered usage](https://developers.cloudflare.com/workers/platform/pricing/)
- [Workers runtime limits](https://developers.cloudflare.com/workers/platform/limits/)
- [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
- [D1 import and export](https://developers.cloudflare.com/d1/best-practices/import-export-data/)
- [GNU AGPL version 3](https://www.gnu.org/licenses/agpl-3.0.en.html)
