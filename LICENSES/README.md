# diffdevil licence boundaries

## Meaning

This is the authoritative component map for the two software licences in this repository. It grants rights to the named software surfaces only; placement beside a licensed component does not silently license unrelated content.

## Reusable software — MIT

The portable diff engine, public TypeScript API and npm package, CLI, GitHub Action and its reusable entry points, schemas, adapters, presets, and comparable integration code are offered under [MIT](MIT.txt). This includes the software under `src/diffdevil/`, the Action implementation and metadata under `actions/`, and software build/qualification tools under `tools/`. The npm package's SPDX metadata is `MIT`. Keep the MIT copyright and permission notice in copies or substantial portions of this software.

## Application and hosted-service software — AGPL-3.0-only

Website and interactive demo application code, hosted runtime, GitHub App backend, hosted configuration, orchestration and management UI, and comparable service-side product code are selected for [GNU AGPL-3.0-only](AGPL-3.0-only.txt). These application/service surfaces may live in this same repository. The first application surface is `apps/playground/`: its local server, browser code, styles, and page assets explicitly carry `AGPL-3.0-only`. MIT-covered engine code incorporated into an AGPL-covered application keeps its MIT notices. Future application paths must name their licence just as explicitly rather than inheriting it from a neighboring directory.

## Content and third parties

Documentation prose, branding, names, logos, artwork, screenshots and other non-software assets have **no selected public content licence** under this decision. The runnable shell scripts under `docs/examples/scripts/` are MIT software and carry SPDX headers. Other `docs/` examples are configuration/data or prose, with no selected public content licence; nearby prose or imagery does not inherit MIT or AGPL. Do not redistribute non-software content under an assumed software licence. A separate content-policy decision is still needed.

Vendored runtime dependencies in `actions/runtime/node_modules/` retain their own licences and notices, recorded in `actions/runtime/MANIFEST.json`; diffdevil's MIT notice does not replace them. Historical evidence in `docs/reference/` describes its original subject and date, not a newly licensed software component.
