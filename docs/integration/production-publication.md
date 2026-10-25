# Production publication controllers

## Meaning

This is the maintained contract for the two GitHub Actions controllers that carry accepted
`main` to production: [`publish-website.yml`](../../.github/workflows/publish-website.yml) for
the static public family (site, manual, FAQ, search, Lens Studio page and legal projection on the
existing `diffdevil-site` and `diffdevil-docs` Direct Upload Pages projects) and
[`deploy-playground.yml`](../../.github/workflows/deploy-playground.yml) for the
`diffdevil-playground` API Worker. It owns their consumed-input closures, pull-request and
production conditions, credential exposure, receipts, concurrency, adoption and recovery.

The [website publication carrier](website-publication.md) still owns the guarded build, legal
input, emitted handlers and operating facts; the [Playground](../../apps/playground/README.md)
owns its runtime and first-resource bootstrap. The first frozen Direct Upload at `4bcb06fd` was a
launch operation. After adoption, these controllers are the ordinary publication route and a
laptop upload is recovery, not procedure. Workflow source is not adoption, an exercised run, a
configured secret or a live deployment; each is observed separately.

## Two controllers, two boundaries

| | Static family | Playground Worker |
| --- | --- | --- |
| Workflow | `Publish website` | `Deploy Playground` |
| Production target | `diffdevil-docs`, then `diffdevil-site` (Direct Upload Pages) | `diffdevil-playground` on its Workers.dev Home |
| GitHub Environment | `diffdevil-website` | `diffdevil-playground` |
| Cloudflare secret | `CLOUDFLARE_PAGES_API_TOKEN` | `CLOUDFLARE_WORKERS_API_TOKEN` |
| Other protected input | `WOLFSBLVT_LEGAL_OPERATOR_B64` (build step only) | none |
| Automatic switch | repository variable `DIFFDEVIL_WEBSITE_PUBLICATION=automatic` | repository variable `DIFFDEVIL_PLAYGROUND_DEPLOYMENT=automatic` |
| Concurrency group | `diffdevil-website-production` | `diffdevil-playground-production` |
| Recovery | dispatch `publish` an exact main SHA, or `rollback` a recorded pair | dispatch `deploy` an exact main SHA, or `rollback` a recorded version |

A static website change never redeploys the Worker, and a Worker-only API repair never rebuilds
or uploads either static host. A shared-engine or lockfile change legitimately reaches both,
because both consume it. Neither controller creates projects or Workers, associates domains or
touches DNS; [the workflow tests](../../tools/publication/workflows.test.mjs) keep those
operations out of ordinary source.

## Consumed inputs

GitHub evaluates each workflow's native `paths` filter before a runner starts, so an unrelated
push creates no run at all.

**Static family.** The site and manual build reads far more of the repository than its two app
directories: the manual renders `docs/**`, `skills/**`, `SECURITY.md` and `LICENSES/README.md`;
generated manual islands run the real CLI over the engine and read `package.json`, the lockfile,
the canonical Skill, all four `action.yml` files, `apps/github-app/app.mjs` (execution stages),
`apps/github-app/release.json`, `apps/browser-extension/manifest.json` and contracts under
`src/diffdevil/contracts/`; the site imports extension Store screenshots, `vendor/brand/`,
`brand/source/`, `packages/design/` and `apps/shared/`; the source resolver names component
READMEs. The filter therefore starts from every file and removes only what the build does not
consume: other `.github/` files, Action implementation under `actions/`, App, managed-App,
extension and Playground runtime source, tests, and the controller itself. Each consumed file
inside an excluded tree is re-included by name.

This direction is deliberate: an unrecognized new input publishes (an extra identical rebuild)
rather than silently never reaching production. [Consumed-input
cases](../../tools/publication/consumed-inputs.test.mjs) pin representative paths for both
controllers and scan the static build's code for imports and repository paths inside excluded
trees, so a new reference without a matching re-include fails ordinary verification. The
candidate's closure was also checked against a traced real build: of 401 tracked files the build
read or stat'ed, the only ones outside the filter were Markdown read by the manual's inbound-link
validation scan and three existence checks. Those can fail a build but cannot change published
bytes, so they do not trigger publication.

**Playground Worker.** `apps/playground/**` except its README and tests, non-test
`src/diffdevil/**`, the engine build (`tools/build.mjs`, `tools/schema-build.mjs`,
`tools/browser-library-build.mjs`), `tsconfig.json`, `package.json` and `package-lock.json`. The
Worker bundles the compiled engine and locked dependencies; the website's Lens Studio page is not
a Worker input.

**Controller changes publish nothing.** Neither push filter names the two workflow files or
`tools/publication/**`. A workflow, controller-script or configuration-only landing therefore
starts no production run; the change is validated on its pull request and takes effect at the
next relevant change or a deliberate dispatch. `tools/website-publication.mjs` is a consumed
input because it selects the publication build environment; the receipt inventory it imports
from `tools/publication/tree.mjs` shapes only the receipt, not the uploaded trees.

GitHub's changed-path list is bounded. Wolf Ops accepts the documented rare gap: a push whose diff
exceeds GitHub's comparison limit may start no run, and the retained dispatch publishes current
`main`. Neither workflow is a required merge check, since a path-skipped workflow cannot report.

## Pull requests

Pull requests that change a controller file run its `Controller checks` job: credential-free
Node 24 `node --test tools/publication/` over the workflow boundaries, consumed inputs and
controller logic with fake Wrangler, fake Cloudflare API and the real Playground handler over the
GitHub double. The same suite runs in ordinary `npm test`, so Verify carries it on all four
platform cells. Site and manual content pull requests keep their existing Verify, public-manual
and FAQ qualification. No pull-request job names an Environment or secret, `pull_request_target`
is never used, and no remote preview is deployed. Fork pull requests receive no secrets from
GitHub in any case.

The guarded publication build itself cannot run on a pull request: it refuses the fixture legal
projection by design. A publication-only build failure therefore appears on the first main run,
before any upload.

## Production runs

Production jobs run only on `refs/heads/main`, either for a relevant push once the matching
automatic switch is set, or for a dispatch. The protected Environment's branch policy is the
actual secret boundary: a dispatch of a modified workflow from another branch cannot read its
secrets. Third-party actions are pinned to reviewed commits; checkout never persists the token;
`GITHUB_TOKEN` stays `contents: read`. Dispatch input reaches scripts only through environment
variables, never interpolated shell source.

A push run checks out current `main` after entering its concurrency slot, so a queued older event
cannot restore an older cut. A dispatch may name one full 40-character SHA.
[`source.mjs`](../../tools/publication/source.mjs) admits the checkout only when it is clean,
equals that requested commit and is contained in `origin/main`.

**Static family.**

1. Admit the source; install the locked graph with Node 24.
2. Run `npm run website:build:publication` with `WOLFSBLVT_LEGAL_OPERATOR_B64` and the optional
   `DIFFDEVIL_PUBLICATION_STORE_URL`/`DIFFDEVIL_PUBLICATION_APP_INSTALL_URL` Environment
   variables. Empty switches keep both surfaces **coming**; the build's prefix guard and receipt
   `availability` still apply. This is the only step holding the legal projection.
3. Record each project's current `canonical_deployment`: the rollback pair.
4. Re-hash `artifacts/manual/dist` against the frozen `publication.json` immediately before
   upload, refuse any missing, changed or unexpected byte or a receipt for another source, then
   `wrangler pages deploy … --project-name diffdevil-docs --branch main --commit-hash <sha>`. Wait
   for the provider deployment to succeed and confirm it is now the project's production
   deployment with that commit.
5. Repeat for the site. The site step refuses to run unless the manual was published in the same
   run.
6. Read back the public hosts without credentials: the site `/source/` page and the docs root
   must contain the published SHA (bounded retry for propagation, ten attempts 15 s apart); the
   joined search entry on both hosts must equal the receipt's bytes; then apex, `www` → apex 308
   with path and query, FAQ, Lens Studio page, the Playground API's CORS answer from the site
   origin, the three legal routes with `X-Robots-Tag: noindex`, both `robots.txt` and the first
   moved legacy apex URL's 308 from the published `_redirects`. Bodies are never retained.

The built trees, which carry the legal identity on its legal routes, leave the runner only through
the Pages upload; the preserved artifact holds paths, sizes, hashes and provider coordinates.
Wrangler applies its default upload bundling to the generated `_worker.js`; the receipt proves
the local bytes Wrangler received, and readback proves the served behavior.

**Playground Worker.**

1. Admit the source, install, build the engine and run the Wrangler dry-run.
2. Record the active 100% version; a split deployment is refused for reconciliation.
3. `wrangler versions upload --tag source-<sha8> --message "diffdevil playground <sha>"`: an
   immutable version with no traffic. It must return a version ID and preview URL.
4. Qualify the preview: health, static front door, public-URL refusal, and one bounded journey
   over [Wolfsblvt/diffdevil#128](https://github.com/Wolfsblvt/diffdevil/pull/128) through
   `/api/head` and `/api/report`, validated against the replay contract with
   `Access-Control-Allow-Origin: *` and `Cache-Control: no-store` from the site origin. A GitHub
   rate-limit answer is not a pass; nothing is promoted.
5. `wrangler versions deploy <version>@100%`, then confirm through the provider that exactly that
   version is active.
6. Repeat the qualification on the canonical Workers.dev Home.

## Receipts

Both jobs write their receipt even after a failure and preserve it as a 90-day run artifact; the
step summary repeats the coordinates. Neither contains credentials, response bodies or legal
identity.

`artifacts/publication/website/receipt.json`:

```text
kind: diffdevil.static-publication, schemaVersion: 1, run
source                        admitted 40-character commit
publication                   sha256 of publication.json, its source, availability, file counts
previous.docs | previous.site canonical deployment before the run: id, url, commit, stage, createdOn
deployed.docs | deployed.site published or restored deployment, files, rollback flag
readback                      sources per host and each check's name, url, status, attempts, failures
```

`artifacts/publication/playground/receipt.json`:

```text
kind: diffdevil.playground-deployment, schemaVersion: 1, worker, canonical, run, source
previous                      active deployment and version before the run
candidate                     uploaded version ID and preview URL
promoted                      active deployment and version after promotion or rollback
qualification.preview | .production  origin, version and each check's result
```

The provider also retains every Pages deployment and Worker version, so rollback coordinates
remain recoverable from Cloudflare if an artifact expires.

## Concurrency

Each surface has one production group with `cancel-in-progress: false`; publication and
rollback share it. A running deployment is never cancelled. GitHub keeps at most one queued run
per group and replaces an older queued run with a newer one; because a push run resolves current
`main`, the survivor publishes the newest accepted cut. A queued dispatch can be replaced the same
way, which is visible in the run list. Pull-request checks cancel their own superseded runs.

## Adoption: the exact Ops inputs

Landing these workflows performs no publication. Ops then supplies, under the existing grant:

1. GitHub Environments `diffdevil-website` and `diffdevil-playground`, each with deployment
   branches limited to `main` and no required reviewers.
2. `diffdevil-website` secrets: `CLOUDFLARE_PAGES_API_TOKEN`, an API token on the existing
   diffdevil Cloudflare account with **Cloudflare Pages: Edit** only (Cloudflare scopes
   Pages permission to the account, not to one project), and `WOLFSBLVT_LEGAL_OPERATOR_B64`, the
   current canonical operator projection the guard accepts.
3. `diffdevil-playground` secret `CLOUDFLARE_WORKERS_API_TOKEN` with **Workers Scripts: Edit**
   only, separate from the Pages token and from every managed-App credential.
4. Repository variable `CLOUDFLARE_ACCOUNT_ID` (that account's 32-character ID); optional
   `diffdevil-website` variables `DIFFDEVIL_PUBLICATION_STORE_URL` and
   `DIFFDEVIL_PUBLICATION_APP_INSTALL_URL`, left unset while those surfaces are coming.
5. The first static run: reconcile what current `main` publishes beyond `4bcb06fd`, then
   dispatch `Publish website` with that exact SHA, read its receipt and public readback, and only
   then set `DIFFDEVIL_WEBSITE_PUBLICATION=automatic`.
6. The first Worker run: dispatch `Deploy Playground` with the exact selected accepted commit
   (for example the PR #180 repair at `32b5936d`, without sweeping later Worker changes), read its
   receipt, then set `DIFFDEVIL_PLAYGROUND_DEPLOYMENT=automatic`.

From then on accepted relevant `main` movement deploys without an approval button. If the first
run exposes a missing token permission, the failure occurs before traffic moves; correct the token
rather than broadening it to an account-wide convenience token.

## Recovery

- **A step failed before any upload or promotion:** production is unchanged. Fix the cause and
  dispatch the same SHA, or let the next relevant push publish.
- **The manual published but the site did not, or readback failed after both:** the run summary
  names the previous pair. Dispatch `Publish website` with `operation=rollback` and the two
  recorded deployment IDs; it verifies each is a successful production deployment of its project,
  restores manual first, then site, through Pages' production rollback, follows the deployment the
  provider answers with, checks it carries the recorded commit and reads back the hosts by those
  commits. A restored deployment without commit metadata is read back but cannot be identified by
  marker. Restoring only one host can leave mismatched navigation or search.
- **A promoted Worker version failed readback:** dispatch `Deploy Playground` with
  `operation=rollback` and the recorded previous version ID.
- **An earlier accepted cut must be republished as new deployments:** dispatch `publish` or
  `deploy` with its exact main SHA. A commit older than these controllers cannot use them; use
  provider rollback instead.

A rollback request is not a recovered outcome; its readback is. A failed run notifies through
GitHub's ordinary workflow notifications to the triggering actor; Ops owns the first-run readback
and recovery. Manual Wrangler use stays available as recovery when Actions itself is unavailable,
following [website publication](website-publication.md) and the Playground README.

## What source evidence does not establish

Local and pull-request checks exercise workflow structure, consumed-input matching and controller
logic against doubles. They do not establish GitHub's live path evaluation, Environment branch
policy, secret availability, token permissions, Cloudflare upload behavior, propagation time,
rollback through the real API, runner cost or the public reader journey in a browser. The
automated readback is HTTP-level; it is not a rendered Lens Studio or legal-page review.
