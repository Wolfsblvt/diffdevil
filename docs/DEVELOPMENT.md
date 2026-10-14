# diffdevil Development

## Meaning

This guide owns reproducible restoration, local builds, ordinary verification,
and the separate npm and Action consumer journeys. It explains which files are
maintained source, which distribution bytes are committed, and what each command
actually proves. Local Windows execution, live GitHub and publication are different boundaries.

## Prerequisites and selected versions

Use Node.js 22 or later and npm; local comparisons also require Git. The current
native pass exercised Windows 11 with Node **24.19.0**, npm **11.17.0**, and
PowerShell **7.6.5**. The preceding layout pass exercised Linux x64 with Node
**22.16.0**, npm **10.9.2**, and Git **2.47.3** at `main@fe3d8b22`. Action
metadata selects **node24** independently of the npm package's `>=22` floor.
Native macOS remains unobserved; [Qualification](qualification.md) binds each
result to its candidate and boundary.

The lockfile pins exact versions of TypeScript, Node typings, Chevrotain, YAML,
Ajv, the source-owned Worker CLI, Wrangler, and the website toolchain: Astro,
Starlight, React, Shiki, CodeMirror, the self-hosted IBM Plex packages, resvg for
derived assets and Playwright for local browser qualification. `package.json`
and the lockfile are the version record; this list names the toolchain, not its
releases. diffdevil compiles with TypeScript 7; the `typescript-6` alias serves
the website type check (`tools/website-typecheck.mjs`) and the manual's compiler-API-based declaration inventory. The root TypeScript 7 package supplies
the build CLI, not the compiler API these consumers call. The website closure is the
largest part of the development install; none of it enters the npm package or
the committed Action runtime.
Wrangler contributes a 106-entry development-tooling closure, including optional
platform packages. That cost is accepted for the hosted playground source route for
now, remains visible in the lockfile, and does not enter either the npm package or
the committed Action runtime. These are selected reproducible versions, not a claim
that every package is latest or independently security-audited.

## Restore and build

For a normal source checkout:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run build
npm run verify
```

A supplied offline carrier can restore the same exact lock without registry access:

```sh
npm ci --offline --cache artifacts/dependencies/npm-cache --ignore-scripts --no-audit --no-fund
```

The public repository does not include a development cache or root dependencies.
A local cache and its provenance are working data, not a second package manifest.
Use `npm ci` to establish the lock instead of assuming copied dependencies are
current. The core runtime dependency closure needs no additional bundler.
The public manual has a separate source-package preparation described below.

`npm run build` emits JavaScript, declarations, source maps, generated preset data
and standalone Ajv validators under ignored `dist/lib`. It removes only that
wholly generated output first, so deleted source cannot survive in a package.
The ordinary npm build uses normal package dependencies; it is not bundled.

`build:offline` and `verify:offline` remain compatibility aliases to the same build
and verification commands. Restore the exact root lock and prepare the manual
consumer first. `npm --prefix apps/manual run verify:offline` additionally sets
`DIFFDEVIL_DOCS_OFFLINE=1`, refusing source-package downloads during verification.
There is no separate reusable compiler installation under `artifacts/toolchain`.

## Verification commands and boundaries

`npm run app:build:staging` and `npm run check:app:staging` select the separate
App consumer into `artifacts/app-staging/`. `DIFFDEVIL_APP_TARGET=staging` also
selects its local state for the existing App seed and browser QA commands. See
[persistent App staging](integration/app-staging.md) for the configuration,
focused two-database qualification and activation handoff. These commands have
no provider mutation or deployment effect.
`check:app` refuses an inherited staging target; use `check:app:staging` for that
target. `npm run qa:app -- --identity` uses the existing signed-in fixture and
built Worker to qualify Overview/Manage headings, browser titles, the unchanged
Works header, desktop layout and keyboard navigation. It records its focused scope
under the selected target's `qa/identity/`, separately from full journey evidence.

After the matching App build, `npm run qa:app:works-entry` qualifies the native
Manage Pro form through an external Works consent double and the real callback.
It loads the emitted Worker and middleware in local Miniflare, uses disposable D1,
and intercepts every Chromium navigation hop and outgoing provider call. Set
`DIFFDEVIL_APP_TARGET=staging` after `app:build:staging` to exercise the distinct
staging consumer. It checks the bound numeric actor, signed intent, PKCE,
application and queued report, visible unavailable/foreign-answer refusals, and
CSP refusal of an unadmitted redirect after the Works hop. Screenshots and results
go to the selected target's `qa/works-entry/`. No live sign-in, Works consent,
report delivery, deployment or private composition is proved by this local pass.

| Command | What it proves |
| --- | --- |
| `npm run check:prep` | Parses machine assets and checks unique, nonempty declared case IDs. It does not execute cases or judge prose. |
| `npm run verify` | Preparation, ordinary build, all registered core and application cases, exact Action regeneration parity, no-write playground/App Worker checks, both public static builds and extension checks. |
| `npm test` | Ordinary tests against the existing build; build first after source edits. |
| `npm run test:conformance` | Actual production test events for every supplied conformance case, with separate failed/not-executed/harness totals. |
| `npm run demo:shortcuts` | Four CLI pairs, a custom formula/named query, and pure Action-shorthand/full-policy parity. Not an Action host test. |
| `npm run test:package` | Packs the built npm artifact, installs it outside the checkout, then executes the installed CLI/API, strict declaration consumer and native Windows launchers. Local use with the supplied cache is offline; hosted CI explicitly tests a registry install. |
| `npm run build:release -- --source-ref COMMIT` | Builds the canonical Skill ZIP, install-free runtime ZIP, bundled Skill/runtime ZIP, and stable release manifest from one full immutable source commit. It does not publish or attach them. |
| `npm run test:release` | Builds the release family twice, checks byte reproducibility and archive budgets, extracts clean carriers, verifies internal manifests, and executes version plus analysis through standalone and bundled launchers. Part of `verify`. |
| `npm run build:actions` | Rebuilds source and writes the committed, install-free Action distribution and metadata. |
| `npm run check:actions` | Reconstructs that distribution in temporary storage and rejects missing, extra or changed generated bytes. Does not repair them. |
| `npm run test:actions` | Executes all four actual metadata-selected Action paths outside the checkout, with no consumer installation and an external fake HTTP boundary. |
| `npm run playground` | Builds the reusable engine and starts the local AGPL playground over unauthenticated public-GitHub reads. It is an operator journey, not a live-write or hosted-deployment check. |
| `npm run playground:worker` | Builds the reusable engine and starts the same public route through local Wrangler/workerd. It disables Wrangler telemetry and does not contact Cloudflare. |
| `npm run check:workers` | Bundles `apps/playground/wrangler.jsonc` and its static asset binding with telemetry disabled and `wrangler deploy --dry-run`. It creates no Worker, version, preview, deployment, route or domain. |
| `npm run check:github-app` | Bundles the managed-App Worker, Queue and placeholder D1 binding with Wrangler dry-run, then compiles the absent-policy default through that configuration in local `workerd`. It creates no App, Queue, D1 database, Worker, deployment, route or credentialed GitHub effect. |
| `npm run qa:app:manifest` | Isolated headless Chromium, the real local manifest CLI and contained native conversion against synthetic GitHub; personal/organisation registration × public/private visibility, keyboard submission and clean result redirect. The ordinary `manifest-helper.test.mjs` cases qualify encrypted capture/recovery and the existing native installer seam. Results/screenshots go to `artifacts/verification/manifest/`. Needs Playwright's Chromium. No real registration, key custody, provider install or deployment. |
| `npm run app:build` | Builds the engine, website provenance, the App's icon projection and the signed-in App (Astro on the Cloudflare adapter, with the managed runtime joined through `apps/app/src/worker.mjs`) into `artifacts/app/dist`, joining the premium extension when `premium/app` exists (`DIFFDEVIL_PREMIUM=off` builds Community; `artifacts/app/edition.json` records which). No Worker, route, domain or deployment. |
| `npm run test:app` | The App's derivation and URL-state cases, the public chart models and readouts of Chart Grammar v1.1 (evidence rules, interval-aware medians, the log-axis fit, table equivalence; the premium charts' cases run with `premium/tests`), the Manage console's model (allowances, capacity, explanatory states, the attention list, the Works projection presentation and the return decision) and its journeys (selecting, enabling with the writer declaration, stopping, swapping within a full allowance, the Free connected organisation, the brief controls, the Pro default as the effective policy's account layer, the Works stand-in's slots, link and return, disconnect and reconnect, account closure) and its Business coordination (named policies by revision, linking, publishing with per-repository results including queued and retried, automatic setup through the lifecycle path, delegated administration only where the delegate can write on GitHub, funding that makes nobody an administrator, publication across repositories with different ceilings, the administrative record), plus the sign-in, viewer, service, entitlement, locator and `/api/analytics` journey against a local Miniflare D1 carrying every managed-App migration, seeded through the managed App's write paths (pathless history and named analytical records) with a GitHub wire double. |
| `npm run check:app` | The App build plus a Wrangler dry-run of its generated Worker configuration. Part of `verify`. |
| `npm run qa:app` | Qualifies the edition the last build recorded: the premium journeys (`premium/app/qa/journeys.mjs`) run only against a build that joined the extension, a Community build asserts the truthful absent states. Seeds local D1 state through Wrangler, serves a loopback GitHub double, runs the built joined App Worker in local workerd with the Works stand-in (`APP_COMMERCIAL_FIXTURE`) and drives headless Chromium through sign-in, the runtime routes, the six destinations in a Pro and a Free entitlement, filters, bucket selection, drill-down into a named file by handle, a Free collaborator inside a funded namespace, keyboard reach and sign-out, the Manage console (`apps/app/qa/manage.mjs`: the capacity-first Overview and its badge, selecting, enabling with the writer declaration and stopping, the repository settings with the message preview, Plan & funding with its slots, the departure to Works and the waiting and confirmed returns, Account with disconnect and reconnect, the Free allowances, the connected organisation and the first link, the Business tabs), and the chart system: every frame mounts, the readout geometry holds under keyboard, pin and clear, the table view matches, the cloud packs through its layout Worker, arranges, opens its Top column and switches metric, the period switch morphs in place, and reduced motion still draws. `DIFFDEVIL_APP_QA_DENSE=1` adds a four-times denser fixture pass with layout timings. Results, screenshots, timings and the Worker log in `artifacts/app/qa/`. Needs Playwright's Chromium. Local behaviour only. |
| `node tools/pr-brief-render.mjs [--github]` | Writes every PR-brief preview state, the final summary and an adversarial-identity case to `artifacts/pr-brief/` (premium context when `premium/` is present; `DIFFDEVIL_PREMIUM=off` for Community). `--github` also renders each body through GitHub's read-only Markdown API with the local `gh` token or `GITHUB_TOKEN` and checks the native alert, fold and untrusted-text structure. It posts no comment; it is renderer evidence, not a real PR, so desktop, narrow, zoom and assistive-technology behavior still need one. |
| `npm run check:website` | Generates selected sources and assets, builds both static hosts into `artifacts/website/dist` and `artifacts/manual/dist`, and mirrors one joined search index. Part of `verify`. No deployment or remote preview. |
| `npm run website:assets` | Renders the ignored favicon, touch icon, web-manifest and GitHub App logos, Open Graph image and manifest from `packages/design/assets/identity/`, measuring each framed mark against its declared occupancy. `--report` prints the measurements. |
| `npm run website:build` / `website:dev` / `website:preview` / `website:check` | Full engine + two-host production build, the website Astro dev server, a local preview of the website output, and the website Astro type check. See [the website README](../apps/website/README.md). |
| `npm run test:website` | Data-level website tests (also discovered by `npm test`): fixtures evaluate to the outcomes they teach, snapshots are valid engine reports, the docs manifest names real sources, browser shims match Node. |
| `npm run qa:website` | Headless Chromium qualification of the built website against the real playground application server on the fake GitHub fixture. Needs Playwright's Chromium (`npx playwright install chromium`). Local behaviour only, not a deployment claim. |
| `npm run qa:app -- --participation` | Focused built-Worker beta invitation, survey, completion, reward/quote, export and deletion journey. Results explicitly name the participation scope; this does not replace the full `qa:app` journey. |
| `npm --prefix apps/manual test` | Manifest, source identity, migration, resolver, theme and static-handler contracts without the manual dependency installation. |
| `npm --prefix apps/manual run check` | Builds the engine and checks the actual manual Astro components using its selected supported toolchain. |
| `npm --prefix apps/manual run qa` | Rebuilds an isolated noindex reading fixture and qualifies the actual two-host outputs in Chromium, including real loopback 308 chains. Starts after an ordinary production build. |
| `npm run extension:dev` | Rebuilds the extension into the stable local dogfood path `artifacts/browser-extension/unpacked`. Chrome still requires **Reload** on the extension card and a reload of already-open pull-request tabs; SHA-named witness copies are evidence, not the installed development path. |

The fresh CI `npm ci` cache holds the locked project tarballs but lacks registry
metadata for a lockless tarball consumer. The hosted package step therefore sets
`DIFFDEVIL_PACKAGE_INSTALL_ONLINE=1` and exercises the normal registry install;
the local offline qualification keeps using the single supplied npm cache. The
package result records `installMode`, so hosted success cannot be mistaken for
portable-cache proof.

The ordinary runner runs at most two isolated test-file processes concurrently,
keeping local host use bounded after serial execution exceeded the Windows CI timeout.
It rejects zero discovery and test files with no registered
tests. Skips, expected fixtures and a wrapper file that Node happens to load are
not counted as executed behavioral proof. Current counts and limitations belong
in [Qualification](qualification.md), not a numerical quota in the runner.

The release carriers are generated under `artifacts/release/` and remain ignored
until an authorized release operator attaches the exact qualified files. Their
stable manifest is named `diffdevil-release-manifest.json`; building it creates
no tag, Release, npm publication, deployment, or plugin installation.

The Action distribution is committed because GitHub consumers must receive
executable code and its dependencies. After changing source, locked dependencies,
Action input definitions or the build pipeline, regenerate before `verify`:

```sh
npm run build:actions
npm run verify
npm run test:conformance
npm run test:package
npm run test:actions
```

A stale distribution deliberately fails verification rather than being silently
rewritten. Inspect the resulting diff before committing. This is generated-file
parity, not permission to ignore source review.

### Run another actual Node runtime

The Action journey always uses its current `process.execPath`. To add an installed
Node 24 binary in the same run:

```sh
DIFFDEVIL_NODE24=/absolute/path/to/node24 npm run test:actions
```

`DIFFDEVIL_NODE24` is a test-harness option, not an Action input. It installs
nothing and rejects a supplied binary that is not Node 24. Without another
runtime, the evidence explicitly records which runtime was exercised. To verify
the source and npm package under another Node version, run those commands with
that version selected in the normal shell/toolchain environment too.

START/UNDERSTAND executable examples are included in ordinary test discovery and in
`npm --prefix apps/manual test` after the engine build. They exercise complete
canonical examples, strict exits and evidence, desired plans, extension projection,
catalogue URLs and saved-report CLI exports. The installed package smoke additionally
runs the complete Bash consumer on Linux and both Windows PowerShell and PowerShell
7 consumers on Windows, including true/false/error/unresolved exits and arbitrary
UTF-8/NUL-delimited paths. These shell checks use the newly installed npm artifact;
local source execution is not substituted for that boundary.

The manual Chromium journey additionally covers actual authored pages at 1280/320px
and the frozen-example exclusion/export journey. It uses built static assets and
no live GitHub acquisition or provider write. `PLAYWRIGHT_EXECUTABLE_PATH` may select
an already installed Chromium executable.

## Source and distribution ownership

Public exports are root, `/core`, `/language`, `/policy`, `/git`, `/github`, and
`/package.json`. NodeNext TypeScript imports use `.js` specifiers. Core facts,
detail and policy compilation perform no filesystem or provider I/O; hosts
supply validated data. Compiled handles and correlation frames are process-local,
while reports and plans are versioned inert data.

`src/diffdevil/actions/` owns host inputs, event targeting, policy/source selection, runner
orchestration, output files, summaries and process exits. `src/diffdevil/hosts/` shares
trusted policy acquisition with the CLI. `src/diffdevil/github/` owns provider acquisition
and reconciliation, not another evaluator. `apps/playground/` consumes the built public
engine through an AGPL application server, Worker adapter, versioned response schema,
browser assets and application-owned tests. `apps/github-app/` consumes that same engine
through verified ingress, Queue, D1, native-check, and recovery/history adapters. Neither
application is part of the npm or Action distributions.

`actions/runtime/` is the committed native-ESM closure: compiled code, static
validators, 12 locked runtime package trees, original third-party notices and a
manifest of the shipped packages and their rights. It has its own `package.json`; root development
`node_modules` is not consulted. It is not a single-file minified bundle.
`.gitattributes` preserves the exact vendor bytes, including original line
endings; whitespace checks still apply to authored source.

See [Action distribution](integration/action-distribution.md) for consumer paths,
regeneration, footprint, dependency rationale and exit cost. The npm tarball and
Action distribution have different file boundaries and different tests.

## Focused tests

```sh
node --test src/diffdevil/tests/actions.test.mjs src/diffdevil/tests/action-metadata.test.mjs
node --test src/diffdevil/tests/cli-effects.test.mjs src/diffdevil/tests/github-git.test.mjs
node --test src/diffdevil/tests/github-*.test.mjs
node --test src/diffdevil/tests/policy-yaml.test.mjs src/diffdevil/tests/schema.test.mjs
node --test apps/playground/playground.test.mjs
node --test apps/github-app/github-app.test.mjs
```

The GitHub fixture is an explicit in-memory HTTP implementation under
`src/diffdevil/tests/helpers/`. Action consumer execution preloads it outside the copied
production distribution; production runner files are not patched. No test needs
real credentials or performs live GitHub mutations.

Workspace Action policies and template targets are confined to the selected
checkout, including symlink resolution. They remain read-only in Actions.
Controlled local Git acquisition disables executable filters, textconv/external
diff and filesystem monitors, uses existing objects, and strips Action input and
known credential variables from its child environment. This is a data-acquisition
boundary, not a general sandbox for running arbitrary PR programs.

## Evidence and local Git

Current native logs are under `artifacts/verification/native-node24-*.log`;
the earlier layout logs remain under `artifacts/verification/layout/`. Commands write their own results to
`artifacts/conformance/results.json`, `artifacts/package/`,
`artifacts/verification/actions/consumer.json` and `artifacts/shortcut-demo/`.
Generated tarballs and build/install directories are reproducible; a transfer need
not retain them. Earlier runtime evidence is preserved as dated technical records
under `docs/reference/`, not duplicated into each new return.

Inspect `git status --short --branch` and recent commits before mutation.
Root `node_modules/`, `artifacts/`, and `dist/` stay ignored. The deliberate
exception is the shipped dependency closure **inside** `actions/runtime/`.
`actions/runtime/MANIFEST.json` records the shipped packages and their rights;
`npm run check:actions` owns parity by rebuilding and comparing bytes. Preserve
original dependency bytes; do not normalize their line endings.

`src/diffdevil/tests/examples.test.mjs` executes the actual task-guide CLI command specimens,
policies, and parsed workflow inputs. It does not freeze narrative text. The
package journey checks an alternative version in the installed manifest. On
Windows it uses npm's installed dispatch and executes the installed PowerShell
launcher for version and scalar query. It inspects the installed CMD and
PowerShell launcher files separately. The Linux POSIX path remains its own result.

The read-only repository CI runs these same commands on Linux Node 22/24 and
Windows Node 22/24. A source-authored matrix is not a passed hosted run. The native
Windows result is recorded in [Qualification](qualification.md); hosted Windows
and Linux checks still require exact-head observation after publication.

Publication, release identity, real credentials, live settings and provider
writes require their own authority. See [licence boundaries](../LICENSES/README.md), [release procedure](publication-boundary.md)
and exact current [Qualification](qualification.md).

## Public-manual toolchain and qualification

The manual uses an isolated supported peer graph: Node >=22.12, Astro 7.3.3,
Starlight 0.42.2 and the source-only `@wolfsblvt/starlight-works` package from
`Wolfsblvt/starlight-works@22d4567006ec7a33d890fab2f3d3515332498a90`.
`npm --prefix apps/manual run toolchain` fetches that exact source and invokes its
own build/pack route. The website's existing locked graph is not upgraded for this
consumer. Prepared source/package and consumer receipts live under
`artifacts/manual-toolchain`. The generated child lock is retained in qualification
artifacts; a clean transitive resolution is a new graph, not automatically reusable
prior evidence.

The website's ordinary build-done hook builds the manual and joins search, so
`npm run website:build` and root verification still exercise both hosts. Manual-only
commands are owned by `apps/manual/package.json`, leaving the reusable package and
Action distribution metadata unchanged. After preparation and engine build,
`npm --prefix apps/manual run test:projection` exercises AST projection and actual
generated inventories. The complete command contract lives in the
[manual application README](../apps/manual/README.md).

Manual browser qualification builds an isolated noindex reading fixture and
exercises both actual outputs, including the emitted static request handler, in
Chromium. The normal production build excludes that fixture. The existing FAQ
browser journey also runs against the combined candidate. Neither command deploys
a host.

For an already prepared checkout, `DIFFDEVIL_DOCS_OFFLINE=1` or npm's `--offline`
mode reuses the verified source package and installed consumer graph or npm's
populated cache without a network fallback. An empty cache cannot install an
unpublished package offline. The ordinary runner prunes nested dependency and
generated-output directories before discovering repository tests.


## Policy and reference inventories

Run `npm --prefix apps/manual run generate` after a selected canonical inventory
input changes, then `npm --prefix apps/manual run check:generated` to prove committed
Markdown parity. The ordinary renderer also refuses drift. Authored prose and complete
examples stay outside paired generated boundaries. Exact input identities and emitted
body digests are in `artifacts/manual/generated-islands.json`. The manual's `test`
discovers its `*.test.mjs` suite, including independent policy chapters, CLI invocations,
schema/reader distinctions and migration guards. Its separate `qa` command additionally
exercises the full policy/reference family through the built browser surface.

## Final public-surface reconciliation

`npm run website:build` emits the product and manual hosts, their exact source
provenance, finite redirects and one joined search index. The old apex Markdown
collection is not an article source. `npm run qa:website` exercises the existing
product, Examples, Playground, editor, export and shell journeys;
`npm --prefix apps/manual run qa` adds the manual, FAQ joins, resolver, fragment,
theme, setup/download and responsive journeys. The standalone
`node apps/website/qa/faq.mjs` preserves the FAQ's history, focus and native no-JS
contract. These checks run on locally built files, not deployed hosts.

The website's [build inputs](../apps/website/README.md#setup-and-download-build-inputs)
own public URL binding and the optional publication-read-back manifest. Unconfigured
App setup and unpublished archives remain unavailable; a local release build must
not be supplied as proof of publication. The root README is npm's front door; there
is no separate package README template to render or maintain.
