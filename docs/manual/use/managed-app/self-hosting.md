# Self-host the App

> [!NOTE]
> **In development**
>
> The supported runtime and operator seams exist in source. The complete self-hosted service, authenticated administration, and production recovery journey still need qualification.

Self-hosting means operating the same managed App under your own GitHub App identity and infrastructure. It does not enroll repositories in the official hosted service or change the policy engine. You own registration, repository scope, Cloudflare resources, credentials, upgrades, incidents, retained data, and the information you give your users.

The supported adapter is **Cloudflare Workers, Queues, and D1**. Application meaning is kept outside those provider bindings, but that does not make an unimplemented Docker image or alternate provider a supported deployment. For a service someone else operates, use [Use the managed service](service.md).

## Start from a complete source checkout

Use an immutable source revision whose application changes you have reviewed, Node.js 22 or later, npm, Git, and the declared dependencies. Building the npm CLI alone does not install the App application tree. Keep local configuration, credential files, database exports, and provider receipts outside tracked source and access-controlled; the repository's ignored `artifacts/` directory is convenient for non-secret build evidence, not a secure secret store.

From the repository root:

```sh
npm ci --ignore-scripts
npm run build
npm run check:github-app
```

The final command performs the maintained Worker dry-run and default-policy qualification. It does not create a Worker, queue, database, App, credential, installation, or deployment. A passing bundle is necessary but does not establish real permissions, delivery, retention, or useful PR effects. The [operator source](../../../../apps/github-app/README.md) and [Development command register](../../../DEVELOPMENT.md) own the exact supported commands.

Run the ordinary application tests before selecting an upgrade. They exercise signature admission, real application use cases against isolated boundaries, D1 state transitions, retries, and credential-helper failure paths without enrolling a repository. They are not evidence that your production account has those resources.

## Register the intended GitHub App

You need authority over the account or organization that will own the registration, an actual HTTPS webhook destination, and the ability to review the installation's repository access. Keep the App registration, a repository installation, and execution enablement distinct.

This complete, read-only specimen prints registration inputs and a provider registration link:

```sh
node apps/github-app/operator-helper.mjs registration --webhook-url https://example.invalid/webhooks/github
```

`example.invalid` is deliberately non-operational. Replace it with your selected webhook destination when preparing a real registration; running this specimen registers nothing. The helper selects Contents read, Pull requests write, Checks write, and the PR/check events. GitHub supplies installation lifecycle events. Review the resulting App identity and scope rather than assuming the example selected your organization.

Keep the numeric App ID, its downloaded RSA private-key file, and webhook secret as different inputs. The private key authenticates the App; installation tokens are minted for bounded execution; the webhook secret verifies incoming bytes. Hosted adopters do not receive these operator credentials. Do not put any secret value in a command argument, repository file, public issue, screenshot, or documentation example.

## Give each provider resource its real job

The maintained [Wrangler configuration](../../../../apps/github-app/wrangler.jsonc) is the adapter's binding contract, not a provisioned production environment.

| Resource | Required consequence for the operator |
| --- | --- |
| Worker | Serve signed webhook admission, health, queue consumption, and scheduled maintenance using the shared built engine |
| `APP_QUEUE` and its consumer | Durably retain admitted minimal envelopes, retry bounded work, and route exhausted deliveries to the selected dead-letter queue |
| `APP_DB` D1 binding | Own delivery deduplication, fenced PR execution, settings/consent, recovery, checks, history, and deletion state |
| Scheduled maintenance | Actually run expiry, offboarding, and tombstone maintenance; a declared cron alone does not prove cleanup happened |
| HTTPS ingress and App registration | Deliver events to this exact service identity, not another environment or a dashboard route |

Provision resources in your explicitly selected Cloudflare account using its supported provider tooling. Record the actual resource identities and bindings in an untracked derived configuration. The checked-in all-zero database ID is a placeholder and must not be deployed. Preserve the source configuration's entry point, engine aliases, migration directory, queue settings, and scheduled maintenance. Moving the configuration file changes relative path resolution; rebase those paths rather than copying it to another directory unchanged.

The current configuration keeps `workers_dev` disabled. A repository hostname, reserved domain, or selected configuration route is not an exposed service. Establish the actual ingress separately and verify it against the App's webhook setting. Do not expose store/admission methods as unauthenticated HTTP endpoints merely to obtain a control surface.

## Initialize and migrate the database

Apply the repository's ordered D1 migrations to the intended database before admitting work. The maintained sequence covers the initial ledger and leases, consent provenance, preservation of already-active consent, revision-checked admission settings, and offboarding consent tombstones. Skipping an intermediate migration can change whether a repository runs or whether a restore respects an opt-out; it is not only a missing-column problem.

Use the pinned Wrangler D1 migration commands and explicitly select local versus remote state. For a local development database, this command applies only the checked-in migrations to local state:

```sh
node node_modules/wrangler/bin/wrangler.js d1 migrations apply APP_DB --local --config apps/github-app/wrangler.jsonc
```

Then the maintained local adapter can be started with:

```sh
node tools/run-wrangler.mjs dev --local --config apps/github-app/wrangler.jsonc
```

These commands are not a public deployment or complete authenticated installation. Use local fixtures for qualification rather than a copied production credential. For live migration, review provider targeting, compatibility, backups, and recovery first; never replace `--local` with `--remote` casually in a shared production terminal. The complete migration files and their D1 qualification remain in the [operator source](../../../../apps/github-app/README.md).

`GET /health/ping` establishes that the Worker answers. `GET /health/ready` currently checks database reachability; it does not prove all migrations, queue delivery, GitHub credentials, or repository execution. An HTTP 200 on either is not your release acceptance test.

## Install credentials without confusing version creation with deployment

The source-owned credential helper requires an already identified Worker deployment, an actual account ID, and a derived configuration without the placeholder database ID. It reads back the account, deployment, and versions before reading the private key. It is not a bootstrap command for a nonexistent Worker.

For that established target, the operator command has this shape:

```sh
node apps/github-app/operator-helper.mjs install --app-id 123 --private-key-file path/to/downloaded-app-key.pem --account-id account-id --config path/to/derived-qualification.jsonc
```

The identifiers and file paths are specimens, not values for a real environment. The helper accepts the downloaded unencrypted RSA PKCS#1 App key and obtains the webhook secret through a hidden interactive prompt. Its non-interactive `--webhook-secret-stdin` route is for an already-protected, redirected input, not an instruction to echo a secret into shell history. No secret value belongs in a receipt.

This helper creates an **undeployed Worker version** using versioned secret installation. It does not deploy that version, register the App, install it on a repository, or enable execution. Its receipt separates command acceptance, created-version identity, version readback, unchanged deployment, and partial/unknown results. A failed readback needs reconciliation; rerunning blindly can create another version.

Deploying the selected version remains a deliberate provider operation under your own operating authority. Keep credentials out of diagnostics, use the narrow required permissions, and rotate/revoke them through the selected provider route after testing the replacement. Credential rotation and code rollback do not undo database migrations or repository effects.

## Qualify before enabling repositories

Verify the actual deployed version, bindings, complete migration state, protected credential installation, webhook destination, queue consumption, and maintenance execution. Then use a deliberately selected test repository and the admitted authenticated administration route to establish access, effective policy, exclusive-writer confidence, and explicit execution consent. Keep history off unless that test separately selects it.

Current source provides `createAdmissionService` with a deny-by-default authorization callback and revision-checked updates; it does not ship a finished public dashboard or a documented customer administration HTTP API. The complete service needs an authorized adapter for these operations. Direct SQL edits or an unprotected wrapper are not substitutes. Final UI labels and interaction order are not fixed here.

Exercise a supported event through signature verification, durable admission, one execution, native check, selected label/comment readback, duplicate/no-op handling, and a fresh head. Distinguish a queued event from completed application. Verify disabled access and history opt-out as well as the happy path. A one-repository backend canary does not establish general account administration or complete data-lifecycle behavior.

## Observe and repair by stage

Ingress accepts only selected signed events and queues minimized identifiers, not raw webhook bodies. `202` with `enqueued` means durable admission; `202` with `ignored` means no selected work was queued. An enqueue failure is not a completed delivery. Work that never reached the queue needs provider-delivery investigation, not a retry of an imaginary queue record.

Once admitted, delivery deduplication and per-PR fenced leases prevent overlapping attempts from owning the same work. A lost lease must be reacquired before effects. Do not delete a lease or mark a delivery complete to force a stuck operation through. Inspect its stable code, phase, current identity, and repair/readback standing first.

A dead-letter item or open repair remains unresolved work. Repair must reacquire current access, source, policy, and provider state. A stale or closed PR can be rejected without writing; an ambiguous comment creation needs readback before any repeat. If labels succeeded but check publication or history failed, repair that consequence without blindly replaying the effects. [Troubleshooting](../../help/troubleshooting.md#an-app-operation-needs-repair) preserves the relevant diagnostics.

Keep recovery logs as minimized and bounded as the database. Queue payloads, dead letters, traces, and exports must not become a parallel raw-patch archive. The seven-day recovery boundary applies to failures too; retries do not keep an event alive indefinitely.

## Back up, export, restore, and update

Use three distinct artifacts: the resolved ordinary policy for portability; the versioned application configuration/state export for settings, consent, origins, and deletion meaning; and the versioned retained numeric-history export. A raw D1 export may contain protected account/configuration state and is not the user-facing history download.

The repository supplies `exportState`/`importState`, `exportHistory`/`importHistory`, and `maintain` on the storage adapter. These are operator integration seams, not invented public HTTP routes or a one-command backup service. Use them through the authorized operating adapter and qualify round trips with the [D1 tests](../../../../apps/github-app/d1-state.test.mjs). Protect exported bytes according to their contents; “no private key” does not mean public data.

Pause conflicting writers and reconcile or drain admitted work before a restore or provider move. Do not import active leases as permission to replay old effects. Restore opt-outs, expiration, and deletion tombstones before serving history or processing jobs. Imported repositories return with unknown reach and pending enablement, not implicit installation access or renewed consent. Re-establish current authorization and obtain the required explicit re-consent before resuming.

A useful restore proves policy/configuration identities, history versions and evidence, deletion survival, no expired-data resurrection, and one newly authorized operation. D1 SQL import alone proves none of those application consequences. Define the longest supported backup-restore window: tombstones must outlive it by seven days. Disclose bounded provider-backup expiration instead of promising immediate erasure of every backup.

Before a code update, read the selected source and migrations, exercise local verification, record the current version/configuration, and test recovery in an isolated environment. A previous Worker version is not automatically compatible with an upgraded schema. Stop and reconcile on incompatibility rather than treating rollback as a database reversal.

## Stop or decommission safely

Disable new execution and collection for the intended scope, reconcile in-flight work, preserve authorized exports, and apply the chosen offboarding/deletion schedule. A temporary access error is not sufficient evidence to destroy an installation's history. Confirm real removal or an administrator's selected action.

After the retained-data and recovery obligations are complete, remove the selected ingress, credentials, installation access, queues, database, and other resources through their provider controls. Do not destroy the database or maintenance route first and strand deletion work. Removing an App does not require a final GitHub cleanup write, and old App-owned labels/comments do not disappear merely because the service stopped.

The [App architecture](../../../integration/github-app.md), [privacy and history contract](../../../PRIVACY-AND-DATA.md), [security reporting](../../../../SECURITY.md), and [licence map](../../../../LICENSES/README.md) remain the complete specialist authorities. Your deployment must meet its own access, disclosure, retention, support, and AGPL obligations; the official service's future public terms are not automatically yours.
