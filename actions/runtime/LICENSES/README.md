# diffdevil licence boundaries

## Meaning

This is the authoritative component map for software, documentation, examples, and reserved product assets in this repository and the npm package. Placement beside a licensed component does not silently license unrelated content.

## Reusable software — MIT

The portable diff engine, public TypeScript API and npm package, CLI, GitHub Action and its reusable entry points, schemas, adapters, presets, and comparable integration code are offered under [MIT](MIT.txt). This includes the software under `src/diffdevil/`, the Action implementation and metadata under `actions/`, and software build/qualification tools under `tools/`. The reusable software remains MIT. Because the npm artifact also includes CC BY documentation and reserved identifiers, its package metadata uses `SEE LICENSE IN LICENSE.md` and the top-level dispatch points here instead of describing the whole artifact as MIT. Keep the MIT copyright and permission notice in copies or substantial portions of this software.

## Application and hosted-service software — AGPL-3.0-only

Website and interactive demo application code, hosted runtime, GitHub App backend, hosted configuration, orchestration and management UI, and comparable service-side product code are selected for [GNU AGPL-3.0-only](AGPL-3.0-only.txt). These application/service surfaces may live in this same repository. The first application surface is `apps/playground/`: its local server, browser code, styles, and page assets explicitly carry `AGPL-3.0-only`. MIT-covered engine code incorporated into an AGPL-covered application keeps its MIT notices. Future application paths must name their licence just as explicitly rather than inheriting it from a neighboring directory.

## Documentation and examples

Original documentation prose and reusable explanatory content, including the root `README.md`, guides, manuals, documentation maps, and original diffdevil-authored prose in `docs/reference/`, are licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/legalcode). Credit **Wolfsblvt Works**, identify changes, and link the licence when reusing that content. This licence does not grant rights in quoted, linked, or otherwise incorporated third-party material; those portions retain their original terms.

Runnable code, workflows, shell scripts, expression files, and policy/configuration examples under `docs/examples/` are MIT-licensed software or reusable integration specimens. The scripts already carry SPDX headers. Synthetic diff and report specimens are explanatory content under CC BY 4.0; they are not authenticated provider records.

The product name, slogans, logos, mascot, artwork, screenshots, and other brand or visual assets remain reserved. Their appearance in CC-licensed prose does not grant trademark or asset rights. `docs/BRANDING.md` describes the textual brand; it is not a licence for the brand identifiers it describes. The local playground application is present in source; no hosted deployment or GitHub App runtime is claimed yet.

The npm artifact includes MIT software, the CC BY 4.0 root README and documentation, reserved identifiers, the top-level `LICENSE.md` dispatch, and this component map. Its package metadata uses `SEE LICENSE IN LICENSE.md`; the Action runtime package remains MIT because that separate distribution contains reusable software and third-party notices rather than the mixed npm documentation surface.

## Third parties

Vendored runtime dependencies in `actions/runtime/node_modules/` retain their own licences and notices, recorded in `actions/runtime/MANIFEST.json`; diffdevil's MIT notice does not replace them. Historical evidence in `docs/reference/` describes its original subject and date, not a newly licensed software component.
