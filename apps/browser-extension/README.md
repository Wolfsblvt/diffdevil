# diffdevil for GitHub

A Chrome Manifest V3 application that puts replacement-aware **Changed** counts beside GitHub's pull-request and file statistics. Analysis uses the same diffdevil parser, measurements, policy compiler and report contracts as the reusable engine. It does not run a separate approximation in a DOM scraper.

This is an authored source candidate, not a published Store extension. The implemented browser UI, settings, data management, provider acquisition, build, fixtures and Store-preparation pipeline are included. Installed Chrome, live GitHub and Windows acceptance are distinct from the deterministic browser evidence. See [QA](qa.md) and the generated receipts.

## Build and load

From the repository root, with Node 22.12 or newer:

```sh
npm ci --ignore-scripts
npm run extension:dev
```

The development result always replaces `artifacts/browser-extension/unpacked`. In an unrestricted Chrome profile, open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select that stable directory once. After each later build, use **Reload** on the extension card and then reload any open GitHub pull-request tab; Chrome does not retroactively replace an already injected content script. The toolbar action opens the full settings application. An organization's managed browser policy may prevent installation; do not bypass it.

`npm run extension:build` is the underlying one-shot candidate build. SHA-named copies and generated receipts are immutable qualification evidence, not the development path Chrome should retain.

A build without bundled font files uses the normal system-font fallbacks:

```sh
npm run build
npm run extension:check
node tools/browser-extension-build.mjs --without-fonts
```

The build is local. It does not publish npm, deploy a service, open a Store listing or upload source. Root `npm run build` also produces a self-contained MIT browser export at `dist/browser/index.js`.

## What appears on a pull request

The in-place experience follows the accepted [Extension Grammar v1](../../design/extension-grammar-v1.dc.html): diffdevil takes the seat GitHub already uses for its diffstat, in GitHub's own typography and colours, and speaks its own grammar only inside the report. Three seats exist: the pull-request seat in the header's tabs row, the Files-changed toolbar sentence where GitHub renders one, and each file header. Nothing else on the page is touched: no extra row, no toolbar, no sidebar.

**Changed** counts modified line positions once and keeps added-only, deleted-only and modified components separate; the seat shows the value, the indivisible `+ − ~` triplet, and, for the pull request, the size chip, a fixed 56 px band rail generated from the policy in effect and the word `local`. A dashed chip is a local policy result; it becomes solid only when the mapped label is observed on the pull request. `size ?` with a dotted border means the evidence straddles bands; `! policy unavailable` means the repository policy could not be applied while the measurement stands. A file seat carries the value and the triplet only: a file has no band, no chip and no provenance, because a pull request's tier is never copied down to its files. The same treatment reaches the file tree's per-file counters when GitHub shows them: a tree counter is bound to its file through GitHub's own `#diff-<sha256(path)>` anchor, or an explicit path attribute, and receives a seat only for a file the analysis knows.

While the comparison is being read, GitHub's counters stay untouched: no spinner, no placeholder. Once Changed is known they are hidden in place by default, or kept after Changed, faint, with `display.nativeChurn`. On a failure a muted `× diffdevil · Retry` marker takes the seat's leading position and GitHub's counters are restored at full colour. When the head advances, the previous result stays visible at reduced opacity, labelled `⟳ re-reading` with the new short SHA, until the new comparison is read.

A result already computed for the same repository, pull request, base and head is reattached at once when you move between Conversation, Commits, Checks and Files changed or reload; freshness is confirmed in the background, and only a changed head triggers `⟳ re-reading`. Private pull requests are read through the signed-in `/changes` page's own file summaries and embedded diff contents, and the files GitHub did not embed are loaded through the same-origin `page_data/diff_entries` route the page itself uses, in batches, without a token or any new permission; only a file GitHub itself declines to supply (too big, binary, submodule, truncated) is shown with bounded evidence rather than a guess.

The aggregate follows the complete PR across Conversation, Commits, Checks and Files changed. Per-file augmentation is confined to the full-PR Files changed comparison: commit-only and explicitly narrowed comparisons must not inherit whole-PR file measurements. Newly rendered modern and legacy file headers are attached lazily. Unacquired file paths retain their native presentation rather than receiving invented facts.

Click Changed to inspect the non-modal report. Click again, press Escape, click outside or use Close to dismiss it; focus returns to the seat. The report is a GitHub shell (surface, border, elevation, position, dismissal) around a diffdevil machine block: one dominant value beside `changed`, the evidence and measure chips, the decomposition column, then raw churn, the files strip, the policy composition with its band and metrics, and the effect plan with `Find in labels ↗` and the readback lane. The toolbar seat opens the concise report without policy or plan; a file seat opens that file's report. `Copy facts` writes the canonical diffdevil human report for that scope, the exact text the CLI prints, never a DOM scrape. Below 544 px the report becomes a bottom sheet. It renders in a shadow root so GitHub's styles and ours never cross.

Unknown, bounded and unmeasurable values remain explicit. Missing provider material, binary changes, an unavailable policy and a moving head do not become an exact zero or a convenient size tier.

## Your settings

The options application uses the shared diffdevil surface tokens, accepted wordmarks and both authored themes. Every setting has its own human name and a literal visible deep link, for example `#display.brandIcon` or `#policy.advancedYaml`. Search covers Advanced settings without changing the selected Basic view. A deep link reveals and focuses its target without permanently switching the view. Basic shows the number of active advanced changes.

Unsaved YAML, path, band and repository-editor values survive searching, switching Basic/Advanced and changing theme. Saving uses the real schema/compiler. A rejected edit does not overwrite the saved policy. Reset is per-setting; destructive whole-data and override operations require confirmation.

Two settings change rendering, and both are cosmetic. `display.brandIcon` selects the glyph (default), the full-colour micro symbol or no icon; the report header always uses the glyph. `display.nativeChurn` keeps GitHub's raw counters hidden (default) or faint after Changed. What a seat shows is a fact of the comparison, not a preference: there is no per-seat toggle, no rail switch and no alternative layout.

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

Raw diffs are processed in memory and discarded. Normalized reports can contain private paths and revision identities; trusted policy text and immutable missing-file results are rebuildable cache data. The LRU budget is bounded. Small settings can synchronize through Chrome; advanced YAML and repository overrides are local. A support snapshot is redacted; a deliberate full settings export is not. Read [Privacy](privacy.md) before using private repositories.

## Verification and distribution

```sh
npm run extension:test
npm run extension:qa
npm run extension:qa:installed -- --require
npm run extension:store
```

These commands follow a built candidate. The DOM/acquisition runs need Playwright Chromium (`npx playwright install chromium`) or an explicitly configured `CHROMIUM_EXECUTABLE`. Installed QA requires a browser/profile that permits extensions and records a distinct blocked state when managed policy forbids them. A blocked probe is not a passing installed test.

The complete future Store submission source lives under [store](store/README.md): listing copy, privacy answers, reviewer notes, a 128px icon, five 1280×800 RGB screenshots, 440×280 and 1400×560 RGB promotional images, editable SVG compositions and a hash manifest. `npm run extension:store` validates those committed bytes and creates a disposable submission kit; `npm run extension:store:generate` deliberately refreshes the tracked assets from qualified authored fixtures. No public Store link is invented.

The application is AGPL-3.0-only, reusable core/browser code is MIT, original prose is CC BY 4.0, and accepted visual identity remains reserved. [Licences](licenses.md) and the root component map define the boundaries.
