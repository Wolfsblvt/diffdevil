# Persistent App staging

## Meaning

The signed-in App can be built as a separate persistent consumer of Wirt staging.
Its dashboard, managed backend, sessions, commercial projections, participation
records, history and background work share one staging Worker and staging D1,
separate from production. This document owns the source configuration, local
qualification and activation handoff. The selected staging origin, GitHub App
bot, installation-account IDs, D1 UUID, Queue names and Wirt public client ID
are committed source assignments from returned provider readbacks. These source values do not prove
that the selected hostname is served, the bindings are deployed or the App's
live consumer journey works. No participation campaign is currently admitted,
so its configuration remains unset while the selected survey/reward journey stays
a later activation prerequisite. Ops returned a protected signing-key custody
reference and confirmed its active key matches retained custody, but the installer's
consumer binding has not been read back. Protected reference and key material stay
in Ops custody and are not repeated in this public source document.
The original production-origin Wirt TEST client and callback registration remain
preserved. Registration alone does not establish a deployed commercial App
consumer or an App-held relationship; the dedicated staging tuple is distinct.
Only a staging build adds a small neutral Staging mark beside the analytical and
Manage page headings and the `Staging ·` browser-title prefix. Both project the
existing selected build target; the fixed Works header and production appearance
remain unchanged.

## One consumer per deployment

`apps/app/staging/wrangler.json` selects the same `apps/app/src/worker.mjs` as the
ordinary App. It does not introduce another billing engine or a router that mixes
Wirt producers. `APP_DB` is the entire deployment's database, including protected
GitHub authorization, browser sessions, account/Manage state, funding, survey
responses and analytical history. `APP_QUEUE` and its consumer/dead-letter Queue
belong to that same deployment. The standalone `apps/github-app/wrangler.jsonc`
is not a second staging backend to deploy beside it.

| Boundary | Ordinary App source | Staging source assignment |
| --- | --- | --- |
| Worker | `diffdevil-app` | `diffdevil-app-staging` |
| GitHub App identity | Production registration | App `5304708`, OAuth client `Iv23ligyaI03RtvptTAa`, bot `diffdevil-staging[bot]` |
| Wirt public OAuth client | Production controlled-test client | `01a136df-f666-70e6-9876-ce292de127c8` |
| Installation accounts | Production access | Exactly `[9962104,341708115]` |
| D1 | `diffdevil-github-app` | `diffdevil-github-app-staging` (`6f952779-bd44-42de-adf7-cc03709c8222`) |
| Work Queue | `diffdevil-github-app-work` | `diffdevil-github-app-staging-work` (`0c99f14931e64ba68c280a6caec96e58`) |
| Dead-letter Queue | `diffdevil-github-app-dlq` | `diffdevil-github-app-staging-dlq` (`caf7011b0fb840c780cfa614463b8657`) |
| App and Wirt origins | Production endpoints | `https://app-staging.diffdevil.dev` and `https://wirt-test.wolfsblvt.app` |
| Build, notices and edition receipt | `artifacts/app/` | `artifacts/app-staging/` |
| Local adapter/QA state | `artifacts/app/state/` | `artifacts/app-staging/state/` |
| Local secret file, when deliberately supplied | `apps/app/.dev.vars` | `apps/app/staging/.dev.vars` |

The Wirt public client ID is a non-secret source assignment; its returned
registration is secretless and uses PKCE. There is no currently admitted Wirt
campaign, so `APP_PARTICIPATION_CAMPAIGN` stays unset. The staged survey/reward
journey remains selected and still needs a real campaign before that part can be
activated. The protected-input operation supplies the GitHub App ID and OAuth
client ID from their registration; source does not duplicate those runtime
inputs. Ops has returned the protected Wirt signing-key custody reference and
matched the active producer key to retained custody, but delivery through the
staging installer's consumer set remains unobserved. The private reference and
key are not copied here. The configuration explicitly disables `workers_dev`
and `preview_urls`; source assignments do not prove the provider's current
exposure settings.
Production configuration and its existing TEST client are unchanged. Do not copy production D1 or its protected
values into staging. Stage GitHub ingress/installation identity, OAuth client,
seal and Wirt signing material must belong to the staging registrations, rather
than reusing production identity by convenience.

## Bound the admitted staging accounts

The staging configuration supplies `APP_STAGING_INSTALLATION_ACCOUNT_IDS` as a
non-secret JSON array of positive numeric GitHub **installation-account IDs**.
Its selected source value is exactly `[9962104,341708115]`: Wolf's personal
account and the dedicated staging test organisation. The collective fixture
actor is not a third installation account. A person's collaborator role is
still decided by GitHub within an admitted account, rather than by a list of
user IDs. Production omits this setting and retains ordinary authorised reach.

The guard applies to signed-in repository discovery and authorization, webhook
admission, queued repository operation, and App installation credentials. Store
eligibility also disables history acquisition, publication and reads for an
outside account, including already-enabled repositories and history-only
repositories with execution off. Existing outside history jobs stop with
`history-off`; suspension and removal still withdraw existing reach. The guard
does not delete retained data, change stored consent or add a GitHub permission.
Malformed configuration refuses rather than opening the estate.

A public-unlisted registration does not enforce this boundary. Provider
visibility, actual exposure, information given to participants, real admitted
identifiers and live guard behavior must still be qualified in the activation
packet. Removing the setting from a derived staging configuration removes the
restriction; read back the actual version's configuration before exposure.

## Build and qualify locally

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run app:build:staging
npm run check:app:staging
node --test apps/app/tests/staging.test.mjs
```

`--staging` selects the staging configuration for the existing build command.
`DIFFDEVIL_APP_TARGET=staging` selects it for build, development, preview, seed and
QA. The build reads its origin from that configuration; a contradictory
`DIFFDEVIL_APP_ORIGIN` refuses rather than putting production links in staging.
The generated deployment configuration is
`artifacts/app-staging/dist/server/wrangler.json`. Its asset binding and migration
path are generated by the existing Cloudflare adapter. `edition.json` records
the target, origin and Community/private composition. Third-party notices follow
that composition. Existing production build commands retain their paths.
`check:app` expects production and refuses an inherited staging target before
building or dry-running another target's stale output. Use `check:app:staging`
to build and dry-run staging explicitly; Verify does not add a second App build.

To qualify the built staging Worker through the existing browser journeys, use a
disposable local checkout with no local secret files or credential-bearing `.env`
inputs. Restore the prior process setting afterward:

```powershell
$priorAppTarget = $env:DIFFDEVIL_APP_TARGET
try {
    $env:DIFFDEVIL_APP_TARGET = 'staging'
    npm run qa:app
    if ($LASTEXITCODE -ne 0) { throw 'Staging App QA failed.' }
} finally { $env:DIFFDEVIL_APP_TARGET = $priorAppTarget }
```

QA replaces external inputs with fixture values, uses loopback GitHub, and seeds
the staging binding through the real migrations. Its default local App/GitHub
ports are 4512/4533, separate from ordinary QA's 4412/4433; an occupied App port
is refused with the observed listener PIDs, without terminating its listener.
It does not use Wirt's live TEST account. The focused D1 test separately exercises two HTTPS consumers:
distinct sessions, OAuth callback destinations, foreign-Origin refusal, Wirt
public-client/PKCE exchange, foreign callback refusal, signature-separated
projection application, entitlement and survey-state isolation. Doubles are
local evidence, not accepted producer interoperability or live restore proof.

## Activation handoff

The responsible delivery operator fills and admits this bounded packet before
any affected activation. Independent security review covers the candidate and
its actual credential/data assignment. Source acceptance is not activation.

1. Select the accepted public commit and, for hosted premium, the corresponding
   maintained private composition/lock. The private consumer reuses this build
   target and its output paths; it must not copy a second configuration or deploy
   its old production artifact as staging. Qualification must record the actual
   included engine, public source and private composition separately.
2. The committed source carries the returned non-secret App origin, bot login,
   installation-account IDs, D1 UUID, Queue names and staging Wirt public OAuth
   client ID. The App ID and its OAuth client ID enter through the protected-input
   operation from the actual registration. Keep secrets out of source. Rebuild
   and inspect generated configuration and header links after assignment changes.
   Do not deploy unresolved placeholders. The customer continuation is exactly
   `<admitted staging App origin>/manage/plan`.
3. Establish the separate staging Worker, D1, work Queue and dead-letter Queue
   through the established provider route under explicit authority. The same
   migration inventory as production applies to a fresh staging D1. Applying
   those migrations remotely, copying retained TEST state, or migrating the
   production database is not a build step.
   The credential helper requires an existing deployment/version to preserve.
   For a new Worker, bootstrap the exact admitted build under that separate
   resource/deployment grant, with no route/custom domain, `workers_dev:false`
   and `preview_urls:false`; do not attach the Home yet. The non-secret command is
   `node tools/run-wrangler.mjs deploy --config artifacts/app-staging/dist/server/wrangler.json`.
   Inspect that generated configuration before the command and read back the
   actual lack of exposure using the contract below. A bootstrapped Worker with
   missing credentials is not an operational App. Lack of an HTTP route does
   not make it idle: configured cron and Queue handlers can run before the
   credentials/schema are ready. The bootstrap grant includes that background
   consequence on the admitted staging resources; read back its actual behavior.
   Record the returned bootstrap version ID with its qualified source, included
   engine and Community/private composition. This becomes the installer's explicit
   `--base-version-id`, not an implicit latest-version selection.
4. Supply staging-only protected inputs through the maintained
   [protected-input operation](#protected-input-operation):
   `GITHUB_WEBHOOK_SECRET`, `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`,
   `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `APP_SEAL_KEY` and
   `WIRT_SIGNING_KEY_CURRENT`. The full-set helper prepares the current key;
   the first actual rotation/rollover separately scopes subset and previous-key
   support before operating that change.
   The staging App's exact bot login is a required non-secret registration input:
   a separate GitHub App has a different bot, and owned brief comments match that
   author. GitHub's webhook targets `<staging origin>/webhooks/github`; its OAuth
   return is `<staging origin>/auth/callback`. Staging installation/admission and history
   consent remain distinct deliberate effects. Use dedicated staging test
   repositories/accounts. D1 separation does not isolate GitHub-side effects:
   co-installing production and staging yields two check runs, two owned briefs
   and two writers reconciling the same declared labels. Any co-installation
   requires deliberate acceptance of those effects for the exact named repository;
   this packet grants no installation or acceptance.
5. The returned Wirt staging public client is
   `01a136df-f666-70e6-9876-ce292de127c8`, secretless and PKCE-required, with
   callback `<staging origin>/integrations/wirt/link/callback` and receiver
   `<staging origin>/integrations/wirt/projection`; source carries its public ID.
   The production controlled-test client remains intact until the staging
   replacement is qualified. Ops returned the protected signing-key custody
   reference and matched the active producer key to retained custody; the exact
   installer consumer binding and delivery remain a later Ops operation. Do not
   copy the protected reference or key material into this public repository. No
   producer or data reassignment follows merely from the continuation route
   existing. No staging campaign is currently admitted; keep
   `APP_PARTICIPATION_CAMPAIGN` unset. The selected survey/reward journey remains
   a later activation prerequisite. When a campaign is admitted, select the
   variable with Wirt staging's registered campaign
   `key` and `version`, the implemented `survey` (`beta-v1`), public `name`, UTC
   `opensAt`/`closesAt` and `inviteAfterDays`/`reminderAfterDays`. Persist that
   non-secret JSON in staging vars through step 2. The runtime validates the
   [campaign shape](../../apps/app/src/lib/participation/campaign.mjs); there is
   no default cohort, launch window or reward. Without the campaign and an
   admitted Wirt consumer, staging has no survey/invitation/reward section.
6. Dry-run the admitted build with the native route:
   `node tools/run-wrangler.mjs deploy --dry-run --config artifacts/app-staging/dist/server/wrangler.json`.
   Under the separate activation grant, activate the exact credential version
   returned by the protected operation, which inherits the qualified bootstrap
   build. Require the receipt's `baseVersionId` to equal the exact bootstrap
   version in step 3 and its `version.id` to equal the credential version being
   activated. The bootstrap's source/engine/composition evidence belongs to those
   exact IDs. Use the version activation invocation below. Do not select an implicit
   latest version or substitute an older production artifact. Attach only the
   admitted staging Home through its qualified provider route after the protected
   version/schema are ready, preserving the source exposure settings and the
   exposure readback below.
   Read back Worker version, origin, D1 ID/schema, both Queues, and non-secret
   registration/callback facts. Exercise a staged reader/admin sign-in, all six
   destinations, Manage, and an admitted signed callback/projection/application
   and report. Exercise the survey at `/manage/plan/survey`, persisted draft and
   completion, delivery of the stable completion/event identities, Wirt's typed
   acceptance or replay, customer reward standing and the Origin-checked reward
   preview. Under the separate commercial TEST authority, carry the reward through
   Wirt's choice/application and signed projection back to the actual App
   entitlement. Follow the [participation contract](app-commercial-link.md#participation-reward-campaigns):
   answers stay in diffdevil, a preview reserves nothing, and an HTTP acknowledgement
   is not reward issuance or application. Verify production account/data and
   original Wirt TEST registration remain intact during staging admission. Before
   production Wirt admission, resolve any actual App-held TEST state and its
   preservation at the admission seam described below.
   Wirt payment/login/mail receipts do not prove DiffDevil
   application, and HTTP acceptance does not prove projected entitlement.

The activation owner also resolves actual recurring Worker/D1/Queue cost and
retained TEST-data recovery before admitting those effects. The source adds no
spend, paid-plan selection, production migration or automatic publication.

## Protected-input operation

Use the [clean operator launch entry](../../apps/github-app/README.md#registration-and-credential-helper)
for both helpers. A background process must hide its own profile-free PowerShell
launch as well; starting Node first and clearing variables afterward is too late.
The entry preserves the selected native authentication and explicitly named
seal/Wirt inputs without carrying ambient Node/preload/proxy/CA controls.

**Installation limitation:** pinned Wrangler 4.150.0 patches `/versions/latest`.
Pre-write latest checks and binding-name readback do not prevent a concurrent
upload from receiving credentials or establish source lineage. The specimens
below retain the complete mediated operation, but are not an admitted exact-base
production route. A qualified atomic composite-and-secret upload is the proposed
replacement; code/assets/settings identity and recovery remain unresolved.
Existing receipts continue to use read-only `resume`; do not retry an ambiguous
installation to work around this limitation.

For a new registration, enter the [native manifest route](#native-manifest-registration-and-capture)
below. The full-set specimen in this section serves an existing registration or
its recovered inputs; these are alternative installation entrances.

Use the pinned root dependencies and a real operational generated configuration
after step 3. All strings below are non-secret specimens. The operator replaces
IDs and opaque file/custody references from the admitted registration and custody
handback; these are not requests for Wolf to paste raw values into a conversation.
The files remain under their custodian's access controls, outside the repository.
GitHub's OAuth client ID and client secret belong to the same selected GitHub App.
Wirt's current signing file comes from the admitted staging counterpart.

For a separately admitted public staging App, registration preparation can use
the following non-secret specimen after replacing its name and origin. It emits
inputs and a registration URL; it opens no browser and creates no registration.
Visibility, organisation/actor reach and installation admission remain the
operator's separately settled choices.

```powershell
pwsh -NoProfile -NonInteractive -File apps/github-app/operator-launch.ps1 operator registration --app-name diffdevil-staging --visibility public --webhook-url https://admitted-staging.example/webhooks/github --oauth-callback-url https://admitted-staging.example/auth/callback --policy-refresh
if ($LASTEXITCODE -ne 0) { throw 'Staging registration preparation refused.' }
```

```powershell
$stagingConfig = 'artifacts/app-staging/dist/server/wrangler.json'
$credentialReceipt = 'D:\custody\diffdevil-staging\operations\credential-install.json'
$qualifiedBootstrapVersion = 'qualified-bootstrap-version-id'
New-Item -ItemType Directory -Path (Split-Path -Parent $credentialReceipt) -Force | Out-Null
$credentialArguments = @(
    '--worker', 'diffdevil-app-staging',
    '--account-id', 'admitted-account-id',
    '--config', $stagingConfig,
    '--receipt-file', $credentialReceipt,
    '--base-version-id', $qualifiedBootstrapVersion,
    '--app-id', '123',
    '--private-key-file', 'C:\operator-custody\staging-app.pem',
    '--webhook-secret-file', 'C:\operator-custody\staging-webhook.txt',
    '--oauth-client-id', 'admitted-staging-github-client-id',
    '--oauth-client-secret-file', 'C:\operator-custody\staging-github-oauth.txt',
    '--seal-key-file', 'C:\operator-custody\staging-seal.txt',
    '--seal-key-recovery-ref', 'admitted-staging-seal-custody',
    '--seal-key-initial',
    '--wirt-signing-key-file', 'C:\operator-custody\staging-wirt-current.txt'
)
pwsh -NoProfile -NonInteractive -File apps/github-app/operator-launch.ps1 operator check @credentialArguments
if ($LASTEXITCODE -ne 0) { throw 'Staging credential preflight refused.' }
pwsh -NoProfile -NonInteractive -File apps/github-app/operator-launch.ps1 operator install @credentialArguments
if ($LASTEXITCODE -ne 0) { throw 'Retain the receipt. A proven not-attempted result permits correction and a new receipt; otherwise resume read-only before another effect.' }
```

`check` uses the install parser, exact-target provider readback, protected-file
metadata and same-directory receipt commit probe, but does not read protected
contents. Install exclusively creates and flushes the non-secret receipt before
reading contents. It validates the RSA key, single-line webhook/OAuth secret,
seal key of at least 16 characters and the existing Wirt UTF-8 signing contract.
It then privately authenticates the PEM/App ID through GitHub's `GET /app`,
matches the OAuth client ID, and reads the bot identity against the configuration's
`GITHUB_APP_BOT_LOGIN`. Raw responses and JWTs are withheld. `check` leaves that
identity unverified. Actual OAuth/webhook-secret use remains a live consumer seam.
All seven values go to one contained native stdin bulk write. For a managed
consumer that already supplies values to a hidden child environment, the seal
and Wirt inputs may instead use explicit names such as
`--seal-key-env DIFFDEVIL_STAGING_APP_SEAL_KEY` and
`--wirt-signing-key-env DIFFDEVIL_STAGING_WIRT_SIGNING_KEY`. Each is an
alternative to its corresponding file option; passing both refuses. The helper
reads only those named values after the receipt is flushed, removes those names
from the Wrangler child environment, and sends the values through private stdin.
Provider commands default to the helper-installed Wrangler path and working
directory; intentional Wrangler and runner injection remain supported. They use
an explicit empty env file, so caller-folder and helper-root dotenv files cannot
select provider configuration. The helper pins the target account and removes
known endpoint, environment, account-alias and unselected authentication
overrides. It preserves the supported `CLOUDFLARE_API_TOKEN`,
`CLOUDFLARE_API_KEY` and `CLOUDFLARE_EMAIL` sources, `WRANGLER_HOME`, and other
ordinary process inputs. It does not establish a vault record or recovery
route. Structured provider reads enable Wrangler's JSON output at `log`. The
helper recognizes only its native version-update notice at stream boundaries,
then strictly parses the complete JSON; other output refuses target qualification.
Credential writes retain `error` logging. Native output is not forwarded,
disk logs/telemetry are disabled, and no
temporary secret carrier exists to clean up. Operator-owned input files remain
intact. Preflight reads
back the latest uploaded version's `APP_DB` against the selected configuration;
the credential version inherits that latest version, rather than necessarily the
active deployment. Keep this one Worker under the installing operator's writer
custody until reconciliation, and qualify the returned version's actual source,
engine and composition before activation. Do not upload another build between
the qualified bootstrap and this operation.

The specimen's `--seal-key-initial` is only for a confirmed new/empty staging
database. It refuses if the already-qualified version names an `APP_SEAL_KEY`
secret binding, without reading its value. Name absence does not prove an empty
database or custody. For an established target, replace that flag with
`--seal-key-previous-receipt <durable-successful-receipt>`. Install compares the
domain-separated seal check, custody reference and exact account/Worker/database
before its write. A different key or foreign receipt refuses. The receipt records
the check and `initial`/`matched` result; this is equality evidence, not external
custody proof. Preserve both that receipt and its configuration/source/edition
interpretation in the admitted non-secret operation handback. The path above is
a replaceable custody specimen outside the disposable checkout. If a receipt was
first written under repository `artifacts/`, that copy must move into the durable
handback before the worktree is retired.

The seal key must be **generated once and retained before installation**, not
generated in a transient install process. The opaque recovery reference names
the operator's admitted recoverable custody record for that exact key; record
its custodian, retrieval route and relevant failure boundary in the actual
protected-input handback. A filename or this reference alone does not prove that
custody exists. The activation operator owes its custody/retrieval qualification
before admitting protected installation. Cloudflare's write-only secret slot is
not a recoverable copy. Keep this dependency with the whole-D1 recovery unit:
reusing the original key can open restored authorizations and preserve opaque
file locators; replacing it with a new key cannot. Local tests reconstruct the
protector from a retained synthetic copy, not a real external key store.

Use random key material, not a typed phrase. The helper's contained
[`generate-seal` specimen](../../apps/github-app/README.md#registration-and-credential-helper)
writes 32 random bytes into one exclusively created custody-owned file and prints
only its non-secret check/reference. Run it only after that destination's durable
custody and retrieval route have been established. It does not admit a vault row,
establish recovery coverage or replace an environment-only custodian's contained
generation/admission route. Durable seal/Wirt material and transient, regenerable
GitHub credential inputs are distinct; initial installation creates no policy to
retain seven plaintext files. The first actual rotation/enforced Wirt rollover
resurfaces the exact subset/previous-key support before that operation.

A proven failure before the write persists terminal `state: not-attempted` and
`command: not-attempted`. Keep it, correct the cause, and select a new receipt for
the new operation. After an attempted/ambiguous write, reconcile read-only using
the exact unchanged config and existing receipt, with no credential input flags:

```powershell
pwsh -NoProfile -NonInteractive -File apps/github-app/operator-launch.ps1 operator resume --worker diffdevil-app-staging --account-id admitted-account-id --config artifacts/app-staging/dist/server/wrangler.json --receipt-file D:\custody\diffdevil-staging\operations\credential-install.json
if ($LASTEXITCODE -ne 0) { throw 'The receipt remains unresolved; retain it for exact-target reconciliation.' }
```

Resume performs provider reads only. It refuses absent/unusable or
different-config/account/Worker/database receipts and never repeats the write.
An accepted write with a later readback failure can recover its version identity;
a lost write acknowledgement remains partial. A final receipt commit failure
leaves the earlier flushed ambiguity marker recoverable. Only `version-created`
with `command: accepted`, version identity and required secret-binding-name
readback, plus an unchanged active deployment, is a source-helper success. That
receipt is not secret-value verification, a deployed version, external custody
proof or an active App journey.

After the bootstrap's actual source/engine/composition and the returned version
are qualified, the **separate admitted activation** can use this non-secret
version-specific invocation. It is shown for the delivery operator; the helper
never runs it:

```powershell
$prepared = Get-Content -LiteralPath $credentialReceipt -Raw | ConvertFrom-Json
if ($prepared.mode -ne 'provider' -or $prepared.state -ne 'version-created' -or $prepared.worker -ne 'diffdevil-app-staging') { throw 'No qualified staging credential version.' }
if ($prepared.baseVersionId -ne $qualifiedBootstrapVersion -or $prepared.identity.state -ne 'verified') { throw 'Credential version is not tied to the exact qualified bootstrap and App identity.' }
node node_modules/wrangler/bin/wrangler.js versions deploy "$($prepared.version.id)@100%" --name diffdevil-app-staging --config $stagingConfig --yes
if ($LASTEXITCODE -ne 0) { throw 'Read back actual deployment before another activation attempt.' }
```

Use current provider deployment readback to establish the actual active version;
the activation command's exit alone does not establish it. Ordinary production
uses the same input/receipt route with its own exact config, Worker and custody.
The standalone backend still accepts its three inputs; Community sign-in without
Wirt requires six and does not acquire an unused commercial credential.

## Native manifest registration and capture

The preferred initial registration route is the local
`apps/github-app/manifest-helper.mjs` CLI. It prepares GitHub's native manifest
form for a **personal** or **organisation** namespace and requires an explicit
`public` or `private` visibility. Private personal Apps cannot supply organisation
installation; choose the namespace and visibility for the complete admitted actor
estate before actual creation. This source route authorizes no provider effect.
The older full-set file installer remains available for existing registrations
and recovery; it is not necessary to transcribe five new GitHub inputs manually.

The helper binds one IPv4 loopback listener, checks the callback's unguessable
state, and converts the one-use code in a contained native child. It preserves
the response encrypted with the existing App protector before interpreting it.
App ID, client ID, owner/type, slug, requested permissions and events must
validate before the capture becomes usable. GitHub permits editing the proposed
name during creation; the safe receipt retains the requested `appName` and the
returned `identity.appName`/slug, and installation uses that returned bot identity.
The response does not prove actual
visibility, webhook/callback settings, provider redirect acceptance or installation:
those remain distinct live readbacks. The manifest sends the exact selected values.

Establish recoverable custody of the seal **before** registration. For a joined
App the same retained seal opens the capture and later protects App state; Wirt's
signing key has separate custody. An opaque custody reference or an encrypted
capture is not an off-workstation key backup. Capture and installation accept the
same explicitly selected `--seal-key-env <variable-name>` alternative to
`--seal-key-file <path>`. Select exactly one source; conflicts, invalid names and
names reserved for provider controls refuse. An admitted managed consumer can
inject that named value into the hidden helper child without a plaintext key
file. The helper does not discover a store, read ambient values or establish that
consumer binding. Keep the encrypted capture and its non-secret receipt in an
admitted operation handoff directory outside a disposable worktree. Do not export
the GitHub response, PEM, code or secrets into console output, screenshots, logs,
source or five plaintext files. Retire the transient encrypted capture only after
the accepted installation/recovery handback preserves what the operator needs.

This PowerShell specimen uses non-secret placeholders. Its directory must already
exist and the named seal must already reach the hidden helper through the admitted
custody consumer. The source specimen does not populate that environment value.
Registration
creates a real GitHub App only when an authorized operator follows the displayed
local URL and submits the provider form; the helper never opens a browser itself.

```powershell
$stagingConfig = 'artifacts/app-staging/dist/server/wrangler.json'
$credentialReceipt = 'D:\custody\diffdevil-staging\operations\credential-install.json'
$qualifiedBootstrapVersion = 'qualified-bootstrap-version-id'
$captureArguments = @(
    '--capture-file', 'D:\custody\diffdevil-staging\operations\github-capture.enc',
    '--receipt-file', 'D:\custody\diffdevil-staging\operations\github-capture.json',
    '--seal-key-env', 'DIFFDEVIL_STAGING_APP_SEAL_KEY',
    '--seal-key-recovery-ref', 'admitted-staging-seal-custody'
)
$registrationArguments = @(
    '--owner', 'admitted-owner', '--owner-type', 'organisation',
    '--visibility', 'public', '--app-name', 'diffdevil-staging',
    '--webhook-url', 'https://admitted-staging.example/webhooks/github',
    '--oauth-callback-url', 'https://admitted-staging.example/auth/callback',
    '--policy-refresh', '--port', '43871'
)
pwsh -NoProfile -NonInteractive -File apps/github-app/operator-launch.ps1 manifest check @captureArguments @registrationArguments
if ($LASTEXITCODE -ne 0) { throw 'Registration destinations or selection are not ready.' }
pwsh -NoProfile -NonInteractive -File apps/github-app/operator-launch.ps1 manifest register @captureArguments @registrationArguments
if ($LASTEXITCODE -ne 0) { throw 'Retain the capture; inspect status and recovery before another registration.' }
pwsh -NoProfile -NonInteractive -File apps/github-app/operator-launch.ps1 manifest status @captureArguments
if ($LASTEXITCODE -ne 0) { throw 'The protected capture is unavailable or unusable.' }
```

The explicit file alternative replaces `--seal-key-env` with `--seal-key-file`
and an admitted retained-file path; it is not a required transfer for a managed
consumer. `check` reads file metadata where applicable and exercises the
same-directory atomic output commit, without reading protected contents or
contacting GitHub. `register` privately
validates the seal, flushes the empty encrypted checkpoint, and serves a native
form with the namespace, visibility, callbacks and actual manifest permission/event
contract visible before **Continue on GitHub**. The operation handoff must carry
that same contract: **Contents: read; Pull requests: write; Checks: write**;
selected events **`pull_request`, `check_run`**, plus **`push`** when
`--policy-refresh` is selected, as in the specimen above. `push` lets the App
refresh trusted policy when the repository's default branch changes. Omitting
that flag omits `push` from both the page and submitted manifest.
GitHub supplies [`installation` and `installation_repositories` lifecycle events](https://docs.github.com/en/webhooks/webhook-events-and-payloads#installation)
by default; they are separate from the selected subscriptions and add no requested
permission. These disclosures explain the existing scopes, not another consent
step or authority for creation/installation. Actual GitHub presentation remains
a separate live readback.
Selected seal/Wirt environment names are withheld from the contained conversion
child; the installer sends their values only through its private native stdin.
GitHub's [manifest handshake](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest)
must finish within one hour. This is the provider's handshake boundary, not a
recurring consent lifetime. The exact live GitHub loopback-redirect seam remains
unobserved; local qualification uses a synthetic GitHub server and isolated
headless Chromium. No tunnel or permanent registration service is introduced.

Before **separately admitted protected installation**, set the exact operational
config's `GITHUB_APP_BOT_LOGIN` to the returned non-secret `identity.botLogin`,
retain the correct `APP_ORIGIN`, and qualify the built bootstrap/account/Worker/D1
through the existing installer route. For a joined App, the capture's webhook
and OAuth callback must equal that config's `/webhooks/github` and `/auth/callback`.
The following consumes the five GitHub inputs privately in memory and reuses
the exact-target undeployed-version installer. Community needs the seal as its
sixth input; add Wirt's separately retained signing input only when configured.
Pass the exact qualified bootstrap version and explicitly choose initial mode
only for a confirmed new/empty target. For an established target, replace
`--seal-key-initial` with `--seal-key-previous-receipt <previous-successful-receipt>`.
The existing installer checks both identity and the retained seal comparison;
neither capture success nor possession of a new seal establishes an empty target.

```powershell
pwsh -NoProfile -NonInteractive -File apps/github-app/operator-launch.ps1 manifest install @captureArguments --config $stagingConfig --worker diffdevil-app-staging --account-id admitted-account-id --base-version-id $qualifiedBootstrapVersion --seal-key-initial --install-receipt-file $credentialReceipt --wirt-signing-key-env DIFFDEVIL_STAGING_WIRT_SIGNING_KEY
if ($LASTEXITCODE -ne 0) { throw 'Retain the installation receipt and capture. Correct a proven not-attempted refusal with a new receipt; reconcile an attempted/ambiguous write read-only.' }
```

For standalone operation omit the OAuth callback and use its exact backend config;
the installer still delivers only three inputs. Community without Wirt omits
the Wirt input. An admitted file consumer may instead select
`--wirt-signing-key-file`; never pass both Wirt sources. No manifest command deploys, admits a repository,
enables history, creates resources, or activates Wirt.

Recover the condition left by an interruption rather than beginning again:

| Retained condition | Next sound move |
| --- | --- |
| `prepared` | `resume` reopens the same local flow within the handshake interval. Reconcile an App already created before submitting another form. |
| `callback-received` | `resume` converts the retained code only when conversion has never been attempted and the interval remains valid. |
| `conversion-attempted` | Outcome is unknown. `resume` refuses another conversion. Inspect the existing registration through the authorized provider route; recover its regenerable inputs through the full-set installer rather than creating a duplicate App. |
| `captured` | The raw response is encrypted and retained even if interpretation or the safe receipt commit failed. `resume` validates that response without contacting GitHub again. |
| `ready` | `resume` revalidates the preserved response; `install` uses a separate new installation receipt. |
| Installation attempted, receipt incomplete | Use `operator-helper.mjs resume` with the same exact config/account and **installation** receipt. It reads provider state and never repeats the upload. A capture alone does not reconcile a Worker write. |

```powershell
pwsh -NoProfile -NonInteractive -File apps/github-app/operator-launch.ps1 manifest resume @captureArguments
if ($LASTEXITCODE -ne 0) { throw 'Retain this capture and its exact unknown/refused condition for reconciliation.' }
pwsh -NoProfile -NonInteractive -File apps/github-app/operator-launch.ps1 operator resume --config $stagingConfig --worker diffdevil-app-staging --account-id admitted-account-id --receipt-file $credentialReceipt
if ($LASTEXITCODE -ne 0) { throw 'The exact Worker write remains unresolved; do not repeat installation.' }
```

Only run the latter command when that installation receipt exists. A missing,
wrong-key or malformed capture refuses even if its non-secret receipt says ready.
There is no way to recover a conversion response lost before its encrypted commit
from an acknowledgement alone. The helper records that unavoidable gap as unknown.
After a hard process interruption, the exact `<capture-file>.lock` names its PID;
the operator must establish that writer stopped before removing only that lock.
Ordinary cancellation closes the listener and releases its lock. Another occupied
port is refused without taking over its listener.

`node --test apps/github-app/manifest-helper.test.mjs` exercises the real CLI,
encrypted capture/recovery, unsafe native stdout/stderr positive control, and
standalone/Community/Wirt installation through the synthetic native provider.
`npm run qa:app:manifest` exercises the real form, keyboard submission, state
callback, contained native conversion and exact-base installation for both namespace
types and visibility choices, using the named-environment seal throughout. It
compares visible permissions/events with the submitted manifest, with policy refresh
selected and omitted, and keeps GitHub's lifecycle events visibly separate. Personal
fixtures deliver Community's six inputs; organisation fixtures deliver Wirt's seven.
Its non-secret result/screenshots go under
`artifacts/verification/manifest/`. This proves local synthetic operation, not
real registration, off-workstation custody, Cloudflare installation or App use.

## Exposure configuration and readback

Both source and generated staging config must retain `workers_dev:false` and
`preview_urls:false`. [Wrangler's configuration contract](https://developers.cloudflare.com/workers/wrangler/configuration/)
states that omitting `preview_urls` can preserve an existing provider setting;
source omission or a successful deploy is not evidence of disabled previews.
Before credentials, the bootstrap has no custom domain or route. Before and
after Home activation, the admitted operator uses the existing authenticated
Cloudflare API route to read
[`GET /accounts/{account_id}/workers/scripts/{script_name}/subdomain`](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/subdomain/methods/get/):
require `enabled:false` and `previews_enabled:false` for this exact staging
account/script. Separately read back its routes/custom domains: none at bootstrap,
then exactly the admitted staging Home. Record account/script, response booleans,
observed domains/routes and the active version as non-secret facts.

Source flags, provider metadata and an actual HTTPS request prove different
boundaries. The retained live admission still owes that readback and actual
canonical-host TLS/routing/App behavior; no provider observation is claimed here.

## Recovery and retained TEST state

For the first empty staging deployment, a failed activation can leave production
serving while the exact staging configuration/provider fault is repaired. Do not
redirect callbacks into production as a fallback. After staging has valuable
data, preserve the whole staging D1, its schema/migration coordinate and the
mediated seal/signing dependencies through the established backup/restore route
before a state-changing recovery. Never delete a staging database to roll back
code. A previous staging Worker version is code recovery only; its compatibility
with the current database must be established.

Commercial state restored from an older snapshot requires the existing Wirt
restore reconciliation; stale funding or a later disconnect must not be asserted
current from a database restore. See [the commercial recovery contract](app-commercial-link.md#restore-occasion).

Preserve the original production-origin Wirt TEST client, registered callbacks
and redirects, valuable Wirt history, and its exchange, refresh and replay
compatibility obligations until their explicit admitted disposition. These are
distinct from the dedicated staging producer/client/receiver/Manage tuple.
A registered callback does not establish that production holds TEST-funded App
links, projections, benefits or other commercial application state. Failure to
recover an operational consumer proves neither an existing relationship nor an
empty production database.

At production Wirt admission, the responsible delivery owner establishes what
App-held TEST state, if any, actually exists and identifies its key, authority
and consumer dependencies. Before changing that state or its route, admit its
preserved disposition with the exact state, destination, recovery owner and
qualified replacement where needed. Preserve actual valuable state and its
dependencies until that preservation and replacement are qualified; this is no
blanket instruction to move or retire production D1 contents, copy production
sessions/authorizations, or invent a customer/token migration. If no App-held
relationship is established, retain the real Wirt registration, history and
compatibility obligations without inventing one. Dated operator observations
remain evidence of their observed boundary, not current database-emptiness proof.
