# diffdevil public website

## Meaning

This is the AGPL-3.0-only application source for diffdevil's public website: the homepage, the complete read-only playground, the examples catalogue, the manual rendered from the repository's own Markdown, the public browser-extension and GitHub App pages, and the legal/privacy routes. It is built with Astro static output and Starlight, with one lazy React island for the playground. It computes nothing itself: every number on every surface comes from the shared engine in `dist/lib`, at build time on static pages and in the browser inside the playground. The design authority is the repository's [design reference](../../design/README.md); the site applies Surface Grammar v1 and does not re-derive it.

The website is built and qualified locally. Nothing here deploys, previews remotely, routes, or exposes it; publication is a separate decision with its own Work.

## Build, run, qualify

From the repository root:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run website:build        # engine build → docs collection → astro build → artifacts/website/dist
npm run website:preview      # serve the built output locally
npm run website:dev          # engine build → docs collection → astro dev server
npm run website:check        # astro type check
npm run test:website         # data-level tests (also discovered by npm test)
npm run qa:website           # headless Chromium qualification of the built output
```

`npm run verify` includes `check:website`, so the site must build for ordinary verification to pass. The browser qualification (`qa:website`) needs Playwright's Chromium in the user cache (`npx playwright install chromium`); it serves the build, runs the real playground application server against the in-memory fake GitHub fixture, and writes results and screenshots to `artifacts/website/qa/`.

Configuration is environment at build time, never a decided domain:

| Variable | Meaning | Default |
| --- | --- | --- |
| `DIFFDEVIL_SITE_ORIGIN` | Public origin used for canonical URLs, the Open Graph image and every absolute URL copied to an agent | `https://diffdevil.invalid` (placeholder; canonical links are omitted) |
| `PUBLIC_PLAYGROUND_API` | Origin of the playground API Worker the playground calls for live public pull requests | `http://127.0.0.1:4173` (the local `npm run playground` server) |
| `PUBLIC_APP_INSTALL_URL` | Canonical GitHub App installation route. Every "Install the App" / "Install on GitHub" links here directly | unset |
| `PUBLIC_CHROME_WEB_STORE_URL` | Canonical Chrome Web Store listing of diffdevil for GitHub. Every "Add to Chrome" links here directly | unset |
| `PUBLIC_DASHBOARD_URL` | The authenticated application. When set, **Dashboard** takes the header's one trailing slot from the npm copy command | unset |
| `PUBLIC_DISCORD_URL`, `PUBLIC_BLUESKY_URL` | The shared Wolfsblvt Works Discord server and Bluesky account (Community panel and footer) | unset |
| `PUBLIC_SPONSOR_URL` | Funding destination of the `#support` Sponsor action | unset |

The last five rows are live destinations, not design decisions. The site is built as though they exist: while one is unset its control renders complete but without an `href` (`aria-disabled`), through `ActionLink.astro`, so nothing points at an invented URL and nothing says "coming soon". Set the variable and the same control is live. "Action wording goes to the action, product wording goes to the product page": no install action is ever routed through `/extension/` or `/app/`.

## One shell, one page grid

Every route, the manual included, renders the same header (`src/components/Header.astro`) on the same grid (`.wrap` in `src/styles/global.css`: `--content-max` wide, `--page-x` gutters, centred). The lockup therefore sits at one coordinate everywhere. A page names its top-level section with a plain label beside the lockup (`Docs`, `Examples`, `GitHub App`, `Extension`); that label sits outside the home link and is never a link. Sections put their blocks on that grid; none of them chooses its own width.

The header applies the Wolfsblvt Works header grammar: **identity → search → navigation → one divider → utilities → one trailing action**.

```text
[diffdevil  Examples] [Search  Ctrl K] Docs Playground Examples Install⌄ │ [GitHub] [Community⌄] [Theme] [npm copy | Dashboard]
```

- **Geometry:** 62px shell; 190 × 30 search launcher (a button, not a field) that compacts to 156 and then to a 30 × 30 icon; 13px navigation with 18px gaps; one 1 × 18 divider; 28 × 28 direct GitHub source icon; 42 × 28 Community trigger (`social-links` = Lucide `waypoints` + chevron); 64 × 28 theme control (narrower than the shared 72px default, by owner direction: two 24px sides and a small 12px middle that holds only the dot); one 30px trailing action. The current item takes one emphasis step (stronger, semibold text) and every label reserves its semibold width, so the cluster never shifts between routes. The npm command confirms a copy in place at exactly its resting width.
- **Install⌄, Community⌄, Menu⌄** are disclosures of ordinary links (`button` + `aria-expanded`/`aria-controls`), not ARIA menus: click, Enter or Space toggles; Tab walks the rows; Escape closes and refocuses the trigger; an outside click closes without stealing focus; one panel is open at a time; a panel shifts to stay inside the viewport (`lib/client.ts`). Install is a menu of the site's own pages and nothing else: browser extension first, then the GitHub App, then the CLI and Actions, each one whole-row link with a title and a short description. Direct install actions (`Add to Chrome`, `Install on GitHub`) are deliberately not in it; they live on those pages and on the homepage, as plain buttons without a link glyph.
- **Responsive, by content budget:** search compacts first; then the *whole primary navigation* collapses into `Menu⌄` in the navigation's own place, with the same destinations inside. GitHub, Community and Theme stay visible at every width and never move into the menu; the npm convenience command leaves with the navigation (Install, the hero and the manual keep the route). At the narrowest widths the redundant section label yields before any utility does.
- **Destinations** come from one product-owned list, `src/data/destinations.ts`, rendered by the Community panel (Discord, Bluesky, Wolfsblvt Works; GitHub is already the direct icon) and by the footer (icons only, never collapsed, complete: Works, Discord, Bluesky, GitHub).

### Theme control

`ThemeControl.astro` is one native button over three preferences and four traversal positions: **Dark → Auto → Light → Auto → Dark → …** The whole control is one target; there are no per-side hit zones and no direct Light → Dark wrap. One capsule previews the real appearance (`#111318` when dark, `#F5F6F8` when light) and, in Automatic, stretches to take the centre dot inside it. ArrowRight/ArrowLeft step forwards/backwards while it is focused; its tooltip and `aria-description` state the current preference and the next click.

`lib/theme-script.mjs` is the single before-paint rule, shared verbatim by `Base.astro` and the manual's Starlight head: `diffdevil.theme` holds `dark | auto | light`, `diffdevil.theme.next` the manual side the bounce is heading for, and `<html data-theme>` is always the resolved appearance. With nothing valid stored the theme is **explicit Dark**. Migration: a legacy `system` value becomes `auto`; an Auto without a stored bounce side gets the opposite of its resolved appearance, once; earlier builds removed the key for Auto, which cannot be told from "never chosen", so an absent key takes the dark-first default. Auto follows the system live; explicit choices ignore it. The preference is origin-local storage; carrying it across product hosts belongs to the documentation-host work, not to this control.

The page never scrolls sideways. Grid tracks are `minmax(0, …)`, code and prompts wrap, and only a deliberately bounded inner block (the playground's files table on a narrow screen, a long report document, a long presenter pane) may scroll. `qa/run.mjs` measures page-level overflow on every route at 1280, 1024, 768, 640 (the layout of a 1280 window at 200 % zoom) and 390.

Section anchors: the literal `#id` eyebrow carries the `id`, is the scroll target under the sticky header, and is a link to itself; the magenta `#` after the title is the same link for pointer users, and hovering or focusing either lights both (`SectionHead.astro`). Cross-links into the manual always close a section (`SectionLinks.astro`); the hero is the one exception.

The manual keeps that shell. `src/components/docs/Header.astro` renders the site header inside Starlight's fixed header; `src/styles/starlight.css` puts Starlight's frame on the page grid: the navigation rail starts under the lockup, everything left of its divider (header included) is the raised ground, the divider runs through the header, and the rail scrolls on its own beneath the fixed header. Article typography in that file is provisional until the docs-page design lands.

## Search

`src/components/Search.astro` and `src/lib/search.ts` are the one search on every route. The build's Pagefind index covers the whole output: site pages opt in with `data-pagefind-body` on `<main>` (from `Base.astro`), manual pages through Starlight. Each hit is marked **Docs** or **Site** from its URL. Legal routes (`/privacy/`, `/impressum/`) pass `noindex` to `Base.astro`: they stay public and fetchable, carry `noindex, nosnippet`, and are left out of the index. The index exists only in built output; `astro dev` shows an honest "not available in this preview" instead.

## Open design seams, and the slots that wait for them

Two visual decisions are still with the owner. The site builds their structure and interfaces and does not invent their look:

- **Icons.** Components never embed a drawing; they ask `Icon.astro` for a meaning (`social-links`, `discord`, `changed`, …). `src/data/icons.ts` resolves it at build time, locally and with no runtime icon request, along the three routes of the Works icon standard: UI glyphs from Lucide (`@iconify-json/lucide`), brand marks from Simple Icons (`@iconify-json/simple-icons`), and the ratified Works-authored diffdevil family (`diffdevil/brand`, `changed`, `raw-churn`, `bands`) vendored from `Wolfsblvt/wolfsblvt-icons@8596b6bc`. `@wolfsblvt/icons` is the intended consumer route and is not published yet; adopting it replaces that one file and `Icon.astro`, no caller. Bluesky and Chrome are rendered from Simple Icons like GitHub and Discord; their curated admission metadata in the shared catalogue is an open join there. The maker's website uses Lucide `globe` until the reserved `wolfsblvt/works` glyph exists.
- **Support / sponsor visual.** (still an open owner design seam) `home/Support.astro` fixes the semantics, layout and responsive behaviour with ordinary tokens and ordinary buttons. The final design plugs into `--support-ground` (the banner ground), `--support-art` on `[data-support-art]` (the right-hand art; empty until set), and the `sponsor` / `star` icon slots.

`/impressum/` is the site's own legal-notice route and the footer links to it. Its notice text is owed from the Wolfsblvt Works legal-page standard; until this repository can consume that standard the page names the operator and points at the Company legal notice rather than improvising legal copy.

## The browser extension on the site

diffdevil for GitHub is one of the three operating routes (run it yourself · bring Changed into GitHub · let it run for you) and the easiest one to adopt, so it is the hero's primary action, route card 02, the `#extension` section directly after `#measure`, the first Install entry and its own page, `/extension/`. The Playground is the trial surface, not a fourth route: it has no homepage card and is reached from the header, the hero and `#measure`.

`components/extension/Projection.astro` and `Scene.astro` render the extension's projection as semantic HTML and CSS in GitHub's own visual language (no screenshot, iframe, live fetch or script; the site's magenta stays out of it; GitHub's raw diffstat stays present, de-emphasised). Every figure comes from `extensionSpecimen()` in `lib/specimens.ts`: `docs/examples/reports/exact.json` under `full.yml`, the same 178 / +45 −18 ~115 / raw +160 −133 / size/M that `#measure` teaches. A file's virtual band is the engine's own answer for that file under the same policy. The pull request's title and branch are scene dressing.

`/extension/` is the trust and detail surface. Its statements about what the extension reads, stores and never does follow the extension's own privacy notice, manifest and listing copy (`storage`; content script on github.com; host access to api.github.com; Incognito not allowed; local analysis; raw patches not persisted; native label handoff only); when that source changes, the page follows it. The two settings images under `src/assets/extension/` are the extension's real rendered settings UI from its store kit, cropped. The extension's manual pages are optional entries in `docs-manifest.mjs`; links to them turn live when that source is in the repository.

## Terminal specimens are executed, not typed

Commands shown on narrative surfaces (`#query`, the `#agents` comparison) are run at build time by the real CLI through `src/lib/cli-specimen.ts` against `docs/examples/reports/exact.json` under `docs/examples/policies/full.yml`, and the page prints that stdout and exit code. A command the CLI refuses fails the build. The `#policy` YAML and plan panels are projections of the same real policy and of the plan the engine creates for that report; only the third panel (what an explicit `apply` reports) is copy-deck illustration, because a static page cannot apply anything. Presenter output is never re-rendered by the website: when the shared human and agent presenters change, these surfaces change with them.

## Layout

| Path | Owns |
| --- | --- |
| `astro.config.mjs` | Astro + Starlight configuration, engine aliases, the browser shims for the engine's two Node imports |
| `src/pages/` | `/`, `/playground/`, `/examples/`, `/extension/`, `/app/`, `/privacy/`, `/impressum/`, `404`, the per-example JSON documents, and the raw `/skill/*` and `/setup/*.md` routes |
| `src/components/` | The shared shell: `Header`, `InstallEntries`, `DestinationRows`, `Footer`, `Search`, `ThemeControl`, `ActionLink` (links to configured live destinations), `Icon`, `SectionHead`, `SectionLinks`, `CodeBlock`, `AppPanel` (the one branded App panel used by both the homepage and `/app/`), and `extension/` (the shared projection and pull-request scene) |
| `src/components/home/` | Homepage sections; numbers computed at build through `src/lib/engine-node.ts`, `src/lib/specimens.ts` and `src/lib/cli-specimen.ts` |
| `src/islands/playground/` | The React island: URL state, browser engine wrapper, rail, controls, CodeMirror policy editor, result column with four views, the small JSON/line tokenizer for read-only data (`highlight.tsx`), export dialog |
| `src/data/` | The keyed copy deck (`copy.ts`), site facts and configured destinations (`site.ts`), the social destination list (`destinations.ts`) and the icon registry (`icons.ts`) |
| `src/styles/` | Canonical tokens import with the documented light-cascade correction, self-hosted fonts, surface grammar, playground and Starlight mappings |
| `src/lib/` | Build-time engine access and executed CLI specimens, example catalogue reader, agent-source reader, Shiki theme, the pre-paint theme script, search, shared client behaviour |
| `src/shims/` | `node:crypto` (SHA-256) and `node:util` stand-ins so the engine runs in the browser unchanged |
| `../docs/examples/catalogue/` | The shared real-PR lesson catalogue: source identities, policies, snapshots and guide. `/examples/` and the Playground read this one source; fixtures remain engine-test inputs only |
| `docs-manifest.mjs` | The manual's reader-facing selection; `tools/website-docs.mjs` generates the ignored Starlight collection from it |
| `public/` | Static files. The derived favicons, touch icon, web-manifest and GitHub App logos, Open Graph image and manifest are **generated, ignored output** of `tools/website-assets.mjs` from the canonical identity SVGs; the build regenerates them and Astro copies them into the site |
| `qa/run.mjs` | Browser qualification |
| `website.test.mjs` | Data-level tests |

## Derived assets

The identity SVGs under `design/assets/identity/` are the only committed source. `npm run website:assets` renders every icon and raster the site needs into `apps/website/public/` as ignored files; `website:build`, `website:dev` and `check:website` run it first. The generator frames one master mark for several consumers (`FRAMES` in `tools/website-assets.mjs`): the web-manifest icon and the GitHub App badge are the same mark with different outer pads, and each frame declares the canvas occupancy its visible mark must land in. The generator measures the rendered bounds and refuses to emit a frame outside its range (`--report` prints the measurements), so adjusting a badge is one number and one exported candidate to judge, never a hand crop. No raster is committed; the GitHub App registration is the one consumer that cannot receive build output, and it takes the generated `github-app-logo-512.png` by explicit upload.

## Sources the site serves but does not author

The persistent Agent Skill (canonical home `skills/diffdevil/SKILL.md`, served at `/skill/SKILL.md` with its front-matter `metadata.version` at `/skill/version`) and the one-off setup instructions (`docs/setup/{cli,actions,app,everything}.md`, served raw at `/setup/*.md` and rendered in the manual) are repository-owned product content authored separately. The build reports which of them are present; an absent source emits no route and no placeholder. The homepage Agents chapter, its copy prompts and the version chip read those sources; the version is never hard-coded.

## Licence

Application code and assets under `apps/website/` are **GNU AGPL-3.0-only**. They consume the reusable diffdevil engine under its MIT terms. The identity assets under `design/assets/identity/` and the derived rasters in `public/` are reserved brand material, not covered by the software licences. IBM Plex is used under the SIL Open Font License.
