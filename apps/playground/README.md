# diffdevil playground

## Meaning

This is the first executable application surface for diffdevil: a local, browser-visible front door that analyzes one public GitHub pull request through the existing engine and links into the repository-owned documentation. It proves the playground boundary without creating a second measurement implementation, provider-write route, account system, hosted control plane, or shadow documentation source.

## Run locally

From the repository root:

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run playground
```

Open `http://127.0.0.1:4173`. Override the loopback host or port with `DIFFDEVIL_PLAYGROUND_HOST` and `DIFFDEVIL_PLAYGROUND_PORT` when deliberately needed.

The first tranche:

- accepts canonical public `https://github.com/<owner>/<repository>/pull/<number>` URLs;
- uses GitHub's unauthenticated read API, so private repositories are outside this route;
- calls the production `GitHubClient` and `analyzeGitHub` engine;
- exposes replacement-aware and raw measurements, evidence standing, and a compact file projection;
- publishes a versioned success/error envelope defined by [`contracts/response-v1.schema.json`](contracts/response-v1.schema.json);
- performs no provider writes and stores no analysis history; and
- links to maintained repository documentation rather than copying it into a second knowledge base.

The response schema is compiled in the application test against the reusable report/value schemas. Generic 404/405 and analysis errors use the same public envelope; unexpected internal detail is not returned. A failed static-asset read is evicted so a transient filesystem failure does not poison the process cache.

GitHub's unauthenticated rate limits are a real operating boundary. A hosted service may later add deliberate authentication, caching, abuse controls, and persistence under its own accepted application design; this local tranche does not smuggle those systems in early.

## Cloudflare Workers source route

`wrangler.jsonc` defines the hosted adapter named `diffdevil-playground`. It packages
the same application module and the `public/` asset directory in one Worker. Static
paths stay asset-first; only `/api/*` and `/health/*` invoke Worker code first.
`public/_headers` applies the browser security headers to directly served assets,
while the shared application handler applies them to Worker responses.

From a restored checkout, run the local Worker runtime with:

```sh
npm run playground:worker
```

Use the source-only bundle check before a provider operation:

```sh
npm run verify
```

It validates the Worker bundle and asset binding with `wrangler deploy --dry-run`.
It creates no Cloudflare resource, version, route, domain, or deployment.

The selected production name is `diffdevil-playground`, whose first public route is
`https://diffdevil-playground.wolfsblvt.workers.dev`. This source does not claim that
the route exists. An authorized operator must first reconcile Cloudflare's current
Worker state: Cloudflare documents that `wrangler versions upload` cannot create a
first Worker version when the named Worker does not yet exist. Do not substitute an
opaque production `wrangler deploy` for that missing provider-creation decision.

Once the Worker exists and the live-effect boundary is authorized, upload a version
without promoting traffic, attaching the accepted commit SHA to both message and tag:

```sh
wrangler versions upload --preview-alias candidate --message "diffdevil playground <sha>" --tag "<sha>"
```

Read back the returned version ID and preview URL, then exercise the static front
door, `/health/ping`, public-URL refusal, and one real public-PR response against the
versioned response schema. Only after that readback may the operator deploy that exact
version at 100%:

```sh
wrangler versions deploy <version-id>@100% --message "Promote diffdevil playground <sha>"
```

Read back the Worker, deployment, Workers.dev route and the same public journey. For
later changes, keep the preceding accepted version ID and use `wrangler versions
deploy <previous-version-id>@100%` to roll back. This first Worker has no preceding
production version: if production exposure succeeds but its immediate readback fails,
disable only its Workers.dev route and preserve the uploaded version and evidence for
repair; do not delete the Worker or blindly upload another version.

## Licence

Application code and assets under `apps/playground/` are licensed under **GNU AGPL-3.0-only**. They consume the reusable diffdevil engine under its MIT terms. Documentation and brand rights remain governed by the repository licence map rather than inheriting the application licence by proximity.
