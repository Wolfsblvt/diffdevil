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

## Layout

| Path | Owns |
| --- | --- |
| `astro.config.mjs` | Astro + Starlight configuration, engine aliases, the browser shims for the engine's two Node imports |
| `src/pages/` | `/`, `/playground/`, `/examples/`, `/app/`, `/privacy/`, `404`, the per-example JSON documents, and the raw `/skill/*` and `/setup/*.md` routes |
| `src/components/home/` | Homepage sections; numbers computed at build through `src/lib/engine-node.ts` and `src/lib/specimens.ts` |
| `src/islands/playground/` | The React island: URL state, browser engine wrapper, rail, controls, CodeMirror policy editor, result column with four views, export dialog |
| `src/data/` | The keyed copy deck (`copy.ts`) and site facts (`site.ts`) |
| `src/styles/` | Canonical tokens import with the documented light-cascade correction, self-hosted fonts, surface grammar, playground and Starlight mappings |
| `src/lib/` | Build-time engine access, example catalogue reader, agent-source reader, Shiki theme, shared client behaviour |
| `src/shims/` | `node:crypto` (SHA-256) and `node:util` stand-ins so the engine runs in the browser unchanged |
| `catalogue/` | Frozen fixture list and captured real-PR snapshots ([contract](catalogue/README.md)) |
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
