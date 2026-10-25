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
| `PUBLIC_CHROME_WEB_STORE_URL` | `DIFFDEVIL_PUBLICATION_STORE_URL` when supplied (must be a `https://chromewebstore.google.com/detail/` listing); otherwise empty, and every extension action shows **Coming to the Chrome Web Store** |
| `PUBLIC_APP_INSTALL_URL` | `DIFFDEVIL_PUBLICATION_APP_INSTALL_URL` when supplied (must be a `https://github.com/apps/` installation page); otherwise empty, and every App action shows **Public access is coming** |
| `PUBLIC_DASHBOARD_URL` | empty: no signed-in App entry in the header |
| Optional Discord/Bluesky/Sponsor destinations | empty until separately accepted |
| Published release manifest | omitted: no guessed download assets |
| `DIFFDEVIL_DOCS_QA` | removed: no reading-qualification route |

The extension and App switches are independent: the Store listing can open while the
App stays private, or the reverse. Set a switch only after that surface's own admission
and legal/distribution work is accepted. The initial website cut leaves both empty.
A nonempty App installation URL is not evidence that its hosted privacy/retention,
contract or commercial journey is ready. Rebuild the pair after an admitted change;
`publication.json` records the resulting `availability`.

Ordinary `website:build` remains a local/CI build, uses the obvious legal fixture
when no projection is supplied and retains the loopback API default. **Its output
is not the publication artifact.** The publication command rejects missing,
malformed, fixture or unprovisioned operator/contact data before building. Contact
standing is an operator assertion backed by real operating evidence, not something
the renderer verifies with an email or form request.

### Canonical operator and the Works contact event

The restricted canonical source is the operator record `legal/operators/wolf.v1.json`
in the private agent-data repository; its adjacent `legal/README.md` governs use.
The authorized operator resolves that existing source. Read it at build time rather
than copying identity from a prior build or this public repository. Preserve the
record coordinate/revision in the restricted publication record, not its contents
in build logs or the public receipt. The joined build removes intermediate
`.prerender` bundles from both static upload roots; build-only modules are not public
assets.

The schema-1 input consumed here is:

| Field | Build meaning |
| --- | --- |
| `schemaVersion` | `1` |
| `operatorId`, `publisherName` | canonical operator and maker identity; the maker is not a substitute legal person |
| `legalName` | the actual natural-person/legal-entity name, rendered only on legal routes |
| `postalAddress.streetAddress`, `.postalCode`, `.locality`, `.countryName` | legal address, rendered only on legal routes |
| `contacts.impressum`, `.legal`, `.privacy` | canonical aliases, selected respectively by Impressum, Terms and Privacy |
| `contactStanding` | `provisioned` only from the canonical operating record |
| `additionalDirectContact.label`, `.href`, `.standing` | the working additional contact label, HTTPS URL and `provisioned` standing |

The canonical email aliases were confirmed provisioned on 2026-10-22. Privacy uses
the canonical privacy value even where it points at the legal mailbox; do not invent
a distinct privacy mailbox. This does not qualify outbound deliverability. At the
2026-10-24 source check, the canonical record had **no additional direct contact**.
The guarded publication build therefore still correctly refuses that record.

The selected additional route is the shared Works form at
`https://contact.wolfsblvt.works/`. After the authorized Works owner deploys it, the
operating readback must establish the actual canonical URL, successful submission
and receipt/handling route, and its channel-specific privacy information. Only then
does the authorized custodian update the **private** canonical record with
`additionalDirectContact: { label: "Contact Wolfsblvt Works", href: <observed HTTPS URL>,
standing: "provisioned" }`. diffdevil then consumes a fresh projection and rebuilds.
Do not stage a real-looking provisioned pointer in public source, substitute another
email or GitHub issues, or weaken the guard while waiting for that event.

The operator supplies the canonical JSON as UTF-8 base64 via the mediated
`WOLFSBLVT_LEGAL_OPERATOR_B64` environment value. Base64 is transport, not encryption.
Never echo the value, place it in a shell argument or public CI secret diagnostic,
pass it through `PUBLIC_*`, or use it for screenshots. The real publication trees
necessarily contain the intended identity on the three legal pages: keep them in
the restricted deployment workspace until the authorized upload. Only the final
legal routes are its public destination. `publication.json` contains paths, sizes
and hashes, not a copy of the operator record.

Confirm applicable operator disclosures from the real record before the cut: an
issued VAT/economic identifier, register/professional information or consumer-dispute
statement cannot be inferred absent merely because the minimal record omits it.
Do not publish ordinary personal tax identifiers. If an additional disclosure applies,
return that exact fact for a bounded legal-source amendment before upload. This is
an unresolved applicability check, not permission to invent a company or exemption.

## Qualification before the upload pair is frozen

Use `npm run test:website`, `npm --prefix apps/manual test`,
`npm run qa:website`, `npm --prefix apps/manual run qa` and
`node apps/website/qa/faq.mjs` against the ordinary two-host build. The manual QA
command creates a deliberately isolated reading specimen and therefore must precede
the final publication rebuild. These suites exercise source/Edit links, redirected
fragments, keyboard/search/theme behavior, responsive reading, example replay,
unavailable actions and generated assets with a loopback GitHub double. The real
public API and provider routing remain separate evidence.

Run `node --test apps/website/legal-operator.test.mjs` for the build-input boundary
and `node apps/website/qa/legal.mjs` against the ordinary joined **fixture** build.
The focused legal readback uses the emitted handlers without internet access. It
checks all three routes' response/header/metadata behavior, canonical/footer links,
sitemap/search exclusion and operator-field isolation from other output and page
metadata, then records desktop/narrow screenshots and results under
`artifacts/website/qa/legal/`. It refuses a non-fixture legal build before making
screenshots. It is not the live legal verifier and must not consume the real payload.

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
- hosting/request-log retention and transfer facts described below, and
  existing Search Console coverage/sitemap handoff for both Homes. A new docs
  hostname does not automatically require a new property.

These are a bounded operating readback, not work for the owner to reconstruct.
Missing provider access leaves these facts **UNOBSERVED**; a project name in this
document does not resolve them.

### Privacy readback for the actual public service

The notice describes the public sites/API's delivery and security processing and
the extension's real local storage; it does not equate an absent product-history
table with absent provider processing. Before upload, the operating seat records:

- Cloudflare Pages/Functions and Playground Worker plan, enabled observability,
  invocation/custom logs, sampling, retention, exports/Logpush, access and any
  separate security/incident store. Invocation logs can include request URLs, so the
  API's public-PR query and a policy carried in a page URL are material. A source
  `console.error` absence would not establish a no-logging claim; the current Worker
  also emits unexpected exceptions.
- The applicable Cloudflare agreement/DPA, recipients/subprocessors, processing
  locations and transfer safeguards. Published provider terms are useful evidence,
  not proof of this account's settings or executed arrangement. Record the actual
  mail/contact providers and confirm that the Works channel notice describes them.
- The request/security and support retention practice against the notice's purposes
  and criteria. The notice cites Cloudflare's published Workers Logs windows (Free
  three days, Paid seven days); those are not a universal Cloudflare TTL. Any retained
  exports or other processing outside the described boundary need their actual
  purpose, recipients and retention disclosed before use.
- The basis and delivery of any Article 14 notice owed for personal data obtained
  through public GitHub PRs, or the actual supported exception. A public repository
  and a passive footer notice do not, alone, establish an exception. Assess the
  bounded live acquisition and published lesson fixtures, not a hypothetical future
  App dataset. Any required direct notice is a separate authorized operation.
- Whether the actual free public service forms a consumer digital-service contract
  triggering additional information/functions, and the real operator's § 36 VSBG
  standing where applicable. A free, preview or open-source label alone does not
  settle those questions. Terms preserve statutory liability and do not pretend
  that a footer link proves agreement.

These are finite legal/provider facts to resolve for the selected public offer,
not a new compliance automation system. A mismatch holds only the affected launch
claim/effect and returns the exact correction needed; it does not weaken the contact
guard or turn a future paid App launch into a prerequisite for the public website.

The managed-App section is explicitly a development boundary. Before opening that
separate surface, its owner still owes the actual hosted offer and roles, customer
history/audit/backup retention, qualified archive/recovery policy, GitHub grant and
history choices, export/deletion and any commercial/consumer journeys. Do not turn
the runtime's 3660-day default or selected four-year inactive archive into a lived
customer promise. The extension's Store package and listing keep their own privacy
and availability readback; this website change does not publish that listing.

### Facts behind the authored copy

| Public claim | Maintained evidence |
| --- | --- |
| Saved lessons fetch fixtures and check public-PR freshness; only a revision check is session-cached | `apps/website/src/islands/playground/Playground.tsx` |
| Policy editing is local; PR/policy values can travel in URLs | `apps/website/src/islands/playground/Playground.tsx` and its state/API helpers |
| Public API has transient acquisition, `no-store` responses, no result cache or service rate limiter | `apps/playground/app.mjs`, `worker.mjs`, `wrangler.jsonc` |
| Extension reports/policy text persist within a size budget; no TTL; some preferences synchronize | `apps/browser-extension/src/background/analysis.ts`, `cache.ts`, `preferences.ts`, `worker.ts` |
| Managed history retains protected names/paths; source content is separate; stopping and deletion differ | `docs/PRIVACY-AND-DATA.md`, `apps/github-app/analytical-data.mjs`, `storage.mjs` |
| Managed grant, Works and feedback purposes differ from browser login/history | `apps/github-app/authorization-storage.mjs`, `docs/PRIVACY-AND-DATA.md`, `apps/app/README.md` |

Legal/provider anchors checked on 2026-10-24:
[§ 5 DDG](https://www.gesetze-im-internet.de/ddg/__5.html),
[GDPR Articles 6, 13, 14 and 21](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng),
[§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html),
[§ 36 VSBG](https://www.gesetze-im-internet.de/vsbg/__36.html),
[Cloudflare privacy](https://www.cloudflare.com/privacypolicy/),
[Cloudflare DPA](https://www.cloudflare.com/cloudflare-customer-dpa/),
[Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/),
[GitHub privacy](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)
and [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage).

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

Read the actual Impressum, Privacy and Terms with the projected identity/contact
locally under the restricted operating context; retain only redacted evidence in
the public room. Check the Works form link against its prior live readback. Run the
Leitsatz public-legal Skill's manual verifier for the selected published Home and
fixed sitemap routes after this real publication occasion. It must remain a manual,
bounded check, never CI, a deploy hook, monitoring or a scheduled crawl. Its result
proves fetched content/directives, not legal sufficiency, mailbox receipt, provider
configuration, notice delivery or contract formation.

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
