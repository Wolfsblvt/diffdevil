# diffdevil licence boundaries

## Meaning

This is the authoritative component map for software, documentation, examples, and reserved product assets in this repository and the npm package. Placement beside a licensed component does not silently license unrelated content.

## Reusable software — MIT

The portable diff engine, public TypeScript API and npm package, CLI, GitHub Action and its reusable entry points, schemas, adapters, presets, and comparable integration code are offered under [MIT](MIT.txt). This includes the software under `src/diffdevil/`, the Action implementation and metadata under `actions/`, and software build/qualification tools under `tools/`. The reusable software remains MIT. Because the npm artifact also includes CC BY documentation and reserved identifiers, its package metadata uses `SEE LICENSE IN LICENSE.md` and the top-level dispatch points here instead of describing the whole artifact as MIT. Keep the MIT copyright and permission notice in copies or substantial portions of this software.

## Application and hosted-service software — AGPL-3.0-only

Website and interactive demo application code, hosted runtime, GitHub App backend, hosted configuration, orchestration and management UI, and comparable service-side product code are selected for [GNU AGPL-3.0-only](AGPL-3.0-only.txt). These application/service surfaces may live in this same repository. The application surfaces are `apps/playground/` (local server, Worker adapter, browser code, styles, page assets), `apps/github-app/` (the managed-App runtime), `apps/website/` (the public website, its playground island, catalogue data and derived assets), `apps/browser-extension/` (Chrome application, settings, browser UI, tests and QA), and `apps/shared/` (presenters both applications use); each explicitly carries `AGPL-3.0-only`. MIT-covered engine code incorporated into an AGPL-covered application keeps its MIT notices. Future application paths must name their licence just as explicitly rather than inheriting it from a neighboring directory.

## Documentation and examples

Original documentation prose and reusable explanatory content, including the root `README.md`, guides, manuals, documentation maps, and original diffdevil-authored prose in `docs/reference/`, are licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/legalcode). Credit **Wolfsblvt Works**, identify changes, and link the licence when reusing that content. This licence does not grant rights in quoted, linked, or otherwise incorporated third-party material; those portions retain their original terms.

Runnable code, workflows, shell scripts, expression files, and policy/configuration examples under `docs/examples/` are MIT-licensed software or reusable integration specimens. The scripts already carry SPDX headers. Synthetic diff and report specimens are explanatory content under CC BY 4.0; they are not authenticated provider records.

The product name, slogans, logos, mascot, artwork, screenshots, and other brand or visual assets remain reserved. This includes the admitted production identity SVGs under `packages/design/assets/identity/`, the icons and rasters the website build derives from them (generated, not committed), the reference sheets, and `packages/design/tokens.css`; their appearance in CC-licensed prose does not grant trademark or asset rights. IBM Plex Sans and Mono are redistributed by the website build under the SIL Open Font License. `docs/branding.md` describes the textual brand; `packages/design/` owns the selected reusable visual reference. Deployment and GitHub App runtime standing are operational facts, not licence claims made by this component map.

The npm artifact includes MIT software, the CC BY 4.0 root README and documentation, reserved identifiers, the top-level `LICENSE.md` dispatch, and this component map. Its package metadata uses `SEE LICENSE IN LICENSE.md`; the Action runtime package remains MIT because that separate distribution contains reusable software and third-party notices rather than the mixed npm documentation surface.

## Third parties

Vendored runtime dependencies in `actions/runtime/node_modules/` retain their own licences and notices, recorded in `actions/runtime/MANIFEST.json`; diffdevil's MIT notice does not replace them. Historical evidence in `docs/reference/` describes its original subject and date, not a newly licensed software component.
### Website and extension icon material

The website resolves selected icon geometry at build time and embeds it in generated HTML. `@iconify-json/lucide@1.2.135` supplies Lucide UI geometry under the ISC licence, and `@iconify-json/simple-icons@1.2.97` supplies Simple Icons brand geometry under CC0-1.0. The dependency packages are build inputs rather than browser requests, but the embedded geometry keeps its original terms. The built website publishes this component map at `/docs/licences/` so the notices travel with that distribution.

The GitHub, Discord, Bluesky, Google Chrome, and GitHub Actions names and marks remain the property of their respective owners. Simple Icons' CC0 dedication covers the icon data; it does not waive trademark, patent, publicity, privacy, or other third-party rights. Inclusion describes the selected visual source and implies no sponsorship, affiliation, or endorsement. The full [CC0 1.0 legal code](https://creativecommons.org/publicdomain/zero/1.0/legalcode) remains the upstream terms for the selected Simple Icons data.

The four `diffdevil/*` product glyphs embedded in `apps/website/src/data/icons.ts` are copied unchanged from `Wolfsblvt/wolfsblvt-icons@8596b6bc2ba7c4b950963b7ec26cee1a26974439`. They are original Wolfsblvt Works material under the [MIT licence](MIT.txt); incorporating them into the AGPL-covered website does not replace that MIT notice. `@wolfsblvt/icons` is the intended package route but is not yet published, so this exact source and licence coordinate remains the current vendored boundary.

The browser extension likewise vendors the accepted centre-seam `diffdevil/brand` geometry unchanged at `apps/browser-extension/assets/diffdevil-brand.svg` from the same icon-system commit. Its recorded SHA-256 is `d33cf3b1a7a8ec52706da3311ac82e0500ec6c2eee8e35baeaaa2d5ef2b9b34e`; that SVG remains MIT software inside the AGPL-covered application. Full-colour wordmark and symbol identity assets remain reserved.

#### Lucide ISC notice

```text
ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
```

Some selected Lucide geometry is derived from Feather. The following notice accompanies those icons:

```text
The MIT License (MIT)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
