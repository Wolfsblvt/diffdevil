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

## Licence

Application code and assets under `apps/playground/` are licensed under **GNU AGPL-3.0-only**. They consume the reusable diffdevil engine under its MIT terms. Documentation and brand rights remain governed by the repository licence map rather than inheriting the application licence by proximity.
