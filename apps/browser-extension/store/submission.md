# Submission and reviewer handoff

## Meaning

A finite release checklist for an already authored application and source-backed Store kit. Publication, public website changes, developer verification and the final Store submission remain explicit later effects. Do not treat an unverified candidate, ignored artifact or provider-dashboard draft as released product truth.

## Source and reproducibility

Record the accepted commit and base, Node/TypeScript/browser versions, package-lock integrity, build receipt and unpacked file hashes. Use the corresponding source, not a detached binary. Run the normal repository gates, application/core tests, browser DOM/acquisition tests and installed suite. Confirm no unrelated website, deployment or npm publication step is part of the build. Review generated Action-runtime changes and check their freshness.

Store copy and upload bytes come from `apps/browser-extension/store/`. Run `npm run extension:store` to validate the committed asset manifest and copy the exact source-backed kit into `artifacts/browser-extension/store/`. Do not edit descriptions only in the Chrome Web Store dashboard and do not upload an image that has no committed counterpart.

## Browser release gate

Accept installed MV3 behavior in an unrestricted allowed Chrome profile, including CSP, real settings storage, IndexedDB, worker and browser restart, quotas, disabling/reset and no raw-source persistence. Accept real public and authorized private GitHub PRs and current modern/legacy placement where applicable. Check the full PR and narrowed/commit comparisons, head changes and native label handoff with and without permission. Execute Windows and real Chrome zoom/accessibility acceptance. Managed-policy-blocked evidence and authored fixtures do not satisfy these gates.

Confirm the full-colour/none choices and the pinned accepted centre-seam monochrome resolver. The build must verify the shared glyph hash and must not redraw or substitute its geometry.

## Package and Store material

Build the exact version without development harnesses, source maps, tokens, credentials, test browser profiles or dependency caches in the unpacked package. The manifest must remain MV3 with the declared minimal permissions and no remote-code allowance. The package must contain its applicable code/font notices and corresponding-source location. A font-free package is supported; do not advertise bundled typography in that package.

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

Use `listing.md` for the single purpose, short and detailed descriptions. Use `privacy-answers.md` to disclose website content, limited PR-route activity and local/synchronized configuration. Set a real public privacy-policy URL and real owner contact identity. Do not invent a Store URL or hardcode a made-up extension ID into the footer. The source/options/product links can remain the existing repository links until the accepted public website supplies better canonical routes.

## Reviewer instructions

Load the corresponding unpacked package in an allowed Chrome profile, open an accessible GitHub PR, and wait for the comparison to qualify. Click Changed to inspect the report, including raw counts and revision identity. Open Settings with the toolbar action; search `#policy.advancedYaml`, change theme, inspect cache/diagnostics and try an invalid policy without overwriting the saved value. The README explains policy modes and the deliberate absence of hosted-App delivery.

A writable repository is not required for local counts or virtual bands. Native-label handoff is visible only where the relevant native picker is available. An API rate limit or an inaccessible private base may require signed-in acquisition or a deliberate Personal only policy mode; it must not be reported as a zero-sized PR.

## Primary image specification

[Chrome Web Store images](https://developer.chrome.com/docs/webstore/images), checked 2026-09-19. Image dimensions and file hashes are recorded in `apps/browser-extension/store/assets/asset-manifest.json`; `artifacts/browser-extension/store/` is only its validated disposable copy. This checklist does not grant publication authority or claim Store approval.
