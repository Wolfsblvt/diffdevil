# Website publication

## Meaning

This is the build and operator carrier for publishing the existing product site,
manual, FAQ and Lens Studio. It is publication preparation, not deployment
authority, a public App launch, or evidence that the selected Cloudflare resources
already exist. The accepted visual baseline remains in place. The separate App,
extension Store and package releases keep their own availability boundaries.

## Selected outputs and proposed hosting

Use two Cloudflare Pages **Direct Upload** projects with the generated advanced-mode
`_worker.js` handlers. This fits the existing emitted artifacts without a runtime
migration or a new deployment workflow. The concrete proposed names below require
the operating owner's current account readback and technical judgment before use;
they are not observed existing projects. Reuse a fitting existing project if one
already owns the host, and record its exact name in the publication card.

| Proposed project | Upload directory | Canonical host | Additional host |
| --- | --- | --- | --- |
| `diffdevil-site` | `artifacts/website/dist` | `diffdevil.dev` | `www.diffdevil.dev` |
| `diffdevil-docs` | `artifacts/manual/dist` | `docs.diffdevil.dev` | none |

Production branch is `main`. Direct Upload is deliberate: pushing a source branch
or opening a PR must not publish the site or expose a preview. Use the existing
locked Wrangler CLI through `node node_modules/wrangler/bin/wrangler.js`, with
`WRANGLER_SEND_METRICS=false`; no global installation is required. The existing
`tools/run-wrangler.mjs` accepts only Worker dev/deploy and is not a Pages wrapper.

The public API remains the independently operated
`https://diffdevil-playground.wolfsblvt.workers.dev`. No API deployment is performed
by this preparation, and its limits, credentials and host remain unchanged.
It needs an actual public-PR acquisition from the published site to establish
browser/API continuity; frozen lessons alone cannot prove that path.

**Observed pickup gap (2026-10-21):** an HTTPS request carrying
`Origin: https://diffdevil.dev` received 200 from `/health/ping`, but both
`/api/head?url=https://github.com/Wolfsblvt/diffdevil/pull/128` and `/api/report`
for the same public PR received 404 `E_NOT_FOUND`. None returned a CORS header.
Current source already implements both routes and wildcard CORS on its public
read-only JSON. The operating release therefore needs to pick up that existing
source before the website can supply live PR analysis. A green health probe is
insufficient. Do not downgrade the site to frozen examples to bypass this gap.

Provider mechanics were checked against Cloudflare's current
[Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/),
[Wrangler Pages commands](https://developers.cloudflare.com/workers/wrangler/commands/pages/),
[advanced mode](https://developers.cloudflare.com/pages/functions/advanced-mode/),
[custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
and [rollback](https://developers.cloudflare.com/pages/configuration/rollbacks/)
documentation on 2026-10-21. Current account inventory and live behavior require
their own readback.

## Build the exact candidate

1. Accept and integrate the source candidate under the repository's exact-head
   Verify requirement. Reconcile ordinary main drift before selecting the cut.
2. Use a clean checkout of that exact commit, Node 24 and the locked dependencies:
   `npm ci --ignore-scripts --no-audit --no-fund`.
3. Supply the private build-only `WOLFSBLVT_LEGAL_OPERATOR_B64` projection through
   the operator's mediated environment. Never print it, put it in a command argument,
   expose it as `PUBLIC_`, or commit generated legal HTML.
4. Run `npm run website:build:publication`. It invokes the ordinary joined build;
   it performs no upload, DNS, account or preview operation.
5. Keep both output trees together with `artifacts/website/publication.json`, the
   exact source SHA, root lockfile, manual consumer lockfile and source-package
   receipt. The receipt lists every output path, size and SHA-256. The operator
   checks those actual upload bytes again before upload. A later QA rebuild changes
   the output and requires rebuilding this publication pair.

The publication command explicitly selects:

| Input | Value or treatment |
| --- | --- |
| `DIFFDEVIL_SITE_ORIGIN` | `https://diffdevil.dev` |
| Manual canonical | `https://docs.diffdevil.dev` from the maintained manifest |
| `DIFFDEVIL_SOURCE_REF` | exact clean checkout HEAD, observed by the command |
| `DIFFDEVIL_EDIT_REF` | `main` |
| `PUBLIC_PLAYGROUND_API` | `https://diffdevil-playground.wolfsblvt.workers.dev` |
| `PUBLIC_APP_INSTALL_URL`, `PUBLIC_DASHBOARD_URL` | empty: hosted actions unavailable |
| `PUBLIC_CHROME_WEB_STORE_URL` | empty: Store installation unavailable |
| Optional Discord/Bluesky/Sponsor destinations | empty until separately accepted |
| Published release manifest | omitted: no guessed download assets |
| `DIFFDEVIL_DOCS_QA` | removed: no reading-qualification route |

Ordinary `website:build` remains a local/CI build, uses the obvious legal fixture
when no projection is supplied and retains the loopback API default. **Its output
is not the publication artifact.** The publication command rejects missing,
malformed, fixture or unprovisioned operator/contact data before building. Contact
standing is an operator assertion backed by real operating evidence, not something
the renderer verifies with an email or form request.

## Qualification before the upload pair is frozen

Use `npm run test:website`, `npm --prefix apps/manual test`,
`npm run qa:website`, `npm --prefix apps/manual run qa` and
`node apps/website/qa/faq.mjs` against the ordinary two-host build. The manual QA
command creates a deliberately isolated reading specimen and therefore must precede
the final publication rebuild. These suites exercise source/Edit links, redirected
fragments, keyboard/search/theme behavior, responsive reading, example replay,
unavailable actions and generated assets with a loopback GitHub double. The real
public API and provider routing remain separate evidence.

Verify the final emitted handlers locally with both canonical hosts and `www`.
Legal pages must carry `noindex, nosnippet` in metadata and `X-Robots-Tag`, omit
social metadata, and stay out of search and sitemaps. Both hosts emit `robots.txt`
and `sitemap.xml`; robots permits fetching legal pages so their exclusion is visible.

## Exact operating facts needed before publication

Katja/the authorized operating seat resolves and records:

- the actual Cloudflare account, project names/IDs, production branch, current
  deployment IDs and whether existing custom domains already serve anything;
- apex zone and existing `@`, `docs`, `www` records, their full prior settings and
  the exact intended DNS changes, preserving `app`, staging, mail and unrelated records;
- Pages custom-domain association for each hostname **before** directing DNS at it;
  apex use requires the matching Cloudflare zone; subdomain DNS targets the actual
  project `pages.dev` name returned by the provider, never a guessed address;
- active TLS for all three names, HTTPS behavior, existing redirect/cache/Access/WAF
  rules that could bypass or mask the generated handler, and public reachability;
- available plan and Pages Functions request/cost consequence. The handler executes
  for all routes; this is not assumed to be an unlimited free static-only workload;
- provisioned legal email and the effective additional direct-contact route, the
  approved production operator projection and applicable operator/legal disclosures;
- hosting/request-log retention and transfer facts for the privacy notice, and
  existing Search Console coverage/sitemap handoff for both Homes. A new docs
  hostname does not automatically require a new property.

These are a bounded operating readback, not work for the owner to reconstruct.
Missing provider access leaves these facts **UNOBSERVED**; a project name in this
document does not resolve them.

## Operator effects after explicit publication authorization

The finite publication card identifies the source, artifact hashes, actual account
and project IDs, prior deployment/DNS state, approved operator data and readback
owner. It names any first-time resource creation separately from content upload.
Once authorized, the operating seat:

1. Creates only missing accepted Direct Upload projects, using production branch
   `main`, or reuses the proven projects. Example creation commands, not performed
   by any build: `node node_modules/wrangler/bin/wrangler.js pages project create
   diffdevil-site --production-branch main` and the equivalent `diffdevil-docs`.
   The publication authorization also needs to name the independently observed
   Playground pickup: deploy the accepted existing API source through
   `node tools/run-wrangler.mjs deploy --config apps/playground/wrangler.jsonc`,
   preserving the current Worker target, binding/credential posture and limits.
   Record the prior Worker version first; qualify `/api/head`, `/api/report` and
   CORS from the public site origin before publishing the site. If this separate
   effect is not authorized, hold publication rather than imply live PRs work.
2. Uploads manual first, then site from the frozen pair using `pages deploy
   artifacts/manual/dist --project-name diffdevil-docs --branch main --commit-hash
   <accepted-sha>` and the corresponding site directory/project. Substitute actual
   accepted project names when readback establishes an existing owner.
   These commands publish, including a `pages.dev` surface; do not run them as a
   dry-run or pre-authorization preview.
3. Associates the canonical/compatibility domains and makes only the authorized DNS
   changes. The site handler sends `www` to apex with **308**, preserving path and
   query. The browser preserves fragments. Manual aliases and finite legacy apex
   URLs also use the generated 308 mapping. Do not replace this with a broad `/docs/*`
   rule that loses source/fragment meaning.
4. Records deployment IDs, actual URLs, source/artifact identity, DNS/TLS standing,
   result time, readback and any partial outcome. Stops the affected publication
   effect if the account/target differs; does not touch App deployment or admission.

Pages advanced mode owns routing. Keep `_worker.js` in each uploaded root, not as a
downloadable text asset. `_redirects` also serves plain static adapters; it is not
the sole proof of Pages behavior. The handler revalidates HTML, Pagefind and other
mutable files, caches content-addressed `/_astro/` assets for a year, and marks
error responses `no-store`. Existing provider cache overrides still need readback.

## Public readback and rollback

The publishing operator checks both real canonical hosts in an agent-owned browser:
homepage, manual root, FAQ question deep link, SITE/DOCS/FAQ search results, cross-host
theme continuity, real example replay and one actual public-PR API analysis. Check
source/Edit/download links, unavailable Store/App/setup actions, local fonts/icons,
robots, sitemap/canonicals, legal pages/headers and absence of fixture operator data.
Fetch a representative `www` URL and a moved legacy URL with query/fragment, and
verify 308 plus final destination. Recheck after a cache-cold navigation. A CLI
deployment receipt is not this public reader result.

Retain the **pair** of previous production deployment IDs and frozen output trees.
If either host fails, roll both back to the last coherent pair through Pages'
production rollback operation, then repeat the affected readback. Restoring only
one host can leave mismatched search/navigation. If this is first publication and
no prior deployment exists, do not promise a provider rollback: restore the recorded
prepublication DNS/custom-domain state to withdraw the new exposure, or upload the
previously accepted static pair if one was preserved. Read back the actual outcome;
DNS/cache propagation can delay it. No database migration or App rollback belongs
to this static publication.

The rollback mechanism is prepared, not exercised against production. A failed
public outcome remains with the operating owner until recovered; no success claim
is inferred from a rollback request. Public adoption and a later design facelift
remain separate from this source-preparation result.
