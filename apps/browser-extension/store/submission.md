# Submission and reviewer handoff

## Meaning

A finite release checklist for an already authored application and source-backed Store kit. Publication, public website changes, developer verification and the final Store submission remain explicit later effects. Do not treat an unverified candidate, ignored artifact or provider-dashboard draft as released product truth.

[The dashboard walkthrough](dashboard.md) is the split-screen operator packet. [Public links](public-links.md) owns final destinations, temporary fallbacks and their launch readback. This file owns package qualification and reviewer instructions; it does not duplicate those fields.

## Source and reproducibility

Record the accepted commit and base, Node/TypeScript/browser versions, package-lock integrity, build receipt and unpacked file hashes. Use the corresponding source, not a detached binary. Run the normal repository gates, application/core tests, browser DOM/acquisition tests and installed suite. Confirm no unrelated website, deployment or npm publication step is part of the build. Review generated Action-runtime changes and check their freshness.

Store copy and upload bytes come from `apps/browser-extension/store/`. Run `npm run extension:store` to validate the committed asset manifest and copy the exact source-backed kit into `artifacts/browser-extension/store/`. Do not edit descriptions only in the Chrome Web Store dashboard and do not upload an image that has no committed counterpart.

The committed visual set renders the Extension Grammar v1 implementation against authored fixtures. Review it against the accepted in-place experience before any Store submission; regenerate it deliberately whenever the rendered interface changes.

Build the selected source after its integration is accepted. A proposal-head build can qualify the candidate, but it must identify that proposal rather than claim accepted-main standing. If main moves, compare the actual extension/browser-engine/build/dependency closure before reusing evidence. Unrelated App changes alone do not require the extension's entire historical acceptance to be repeated.

### Exact package handoff

The technical return records:

- accepted base and candidate/final commit plus tree, clean/dirty standing, extension version, declared engine version and unpublished/released standing;
- Node, npm, TypeScript and actual browser versions, plus the package-lock SHA-256;
- ZIP path, SHA-256, byte size and member count; `build-receipt.json`, `package/package-receipt.json` and `bundle-metafile.json` paths;
- the old accepted archive identity and a comparison covering **every** member of both archives, including added/removed hash-named chunks, with old/new hashes and sizes;
- an explanation for each executable, import-path, build-metadata, permission, notice, privacy or asset difference, mapped to its actual source inputs;
- commands, receipts and exercised source identity, with installed fixture, public GitHub and private GitHub results kept distinct;
- `store/assets/asset-manifest.json`, exact retained/generated image standing and the source-backed dashboard packet; and
- remaining public readbacks or installed checks, with the receiving operator and exact next action.

Use the actual old archive, or a rebuilt archive whose whole ZIP hash equals its recorded accepted hash. A reconstruction that does not match is not the accepted comparison baseline. Do not equate unchanged file counts with unchanged package contents. Preserve an accepted archive rather than overwriting it in place under the same release identity.

## Browser release gate

Accept installed MV3 behavior in an unrestricted allowed Chrome profile, including CSP, real settings storage, IndexedDB, worker and browser restart, quotas, disabling/reset and no raw-source persistence. Accept real public and authorized private GitHub PRs and current modern/legacy placement where applicable. Check the full PR and narrowed/commit comparisons, head changes and native label handoff with and without permission. Execute Windows and real Chrome zoom/accessibility acceptance. Managed-policy-blocked evidence and authored fixtures do not satisfy these gates.

For a refresh, retain applicable accepted evidence and exercise the changed boundary proportionately. Changed shared-engine bytes require installed aggregate/file and policy checks on public and authorized private PRs; compare actual facts, bounded evidence and cached revalidation. Link/notice-only changes need the installed Settings/notice navigation and readable narrow/light/dark presentation. A Web environment without the authorized private profile hands that exact check to the local operator; it never relabels a public PR or synthetic fixture as private qualification.

Confirm the full-colour/none choices and the pinned accepted centre-seam monochrome resolver. The build must verify the shared glyph hash and must not redraw or substitute its geometry.

## Package and Store material

Build the exact version without development harnesses, source maps, tokens, credentials, test browser profiles or dependency caches in the unpacked package. The manifest must remain MV3 with the declared minimal permissions and no remote-code allowance. The package must contain its applicable code/font notices and corresponding-source location. A font-free package is supported; do not advertise bundled typography in that package.

Create the ignored extension archive only from an accepted unpacked build:

```sh
npm run extension:build
npm run extension:package
```

`extension:package` requires the unpacked tree to match its build receipt exactly, packages only the explicit extension-member allowlist in stable member and timestamp order, then reads the ZIP back and verifies every member's path, size, CRC-32 and SHA-256. Its ZIP and receipt are local release artifacts, not Store publication evidence.

The committed Store source must contain:

- `assets/store-icon-128.png`;
- five 1280×800 RGB screenshots under `assets/screenshots/`;
- the 440×280 small promotional PNG and editable SVG under `assets/promo/`;
- the optional 1400×560 marquee PNG and editable SVG under `assets/promo/`; and
- `assets/asset-manifest.json` with exact dimensions, colour type, SHA-256, provenance and standing.

Generated promotional rasters are PNG24 RGB; the icon deliberately has transparent outer padding. Preserve true proportions and verify small-size readability. Review all visible fixture disclosures before deciding whether accepted release captures should replace them. Do not relabel fixture images as real installed screenshots.

Intentional regeneration uses:

```sh
npm run extension:build
npm run extension:qa
npm run extension:store:generate
```

That command rewrites tracked source and therefore requires visual inspection plus an ordinary source diff. Routine Store preparation validates and copies; it does not silently regenerate artwork.

Use `listing.md` for the single purpose, short and detailed descriptions and `privacy-answers.md` for the actual local/synchronized data practices. Consume the accepted website/legal result and complete `public-links.md` before submission: the prepared product/manual/maker/contact links do not prove deployment, and the direct GitHub extension notice stays the explicit fallback until a dedicated replacement is accepted. Do not invent a Store URL or hardcode a made-up extension ID into the footer. Software licences, extension privacy, website Terms and operator contact keep their distinct meanings.

## Reviewer instructions

Load the corresponding unpacked package in an allowed Chrome profile, open an accessible GitHub PR, and wait for the comparison to qualify. Click Changed to inspect the report, including raw counts and revision identity. Open Settings with the toolbar action; search `#policy.advancedYaml`, change theme, inspect cache/diagnostics and try an invalid policy without overwriting the saved value. The README explains policy modes and the deliberate absence of hosted-App delivery.

On first install, Settings opens at `#ready`: inspect the active policy, automatic file budget, cache limit and public example link. Ready is orientation, not an account/setup wizard. In an accessible PR, check right-aligned aggregate and file seats, then navigate away and back, open the same comparison in a second tab, and restart the worker/browser. Cached facts must visibly revalidate; inaccessible or moved comparisons must not silently become current.

Use a PR above the selected automatic file budget to inspect measured/bounded/provider-declined coverage. Scroll onto additional files, try a file's on-demand action and the report's **Analyze remaining files** control. One explicit pass may still leave collapsed or unavailable files bounded; it does not promise a complete result.

Pause the repository from its report and use **Resume** on the page or at `#repositories.paused`. Inspect `#data.controls`, expand a repository and try confirmed **Clear this PR** and **Clear this repository** scopes on disposable data. Pausing preserves reports; a scoped clear does not resume or change GitHub. A PR clear retains the repository's trusted-policy cache, while a repository clear removes that cache as well. Settings and overrides remain separate.

The five Store images are production UI with authored fixtures, including test storage for the data-control specimen. They prove those rendered states, not installed unrestricted Chrome, real signed-in GitHub, Store submission or Store-installed use. Keep these evidence layers separate even when older installed evidence exists. At submission, preserve the exact unencrypted-cache disclosure and use Store review as the provider-interpretation route for this package. Do not certify strong at-rest encryption as present. If the dashboard requires an incompatible mandatory certification, stop at that field and return its exact wording. Select deferred publishing so approval does not publish automatically; public release remains a separate owner effect. A rejection returns its exact policy reason before any product-changing encryption work. No build receipt supplies legal certification or provider acceptance.

A writable repository is not required for local counts or virtual bands. Native-label handoff is visible only where the relevant native picker is available. An API rate limit or an inaccessible private base may require signed-in acquisition or a deliberate Personal only policy mode; it must not be reported as a zero-sized PR.

## Primary image specification

[Chrome Web Store images](https://developer.chrome.com/docs/webstore/images), checked 2026-10-12. Image dimensions and file hashes are recorded in `apps/browser-extension/store/assets/asset-manifest.json`; `artifacts/browser-extension/store/` is only its validated disposable copy. This checklist does not grant publication authority or claim Store approval.
