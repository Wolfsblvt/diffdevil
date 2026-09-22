# diffdevil playground

## Meaning

This is the first executable application surface for diffdevil: a public and locally runnable browser front door that analyzes one public GitHub pull request through the existing engine and links into the repository-owned documentation. It proves the playground boundary without creating a second measurement implementation, provider-write route, account system, hosted control plane, or shadow documentation source.

## Use the public playground

Open [`https://diffdevil-playground.wolfsblvt.workers.dev`](https://diffdevil-playground.wolfsblvt.workers.dev).
The hosted Worker runs the same application and response contract described below.
It remains unauthenticated and read-only: public pull requests only, no repository
effects, no analysis history, and no private credential supplied by the visitor.

GitHub's unauthenticated read quota is shared provider capacity rather than a
diffdevil entitlement. When GitHub refuses a read, the playground returns its
versioned `E_GITHUB_RATE_LIMIT` response with HTTP `429`; retry later rather than
treating that response as an analysis result.

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
- serves the complete engine report at `GET /api/report?url=` for browser-side policy replay (the public website playground re-evaluates edited policy locally against it; a pull request above the replay file ceiling is refused, not truncated) and the current head/base at `GET /api/head?url=` for snapshot freshness, both under [`contracts/replay-response-v1.schema.json`](contracts/replay-response-v1.schema.json), with `access-control-allow-origin: *` on the read-only JSON;
- performs no provider writes and stores no analysis history; and
- links to maintained repository documentation rather than copying it into a second knowledge base.

The response schema is compiled in the application test against the reusable report/value schemas. API and health 404/405 responses and analysis errors use the same public envelope; ordinary missing static assets retain their host's 404 semantics. Unexpected internal detail is not returned. A failed static-asset read is evicted so a transient filesystem failure does not poison the process cache.

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

The selected production name is `diffdevil-playground`, and its first public route
is live at `https://diffdevil-playground.wolfsblvt.workers.dev`. The initial resource
was created from accepted source `a2fb057` through the preview-before-production
procedure below. Later operators must still reconcile Cloudflare's current Worker
state before changing it. `wrangler versions upload` cannot create a missing first
Worker, so the first-resource path remains deliberately separate from ordinary
version uploads and recovery.

For a missing Worker, derive and inspect one temporary bootstrap config from the
accepted canonical config. It changes only `workers_dev` and `preview_urls` to
`false`; the Worker name, module, compatibility settings, and asset binding remain
identical. Use that temporary config for one attributable strict `wrangler deploy`
tagged and messaged with the accepted source SHA. This creates the initial internal
deployment without a Workers.dev route, preview URL, custom route, or domain. Read
back the Worker, deployment/version, and Worker-subdomain state before continuing;
both `enabled` and `previews_enabled` must be `false`. The bootstrap config is an
operator artifact, not a second committed configuration source.

Enable preview URLs only through the Worker-subdomain control, leaving the production
Workers.dev route disabled. Then upload the accepted source version without promoting
traffic, attaching the accepted commit SHA to both message and tag:

```sh
wrangler versions upload --preview-alias candidate --message "diffdevil playground <sha>" --tag "<sha>"
```

Read back the returned version ID and preview URL, then exercise the static front
door and both referenced assets, `/health/ping`, public-URL refusal, canonical API
failures, and one real public-PR response against the versioned response schema. Only
after that readback may the operator deploy that exact version at 100% while keeping
the production Workers.dev route disabled:

```sh
wrangler versions deploy <version-id>@100% --message "Promote diffdevil playground <sha>"
```

Read back the deployment/version identity, then enable the production Workers.dev
route and exercise the same journey at the canonical URL. For later changes, keep the
preceding accepted version ID and use `wrangler versions deploy
<previous-version-id>@100%` to roll back. This first Worker has no preceding
production version: if production exposure succeeds but its immediate readback fails,
disable only its Workers.dev route and preserve the uploaded version and evidence for
repair; do not delete the Worker or blindly upload another version.

## Licence

Application code and assets under `apps/playground/` are licensed under **GNU AGPL-3.0-only**. They consume the reusable diffdevil engine under its MIT terms. Documentation and brand rights remain governed by the repository licence map rather than inheriting the application licence by proximity.

## Public-service operating boundary

The configurable visitor journey is maintained in [Playground](../../docs/manual/use/playground.md). This component owns acquisition and operation, not a second visitor manual. A source build, local Worker, deployment and qualified live visitor journey remain separate observations.

Production admission must establish visitor and service-wide compute/upstream budgets, bounded requests and responses, understandable retry behavior, credential isolation and the actual configured website/API connection. Anonymous GitHub reads share the upstream allowance of the service's originating IP; compute capacity does not remove that constraint. No authentication, persistent visitor history or permanent CAPTCHA is implied by the open experience.

Do not introduce shared caching of contextual public PR data without explicit bounded expiry and public-visibility revalidation. Repository visibility can change after capture. Separate immutable numeric analysis from contextual data, and keep source text and PR prose out of permanent shared history. These are operator acceptance requirements, not a claim that this adapter already supplies a production cache, traffic gateway or every service-level control. The [data contract](../../docs/PRIVACY-AND-DATA.md#public-playground) remains authoritative.

Qualify both a retained example and a real public PR through the configured service, including malformed/private input, throttling, source movement, policy editing and supported exports. A measurement-only deployment does not qualify the complete website interaction. Publication and provider configuration require their separate operator grant.
