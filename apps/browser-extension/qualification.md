# Source-candidate qualification

## Standing

This is a full authored local extension source candidate, not a published extension or an accepted live-GitHub integration. Its source, reproducible build, configuration application, tests, Store assets and evidence are carried together. Provider publication and final acceptance remain separate.

The initial verified source is `Wolfsblvt/diffdevil@86dcf193a3186467d5b5f24a4246767adaf0a069`, tree `0658aa5f8b0e97f1774d05abb2bfc4b9f22bf733`. The final source was replayed onto current `main` after presenter PR #25 landed and preserves that accepted base without duplicating its implementation. The earlier draft PR #26 contains a different bounded browser-core attempt; it is not evidence for this full application.

## Executed evidence

On Linux, Node 22.16.0 and TypeScript 5.8.3, the final local pass includes:

- Successful core build, strict extension type-check and font-free MV3 packaging.
- 69 focused passing tests: 24 shared browser-core tests and 45 application tests, with no failures or skipped tests.
- 42 passing Chromium DOM/controller checks and 13 passing browser acquisition-adapter checks, with explicit authored data and transport fixtures.
- Successful repository preparation check, covering 52 JSON assets and 189 declared conformance cases.
- Successful supplied conformance run. The exact category counts are in the evidence log.
- A freshly regenerated Action distribution: 1,159 generated files and 12 locked runtime packages. The generated-file freshness check passes.
- Ten successful install-free Action consumer executions covering all four entry points, under Node 22 with mock HTTP. Node 24 was not exercised locally.
- Eight generated Store images with source, size, format and SHA-256 receipts. Screenshots and promotional PNGs are 24-bit RGB; the Store icon has its required transparent padding. No Store listing was created.

The root test run recorded 588 passing tests and one failing test module: the unrelated GitHub App D1 test could not import the unavailable offline `miniflare` dependency. This is not a completely green repository suite. Its test was not removed, disabled or replaced.

The installed npm-consumer check reached ordinary offline installation and failed with `ENOTCACHED` for registry metadata for `ajv`. This is an unexecuted consumer gate, not a successful installation. No network install or publication was claimed.

## What browser evidence proves

The rendered checks execute production rendering, settings and lifecycle code in Chromium with declared test dependencies. They verify keyboard interactions, literal deep links, Basic/Advanced search, unsaved-editor preservation, lazy file headers, head changes, stale-result rejection, label-picker handoff, themes, responsive layout and bounded popovers. The acquisition checks exercise production source acquisition against authored HTTP responses.

The container's managed Chromium policy blocks extension installation and ordinary browsing. The actual installed-extension runner records `blocked-by-managed-policy`; its installed tests did not run. Policy was not changed or bypassed. DOM/controller fixtures are not presented as installed MV3, native extension-storage, live authenticated private-GitHub, current production CORS, Windows or Chrome Web Store acceptance evidence.

## Remaining qualification

An unrestricted authorized browser must run the installed MV3/native-storage suite and the live journeys described in qa.md. That includes representative public and accessible private pull requests, the current GitHub DOM on all supported tabs, real lazy rendering and a real head refresh, keyboard/zoom/theme behavior, and the native label-picker handoff with visible readback. The authored CI job requires the installed suite rather than accepting a managed-policy skip as success.

Trusted App-report delivery is not implemented because there is no accepted authenticated transport for this browser client. Its identity/standing interface and explicit preferences are preserved; local analysis remains functional and never invents App approval. Managed-App label writes and Firefox remain separate work.

The compact default is the accepted shared centre-seam `diffdevil/brand` glyph, pinned to `Wolfsblvt/wolfsblvt-icons@8596b6bc2ba7c4b950963b7ec26cee1a26974439` and verified by SHA-256 during build. The full-colour option uses the accepted theme-specific micro symbol.

## Custody and reproduction

The delivery manifest records the exact local source commit/tree and any actual remote branch/PR state. A created remote branch is not proof of a transferred source tree. Source ZIP, patch, font-free unpacked build, Store pack and evidence pack each have independent SHA-256 digests. No font files, browser profile, credentials, development dependency installation or downloaded toolchain archive are part of that handoff. The full source snapshot retains the repository’s already-tracked install-free Action dependency closure.

Run the commands in README.md and qa.md against the exact source. The existing root Verify workflow remains intact. The new read-only browser job builds and tests the extension, requires actual installed MV3 verification, creates review assets and uploads evidence. It does not write repository source or publish anything.

## Persistent continuity and the automatic file limit

Measured on Windows 11 with Node 26.7 and Playwright Chromium, in the real installed MV3 worker with synthetic provider files (`npm run extension:benchmark`; single observations, not guarantees). Local cost is nearly independent of the limit; what the limit governs is how many files are read from GitHub.

| Specimen | Measured / total | Acquisition message | Packet | Stored report | Cold analysis | Cold rehydration after worker death | Engine heap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| small | 12 / 12 | 56 KB | 5 KB | 10 KB | 65 ms | 0.21 s | 2.0 MB |
| 100+ | 150 / 150 | 0.78 MB | 13 KB | 110 KB | 0.12 s | 0.44 s | 0.6 MB |
| 500+ | 150 / 600 | 0.82 MB | 39 KB | 471 KB | 0.30 s | 1.1 s | 1.6 MB |
| 500+ | 600 / 600 | 3.1 MB | 40 KB | 436 KB | 0.40 s | 1.1 s | 1.2 MB |
| provider ceiling | 150 / 3,000 | 1.0 MB | 179 KB | 2.4 MB | 2.5 s | 5.6 s | 6.5 MB |
| provider ceiling | 3,000 / 3,000 | 16 MB | 181 KB | 2.2 MB | 2.0 s | 5.5 s | 6.1 MB |

A stored report is about 0.8 KB per file whether measured or bounded, so the default 16 MiB budget holds several ceiling-size pull requests. The aggregate packet carries a path and a standing per file, not every file record. Projection and rehydration cost follows the inventory size, not the limit. The acquisition message follows the number of measured patches: at the 3,000-file ceiling with every patch it reaches 16 MB for ordinary patches, close enough to the 24 MiB message boundary that an unlimited automatic pass is not safe there, and a limit of 500 or less cannot reach it. On the signed-in route each eight files are one request and three run at a time, so the default of 150 is 19 requests (about seven sequential rounds) and 500 is 63. **150 is the default** because it measures a typical large pull request completely, costs about nineteen requests, and leaves everything beyond it one explicit act or one scroll away; the limit is user-configurable from 1 to the provider's 3,000.

Live, anonymous, read-only runs of the built extension on public pull requests (the anonymous page is GitHub's classic page, so these ran through the public API route, whose requests follow the inventory, one per hundred files, whatever the limit): kubernetes/kubernetes#142173 (167 files) measured 150, left 9 bounded, 8 declined by GitHub, first seat in about 6 s with 6 API requests; rust-lang/rust#163306 (417 files) measured 150, 264 bounded, 3 declined, with 10 API requests. At the ceiling an anonymous visitor's sixty requests an hour are nearly spent by one pull request; that boundary is unchanged and still surfaces as a rate-limit failure.

Unobserved here: the signed-in `diff_entries` route's latency and behavior at 150, 500 and 3,000 files on a real private pull request (anonymous GitHub does not serve it); Chrome's behavior with a real Web Store installation (a command-line-loaded unpacked extension is re-announced as an install on every launch); macOS and Linux; and keyboard, zoom and screen-reader journeys of the new report block and file report on live GitHub.
