# Managed App runtime source

## Meaning

This is the source-owned Cloudflare Worker, Queue, and D1 adapter for the optional managed diffdevil GitHub App. It admits verified webhooks, serializes selected repository execution, calls the shared diffdevil engine, owns one App check lifecycle, and retains only the selected recovery and opt-in history projections. It is not an App registration, deployment, dashboard, or live-service claim.

## Boundary

The [signed-in App's inspection and admission route](../app/README.md#inspect-and-admit-a-repository)
is the maintained caller of this runtime's authorization and admission services.
Its read-only trusted-policy review and same-origin admission form use the existing
GitHub session and bind the inspected repository, policy, revision and running
version. The standalone webhook Worker below does not serve that router. Source
delivery does not establish its production deployment or authorise admission.

[Recovery replay](../../docs/integration/app-recovery.md) owns the isolated restored
point's one-time healthy-source input adapter, later-duty application and durable
checkpoint. Healthy-source rollback does not establish input after loss of that
source or authorize serving.

`worker.mjs` is the small provider entry point. `app.mjs` carries webhook execution use cases; `admission.mjs` is the non-visual, authorization-callback boundary for repository settings; `storage.mjs` is the D1-only lease/recovery/history adapter; `contracts.mjs` defines the minimized queue and history shapes; `crypto.mjs` keeps webhook authentication and short-lived App-JWT minting at the secret boundary. `authorization.mjs` and `authorization-storage.mjs` provide a separate route-neutral GitHub-user authorization and protected browser-session seam. `commercial.mjs`, `commercial-wirt.mjs` and `commercial-storage.mjs` are the Wirt consumer: customer-authorized Works link, signed projection receiver, ordered application and report outbox, organisation bindings and the entitlement adapter; [the commercial link contract](../../docs/integration/app-commercial-link.md) owns their routes and boundaries, including the `reconcileAfterRestore()` seam an operator runs after any database restore or import, before serving again. The common engine remains in `src/diffdevil/`.

The authorization seam is source-only. A later dashboard router supplies allow-listed return-context keys, HTTPS origins, and exact HTTPS callback URLs, extracts the `__Host-diffdevil-oauth` browser-binding cookie at callback and the `__Host-diffdevil-session` cookie for session operations, binds the handlers to selected paths, and maps stable error codes to designed language. The callback accepts state only from the initiating browser and reads its return context from the consumed server-side attempt. Its injected provider adapter creates the GitHub authorization URL, exchanges the callback code, verifies the user authorization, and checks current installation plus repository administrator access through the user's authorization at each admission operation. The application validates the provider URL and its exact callback against that allowlist. Its injected protector seals authorization material before D1 storage and opens it only for server-side provider calls. The persisted authorization expiry must represent the lifetime of the protected grant including any refresh capability; token refresh returns rotated material and expiry through the provider verification callback. Session lifetime is a required adapter input; no product duration is selected by this source. The application never treats user authorization as installation execution authority. Protected success and refusal responses use `private, no-store`; mutations require a same-origin non-GET request. Dashboard admission origin is assigned by the service, not accepted from browser settings. No dashboard route, cookie-serving endpoint, live OAuth setting, or deployment is selected here.

`brief.mjs` joins the standard [PR brief](../../packages/design/pr-brief/README.md) to execution: it resolves the stored `brief` settings and trusted policy into the off, standard or advanced route, adds the App-owned `diffdevil-brief` rule, gathers audience-filtered context (current same-file neighbours read live without history consent; history-backed context from the repository's own retained records under consent), hands the engine a host-composed body whose write re-asserts that consent, records which open PRs it described so their briefs refresh through paced `brief-refresh` queue parts that share one in-memory read of the open PRs' files, and posts the optional final summary once per merged comparison. `worker.mjs` joins the premium context provider through the build alias `@diffdevil/premium-brief` (`premium/pr-brief/`, or `pr-brief-absent.mjs` in a Community build). The signed-in App Worker passes the composed premium extension's `brief` provider. `GITHUB_APP_BOT_LOGIN` names the expected comment author; `APP_ORIGIN`, when set, is the served signed-in App linked from the brief.

The queue holds only delivery/event/action, installation ID, numeric repository ID, PR/check reference, and receipt time; a brief refresh adds the PR numbers it names (or `open` with its walk cursor: the last PR number reached, a listing page and the reached PR numbers carried for another attempt), its cause identity and part. A history capture part adds its causing delivery and PR number, its part, and from the second part the pinned default-branch revision and start time. It never carries the raw webhook body, repository name, source, paths, author data, prose, tokens, or secrets. Current repository names, PR revisions, and trusted base policy are reacquired transiently after the execution lease is claimed.

## Local route

Build first, then run the Worker locally with bindings that are safe to recreate:

```sh
npm run build
node tools/run-wrangler.mjs dev --local --config apps/github-app/wrangler.jsonc
```

Use a local fixture secret for `GITHUB_WEBHOOK_SECRET`. The App ID/private key, Queue, and D1 binding are operational inputs; do not put any value in source, fixtures, or terminal output. This local route does not prove a GitHub App registration, provider permissions, deployed Queue/D1 behavior, deletion, or cost.

The selected purpose-bound GitHub connection stays available only while enabled and actually funded organisation standing needs authority checks; browser logout ends browser access. The route-neutral authorization service exposes `revokeAuthorization` for the session owner, and `commercial.revokeFundingAuthorization` also records unknown authority and queues label removal without unbinding or changing the subscription. Disconnect atomically invalidates the grant, sessions and pending artifacts and persists a disconnected preference across ordinary sign-ins. Only `commercial.reconnectFundingAuthorization` / `authorization.reconnectService` deliberately enables service again through the session owner's currently verified same-scope grant. `authorization.serviceConnection` and the post-logout `body.serviceConnection` expose local retention standing for disclosure, not live provider validity. An explicit provider-invalid answer clears that exact grant and its sessions/artifacts; transient or unknown answers do not. The future Account router must bind the selected disclosure and disconnect/reconnect behavior from [the connection contract](../../docs/integration/app-commercial-link.md#independent-github-connection-revocation); this source cut does not design or qualify those screens or historical restoration of a later disconnect preference.

## Migrations, recovery, and data handling

`migrations/0001_initial.sql` establishes installation/repository state, atomic delivery and renewable fenced per-PR leases, owned-check handles, seven-day operational records, opted-in numeric history, repair work, and restore-resistant deletion tombstones. `0002_consent-provenance.sql` replaces the lossy final-write `consent_origin` model with independent execution, history, and stored-configuration provenance plus explicit consent reasons. `0003_preserve-active-consent.sql` retains the current execution and enabled-history consent of existing active rows without inventing their historical origins; other legacy reasons remain `unknown` until a new explicit transition establishes a current fact. `0004_admission-settings.sql` adds compare-and-set settings revisions, stored policy identities, and explicit one-writer confidence for the non-visual admission boundary. `0005_offboarding-consent-tombstones.sql` retains execution and history standing after the offboarding projection expires, so a returning repository is asked to re-consent only for capability that had actually been active. `0006_user-authorization.sql` adds hashed, browser-bound one-time attempts and artifacts, protected user authorization, and hash-identified server sessions without changing repository consent columns. `0007_consent-actors.sql` adds the latest acting GitHub administrator ID beside each repository's execution and history consent; older actors remain unknown. `0008_history_analytics.sql` adds the repository/time query index, seven-day execution-attempt rows, duplicate receipt count, and shared saved query lenses. `0010_commercial-links.sql` adds Wirt link attempts with their latest establishment outcome, links with their latest applied projection, transition token and restore hold, organisation bindings with observed authority and refusals, the label-free report outbox, received-nonce hashes and the installation's numeric account. `0011_service-connection.sql` adds the minimal persistent service-disconnect preference, separate from browser grants and commercial state. `0012_manage.sql` adds the Manage console's own facts (explicit selection, the Free connected organisation, departures to Works, the choice of what stays, the Pro namespace default) and `0013_business.sql` the Business coordination facts (named linked policies by revision, repository links with the revision last applied, publications with their per-repository results, automatic setup, delegations and the administrative record). Final-session logout removes dormant protected authorization material when no pending artifact or enabled, actually funded organisation purpose remains. Only Pro/Business `funded` or `renewal-in-grace` standing earns sessionless retention; spare capacity does not. A restore hold preserves only that last funded purpose and withholds observations until reconciliation. Ordinary sign-in never clears a disconnected preference. Authorization cleanup now requires migrations 0010 and 0011, including when the Wirt routes are unconfigured; `D1AuthorizationStore.maintain()` removes expired rows and dormant grants when that adapter is operated. Before a real adapter is operated, run the migrations against the selected binding and use a disposable fixture to exercise duplicate delivery, lease recovery, each repair kind, consent loss, admission refusal, and configuration/history export-import. The exact `database_id` in `wrangler.jsonc` is a non-operational placeholder: an operator must replace it only after creating or selecting the target D1 database and read back the binding.

Operational results are minimized and intended for seven-day recovery. A newly discovered or restored repository remains `pending-enable`: provider execution and history both need positive current access and an explicit operator configuration change; suspension, restoration, and post-grace re-addition never silently re-enable either. Legacy active rows retain their existing current consent while their historical origins remain unknown. Policy layers preserve the selected preset list, so an authoritative repository `presets: []` removes inherited size behavior instead of merely masking its declaration provenance. The provider-wide inventory credential requests only repository metadata read; per-repository execution is separately confined to Contents read, Pull requests write, and Checks write.

Opted-in history stores an allowlisted versioned aggregate plus pathless per-file numeric rows, coverage/evidence standing, engine/report identities, and policy-effect categories only; paths, previous paths, people, prose, raw reports, source, queues, errors, templates, and secrets are excluded. Effect reconciliation, check publication, and history publication use one claimable repair contract containing immutable source/policy/comparison identities and bounded summaries. Pre-effect App execution failures additionally retain one stable code and phase, never the provider response or error message. Repair must reacquire provider facts and may reconcile or republish only an unobserved/idempotent consequence—it never replays an observed non-idempotent effect. Configuration export remains separate from the versioned numeric-history export; import reapplies deletion tombstones before any restored history can be retained or served. History retention/offboarding, independent administrator grace, export, deletion, and tombstone reapplication remain governed by [the privacy contract](../../docs/PRIVACY-AND-DATA.md).

## History analytics read contract

`history-analytics.mjs` exposes `createHistoryAnalyticsService({ store, authorize })`. Every call requires an exact repository grant set supplied by the protected operation; the authorizer also checks the current actor and repository for each read, comparison side, lens write, and export. A comparison omits inaccessible repositories before storage reads and returns requested, authorized and represented repository counts. Saved lenses grant no access when replayed. `authorization.mjs` offers matching route-neutral session methods and `private, no-store` response headers. The machine request, saved-lens, and response contracts are `contracts/history-query-v1.schema.json`, `contracts/history-lens-v1.schema.json`, and `contracts/history-result-v1.schema.json`; executable specimens validate each result family. These are source contracts for a future authenticated App router; no public endpoint or dashboard route is deployed by this module.

Each query supplies `{ version: 1, repositoryId, from, to, family, metric?, policyId?, evidence? }` with canonical UTC ISO times and an exclusive `to`. Families are `overview`, `distribution`, `concentration`, `trajectories`, `occurrence`, and `operations`. Metrics are allowlisted total `files`, `changed`, `rawChurn`, `includedFiles`, an opaque configured metric reference, or an opaque scope reference with one of those numeric measures. There is no SQL, expression, path, person, or free-text dimension. `compare(left, right)`, `baseline(query with exact or bounded current measurement and report/metric/policy identity)`, and `policyLab(query, proposal)` are separate versioned calls. Every result names its sample count and observation-time basis. The default PR view takes the latest retained analysis per PR *in the requested window*, including open PRs; it does not claim final or merged PR size. Trajectories keep revisions distinct, while the seven-day operational family counts actual execution attempts separately from deliveries and duplicate receipts.

Distributions use `nearest-rank-v1` at `ceil(p × n)` over all representatives. A quantile has independent lower and upper endpoints; an unbounded side is `null` rather than an exact-only substitute. Histograms return certain and possible counts. Baselines use ordinal below/equal/above counts for fewer than 20 representatives and only then expose a percentile interval. The constant corresponds to rank steps larger than five percentage points below that sample size. Repository/period comparisons require the same quantity, report/metric semantics, evidence filter, and policy identity for policy-included or configured values. They always flag full-window coverage as unestablished because retained analysis rows cannot reconstruct every opt-in or delivery gap between observations.

Unknown count evidence, and bounded counts without a supplied lower endpoint, retain the domain-proven lower bound `0`; their evidence status remains unknown or bounded. This applies to total, scope, and pathless per-file counts. Configured numeric metrics can be signed, so a missing lower endpoint remains `null`. Baselines refuse unknown current evidence, but accept finite or one-sided bounded current measurements. A historical interval is certainly below only when its upper endpoint is less than the current lower endpoint, and certainly above only when its lower endpoint exceeds the current upper endpoint. Equality requires both intervals to resolve to the same single value; touching or overlapping ranges, including identical non-degenerate ranges, contribute to `uncertain`. Rank and percentile intervals retain that uncertainty rather than ranking the current lower endpoint as an exact observation. The rank interval places the current measurement among the `n` historical representatives plus itself, smallest first, so it spans `1` to `n + 1`; the percentile interval is the share of history certainly versus possibly below the current measurement.

Policy Lab v1 accepts one retained numeric metric and either one threshold comparison (`gte`, `gt`, `lte`, `lt`) against a historical opaque rule reference or non-overlapping numeric ranges with an `otherwise` band against a historical band reference. The selected metric may be switched to another already-evaluated retained numeric result; a new formula is not executed in the App. It counts changed, unchanged, incompatible, unsupported, and insufficient-evidence representatives separately. Path-sensitive reconstruction, arbitrary formulas, missing historic results, changed semantic versions, and non-exact numeric evidence never produce a precise replay claim. Results describe proposed matching only; historical provider writes are never replayed. Saved lens version 1 stores one complete, installation-shared allowlisted query, its report/metric/policy identity, and optional occurrence focus as protected configuration, with an optional user-visible name and description. It stores no copied numeric result, path, executable expression, or user identity; it remains saved if historical coverage disappears and reports incompatible versions separately. Numeric export version 2 is repository-scoped for the authenticated read method, includes only unexpired published records and their pathless rows, and retains import compatibility with version 1. Protected configuration export version 7 carries saved lenses separately from numeric history.

## Operator posture

The separate [analytical App data contract](../../docs/integration/app-analytical-data.md)
documents the six-surface read service, protected HTTP adapter, lifecycle/final-merged
collection, observed file sizes and migration `0009_analytical_app.sql`. It is a
source candidate whose named-history landing depends on acceptance of the revised
privacy/final-merged contract; the pathless analytics API above keeps its own meaning.

The selected adapter requires separate Worker/Queue/D1 resources, webhook secret, GitHub App ID, and App private key. Registration, installation permissions, deployment, DNS, history collection, paid entitlement, and production data effects are deliberately outside this source contribution. The intended App permissions are Contents read, Pull requests write, and Checks write; do not broaden them for convenience.

The scheduled Worker maintenance path performs recovery pruning, expiry-derived cleanup, offboarding grace processing, and tombstone expiry. Offboarding and history deletion remove stale App check handles and open repair projections with their retained repository/PR/head/policy identities. `maintain`, versioned configuration `exportState`/`importState`, and separate versioned numeric-history `exportHistory`/`importHistory` are the operator-invokable source seams. The Worker retries rate-limited or lost-lease work through its configured Queue retry/DLQ path. Confirmed disabled access, stale re-requests, and closed PRs are rejected; ambiguous provider, check-publication, and history cases become repair state rather than being acknowledged as complete. Live readback, deleted-installation reconciliation, restore behavior, and provider token boundaries still need real provider qualification.

## Registration and credential helper

Start either helper through the repository's clean launch entry, before Node
starts. On Windows use PowerShell 7 without profiles; on Unix use Bash protected
mode (which ignores `BASH_ENV` and imported functions):

```powershell
pwsh -NoProfile -NonInteractive -File apps/github-app/operator-launch.ps1 manifest --help
pwsh -NoProfile -NonInteractive -File apps/github-app/operator-launch.ps1 operator registration --webhook-url https://example.invalid/webhooks/github
```

```sh
bash -p apps/github-app/operator-launch.sh manifest --help
bash -p apps/github-app/operator-launch.sh operator registration --webhook-url https://example.invalid/webhooks/github
```

Keep these scripts beside the helpers in an installed source tree. They resolve
Node from the trusted operator PATH and preserve caller-relative file paths,
arguments, exit status and redirected streams. Windows starts Node without a new
window; an explicitly interactive console retains its TTY. A background caller
must also hide its own PowerShell process at creation. Do not start a Node wrapper
to invoke this entry: `NODE_OPTIONS` could execute before that wrapper's code.
Direct Node/library entry remains usable only from an already-clean runtime.

The launchers allow only OS paths and the selected Cloudflare authentication
inputs: `CLOUDFLARE_API_TOKEN` takes precedence, otherwise API key/email, otherwise
Wrangler's retained OAuth configuration under the selected home. They forward
only explicitly named seal/Wirt sources into fixed private environment slots;
values never become command arguments. The helper's native children independently
allow only OS/authentication inputs and fixed account/logging controls. Ambient
Node options/module paths, proxy/CA overrides, alternate API endpoints and
unrelated variables do not reach Node or its credential-bearing children. This
qualifies a trusted operator installation with hostile incidental Node/transport
settings, not an untrusted host, executable, dependency tree or credential store.

Credential attachment consumes a **qualified artifact**, with its independently
selected SHA-256, rather than deriving code from mutable `latest`. The existing
script's Upload Version API receives all native modules, versioned settings,
selected static assets and credential bindings in one new undeployed version.
The contained upload child uses pinned Wrangler's native `auth token --json`
internally; its credential-valued response never reaches helper output. The
version POST is attempted once. No inherited binding/asset selector, deployment,
resource provisioning or non-versioned settings write is part of that POST.

Prepare the artifact from the **complete built target config**, including the
joined App's generated server, modules and assets, before protected input:

```powershell
$artifactPath = 'D:\operator-custody\qualified-app-artifact.json'
$artifact = pwsh -NoProfile -NonInteractive -File apps/github-app/operator-launch.ps1 operator prepare-artifact --config path/to/built-target/wrangler.json --account-id account-id --artifact-file $artifactPath | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Artifact preparation refused.' }
```

Preparation uses pinned Wrangler's `versions upload --dry-run --outfile` and
freezes the actual multipart modules/settings plus the complete selected assets.
It applies `.assetsignore`, retains `_headers`/`_redirects` and asset routing, and
binds the original config hash. Source symlinks and unresolved inherited bindings
refuse before protected input. The artifact contains executable code/assets and
no credential bindings; private composites keep their private custody. Qualify
its returned digest against the intended source/composition and retain that
selection through install. Do not silently regenerate the artifact at upload time.

Pass `--artifact-file <retained-artifact>` and `--artifact-sha256 <qualified-digest>`
to `check` and `install` (or the manifest install handoff). Existing consumers add
this preparation/selection; omitting it refuses before protected input. Existing
receipt files remain readable through read-only `resume`, including legacy
receipts without artifact lineage. No raw values need manual transport.

The preferred initial setup is `manifest-helper.mjs`: a local native manifest
form for personal/organisation registration and explicit visibility, with
state-checked callback, contained conversion, encrypted capture and a direct
in-memory handoff to the existing installer. It opens no browser and deploys
nothing. [The maintained invocation and recovery route](../../docs/integration/app-staging.md#native-manifest-registration-and-capture)
explain retained seal custody, the one-hour handshake, interruption checkpoints,
the separate installation receipt, and the unobserved real GitHub redirect seam.
Use the clean entry with `manifest --help` for its CLI options and
`npm run qa:app:manifest` for isolated local-browser/synthetic-provider proof.
The explicit seal file or named-environment input is shared by capture, resume
and installation. A managed environment consumer needs no plaintext seal file.
The install command carries the qualified base version and initial-or-previous
seal receipt selection into the same installer described below. Capture does not
prove an empty target or replace the separate credential-version receipt.

`operator-helper.mjs` prepares non-secret registration inputs and creates one
**undeployed** credential-bearing Worker version after reading back the selected
Cloudflare account, existing Worker deployment and version list. It creates no
App, resource, deployment or repository installation. The exact JSON/JSONC config
selects the Worker; `--worker` checks that name and cannot override it. A conflicting
account, absent/invalid `APP_DB` ID, either checked-in D1 placeholder, or a latest
uploaded version whose `APP_DB` differs from the config refuses
before reading protected files or prompting for input. Use a derived operational
config or the admitted built App config, with its relative paths kept valid.

```sh
bash -p apps/github-app/operator-launch.sh operator registration --webhook-url https://example.invalid/webhooks/github
bash -p apps/github-app/operator-launch.sh operator check --artifact-file path/to/qualified-artifact.json --artifact-sha256 qualified-64-hex-sha256 --app-id 123 --private-key-file path/to/retained-app-key.pem --account-id account-id --config path/to/derived-qualification.jsonc --receipt-file path/to/new-credential-receipt.json
bash -p apps/github-app/operator-launch.sh operator install --artifact-file path/to/qualified-artifact.json --artifact-sha256 qualified-64-hex-sha256 --app-id 123 --private-key-file path/to/retained-app-key.pem --account-id account-id --config path/to/derived-qualification.jsonc --receipt-file path/to/new-credential-receipt.json
bash -p apps/github-app/operator-launch.sh operator resume --account-id account-id --config path/to/derived-qualification.jsonc --receipt-file path/to/existing-credential-receipt.json
```

Registration selects Contents read, Pull requests write, Checks write, and
`pull_request`/`check_run`; GitHub supplies installation lifecycle events. Add
`--policy-refresh` to subscribe to `push` for trusted default-branch policy refresh.
`--app-name`, `--visibility` and `--oauth-callback-url` prepare a distinct identity
and user callback. These are registration inputs, not a provider registration or
an App admission control. The callback uses GitHub's documented
[`callback_urls[]` parameter](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-using-url-parameters).

The standalone backend installs three inputs. A joined-App config (`APP_ORIGIN`
in vars) requires OAuth client ID, OAuth client secret file, retained seal key
file (or the explicitly named `--seal-key-env <variable-name>`) and its opaque
recovery reference as well. When Wirt is configured (`WIRT_ORIGIN`), its current
signing input is required as either `--wirt-signing-key-file <path>` or
`--wirt-signing-key-env <variable-name>`: the complete operation delivers all
seven inputs in one version. Each key accepts exactly one source; the helper
does not search or enumerate ambient variables. Community without Wirt needs no
unused commercial credential. The [staging packet](../../docs/integration/app-staging.md#protected-input-operation)
has a complete PowerShell invocation; production uses the same options with its
own exact config, Worker, custody files or named child inputs, and recovery reference.

For a joined App, select `--base-version-id <qualified-version>` and either
`--seal-key-initial` for a confirmed new/empty target or
`--seal-key-previous-receipt <durable-receipt>` for an established target. The
initial mode refuses an existing `APP_SEAL_KEY` secret binding in the qualified
version's metadata without reading its value; absence is not empty-D1 or custody
evidence. The selected base is an identity/seal-continuity checkpoint. The artifact
supplies the uploaded source independently of a concurrent latest upload. Initial
mode also inspects the actual latest seal-binding state. The artifact's source,
included engine and Community/private composition are qualified by the activation
operator before its digest is admitted.
The exact configuration selects `GITHUB_APP_BOT_LOGIN` (the standalone runtime's
existing default is `diffdevil[bot]`); configure the actual registered bot.

A manifest-capture caller can supply the five matching GitHub values through
`installCredentials({ readGitHubInputs, ... })` instead of creating plaintext
credential files. The callback runs after the durable checkpoint; its App/client
IDs must match the selected IDs. That caller also passes `artifactPath`,
`artifactSha256`, `baseVersionId` and
either `sealKeyInitial` or `sealKeyPreviousReceiptPath`, plus the same retained
seal/Wirt file or named-environment inputs. Capture and installation receipts
remain separate recovery artifacts.

Ordinary interactive use requests the webhook secret through a hidden TTY
checkpoint after preflight and the durable receipt commit. Alternatively,
`--webhook-secret-file` consumes an opaque operator-controlled file;
`--webhook-secret-stdin` requires an already-safe redirected automation channel and
refuses TTY stdin. No raw value belongs in arguments, shell history or a receipt.
The downloaded private key remains an unencrypted RSA PKCS#1 PEM. Input file
contents are validated only after preflight. `check` exercises target readback,
file metadata and a same-directory atomic receipt probe; it does not read protected
contents, create the real checkpoint or write a Worker version.

Installation sends JSON directly to the contained upload child's private stdin. No temporary
secret file is created, including on failure; `carrier: not-created` records that
fact. Native stdout/stderr are contained, Wrangler disk logs and telemetry are
disabled for these children, and only allowlisted receipt fields reach output.
Named seal/Wirt environment values are read only after the flushed receipt exists,
removed from the Wrangler child environment and sent through that same private
stdin. The immutable artifact is a separate source package. The helper leaves
operator-owned input files intact. Their access controls
and retention remain the custodian's responsibility; Node's Unix file mode is not
a Windows custody/ACL guarantee.

Install privately mints the existing short-lived App JWT and uses GitHub's
[authenticated `GET /app`](https://docs.github.com/en/rest/apps/apps#get-the-authenticated-app)
to match the App ID and OAuth client ID, then reads the public bot identity and
compares it with the exact configuration. Redirects refuse; no JWT, raw provider
body or protected value reaches the receipt. This qualifies identity and the
PEM's authentication, not the webhook/OAuth secret's eventual use. `check` reports
identity as unverified and does not perform these protected-content reads.

The successful receipt retains a domain-separated SHA-256 seal continuity check
with its custody reference and Worker/account/database identity. An established
target compares the same key with its previous successful receipt before another
write. Another key, target or custody reference refuses. Keep the original seal:
a new key cannot open existing protected authorization or file locators. The
check proves equality against the retained record, not off-workstation custody
or independent retrieval.

Retain the seal and Wirt signing material through their admitted recovery route.
GitHub's PEM, webhook and OAuth-secret files are transient installer inputs, not
a requirement to keep seven plaintext files. Their custodian may remove them
after the provider result and recovery handback are established; the helper never
deletes operator-owned inputs. Full-set installation remains supported. The first
real GitHub rotation or enforced Wirt rollover must scope the exact subset and
previous-key operation before use. This helper prepares the initial full set;
it is not a general rotation service.

After a custodian has established an appropriate protected recovery destination,
the contained file-generation specimen is:

```sh
bash -p apps/github-app/operator-launch.sh operator generate-seal --seal-key-file path/to/new-custody-owned-seal.txt --seal-key-recovery-ref admitted-custody-reference
```

It generates 32 random bytes once, exclusively creates and flushes the selected
file, and prints only a non-secret check/reference. It refuses an existing file.
No typed phrase or console key is a default. Use this only when the custody route
already selected that file destination; generation does not establish ACLs,
off-workstation recovery or a store binding. An environment-only custodian keeps
generation/admission inside its existing contained route.

The non-secret receipt is created exclusively and flushed before protected input.
A durable `attempted-unknown` marker precedes asset staging and version creation.
Command acceptance, the exact returned version ID, its operation tag/artifact SHA,
secret-binding names/database, observed script ETag and active-deployment comparison
remain separate facts. `version-created` requires matching artifact/operation
lineage on that undeployed version and an unchanged deployment. This is request-bound
source identity through the atomic API, not a provider byte-for-byte download or
secret-value readback. It proves no registration correctness, exposure, runtime
behavior or deployment. `partial`/`unknown` never count as success. `resume` requires the same
exact config hash/account/Worker/database and a usable receipt, performs only
provider reads, and never rereads inputs or repeats installation. Missing or
foreign receipts refuse. A lost write acknowledgement remains partial even when
the new version is seen. Reconcile that exact result before admitting any new
operation; use a fresh receipt only for a deliberately selected new operation.

A proven private-input, identity, continuity or pre-write target failure persists
terminal `state: not-attempted` and `command: not-attempted`. Correct its cause
and use a new receipt for a deliberately selected new operation. After the
attempt marker, use read-only `resume` before considering another effect.
Select a durable operation-receipt path outside disposable worktrees from the
start, or preserve the non-secret receipt in the operation's durable handback
before retiring the checkout. Repository `artifacts/` is only a working copy.

Static assets are staged with their exact native content identities before the
single version POST. A failure can leave staged immutable assets. `not-attempted`
attests that no credential-version request was attempted; it is not an asset
rollback claim. A failed child exit without that before-effect fact stays unknown
even if a matching version is not yet listed. Recovery never
repeats staging or version creation. The staging packet keeps artifact qualification,
credential attachment and version-specific activation distinct. The former
`versions secret bulk`/`latest` path is not used for installation.

`--fake` selects disposable in-process provider responses and labels its receipts
`mode: fixture`; they cannot be resumed as live receipts. The registered
`operator-helper.test.mjs` also exercises the actual CLI/native-child path against
an echoing synthetic provider, failures, late receipt/readback recovery and both
production/staging targets. These tests make no GitHub or Cloudflare request.
