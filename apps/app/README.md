# diffdevil App

## Meaning

This application is the signed-in diffdevil App: the analytical experience of the managed GitHub App, served at `app.diffdevil.dev`. It renders the ratified Overview, Pull requests, History, Files, PR detail and File detail destinations from the managed App's own D1 state and the signed-in person's current GitHub reach. It is not the webhook runtime (that is `apps/github-app/`), not the public website, and not a claim that the hosted App is deployed, that any plan can be bought, or that named file history exists yet.

## What it is made of

- **Astro, server-rendered on Cloudflare Workers** through `@astrojs/cloudflare`. Every view is a URL (scope, period, filters, sort, selected bucket), so a view can be shared, reloaded and re-authorised when opened.
- **The website's own header, tokens, styles and fonts**, imported from `apps/website/src/`. The header is prerendered once at build (`src/pages/fragments/header.astro`) and injected into every page, so the shell is the same component rather than a copy. The App adds `src/styles/app.css`: the shell, navigation, panel and seat grammar the ratified design settled.
- **The managed App's authorization service** (`apps/github-app/authorization.mjs`) with a GitHub App user-authorization provider (`src/lib/github-user-provider.mjs`), an AES-GCM seal for stored grants (`src/lib/protector.mjs`) and opaque browser sessions in the same D1 database.
- **Read-only D1 access** (`src/lib/app-store.mjs`): repository standing and the opted-in, pathless numeric history, served only while a repository's history consent is current.
- **A measurement model** (`src/lib/derive.mjs`, `src/lib/intervals.mjs`) that keeps four facts separate: what was measured (Changed, raw churn, evidence), what policy judged (band), what the App wanted (desired labels) and what GitHub shows (observed effects). Statistics are interval-aware: a median over bounded members reads `a–b` or `≥ a`, never a silently exact number, and an empty population is `n/a`, never `0`.
- **Transient lifecycle facts from GitHub** (`src/lib/viewer.mjs`): titles, states and opened/merged/closed times come from the signed-in person's own GitHub reads of the 100 most recently updated pull requests per repository in scope, per request, cached for a minute in the isolate and never retained. When that read is unavailable (rate limit, scope too wide, provider refusal), pages say so and fall back to analysed-pull-request populations by analysis time.
- **Provisional charts** (`src/lib/charts.mjs`): the ratified encodings (mosaic bar: height is Changed, colour area is composition, outline is raw churn, hatched cap for the unresolved part of bounded values; size lanes with hollow dots; bounded numbers as ranges) rendered as replaceable figures marked `data-chart-provisional`, each beside its accessible table or list. The chart-and-cloud system is a separate co-design; nothing here is accepted chart design.

## Routes

| Route | Content |
| --- | --- |
| `/sign-in`, `/auth/start`, `/auth/callback`, `/auth/session` (POST), `/auth/logout` (POST) | GitHub sign-in: browser-bound state, server-side code exchange, one-time artifact exchanged for a session by a same-origin POST, sign-out. |
| `/` | Overview: period hero with tiles, then the even grid (where change lands or change volume, pull-request activity, size mix, lifecycle, repositories or labels on GitHub, flow, high-turnover files or time to merge or analysed heads). |
| `/prs` | Pull requests: flow, lifecycle, size mix, time to merge by size, analysed heads, then the filterable, searchable, sortable list. |
| `/history` | History: change volume as the mosaic by calendar-aligned buckets, a selected bucket broken into its pull requests, Pro growth and concentration standings or the Free lanes and period comparison. |
| `/files` | Files: the honest standing of file history (Pro) or the bounded See Pro state (Free). |
| `/pr/:owner/:repo/:number` | PR detail: result, policy-and-effect lanes, Pro context standings, pathless file rows, development across analysed heads, freshness against GitHub's current head. |
| `/file/:owner/:repo/*path` | File detail: the route and its authorisation; its history standing. |
| `/health/ping` | Liveness. |

Query parameters: `s` (scope: `all`, `@namespace` or `owner/repo`), `per` (`7d`, `30d`, `90d`, `1y`), `f` (state), `band`, `ev` (measurement), `sort`, `q`, `page`, `w` (selected bucket), `rm` (repositories metric). Anything malformed falls back to its default.

## What is real today, and what is not yet

The App reads what the managed App retains now: repository standing and pathless per-analysis numeric history (Changed, raw churn, decomposition, evidence, file counts, label effect outcomes, recorded bands on newer analyses). It derives populations, medians, size mix, flow, change volume, development across heads and label standings from that. Lifecycle facts are GitHub's, transiently, as described above.

It does not invent what is not retained. Named files, file sizes, turnover-v1, co-change, hotspots and the cloud need the named-file data candidate and the privacy contract that admits paths; the Pro panels for them render a bounded unavailable standing that says so. No subscription source is connected, so every namespace reads as Free unless a loopback fixture says otherwise; Pro and Business presentation is exercised through that fixture. Manage/settings, plans, checkout, the public read-only view and the operator view are not designed and have no routes here. The App is dark-only by decision; its light theme is not designed.

## Build, run and qualify locally

From the repository root:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run app:build        # engine, website provenance, icon projection, Astro build → artifacts/app/dist
npm run test:app         # derivations, URL state, and the sign-in/viewer/store journey against local D1
npm run qa:app           # seeds local D1, serves a GitHub double, runs the built Worker in workerd, drives Chromium
npm run check:app        # the build plus a Wrangler dry-run of the generated Worker configuration
npm run app:dev          # Astro dev with local bindings (needs apps/app/.dev.vars, see below)
```

`qa:app` writes screenshots and `results.json` to `artifacts/app/qa/`. It exercises sign-in, all six destinations in a Pro and a Free entitlement, scope and period persistence, filters, bucket selection, drill-down, keyboard reach, the inert theme control, sign-out, header geometry, private no-store headers, console cleanliness and the absence of external requests. It proves local behaviour against the fixture in `qa/fixture.mjs`, built with the real engine; it proves no deployment, no live GitHub and no real data.

Local variables live in `apps/app/.dev.vars` (ignored): `APP_ORIGIN` (an https origin, or an http loopback origin), `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, `APP_SEAL_KEY` (at least 16 characters), optional `APP_SESSION_DAYS` (default 30), optional `GITHUB_API_BASE` / `GITHUB_OAUTH_BASE` (defaults are GitHub; the sign-in destination is always github.com), and `APP_ENTITLEMENT_FIXTURE` (a JSON map of namespace to plan, honoured only on a loopback origin).

## Operator posture

The Worker needs the managed App's D1 database (`APP_DB`, migrations `0001`–`0007` applied), the GitHub App's OAuth client ID and secret as Worker vars/secrets, a seal key secret, and `app.diffdevil.dev` pointing at it. The webhook Worker keeps `/webhooks/github` and its health routes; which Worker owns the hostname, and whether the two are later merged into one Worker, is a deployment decision outside this source. Building creates no Worker, route, domain, database or deployment; `wrangler.jsonc` carries a non-operational D1 placeholder and no secret.

Per page view the App performs one GitHub token check, one installations read, one repositories read per installation, one organisation-membership read per organisation, and one recent-pull-requests read per repository in scope (scopes of up to 25 repositories), each cached for a minute per isolate. The retained lifecycle source in the data candidate removes the per-repository reads.

## Boundaries kept

- Reads are authorised per request from the person's current GitHub reach; possession of a link is not access, and a repository outside the authorised set is refused, not rendered.
- History is served only while a repository's consent is current and no tombstone blocks it. Nothing in the numeric rows names a file, a person or a path, and the App does not pretend otherwise.
- Entitlement follows the namespace; a viewer's own namespaces follow the viewer's plan; across all repositories, premium aggregates follow the viewer's plan.
- Every protected response carries `Cache-Control: private, no-store`, a `default-src 'none'` content-security policy and the other browser security headers.
- The App performs no provider write, no import, no history enablement, no admission change, no billing effect.
