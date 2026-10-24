# diffdevil App

## Meaning

This application is the signed-in diffdevil App: the analytical and operating experience of the managed GitHub App, served at `app.diffdevil.dev`. It renders the ratified Overview, Pull requests, History, Files, PR detail and File detail destinations from the managed App's own D1 state through the managed App's analytical data contract, under the signed-in person's current GitHub reach and the server-selected plan of each namespace, and the ratified Manage console (D080): what the plan allows, which repositories run and why, each repository's settings, the plan and its funding as the product-facing Wirt seam, and the account's four relationships. Its Worker also carries the managed App's runtime routes (webhook ingress, Queue consumer, scheduled maintenance, the protected analytics read and the Wirt commercial routes) on the same host and bindings. It is not the public website, not a claim that the hosted App is deployed, that any plan can be bought, or that named history has been collected for a real repository.

The production root also owns a neutral discoverable entrance. Its HTML contains no
viewer, repository or analytics state; authentication selects the private experience
at that same root. The product website remains the fuller product explanation.

## Analytical loading

The six analytical destinations first return the protected shell and navigation links after a local session check.
No repository name, plan or measurement is included in that generic shell. Navigation then reads the current viewer
independently of the analytical population. Every acquisition opens the current authorization again; HTML fragments
are private and not cached. Common analytical panels can finish before premium file regions and optional Manage
notifications. A failed read stays in its region with a keyboard-operable retry and explicit unavailable standing.
Late replies cannot replace a newer selected scope or period. With JavaScript disabled, the shell links to the complete
server-rendered document using `render=document`.

Period, bucket and chart-selection interactions keep the previous view while common data loads. Common results then
commit independently of premium acquisition; existing premium chart objects remain usable with a visible previous-selection
notice until their new models arrive. The premium response renders only the requested regions, without rendering and
discarding the common page's charts again. Both common and premium updates retain chart instances and keyboard state.

A 200 shell establishes only a valid local session and a rendered frame. It does not establish provider, plan or
analytical health. An inaccessible detail returns 404 from its independently authorized data read and renders the
existing not-found state; the generic document itself contains no protected detail.

The ordinary read consumes the analytical record already normalized by ingestion/import. Current-policy interpretation
uses a dedicated isolate cache only when the exact report and actual compiled policy match; misses are calculated
at read time. Each request still reads the current retained rows, expiry, history standing, access and entitlement.
The cache admits at most 2,000 frozen numerical interpretations, 12 MiB of accounted serialized weight, and
1 MiB per entry so a useful large interpretation can remain warm without widening the total budget. Weight charges
two bytes per key and value-JSON code unit plus 512 bytes per entry; it is an
explicit retention budget, not a measurement or promise of total V8/Worker heap. Oversized entries compute normally
without displacing smaller entries. Insertion-order eviction and fixed one-minute expiry make removal amortized
constant work; hits do not extend lifetime. Analytical retention is independent of the provider-context cache.
Eviction, expiry, clearing or a cold isolate recomputes the complete answer. This adds no persisted state or job system.
The minute is a reuse window, not physical deletion: expired allocations leave on a later cache operation or isolate loss.
`node --expose-gc apps/app/qa/analytical-read-profile.mjs` measures the common read with the anonymous loading-scale
specimen, including cold/repeated reads, complete-answer equality, accounted retention and a local forced-GC heap
delta. It does not measure native D1 wait, private algorithms or the joined live Worker.

A malformed or inaccessible file-detail route keeps the authorised navigation available and reaches its not-found
page without querying the broader repository population.

`node apps/app/qa/run.mjs --loading` qualifies the built Community Worker with the retained local fixture and held/failed
data replies: prompt shell, independent navigation, populated rendering, retry, superseded replies, reduced motion and
an unavailable namespace scope across Overview, Pull requests, History and Files.
It does not prove the joined private extension, provider CPU/memory, staging recovery or ordinary live use.

`node apps/app/qa/run.mjs --pr-search-detail` exercises all-repository search, direct PR detail and Back on Free,
then repeats with Pro when the build joins an extension. Its deliberately unreadable retained record must leave the
older pathless result usable; premium regions must expose local keyboard Retry and recover independently. This failed-read
journey waits for the common document's readiness rather than network silence. The full journey still checks the
accepted Overview chart composition through its deferred-region wrappers.

For held/failed premium-region and chart-continuity checks without private source, build with
`DIFFDEVIL_PREMIUM=apps/app/qa/loading-premium/index.mjs`, then run the same `--loading` journey. This joins a clearly
synthetic public extension fixture, not the paid implementation; rebuild with `DIFFDEVIL_PREMIUM=off` afterward.
`DIFFDEVIL_APP_QA_LOADING_SCALE=1` selects the anonymous measured-scale cohort for this local journey: 142 records,
915 paths and 256,986 logical size observations represented by 265 shared fact sets and 7,563 exact markers. The fixture
also matches the retained JSON byte envelope and recovery gaps; identities, time distribution and sizes are synthetic,
with explicit inert comparison-identity padding for the byte envelope. It contains no captured production rows. This
qualifies scale and public acquisition boundaries; actual private algorithms and live Worker resources need their own
matching proof. The same local seed path supports a record larger than D1's SQL-file statement limit through bounded
appends while the disposable target has no running reader.

With the public extension fixture, that journey also follows a real retained opaque file handle through the App's
file-detail bridge. `qa/loading/file-read.json` separates fetch timing and response bytes, DOM commits and a two-frame
paint opportunity; the latter is not a compositor timestamp. It records the complete file count and the number of
file-population derivations. It remains synthetic consumer evidence, not private-algorithm or Cloudflare qualification.

A file detail reads only its named repository while retaining the broader scope as navigation context. Its second
file-surface read continues the same request's Files response through `loadSurface`; matching reader, repository,
period, metric, policy, current access and readable history are required. This avoids a second full interpretation
and premium file enrichment. A different request or selection reads fresh data and derives its own answer; only
unchanged deterministic policy interpretations can reuse work across requests. Opaque signatures already calculated
for that view are also reused only inside its runtime.

Files retains the complete query in full documents, progressive fragments and carried links, including the file-detail
return context. The PR search keeps its existing query policy. On Files, `q` and `page` select a local projection of the
same acquired population; changing them with replace-state does not invalidate that population's pending reply or
failure/retry. Scope, period, metric, file selection, cancellation and newer navigation still govern acquisition.
Requests keep the complete URL, while the freshness comparison ignores only these Files-local projection fields.
The private controller owns reapplying the newest local projection and focus through a commit.

With the same public extension fixture build, `node apps/app/qa/run.mjs --files-query` qualifies the public counterpart:
171-character full/partial/GET reads and links, controlled replace-state edits during common/enrichment waits,
failure and keyboard retry, no extra analytical request for a local edit, and rejection of a superseded population.
It models the private controller's URL effect; it does not qualify that controller's input, filtering or focus behavior.

Migration `0017_authorization-refresh.sql` adds the per-grant claim used before a one-use provider rotation. Other
request runtimes re-read the committed winner with bounded backoff; pending/unknown rotation withholds data without
revoking sessions. An interrupted rotation is never taken over by a timer: the provider may already have consumed the
old token. A fresh verified sign-in replaces that uncertain grant. Explicit provider invalidation and account/service
disconnect still retire the grant and sessions. Source tests apply this migration only to disposable local D1; a live
migration remains an independently authorized deployment operation.

## Inspect and admit a repository

On the intended deployment, sign in, open **Manage → Repositories**, select the
repository if necessary, open its settings and choose **Inspect trusted policy**.
The entry is `/manage/repositories/<owner>/<repo>?admission=review` on that
deployment's origin. Current GitHub administration, including the existing
Business delegation ceiling, is checked through the person's own authorization.
Installation credentials never identify the operator.

The read-only review shows repository/installation IDs, settings revision,
recorded execution consent and actor, writer standing, history choice, running
Worker version, trusted default-branch commit, complete effective policy,
declaration origins and configured label/comment rules. It uses the execution
policy resolver with a repository-scoped Contents-read credential. Only a missing
policy file (404) falls back to stored settings and the bundled preset; unreadable
policy is unavailable evidence. Inspecting does not change consent or apply
GitHub effects.

Compare the running version with the accepted deployment/source record, then
choose **Admit execution**. The same-origin form rechecks current authority,
host/version, repository/installation, revision and trusted policy before
recording execution consent. An unresolved writer needs a sole-writer declaration;
that records the operator's statement and does not detect or stop another writer.
History and configuration stay unchanged. The result returns to the review with
current stored consent, actor and revision; the existing administrative record
carries the inspected basis and operation outcome. Audit failure does not roll
back consent. This operation neither applies nor observes labels, comments or
checks. Subsequent PR execution resolves its own trusted base again.

For an already-active repository, the review shows the recorded admission and
links to repository settings to stop execution. Another admission is refused
before mutation: revision and consent actor/origin remain unchanged. Inspecting a
new policy neither renews consent nor requires re-attestation.

The explicit review shows the observed policy separately from the ordinary
stored-layer settings summary. **Repository settings** returns to that unchanged
console, including its existing enable controls; those controls do not claim the
reviewed policy/version binding.

A changed basis needs another review. An unconfirmed response may follow a
committed change: inspect current consent/revision before retrying. The old
revision cannot repeat the update. There is no additional credential or
age-based expiry. The inspection does not attest every open PR's policy or
physical in-flight work.

Wrangler's [version metadata binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/version-metadata/)
supplies `CF_VERSION_METADATA`. Without its running version, inspection remains
available but reviewed admission is unavailable. A provider version ID does not
attest source bytes; the accepted deployment record owns that correspondence.

This source path is **not a production deployment**. The standalone webhook
Worker does not serve these pages. Delivering this caller to production needs an
accepted deployment of the composed App on the intended host, D1 and Queue
bindings, with its GitHub-user OAuth callback, seal and App credentials configured.
A separate staging deployment does not supply those facts. Database editing or an
Action bridge does not substitute for this management operation.

After `npm run app:build`, run `node apps/app/qa/run.mjs --admission` for the
built-browser journey against disposable local D1 and a loopback GitHub double.
It exercises trusted-policy inspection, changed-policy refusal, deliberate
admission, recorded consent and unreadable-policy presentation, with screenshots
under `artifacts/app/qa/admission/`. Generated fixture keys never contact GitHub;
the loopback-only installation-fetch adapter keeps those policy reads local.
This is local qualification, not live production reach or admission.

## What it is made of

The same complete App can be built as a [separate persistent staging consumer](../../docs/integration/app-staging.md), with its own Worker/D1/Queues, build output, local state and Wirt configuration. Its committed activation coordinates are placeholders; production and the existing controlled TEST callback are unchanged.

- **Astro, server-rendered on Cloudflare Workers** through `@astrojs/cloudflare`, with a custom Worker entry (`src/worker.mjs`) that routes the managed runtime's paths to `apps/github-app/app.mjs` and everything else to Astro, and exports the Queue and scheduled handlers. Every view is a URL (scope, period, filters, sort, selected bucket, selected file), so a view can be shared, reloaded and re-authorised when opened.
- **The website's own header, tokens, styles and fonts**, imported from `apps/website/src/`. The header is prerendered once at build (`src/pages/fragments/header.astro`) and injected into every page, so the shell is the same component rather than a copy. The App adds `src/styles/app.css`: the shell, navigation, panel and seat grammar the ratified design settled.
- **The managed App's authorization service** (`apps/github-app/authorization.mjs`) with a GitHub App user-authorization provider (`src/lib/github-user-provider.mjs`), an AES-GCM seal for stored grants (`src/lib/protector.mjs`) and opaque browser sessions in the same D1 database. The analytical read service is installed behind it, so `/api/analytics` answers a signed-in browser through the same adapter the pages use.
- **One data contract** (`src/lib/analytics.mjs`): the managed App's analytical read service (`apps/github-app/analytical-data.mjs`), composed in-process with the reader's authorised set, the entitlement reader, the current-policy reader and the namespace resolver. Each page asks for the surface it renders (`prs`, `history`, `files`, `pr`, `file`); the service decides populations, final merged comparisons, current-policy interpretation, coverage, scope and entitlement. The App re-derives nothing from rows.
- **A record model on a named basis** (`src/lib/derive.mjs`, `src/lib/intervals.mjs`): the service's rows become one record shape, with retained lifecycle (opened, ready, merged, closed), one final merged comparison per merged PR, the band the current policy judges, the recorded original policy result, desired and observed labels, and interval-aware statistics (`a–b`, `≥ a`, `n/a`, never a silently exact number). Where a repository with history has no retained named record yet, its older pathless analyses drive the page by analysis time, and the page says so.
- **Entitlement from the Wirt commercial consumer** (`src/lib/entitlement.mjs`): a repository resolves to its installation's numeric GitHub account and that account's active funding link; the viewer resolves to their own account. Without a configured commercial consumer every namespace reads as Free and the App says so. A fixture map keyed by numeric account is honoured only on a loopback origin, for local qualification.
- **The current policy** (`src/lib/policies.mjs`): the existing trusted resolver reads the authorized repository's current default-branch head with its verified installation identity and a repository-scoped Contents-read credential. Trusted `.diffdevil.yml` overrides stored App configuration and the bundled preset, with one acquisition per repository per request or queue invocation. Only positive file absence permits fallback. Failed stored settings, provider/access/credential reads or invalid policy leave retained base measurements readable with unavailable interpretation and a local retry; they never produce a successful default-policy answer. Analytical responses name the compiled identity, source and trusted head. Recalculation records its actual basis and fails honestly when current policy is unavailable. Original measurements, policy/results and provider effects stay intact. Reading never adopts settings or writes repository data.
- **Opaque file locators** (`src/lib/locator.mjs`): a file-detail address carries an HMAC of (repository, path) under the seal key, never the path, and the document title never names the file. The handle is resolved server-side against the files the reader is entitled to see.
- **Transient display titles** (`src/lib/viewer.mjs`): titles and GitHub links come from the signed-in person's own read of the 100 most recently updated pull requests per repository in scope, cached for a minute per isolate, never retained, never a population source.
- **The chart system** of [Chart Grammar v1.1](../../packages/design/chart-grammar-v1.1.md), the owner-accepted analytical charts and cloud. The server builds one JSON model per chart (`src/lib/charts/models.mjs`) from the record population and renders the F1 frame (`src/components/ChartFrame.astro`): the panel header with a chart/table switch, the fixed-geometry readout that is legend, tooltip and keyboard announcement at once, a skeleton in the chart's own shape, the equivalent table and the teach line, all from the same model and the same readout text (`src/lib/charts/readout.mjs`). The browser draws the charts with ECharts 6.1's SVG renderer and one `diffdevil` theme read from the design tokens (`src/client/charts/`): authored custom-series recipes for the mosaic, pull-request flow with its backlog line and range strip, time to merge by size on a log axis with its ruler, the size mix, lifecycle by size, the size lanes and development over size zones; hover, arrow keys, Enter to pin and drill, Escape to clear, linked hover over shared buckets, and an in-place morph when the period changes. The premium file charts (growth and shrinkage, concentration, the Turnover map, recent file activity) and the cloud live in the premium extension (`premium/app/lib/charts/`, `premium/app/client/`) and draw in the same frame: they register their readouts with `registerChartKinds` and their recipes and the cloud's controller with `registerCharts`. The cloud (`premium/app/components/CloudPanel.astro`, `premium/app/client/cloud.ts`) is packed by d3-cloud in a layout Worker over an OffscreenCanvas with the App's own fonts (a main-thread pack is the fallback), steered so words glide from where they were, with the docked readout, co-change partner meter chips from the service's one co-change derivation, the by-folder/by-repository arrangement, the Top column as real space, the metric switch and the ranked list. There is no floating tooltip anywhere; unknown reads as a state, never as `0`; partial coverage reads `≥`. The tiles keep their small marks (`src/lib/charts.mjs`).

## Community and premium

This directory is the complete Community application: the shell and navigation, the six routes, base operation and history, authorization, the plan and entitlement contracts, the common panels, and truthful Free and unavailable states. The paid implementations (Files and File detail, the Overview cloud, hotspots, Concentration and High-turnover panels, History growth and concentration, and the PR file context) are a separate extension that joins through one seam, described in [src/premium/README.md](src/premium/README.md). A build joins it only when it is present.

- `npm run app:build` joins `premium/app` when that directory exists and otherwise builds Community; `DIFFDEVIL_PREMIUM=off` forces Community and `DIFFDEVIL_PREMIUM=<entry>` selects another extension. `artifacts/app/edition.json` records the result.
- In a Community build an entitled reader's premium slots say that file history is not part of the build; nothing is computed, so nothing is shown as zero.
- `src/lib/view.mjs` exposes `view.premiumHere` (entitled and provided) and `view.premiumProvided`; pages render a premium slot only when both hold.

## Routes

| Route | Content |
| --- | --- |
| `/sign-in`, `/auth/start`, `/auth/callback`, `/auth/session` (POST), `/auth/logout` (POST) | GitHub sign-in: browser-bound state, server-side code exchange, one-time artifact exchanged for a session by a same-origin POST, sign-out. |
| `/` | Overview: the period hero with the live cumulative line and tiles, then (Pro) the full-width cloud, the compact Change volume, Pull-request flow beside current activity, Time to merge by size beside the size mix, and the Turnover map beside the repository or label context; Free keeps Change volume in the cloud's place and the same rows with its panels. |
| `/prs` | Pull requests: Pull-request flow beside analysed heads, PR lifecycle by size beside the size mix, then the filterable, searchable, sortable list. |
| `/history` | History: Change volume picks the bucket (kept, and shared with File growth), Merged PRs by size with the selected bucket banded (Pro and Free), the selected bucket as ranked PR rows and files, Pro growth/shrinkage and concentration over time, the period comparison. |
| `/files` | Files: the full-width cloud that selects the file card in place and owns its metric, arrangement, Top and list controls; the Turnover map; the ranked table by the selected metric beside the selected file's card (Pro); the bounded Pro state with pointers to funded namespaces (Free). |
| `/pr/:owner/:repo/:number` | PR detail: result, policy-and-effect lanes with the recorded original; (Pro) recent activity on this PR's files as a chart beside the other active work on them; named file rows beside development over the size zones; the files this PR's files usually change with, as meter rows. |
| `/file/:owner/:repo/:locator` | File detail by opaque handle: tiles (merged PRs, Changed, raw churn, observed size, Turnover), Changed per merged PR with the aligned file-size strip, often-changed-with meter rows, contributing merged PRs. |
| `/api/analytics` | The managed App's protected analytical read (POST JSON, same origin, session cookie), served by the same Worker with the App's authorization adapter installed. |
| `/manage` | Manage · Overview, capacity first: the plan band with the organisation slots, one row per namespace you administer with a cell per private slot (Free: its two pooled allowances), the namespaces you only read, and Needs you (only decisions: overdue renewal, suspended installation, paused funding, held configuration, pending enable, a repository that left, over the limit, an open paid slot). A first run shows the three setup steps instead. |
| `/manage/repositories` | Repositories: a namespace filter, Free's allowance panel, then per namespace the enabled repositories above the not-enabled ones with the state and its reason on every row; Select, Enable, Stop, Release and Swap in… (a picker in the row; the incoming repository lands as Pending enable), History / Labels only on Free public repositories, the Free connected organisation's connect and disconnect panels, and the funder panel of an organisation someone else funds. |
| `/manage/repositories/:owner/:repo` | Repository settings under the same tabs: Operation (size labels, native check, the pull-request message with its bounded controls and the synthetic preview over the effective trusted policy), History (collection with its acting-administrator provenance, coverage, the import and recalculation jobs with their progress, pause, resume and retry, interpretation, allowance, retention), Configuration (the chain preset → linked policy (Business) → App settings, naming an adopted Pro default revision → `.diffdevil.yml`, the Pro default's differences with Review and apply, and the effective value of every setting with its origin), the pending / enable-again / held / removed / suspended states, Stop or leave. Administration is proved by the authorization service at every read and write. |
| `/manage/defaults` | The Pro namespace default, which each repository adopts from its own settings (D081): the editor from the premium extension for an entitled namespace, the bounded See Pro placeholder on Free, and the honest absent state in a Community build. |
| `/manage/policies`, `/manage/people`, `/manage/audit` | The Business tabs (D081), shown to everyone who coordinates a Business namespace: named linked policies by revision with the repositories linked to them and what each repository file overrides, the editor, linking and unlinking, publishing with the result per repository (applied, applied partly, queued behind in-flight work, failed) and Retry, automatic setup per scope; the administrators and the people named by login with their reach, Can and Can't, and the latest time GitHub did not confirm them; the administrative record with its filters and the facts observed on GitHub. The premium extension's bodies over Community facts; the honest absent state in a Community build. |
| `/manage/plan` | Plan & funding: the standing card (funded, first payment pending, renewing, being prepared, being checked, overdue, ends at term end, change scheduled, ended, ended with an unresolved payment, reconciling after a restore, a gift) with the six Works exits, choose what stays before a reduction (applied when the reduction takes effect, or at once afterwards, and then reported), what the plan funds (Fund / Release / Reconnect per slot), the product-only comparison before a plan change (Pro leads with Business), the Works account; on Free the allowances, the upgrade exits that link Works first and what Pro would change here. The return strip reads the departure recorded when the person left and the outcome Works' callback carried. |
| `/manage/plan` | Plan & funding: the standing card (funded, first payment pending, renewing, being prepared, being checked, overdue, ends at term end, change scheduled, ended, ended with an unresolved payment, reconciling after a restore, a gift) with the six Works exits, choose what stays before a reduction, what the plan funds (Fund / Release / Reconnect per slot), the product-only comparison before a plan change (Pro leads with Business), the Works account; on Free the allowances, the upgrade exits that link Works first and what Pro would change here. The return strip reads the departure recorded when the person left and the outcome Works' callback carried. With a participation campaign: the reward card beside the standing, with its one standing, Wirt's alternatives and applications, the next charge or a preview the person requested with the Monthly or Annual button (an Origin-checked `reward-preview` POST to `/manage/do`; `?preview=` only selects which stored preview to show) as Wirt's receipt. |
| `/manage/plan/survey` | The participation survey: the five questions as a keyboard-reachable form with save-for-later and complete; after completion the reward's standing, what you sent and Delete my answers. |
| `/manage/account` | Account: GitHub sign-in, App installations, the funding connection and Wolfsblvt Works as four separate relationships with their standing; sessions (signing out keeps the funding connection and the sign-in page says so; sign out everywhere); email; export everything you administer; close the account with the export first. |
| `/manage/do` (POST), `/manage/depart`, `/manage/export`, `/manage/works-stand-in` | Every console mutation as one same-origin form post answered with a redirect and a message; the departure to a Works destination that records what the person was doing; the JSON export of settings, effective policies, defaults and retained history for what the person administers; and, on a loopback deployment with the commercial stand-in only, the page that stands in for Works. |
| `/webhooks/github`, `/integrations/wirt/*`, `/health/ping`, `/health/ready` | The managed runtime's routes, unchanged, on the same host. |

Query parameters: `s` (scope: `all`, `@namespace` or `owner/repo`), `per` (`7d`, `30d`, `90d`, `1y`), `f` (state), `band`, `ev` (measurement), `sort`, `q`, `page`, `w` (selected bucket), `m` (file metric), `rm` (repositories metric), `sel` (selected file handle). Anything malformed falls back to its default. Manage pages use `ns` (namespace filter), `swap`, `panel`, `confirm`, `compare` and `m` (the message a redirect carried); `works-link` on Plan & funding is the outcome Wirt's callback returned. The period switch, the History bucket pick and the Files card selection are ordinary links; with scripting the client fetches the next page and swaps it in place so the live chart instances survive and morph (`src/client/charts/mount.ts`), and the address bar follows.

## Participation reward campaigns

`APP_PARTICIPATION_CAMPAIGN` names the one campaign a deployment runs (key and version as Wirt registered it, the survey, its public name, the completion window, the invitation delay and the reminder delay) and needs a Wirt consumer; without both there is no survey, invitation or reward card. Nothing carries a launch date or timing default. A participant is a linked account with a Pro relationship (the beta grant, a paid Pro subscription or one that ended); Business is not part of this reward; an unreadable plan is unknown, never "not eligible".

Once Pro has run for the invitation delay and a managed operation has finished during beta access (a delivery completed, rejected, terminal or left for repair, so successful, held and failed use count; a repository merely enabled or running is setup, not use), the invitation appears at the top of signed-in pages until dismissed, once more as the only reminder after the reminder delay, then never; the survey stays reachable from Plan & funding. The App keeps the first such observation on the campaign's prompt row, because the delivery ledger that shows it is pruned after its recovery window. Completing commits the answers and the outbound completion fact, with its distinct durable event identity, together (`participation_responses`, `participation_deliveries`, migration 0013). Delivery is tried at once, again when the person looks and from scheduled maintenance, with the reports' backoff (60 s to 4 h, then every 4 h, never abandoned) until Wirt answers definitely; see [the consumer](../../docs/integration/app-commercial-link.md#participation-reward-campaigns) for the typed outcomes. Deleting the answers keeps the completion and its reward. The account export carries the responses; closing the account deletes them.

The reward card distinguishes completion saved, delivery pending, link Works to receive it, refused, ready (with both alternatives, or the first eligible renewal after an early conversion), reserved, partly used, used, expired, corrected and unknown. Every amount, remaining use, date and post-reward price is Wirt's: alternatives come from its facts, the next charge from its rewards route and a continuation preview from its quote. Because each preview creates a Wirt quote, it is created only by the person's Origin-checked POST and kept until Wirt's quote lapses (`participation_previews`); rendering or prefetching Plan & funding, including a cross-site link with `?preview=`, creates none. The public source is Wirt's curated reason, never a key, an identity or an answer. The loopback Works stand-in's `participation` part stands in for those routes, and its page reserves, confirms, renews, releases, expires and corrects the reward the way Works would.

## Entitlement and scope

A namespace's features follow that namespace's funded plan, including for a Free collaborator reading inside it. All repositories follows the viewer's own plan and aggregates only premium-funded repositories, naming the excluded Free and unknown-plan counts. The App sends the contract's explicit scope with the reader's inventory: `{ kind: 'all' }`, `{ kind: 'namespace', namespaceId }` (the namespace's numeric installation account) or `{ kind: 'repository', repositoryId }`; the service filters that scope to repositories the reader can currently read, so an inaccessible repository never takes part and a namespace is never inferred from a repository count. While a namespace's account is not recorded yet, its repositories read as All repositories and the page says so. Free keeps every merged, lifecycle and size population; Files on Free points to the funded namespaces the reader may already use and to History.

Organisation administration determines the navigation's Yours grouping, not the plan. An organisation chip and the shell's expected entitlement use its current funded standing even when the reader has a personal Pro subscription. The reader's own personal namespace follows that subscription. Unknown funding is shown as unavailable, without a paid chip or a lower-tier offer; available base analytics remain readable.

## What is real, and what is not yet

The App reads what the managed App retains: repository standing, the named analytical records (lifecycle, development revisions, final merged comparisons with per-file numeric facts and observed sizes), the default-branch size observations, the installation accounts and, for repositories without named records, the older pathless analyses. Lifecycle counts, merged populations, Turnover, growth, concentration and co-change come from the service; a window that begins before the first retained observation is marked partial and its comparison withheld.

It does not invent what is not retained. A repository whose named history has not been collected shows analysed populations by analysis time and names what is missing. An explicitly selected namespace or repository with no repositories in the current authorized view keeps the analytical frame but withholds its measurements and plan as unavailable; this is not an empty population or an upgrade prompt. A merged pull request whose final comparison was not recovered stays in the population unmeasured. A file's Turnover closes when a size observation brackets the period end; for a window ending now the service's current-size observer (bound here to a Contents-read credential scoped to the one repository, minted only when a returned Turnover has an open tail) closes the tail at the read, and when that observation is unavailable the tail stays open above and the page says so. Without a configured Wirt consumer every namespace reads as Free and Plan & funding says nothing can be bought here. The Manage console keeps provider reach, explicit selection, execution consent, history consent, the latest delivery and the plan as separate facts and names each state's reason; allowances follow the hosted offer when a subscription source is connected and are unlimited otherwise, enforced both where a selection is made and in the runtime and history jobs; the Pro namespace default is adopted explicitly into repository settings; a Business linked policy is published into each linked repository's own settings, a delegate acts only where GitHub grants them, and the administrative record keeps requested, queued, applied and failed as they happened; retention days, the shared archive date, the record's retention, monthly import budgets and closure while a plan is linked are named as unsettled seams rather than invented. The public read-only view and the operator view are not designed and have no routes here. The App is dark-only by decision; the charts are qualified at desktop width in the dark theme, and narrow screens and the light theme remain their own design occasion (the chart tokens name provisional light values so that occasion starts from a declared place).

## Build, run and qualify locally

From the repository root:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run app:build        # engine, website provenance, icon projection, Astro build → artifacts/app/dist
npm run test:app         # derivations, URL state, and the Community sign-in/viewer/service/locator journey against local D1 (premium cases: premium/tests)
npm run qa:app           # seeds local D1, serves a GitHub double, runs the built joined Worker in workerd, drives Chromium (Community journeys always; premium journeys when the build joined the extension)
node apps/app/qa/run.mjs --thumb # focused browser qualification of chart/table selection movement on the built App
node apps/app/qa/run.mjs --funding # namespace chips and analytical entitlement for unfunded/funded/shared/unknown scopes
node apps/app/qa/run.mjs --current-policy # trusted path/band overrides, actual basis, unavailable/retry and delayed/superseded reads against the built Worker and local GitHub double
node apps/app/qa/run.mjs --explicit-reader # current connected target reads when installation discovery omits them
npm run check:app        # the build plus a Wrangler dry-run of the generated Worker configuration
npm run app:dev          # Astro dev with local bindings (needs apps/app/.dev.vars, see below)
```

`qa:app` writes screenshots, `results.json` (with the chart mount and cloud layout timings) and the Worker log to `artifacts/app/qa/`. It exercises sign-in, the joined runtime routes, all six destinations in a Pro and a Free entitlement, scope and period persistence, filters, bucket selection, drill-down into a named file through its handle, a Free collaborator inside a funded namespace, keyboard reach, the inert theme control, sign-out, header geometry, document headers, console cleanliness and the absence of external requests, and the Manage console against the Works stand-in (`qa/manage.mjs`): the capacity-first Overview and its badge, selecting, enabling with the writer declaration and stopping, the repository settings with the message preview in six states, Plan & funding with its slots, the departure to Works and the waiting and confirmed returns, Account with disconnect and reconnect and the sign-out disclosure, Free's allowances, connected organisation and first link, the Business tabs (creating, linking, saving and publishing a policy with its result and the repository's chain, automatic setup, naming and removing an administrator, the record and its filters, the export), and the accessible Manage journeys (keyboard-only operation of the sub-tabs, selecting, the enable panel and its declaration, the confirmation dialog and stopping; visible focus; labelled controls, named buttons, hidden decorative icons, headed or captioned tables; the status and alert live regions; 1024 and 900 without horizontal overflow; the dark lock under a light colour-scheme preference; reduced motion on the waiting return strip). For the chart system it checks that every frame mounts, that the readout stays 66 px and the plot never moves under keyboard focus, pin and clear, that keyboard moves are announced, that the table view carries the same rows, that the cloud packs its words through its layout route, lights partners, opens its Top column, arranges by folder, switches metric and lists, that the period switch and the bucket pick morph the live charts in place, and that reduced motion still draws. `DIFFDEVIL_APP_QA_DENSE=1` adds a pass over a four-times denser fixture and records the cloud's layout times. It proves local behaviour against the fixture in `qa/fixture.mjs`, built with the real engine and written through the managed App's own write paths; it proves no deployment, no live GitHub and no real data.
`qa:app` writes screenshots, `results.json` (with the chart mount and cloud layout timings) and the Worker log to `artifacts/app/qa/`. It exercises sign-in, the joined runtime routes, all six destinations in a Pro and a Free entitlement, scope and period persistence, filters, bucket selection, drill-down into a named file through its handle, a Free collaborator inside a funded namespace, keyboard reach, the inert theme control, sign-out, header geometry, document headers, console cleanliness and the absence of external requests, and the Manage console against the Works stand-in (`qa/manage.mjs`): the capacity-first Overview and its badge, selecting, enabling with the writer declaration and stopping, the repository settings with the message preview in six states, Plan & funding with its slots, the departure to Works and the waiting and confirmed returns, Account with disconnect and reconnect and the sign-out disclosure, Free's allowances, connected organisation and first link, and the Business tabs; and a beta participant's survey and reward (`qa/participation.mjs`): the invitation and its dismissal, the labelled keyboard form with an incomplete attempt and a draft, completion while Works doesn't answer and its delivery after the real backoff, Works' monthly and annual preview receipts, a reservation, confirmed charges down to exhaustion, the export, deleting the answers without losing the reward, and no overflow at 1024 and 760. For the chart system it checks that every frame mounts, that the readout stays 66 px and the plot never moves under keyboard focus, pin and clear, that keyboard moves are announced, that the table view carries the same rows, that the cloud packs its words through its layout route, lights partners, opens its Top column, arranges by folder, switches metric and lists, that the period switch and the bucket pick morph the live charts in place, and that reduced motion still draws. `DIFFDEVIL_APP_QA_DENSE=1` adds a pass over a four-times denser fixture and records the cloud's layout times. It proves local behaviour against the fixture in `qa/fixture.mjs`, built with the real engine and written through the managed App's own write paths; it proves no deployment, no live GitHub and no real data.

Run `npm run qa:app -- --business-manage` after `npm run app:build` to qualify the Business Manage journey and its accessible controls without the analytical or other Manage passes. It uses a dedicated freshly seeded local D1 state and the exact edition recorded by that build, writes its report and captures to `artifacts/app/qa/business-manage/`, and honestly reports premium behavior as absent when the build is Community.

Local variables live in `apps/app/.dev.vars` (ignored): `APP_ORIGIN` (an https origin, or an http loopback origin), `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `APP_SEAL_KEY` (at least 16 characters; it also keys the file locators), optional `APP_SESSION_DAYS` (default 30), optional `GITHUB_API_BASE` / `GITHUB_OAUTH_BASE` (defaults are GitHub; the sign-in destination is always github.com), `APP_ENTITLEMENT_FIXTURE` (a JSON map of numeric account to plan, honoured only on a loopback origin), `APP_COMMERCIAL_FIXTURE` (the loopback-only Works stand-in: the account's link, projection, capacity and bindings as JSON, see `qa/manage.mjs`), `APP_PLAN_ALLOWANCES` (optional operator allowances as JSON; the hosted offer applies when a subscription source is connected, no limit otherwise), `APP_HISTORY_RETENTION_DAYS` (retention of enabled history, 1–3660, default 3660), the managed runtime's `GITHUB_WEBHOOK_SECRET`, `GITHUB_APP_ID` and `GITHUB_APP_PRIVATE_KEY`, and the Wirt consumer's `WIRT_*` bindings from [the commercial link contract](../../docs/integration/app-commercial-link.md).

## Operator posture

The Worker needs the managed App's D1 database (`APP_DB`, every migration applied, including `0008`–`0010`), the Queue bindings and cron trigger from `wrangler.jsonc`, the GitHub App credentials and webhook secret, the GitHub App's OAuth client ID and secret, a seal key secret, the Wirt keys when the commercial link is adopted, and `app.diffdevil.dev` pointing at it. The [maintained credential helper](../github-app/README.md#registration-and-credential-helper) carries the complete joined input operation to an exactly selected config/Worker, with protected file inputs, a retained seal dependency, contained native output and a resumable non-secret receipt. The standalone webhook Worker in `apps/github-app/` remains buildable; which unit serves the host is a deployment decision outside this source. Building creates no Worker, route, domain, database or deployment; `wrangler.jsonc` carries a non-operational D1 placeholder and no secret.

Protected page reads check the current GitHub user grant. Ordinary profile, installation/repository discovery, organisation-role and recent-PR title context may reuse the existing minute cache per isolate (titles only, scopes of up to 25 repositories). An explicit analytical repository/PR/file destination also resolves its exact target afresh through that user grant and binds its numeric identity to the App-recorded installation/account; the observation is neither cached nor used to discover siblings. The page then reads its analytical surface (two reads on Overview and Files for a Pro scope). Namespace presentation follows actual funding, independently of organisation administration or the reader's personal subscription; unavailable funding stays unknown. Installation accounts are recorded from webhook identities; an installation observed before that column existed resolves to no namespace until its next delivery. Its funding remains unknown; an analytical fallback to All repositories is named as the viewer-plan boundary.

Organisation authority comes from the signed-in person's App user token and the
paginated [current-user membership list](https://docs.github.com/en/rest/orgs/members#list-organization-memberships-for-the-authenticated-user).
GitHub documents that route without additional permissions; the single-organisation
membership route instead requires Members read. The App does not substitute its
installation token, a CLI credential, repository administration or a stored delegation
for the person's current organisation role. Manage distinguishes an active non-admin
role, pending membership, a completed list without the requested organisation and an
unconfirmed provider read. Unknown authority grants no namespace administration.
Failures carry only a fixed reason/code and an HTTP status when observed, and are not
cached, so refreshing can retry. Successful target role/state/numeric identity remains
transient in the existing one-minute display cache; no full membership response, token,
exception message or unrelated organisation is retained in logs, history or storage.
Action-time authority and repository write/delegation checks remain separate.

`node apps/app/qa/run.mjs --authority` exercises these native Manage states against the
built Worker and a GitHub double; run it with `DIFFDEVIL_APP_TARGET=staging` for the
separate staging build. Screenshots and results use each target's `qa/authority/`
directory. This is local source/consumer evidence, not real GitHub authority or proof
that a missing App permission caused a live refusal.

## Boundaries kept

The production root returns the same useful, indexable `200` entrance to signed-out
people and crawlers, including its own canonical and social identity. A valid local
session continues into the protected Overview. The public entrance does not resolve
a viewer, enumerate repositories or acquire analytics; `/sign-in` remains a separate
unindexed authentication mechanism. The App origin's sitemap contains only `/`.
Staging remains unindexed with an empty sitemap. Both root variants remain
`private, no-store` with `Vary: Cookie`, so a cached response cannot mix their states.

The App build generates its public `/manifest.webmanifest`, 192/512px mask-safe
icons and 180px Apple touch icon from the approved identity. Sign-in and authenticated
shells and public entrance link the same **diffdevil App** install identity, with ID, start URL and scope
`/`, standalone presentation and Apple home-screen metadata. Launch follows the
existing session/access checks. CSP permits only same-origin manifest fetches;
protected documents and data remain private and `no-store`. There is no service
worker, offline promise or private browser cache.

`node apps/app/qa/run.mjs --identity --standalone` exercises the built Worker's public manifest
and PNG responses, public human/crawler launch, invalid-cookie and direct-renderer
refusals, the root-only discovery inventory, fixture OAuth sign-in and protected shell,
alongside the existing shell checks. Its isolated headless Chromium app window and
phone viewport are local fixture evidence, not an OS installation, iPhone
Safari/cookie result or a completed whole-App phone design.

The build carries [third-party notices](THIRD-PARTY-NOTICES.txt) at `/third-party-notices.txt`, including the private extension's additional notices when composed. This records dependency licence inputs and does not publish an App release.

- Reads are authorised per request from the person's current GitHub reach; possession of a link is not access, and a repository or file handle outside the authorised set is refused, not rendered.
- Retained history is served under current repository access and retention/deletion rules; collection consent gates new rows. An explicit Stop collecting keeps existing rows readable, while tombstones and expiry still apply.
- Entitlement is the service's answer: a namespace's plan inside it, the viewer's plan across all repositories, premium aggregation only over premium-funded repositories.
- A file-detail address never carries a path, a document title never names a file, documents carry a `same-origin` referrer policy and the JSON routes `no-referrer`, and the App logs no request URL, query, body or path.
- Every protected response carries `Cache-Control: private, no-store`, a `default-src 'none'` content-security policy and the other browser security headers.
- Analytical page reads perform no provider writes. Explicit protected Manage actions select execution, history, import and recalculation; the managed runtime applies the admitted policy. Works owns billing and reward issuance; quote creation requires the person's protected POST.
