# diffdevil for GitHub

A Chrome Manifest V3 application that puts replacement-aware **Changed** counts beside GitHub's pull-request and file statistics. Analysis uses the same diffdevil parser, measurements, policy compiler and report contracts as the reusable engine. It does not run a separate approximation in a DOM scraper.

This is an authored source candidate, not a published Store extension. The implemented browser UI, settings, data management, provider acquisition, build, fixtures and Store-preparation pipeline are included. Installed Chrome, live GitHub and Windows acceptance are distinct from the deterministic browser evidence. See [QA](QA.md) and the generated receipts.

## Build and load

From the repository root, with Node 22.12 or newer:

```sh
npm ci --ignore-scripts
npm run extension:build
```

The result is `artifacts/browser-extension/unpacked`. In an unrestricted Chrome profile, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select that directory. Open or reload a GitHub pull-request page. The toolbar action opens the full settings application. An organization's managed browser policy may prevent installation; do not bypass it.

A build without bundled font files uses the normal system-font fallbacks:

```sh
npm run build
npm run extension:check
node tools/browser-extension-build.mjs --without-fonts
```

The build is local. It does not publish npm, deploy a service, open a Store listing or upload source. Root `npm run build` also produces a self-contained MIT browser export at `dist/browser/index.js`.

## What appears on a pull request

**Changed** counts modified line positions once and keeps added-only, deleted-only and modified components separate. **Raw** remains GitHub-style additions and deletions. The virtual band pill and rail describe your effective policy, not an applied GitHub label or an App approval. File classification evaluates that file's actual facts; it does not copy the pull-request tier.

The aggregate follows the complete PR across Conversation, Commits, Checks and Files changed. Per-file augmentation is confined to the full-PR Files changed comparison: commit-only and explicitly narrowed comparisons must not inherit whole-PR file measurements. Newly rendered modern and legacy file headers are attached lazily. Unacquired file paths retain their native presentation rather than receiving invented facts.

Click Changed to inspect the non-modal report. Click again, press Escape, click outside or use Close to dismiss it. The report restores focus where appropriate, stays within the viewport and closes when its anchor is replaced. It includes revisions, evidence, files, metrics, bands, scopes, rules, policy provenance and report identities.

Unknown, bounded and unmeasurable values remain explicit. Missing provider material, binary changes, an unavailable policy and a moving head do not become an exact zero or a convenient size tier.

## Your settings

The options application uses the shared diffdevil surface tokens, accepted wordmarks and both authored themes. Every setting has its own human name and a literal visible deep link, for example `#display.brandIcon` or `#policy.advancedYaml`. Search covers Advanced settings without changing the selected Basic view. A deep link reveals and focuses its target without permanently switching the view. Basic shows the number of active advanced changes.

Unsaved YAML, path, band and repository-editor values survive searching, switching Basic/Advanced and changing theme. Saving uses the real schema/compiler. A rejected edit does not overwrite the saved policy. Reset is per-setting; destructive whole-data and override operations require confirmation.

The default icon is the accepted quiet monochrome **centre-seam** `diffdevil/brand` glyph from `Wolfsblvt/wolfsblvt-icons@8596b6bc2ba7c4b950963b7ec26cee1a26974439` (MIT, SHA-256 `d33cf3b1a7a8ec52706da3311ac82e0500ec6c2eee8e35baeaaa2d5ef2b9b34e`). It is copied unchanged into the package and verified during build. Full colour uses the accepted micro symbol. None renders no icon slot.

## Policy and labels

Composed mode uses personal defaults, then the trusted repository `.diffdevil.yml`, then an explicit personal repository override. Repository mode uses repository policy when present and personal defaults when absent. Personal only deliberately excludes repository policy and can retain an explicit per-repository personal override.

Repository policy and explicit templates are read from the exact base SHA, never the proposed PR head. A private or inaccessible-base 404 does not prove policy absence. Invalid or unavailable repository policy is visible and is not silently replaced with personal classification. The factual report remains usable. [Architecture](ARCHITECTURE.md) explains declaration replacement, preset origins and cache identities.

Guided bands can have custom names, thresholds, colours and optional existing-label mappings. Advanced YAML is the full diffdevil policy dialect, not an extension subset. A nonempty advanced document replaces guided personal policy, while preserving those guided preferences for later reuse. It does not authorize a provider write.

Where GitHub exposes its native writable label picker, an explicit handoff opens it and filters the mapped label. The user makes GitHub's actual selection. The extension does not select, create or reconcile labels, issue a hidden POST, remove another label or claim success before observing the native DOM change.

## Local and App standing

The extension works without the hosted App. The portable identity classifier distinguishes matching, policy-mismatched, stale and incompatible App report identities, but this candidate has no authenticated report-delivery integration with the hosted service. It therefore presents **local**, never an invented matching checkmark. App preferences preserve explicit user choices for that future verified delivery boundary and are described as inactive until such a source exists. No hosted analysis, quota-consuming operation or report endpoint is guessed.

## Data and permissions

The manifest requests storage, the `github.com` content-script scope needed for client-side PR navigation, and `api.github.com` for a public read-only fallback. There is no PAT, account, cookie permission, browser-history API, localhost daemon, all-sites host permission, telemetry or source-upload backend. Incognito is deliberately unsupported to avoid mixing its observations into a normal profile's persistent cache.

Raw diffs are processed in memory and discarded. Normalized reports can contain private paths and revision identities; trusted policy text and immutable missing-file results are rebuildable cache data. The LRU budget is bounded. Small settings can synchronize through Chrome; advanced YAML and repository overrides are local. A support snapshot is redacted; a deliberate full settings export is not. Read [Privacy](PRIVACY.md) before using private repositories.

## Verification and distribution

```sh
npm run extension:test
npm run extension:qa
npm run extension:qa:installed -- --require
npm run extension:store
```

These commands follow a built candidate. The DOM/acquisition runs need Playwright Chromium (`npx playwright install chromium`) or an explicitly configured `CHROMIUM_EXECUTABLE`. Installed QA requires a browser/profile that permits extensions and records a distinct blocked state when managed policy forbids them. A blocked probe is not a passing installed test.

The Store generator produces a 128px icon, five 1280×800 RGB screenshots, 440×280 and 1400×560 RGB promotional images, editable SVG compositions and a hash manifest. Captures retain the authored-fixture/source-candidate disclosure. Listing copy, privacy answers and a submission checklist live under [store](store/README.md). No public Store link is invented.

The application is AGPL-3.0-only, reusable core/browser code is MIT, original prose is CC BY 4.0, and accepted visual identity remains reserved. [Licences](LICENSES.md) and the root component map define the boundaries.
