# Browser-extension qualification

## Meaning

Different evidence layers answer different questions. A production DOM test with explicit fixtures is not an installed extension, a live GitHub page, a private-repository test or a Windows result. The build and handoff keep those distinctions visible.

## Reproduce

```sh
npm ci --ignore-scripts
npm run build
npm run extension:check
node tools/browser-extension-build.mjs --without-fonts
node --test src/diffdevil/tests/browser.test.mjs
npm run extension:test
npm run extension:qa
npm run extension:qa:installed -- --require
npm run extension:qa:public
npm run extension:store
npm run check:actions
```

Install the appropriate Playwright browser first with `npx playwright install chromium`, or set `CHROMIUM_EXECUTABLE` to an allowed installation. The installed runner supports `HEADED=1`. It never alters managed policies. Without `--require`, an installation prohibition writes a `blocked-by-managed-policy` receipt without pretending to have run installed assertions; with `--require`, it fails the gate with exit status 2.

## Implemented automated coverage

The shared-core tests exercise replacement-aware/raw parity, all evidence states, partial source and binary behavior, SHA validation, counter disagreement, file projections, exclusions, real policy dialect/composition/provenance, malformed lower policy, independent bands, runtime SHA parity and App identity standing.

The application tests use actual production classes with explicitly injected storage and fetch contracts. They cover defaults and policy lowering, include-only semantics, partial label mappings, settings validation and overrides, queueing/journal recovery, quota rollback, LRU invariants, sender/PR scopes, public API pagination and freshness, policy absence versus inaccessible base, bounded bodies, manifest permissions and closed executable bundles.

The rendered-browser suite executes the real options and content controllers. It checks literal anchors, deep-link focus, Advanced discovery, search/view/draft preservation, invalid edits, reset confirmation, themes and phone widths; lazy modern/legacy file placement, repeated navigation, root replacement, whole-PR versus commit-only views, late-head rejection, bounded retries, native diffstat restoration, icon modes and conservative evidence; anchored interaction by click, Escape, outside pointer and keyboard; text-only hostile paths; native-picker filtering without a provider mutation; that opening a long pull request spends no scrolling allowance on files rendered below the viewport and that scrolling measures only files whose diff is on screen; keyboard focus kept on the same report control, or on the report itself, while an open report is rebuilt by measurement and continuation; a file GitHub collapsed staying bounded with its reason, never re-asked automatically and always included in an explicit pass until it is measured, and a continuation that measures nothing saying so without rebuilding the seats; the production worker against the browser's own IndexedDB, where a rehydration straddling each kind of clear is neither served nor kept; and absence of external requests or uncaught page errors in the fixture run.

A separate browser acquisition suite exercises the production signed-in adapter with authored HTTP responses. It checks immutable-base policy/template acquisition, after-fetch head validation, cache reuse, private/inaccessible 404 handling, truncated policy, deliberate Personal only, traversal rejection, HTML/error response rejection, byte limits, cancellation, independently confirmed empty comparisons, and batch-overflow retries including a failed single-path retry that preserves successful batch-mates. A synthetic entry in the field shape observed live for a generated lockfile GitHub collapses (exact counters, no lines, `newTreeEntry.isGenerated`) is read through a synthetic `page_data/diff_entry_lines` response in the observed `{ diffEntryLines }` shape, with the route's observed query keys bound to the head, on the first pass and on explicit measurement; when that route fails the file is recorded as collapsed rather than declined, an omitted path as not returned, and the path-free diagnostic carries the entry's shape and the failure code. It also runs incremental measurement in two tabs of one browser through the real lock manager, where overlapping requests read each file from GitHub once on both the signed-in and public routes, and refuses patch text when the page or the public API names another head. These are adapter tests, not live network, cookies or CORS evidence.

The installed runner is fully authored. On an unrestricted browser it verifies actual MV3 startup/CSP, real synchronized/local storage separation, engine execution, IndexedDB normalization (schema 2), browser restart, forced termination of the service worker followed by file, report-text and aggregate requests served from persisted facts, measurement of bounded files, and a collapsed file's recorded reason, persisting across restart, concurrent tabs of one comparison producing one stored report, pause and resume refusing and then resuming work without deleting data, the Settings inventory clearing exactly one pull request, the first-install tab and its stable `#ready` section, cache reuse and explicit clear/reset behavior. It uses synthetic reports submitted through the real worker and does not impersonate live provider evidence. A command-line-loaded unpacked extension is announced as an install on every launch, so a restart cannot prove that only a first install opens Settings; that decision is a unit-tested function of Chrome's reason.

`npm run extension:benchmark` runs synthetic specimens (12, 150, 600 and 3,000 files) through that real worker at several automatic limits and records elapsed time, serialized acquisition/packet/stored sizes, in-process engine heap and the cost of a cold rehydration after worker termination. `node apps/browser-extension/qa/benchmark-live.mjs <limit> <pull request URLs>` runs the built extension against real public pull requests anonymously and records coverage, API requests and timings. Neither can represent the signed-in `diff_entries` route's latency: anonymous GitHub does not serve it. `node apps/browser-extension/qa/large-diff-probe.mjs [--lines=9700]` renders one very large synthetic file in place, as GitHub's Load diff does, on the same authored page with and without the running content controller and records main-thread time and long tasks; it bounds what diffdevil adds, not what GitHub's own rendering costs.

The public installed runner uses a disposable anonymous Chromium profile and the built unpacked extension against a current public PR. It checks direct aggregate and per-file Changed, records what file tree and tree counters the page exposed and requires tree seats only when counters exist, opens the aggregate report, follows GitHub's Files link, and exercises a same-document route change that separates frame and tab URL. The receipt records whether GitHub's own click was a soft or full navigation. On failure it keeps a screenshot, page and worker console, and a Playwright trace under `artifacts/browser-extension/qa/public-installed/`. It does not establish signed-in layout or private-repository behavior.

## This source session

The source was reconstructed and verified against main commit `86dcf193a3186467d5b5f24a4246767adaf0a069`, tree `0658aa5f8b0e97f1774d05abb2bfc4b9f22bf733`, then replayed onto current `main` after presenter PR #25 landed. The final extension does not duplicate or modify that presenter implementation, and earlier bounded PR #26 does not contain this full application.

The supplied receipts describe Linux Node 22.16.0, TypeScript 5.8.3 and managed Chromium 143. Core and application checks passed, as did rendered DOM and acquisition fixtures. The exact final counts, versions, hashes and durations belong to the generated receipts and room return, not a permanently frozen number in this manual.

Managed Chromium blocks extension installation and general navigation here. The installed probe records that prohibition; no policy was changed. Live public/private GitHub layouts, actual authenticated redirects, native extension storage/worker behavior, browser zoom settings, Windows runtime and native provider selection are not accepted by the DOM fixture evidence. Responsive viewport tests are not a substitute for installed Chrome zoom acceptance.

The ordinary repository suite also runs unrelated application tests. In this sandbox, the existing `apps/github-app/d1-state.test.mjs` cannot load its locked `miniflare` package. The other registered tests ran; the root suite remains non-green rather than suppressing that file or fabricating D1 behavior. Wrangler/Astro dry-run/build gates likewise require their ordinary locked development dependencies. Run the normal repository CI before accepting the source.

## Acceptance matrix for an unrestricted browser

Use an allowed Chrome profile with a disposable fixture repository. Cover both public and authorized private repositories, all four PR tabs, full Files changed, a commit-only diff, soft navigation between PRs, force-push/base updates during an in-flight read, file expansion and root replacement. Exact numbers should match the same CLI source and policy, with incompleteness deliberately exercised rather than hidden.

Check real cookies, redirects, public API rate limits and inaccessible-base policy errors. Verify no raw patch persists in IndexedDB/local/sync storage; inspect actual report/path and policy cache contents, size eviction and browser quota failure. Restart the browser and worker, then repeat cached analysis and clear/reset. Check two tabs with different comparisons and policies; obsolete results must not cross scopes.

At 80%, 100%, 125%, 150% and 200% browser zoom, exercise aggregate/file popovers near all viewport edges. Use keyboard only, Escape/outside/toggle dismissal, focus restoration, light/dark/automatic themes, forced colours and a screen reader. Confirm that native focus indicators remain legible with GitHub’s raw counters hidden (default) and faint, that the failure marker restores them at full colour, and that the report becomes a bottom sheet below 544 px.

For a writable repository, click only the handoff first and inspect the network: no label mutation should be sent. Make the actual selection yourself in GitHub, confirm the exact existing label, and confirm unrelated labels are untouched. Repeat without write permission and on a tab without a native picker. Never count a fixture DOM insertion as that provider acceptance.

## Evidence outputs

`artifacts/browser-extension/build-receipt.json` hashes the unpacked distribution and records glyph/font standing. `qa/receipt.json` covers rendered controllers and screenshots; `qa/acquisition-receipt.json` covers acquisition fixtures; `qa/installed-receipt.json` covers the separate installed gate. `store/asset-manifest.json` records dimensions, formats, provenance and hashes. Timing samples are single sandbox observations, not comparative performance claims or guarantees.

Screenshots carry visible authored-fixture/source-candidate disclosures. The Store generator accepts only a successful DOM receipt and produces reproducible derivative assets from those captures. Generated artifacts and packaging are review evidence, not publication or acceptance authority.
