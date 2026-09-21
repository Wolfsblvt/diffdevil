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
npm run extension:store
npm run check:actions
```

Install the appropriate Playwright browser first with `npx playwright install chromium`, or set `CHROMIUM_EXECUTABLE` to an allowed installation. The installed runner supports `HEADED=1`. It never alters managed policies. Without `--require`, an installation prohibition writes a `blocked-by-managed-policy` receipt without pretending to have run installed assertions; with `--require`, it fails the gate with exit status 2.

## Implemented automated coverage

The shared-core tests exercise replacement-aware/raw parity, all evidence states, partial source and binary behavior, SHA validation, counter disagreement, file projections, exclusions, real policy dialect/composition/provenance, malformed lower policy, independent bands, runtime SHA parity and App identity standing.

The application tests use actual production classes with explicitly injected storage and fetch contracts. They cover defaults and policy lowering, include-only semantics, partial label mappings, settings validation and overrides, queueing/journal recovery, quota rollback, LRU invariants, sender/PR scopes, public API pagination and freshness, policy absence versus inaccessible base, bounded bodies, manifest permissions and closed executable bundles.

The rendered-browser suite executes the real options and content controllers. It checks literal anchors, deep-link focus, Advanced discovery, search/view/draft preservation, invalid edits, reset confirmation, themes and phone widths; lazy modern/legacy file placement, repeated navigation, root replacement, whole-PR versus commit-only views, late-head rejection, bounded retries, native diffstat restoration, icon modes and conservative evidence; anchored interaction by click, Escape, outside pointer and keyboard; text-only hostile paths; native-picker filtering without a provider mutation; and absence of external requests or uncaught page errors in the fixture run.

A separate browser acquisition suite exercises the production signed-in adapter with authored HTTP responses. It checks immutable-base policy/template acquisition, after-fetch head validation, cache reuse, private/inaccessible 404 handling, truncated policy, deliberate Personal only, traversal rejection, HTML/error response rejection, byte limits, cancellation and independently confirmed empty comparisons. These are adapter tests, not live network, cookies or CORS evidence.

The installed runner is fully authored. On an unrestricted browser it verifies actual MV3 startup/CSP, real synchronized/local storage separation, engine execution, IndexedDB normalization, browser/worker restart, cache reuse and explicit clear/reset behavior. It uses a synthetic report submitted through the real worker and does not impersonate live provider evidence.

## This source session

The source was reconstructed and verified against main commit `86dcf193a3186467d5b5f24a4246767adaf0a069`, tree `0658aa5f8b0e97f1774d05abb2bfc4b9f22bf733`. The local recovery commit is synthetic; it is not that upstream commit's ancestry. The extension does not depend on unmerged presenter PR #25 or claim that earlier bounded PR #26 contains this full application.

The supplied receipts describe Linux Node 22.16.0, TypeScript 5.8.3 and managed Chromium 143. Core and application checks passed, as did rendered DOM and acquisition fixtures. The exact final counts, versions, hashes and durations belong to the generated receipts and room return, not a permanently frozen number in this manual.

Managed Chromium blocks extension installation and general navigation here. The installed probe records that prohibition; no policy was changed. Live public/private GitHub layouts, actual authenticated redirects, native extension storage/worker behavior, browser zoom settings, Windows runtime and native provider selection are not accepted by the DOM fixture evidence. Responsive viewport tests are not a substitute for installed Chrome zoom acceptance.

The ordinary repository suite also runs unrelated application tests. In this sandbox, the existing `apps/github-app/d1-state.test.mjs` cannot load its locked `miniflare` package. The other registered tests ran; the root suite remains non-green rather than suppressing that file or fabricating D1 behavior. Wrangler/Astro dry-run/build gates likewise require their ordinary locked development dependencies. Run the normal repository CI before accepting the source.

## Acceptance matrix for an unrestricted browser

Use an allowed Chrome profile with a disposable fixture repository. Cover both public and authorized private repositories, all four PR tabs, full Files changed, a commit-only diff, soft navigation between PRs, force-push/base updates during an in-flight read, file expansion and root replacement. Exact numbers should match the same CLI source and policy, with incompleteness deliberately exercised rather than hidden.

Check real cookies, redirects, public API rate limits and inaccessible-base policy errors. Verify no raw patch persists in IndexedDB/local/sync storage; inspect actual report/path and policy cache contents, size eviction and browser quota failure. Restart the browser and worker, then repeat cached analysis and clear/reset. Check two tabs with different comparisons and policies; obsolete results must not cross scopes.

At 80%, 100%, 125%, 150% and 200% browser zoom, exercise aggregate/file popovers near all viewport edges. Use keyboard only, Escape/outside/toggle dismissal, focus restoration, light/dark/automatic themes, forced colours and a screen reader. Confirm that native focus indicators remain legible when raw stats are dimmed.

For a writable repository, click only the handoff first and inspect the network: no label mutation should be sent. Make the actual selection yourself in GitHub, confirm the exact existing label, and confirm unrelated labels are untouched. Repeat without write permission and on a tab without a native picker. Never count a fixture DOM insertion as that provider acceptance.

## Evidence outputs

`artifacts/browser-extension/build-receipt.json` hashes the unpacked distribution and records glyph/font standing. `qa/receipt.json` covers rendered controllers and screenshots; `qa/acquisition-receipt.json` covers acquisition fixtures; `qa/installed-receipt.json` covers the separate installed gate. `store/asset-manifest.json` records dimensions, formats, provenance and hashes. Timing samples are single sandbox observations, not comparative performance claims or guarantees.

Screenshots carry visible authored-fixture/source-candidate disclosures. The Store generator accepts only a successful DOM receipt and produces reproducible derivative assets from those captures. Generated artifacts and packaging are review evidence, not publication or acceptance authority.
