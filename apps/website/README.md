# diffdevil public website

## Meaning

This is the AGPL-3.0-only application source for diffdevil's public website: the homepage, the complete read-only playground, the examples catalogue, the manual rendered from the repository's own Markdown, the public GitHub App page, and the legal/privacy routes. It is built with Astro static output and Starlight, with one lazy React island for the playground. It computes nothing itself: every number on every surface comes from the shared engine in `dist/lib`, at build time on static pages and in the browser inside the playground. The design authority is the repository's [design reference](../../design/README.md); the site applies Surface Grammar v1 and does not re-derive it.

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
| `PUBLIC_APP_INSTALL_URL` | GitHub App installation URL | unset: the install action states that the hosted App is not yet open |
| `PUBLIC_DISCORD_URL` | Community invitation shown by the header and footer social slots | unset: the Discord slot is shown as unavailable, not as a link |
| `PUBLIC_SPONSOR_URL` | Funding destination of the `#support` Sponsor action | unset: the action is shown as unavailable |

## One shell, one page grid

Every route, the manual included, renders the same header (`src/components/Header.astro`) on the same grid (`.wrap` in `src/styles/global.css`: `--content-max` wide, `--page-x` gutters, centred). The lockup therefore sits at one coordinate everywhere, and the right-aligned cluster is always search, navigation, socials, theme, then the npm command right-most. A page names its surface with a plain label beside the lockup; that label is never a link and the navigation never changes weight between routes, so nothing moves when you change page. Sections put their blocks on that grid; none of them chooses its own width.

The page never scrolls sideways. Grid tracks are `minmax(0, …)`, code and prompts wrap, and only a deliberately bounded inner block (the playground's files table on a narrow screen, a long report document, a long presenter pane) may scroll. `qa/run.mjs` measures page-level overflow on every route at 1280, 1024, 768, 640 (the layout of a 1280 window at 200 % zoom) and 390.

Section anchors: the literal `#id` eyebrow carries the `id`, is the scroll target under the sticky header, and is a link to itself; the magenta `#` after the title is the same link for pointer users, and hovering or focusing either lights both (`SectionHead.astro`). Cross-links into the manual always close a section (`SectionLinks.astro`); the hero is the one exception.

The manual keeps that shell. `src/components/docs/Header.astro` renders the site header inside Starlight's fixed header; `src/styles/starlight.css` puts Starlight's frame on the page grid: the navigation rail starts under the lockup, everything left of its divider (header included) is the raised ground, the divider runs through the header, and the rail scrolls on its own beneath the fixed header. Article typography in that file is provisional until the docs-page design lands.

## Search

`src/components/Search.astro` and `src/lib/search.ts` are the one search on every route. The build's Pagefind index covers the whole output: site pages opt in with `data-pagefind-body` on `<main>` (from `Base.astro`), manual pages through Starlight. Each hit is marked **Docs** or **Site** from its URL. Legal routes (`/privacy/`, `/impressum/`) pass `noindex` to `Base.astro`: they stay public and fetchable, carry `noindex, nosnippet`, and are left out of the index. The index exists only in built output; `astro dev` shows an honest "not available in this preview" instead.

## Open design seams, and the slots that wait for them

Two visual decisions are still with the owner. The site builds their structure and interfaces and does not invent their look:

- **Icon family.** Components never embed a drawing; they ask `Icon.astro` for a meaning (`discord`, `sponsor`, `theme-auto`, …). `src/data/icons.ts` is the single registry and currently holds neutral placeholder glyphs (only the GitHub mark is final; `discord` is deliberately a generic conversation glyph, not the Discord mark). Replacing the family is an edit to that file.
- **Support / sponsor visual.** `home/Support.astro` fixes the semantics, layout and responsive behaviour with ordinary tokens and ordinary buttons. The final design plugs into `--support-ground` (the banner ground), `--support-art` on `[data-support-art]` (the right-hand art; empty until set), and the `sponsor` / `star` icon slots.

`/impressum/` is the site's own legal-notice route and the footer links to it. Its notice text is owed from the Wolfsblvt Works legal-page standard; until this repository can consume that standard the page names the operator and points at the Company legal notice rather than improvising legal copy.

## Terminal specimens are executed, not typed

Commands shown on narrative surfaces (`#query`, the `#agents` comparison) are run at build time by the real CLI through `src/lib/cli-specimen.ts` against `docs/examples/reports/exact.json` under `docs/examples/policies/full.yml`, and the page prints that stdout and exit code. A command the CLI refuses fails the build. The `#policy` YAML and plan panels are projections of the same real policy and of the plan the engine creates for that report; only the third panel (what an explicit `apply` reports) is copy-deck illustration, because a static page cannot apply anything. Presenter output is never re-rendered by the website: when the shared human and agent presenters change, these surfaces change with them.

## Layout

| Path | Owns |
| --- | --- |
| `astro.config.mjs` | Astro + Starlight configuration, engine aliases, the browser shims for the engine's two Node imports |
| `src/pages/` | `/`, `/playground/`, `/examples/`, `/app/`, `/privacy/`, `/impressum/`, `404`, the per-example JSON documents, and the raw `/skill/*` and `/setup/*.md` routes |
| `src/components/` | The shared shell: `Header`, `Footer`, `Search`, `ThemeSwitch` (light · automatic · dark), `Socials`, `Icon`, `SectionHead`, `SectionLinks`, `CodeBlock`, and `AppPanel` (the one branded App panel used by both the homepage and `/app/`) |
| `src/components/home/` | Homepage sections; numbers computed at build through `src/lib/engine-node.ts`, `src/lib/specimens.ts` and `src/lib/cli-specimen.ts` |
| `src/islands/playground/` | The React island: URL state, browser engine wrapper, rail, controls, CodeMirror policy editor, result column with four views, the small JSON/line tokenizer for read-only data (`highlight.tsx`), export dialog |
| `src/data/` | The keyed copy deck (`copy.ts`), site facts (`site.ts`) and the icon registry (`icons.ts`) |
| `src/styles/` | Canonical tokens import with the documented light-cascade correction, self-hosted fonts, surface grammar, playground and Starlight mappings |
| `src/lib/` | Build-time engine access and executed CLI specimens, example catalogue reader, agent-source reader, Shiki theme, the pre-paint theme script, search, shared client behaviour |
| `src/shims/` | `node:crypto` (SHA-256) and `node:util` stand-ins so the engine runs in the browser unchanged |
| `catalogue/` | Frozen fixture list and captured real-PR snapshots ([contract](catalogue/README.md)). `/examples/` lists the real pull requests only; fixtures stay playground and regression inputs |
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
