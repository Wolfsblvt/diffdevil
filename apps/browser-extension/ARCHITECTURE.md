# Browser-extension architecture

## Meaning

The browser is a new host for the existing measurement and policy system. DOM markup is placement and acquisition evidence, not a second analysis engine. The extension uses the presenter and application foundations already on its current `main` base without modifying the website or its public marketing surface.

## Boundaries and ownership

`src/diffdevil/browser/` is reusable MIT code. Its serialized acquisition and policy entry points validate data, invoke the existing parser/normalizer/compiler/evaluator and return the typed human projection. `github/changes.ts` is the original pure provider-file normalization extracted from `github/source.ts`; Node and browser consumers share it.

`apps/browser-extension/src/content/` owns github.com lifecycle and presentation. Its production controller accepts explicit platform dependencies for deterministic testing; the real bootstrap uses the actual location, acquisition and extension messaging. The content bundle imports the lightweight measurement formatter, not the compiler or parser. `src/background/` owns processing, settings transactions, bounded rebuildable storage and tightly scoped public API reads. `src/options/` is a separate full-tab application. Neither UI reconstructs numbers from CLI output or parses terminal styling.

The public `@wolfsblvt/diffdevil/browser` export is a closed ESM browser bundle. Fixed standalone validators are bundled ahead of time. No Node aliases, remote executable code, dynamic evaluation or schema compilation are required from consumers. Browser SHA-256 parity is tested against Node. Browser code cannot inspect proxies; the facade accepts serialized input, parses it into its own inert realm and uses the existing engine's validation boundary rather than trusting caller-owned executable objects.

## Comparison and acquisition

A comparison key contains host, normalized repository, PR number and full immutable base/head SHAs. A cache entry cannot become current merely because it was drawn at the same URL. Provider-generated JSON and narrowly selected immutable attributes can identify the comparison; arbitrary issue prose, abbreviated commit labels and GitHub line counters alone cannot.

The signed-in route starts from the page's own comparison. When the worker already holds a report for that exact comparison, the content script reattaches from it at once and confirms freshness against a fresh read of the same PR route in the background; a cached report exists only for a comparison that was confirmed for that PR before, so ordinary tab navigation never repeats acquisition, while a moved head keeps the old result visible as re-reading and reads the confirmed comparison. Otherwise the embedded comparison is confirmed against the same route before any policy or cache use. Source then comes from GitHub's `.diff` route when a page context can reach it (it redirects cross-origin without CORS, so it normally cannot), else from the `/changes` page's own embedded file summaries and diff contents plus its same-origin `page_data/diff_entries` route (`paths`, `w=0`, `range=<head>`, with the `GitHub-Verified-Fetch`, JSON `Accept` and `X-Requested-With` headers the page sends), loaded in batches of eight for the files GitHub did not embed; that covers private pull requests without any token. Each entry is verified against the summary counters by the engine; a file GitHub declines (`isTooBig`, binary, submodule, truncated) or that the route does not return stays bounded (`PATCH_OMITTED`), and the anonymous API is consulted only to complete a public comparison. The public fallback reads PR metadata, paginated files, then metadata again without credentials. The latter uses at most thirty 100-file pages, honors transport/evidence limits and rejects a changed comparison. Explicit provider counters are cross-checked. A diff cut at a complete file boundary is still incomplete unless independent cardinality proves the file set. A malformed final hunk cannot bless exact facts; complete independent blocks remain useful when recoverable.

The signed-in diff and HTML response limit is 8 MiB. Serialized worker/acquisition requests are bounded at 24 MiB. Policies and individual templates are bounded at 256 KiB; at most sixteen explicit template paths are acquired. The API adapter has a 20 MiB aggregate pagination limit and a 20-second request timeout. These are execution limits, not statements that larger PRs have no changes. A source-limit failure is visible and never substituted with a fabricated empty report.

The content script's same-origin request is subject to the real browser's cookies, CORS, redirect and enterprise policies. The API host permission is not a claim that a content script can ignore those rules. The local Web sandbox cannot verify signed-in private GitHub access. Modern GitHub markup is an unstable provider interface; fixtures demonstrate the implemented selectors, not a promise about every future layout.

## Policy composition

Each participating policy is parsed and normalized through the real core. For higher layers, only explicitly declared normalized origins are overlaid. An implicit repository preset must not reset personal defaults. Named declarations and arrays replace; path members merge. Explicit presets replace inherited preset-origin values, not separately authored declarations. Every composed prefix compiles, so an upper override cannot hide a broken lower policy while valid upper expressions may reference lower declarations.

Composed: personal < repository at base < explicit personal override. Repository: repository, or personal if absent; personal overrides are ignored. Personal only: personal < explicit personal override, never repository. Empty include-only controls omit the member: an explicit `includeOnly: []` means include nothing in the core and is not a synonym for no restriction.

Guided UI values lower to ordinary policy declarations. Nonempty advanced YAML replaces that guided personal document. Names and optional colour metadata can decorate personally owned bands, but never overwrite a repository-authored band's provenance or facts. Partial label mappings are local handoff metadata, not an invented incomplete core label effect. A file projection evaluates its own core facts. Excluded files retain real measurements but have no virtual size classification.

Repository policy, including referenced templates, is read at the trusted base, not the pull-request proposal. A 404 is cached as absence only when exact-base access is independently confirmed. Invalid/unavailable policy leaves the report readable without a band. Users can deliberately choose Personal only rather than having the extension make that decision silently.

## Lifecycle and cache

Generation counters and AbortControllers prevent an old PR/head response from replacing the current view. Policy/settings changes use distinct context identities. Equivalent in-flight analysis is deduplicated; at most three analysis operations are accepted concurrently. The worker retains at most six report contexts and 150 focused projections per context. Source memory is transient. Twenty-four visible paths are requested per projection batch; failed/missing paths do not generate an endless retry loop.

A scoped repository-root MutationObserver watches provider changes. A cheap outer watcher only rebinds a detached root. There is no interval polling, broad rescanning for every page mutation, MutationObserver loop on injected nodes or global body opacity. Soft navigation, head changes, lazy files, root replacement, themes and explicit disabling are separate transitions. Per-file whole-PR facts are not injected into commit-only/narrowed views.

Rebuildable IndexedDB entries have identities, estimated serialized byte sizes and access timestamps. A 4–128 MiB LRU budget applies to normalized reports and trusted policy entries. Oversized entries are not persisted. The browser's independent quota may still reject a write; cache failure does not cancel a valid in-memory analysis. A generation boundary prevents a late operation repopulating data cleared by the user. Clearing cache never clears user configuration. Browser restart may retain cache but loses in-memory contexts; the controller detects that boundary and reacquires a context.

Small synchronized preferences and larger local policy/overrides use a serialized transaction with a durable previous-state journal. Interrupted writes recover before the next load/save. A failed rollback retains the journal and reports the failure; it does not silently delete policy. Reset is an explicit destructive operation. It also clears the settings page's local theme hint.

## Human and native surfaces

Seats replace GitHub's diffstat in place: the seat is inserted before the native node and the native node is hidden or demoted with a class, never removed, so a failure restores it exactly where it was. Inline surfaces use only host tokens; the report uses diffdevil tokens only inside its machine block and renders in a shadow root with the host variables inherited. The decomposition triplet is one indivisible unit, the rail is layout-driven, and the size chip's border style carries its standing. `Copy facts` asks the worker for the CLI's own human presenter over the same report; the content script never reconstructs text from the DOM. Monochrome/full-colour/none changes only the product mark, not measurement evidence. The monochrome default resolves the accepted shared centre-seam `diffdevil/brand` glyph copied unchanged from its pinned MIT source; this repository does not redraw its geometry.

The report is one non-modal anchored element. It does not lock page scrolling, request fullscreen or turn into a sidebar. It fits on the chosen side without covering its own trigger, has constrained inner scrolling, handles resize/zoom-sized viewports, closes on anchor disappearance and restores focus appropriately. All provider/path/policy text is inserted as text, not executable HTML.

The native label handoff opens and filters GitHub's visible picker. It never clicks the actual selection, sends a hidden mutation or creates a label. Native DOM readback can say a label was observed; it cannot prove the actor or response of a hidden provider operation. Other managed labels remain the user's native reconciliation decision.

## Optional App contract

`appStanding` compares the complete comparison, report, effective-policy, engine, schema, semantics and presenter identities. An older head is stale; a current report with different policy is not agreement; a version mismatch is incompatible. No guessed report-delivery endpoint exists. The current application always says local. A concrete authenticated producer/transport is a preserved external integration boundary, not permission to scrape a convincing-looking comment and display a checkmark.

## Sources

Provider constraints: [Chrome network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests), [storage](https://developer.chrome.com/docs/extensions/reference/api/storage), [GitHub PR files](https://docs.github.com/en/rest/pulls/pulls#list-pull-requests-files), [GitHub API versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions). Read against the implementation on 2026-09-19. These describe platform interfaces; they do not establish this candidate's live-browser acceptance.
