# Chrome Web Store dashboard walkthrough

## Meaning

Keep this packet beside the Chrome Web Store developer dashboard when the owner later authorizes submission. It maps the exact package, public URLs, listing copy, privacy declarations and retained images to a finite sequence. It is preparation, not a record of an upload, certification, review request or publication.

The source is ready for the operator when the release handoff in [Submission](submission.md) names an accepted source, exact ZIP/hash, passing applicable checks and completed [public-link readback](public-links.md). A source candidate or the old historical ZIP does not satisfy that handoff.

## 1. Put the exact inputs beside the dashboard

Use the generated `artifacts/browser-extension/store/` copy, its `assets/asset-manifest.json`, the accepted package receipt and these source-owned copy blocks. Confirm the package SHA-256 immediately before upload. The upload object is `diffdevil-for-github-1.0.0.zip`, containing the extension itself; do not upload the Store-kit directory, an evidence bundle or a ZIP of screenshots.

This is the first unpublished `1.0.0` candidate. If the intended Store item already contains that version, reconcile its actual package/version state before uploading another archive. The extension manifest owns the update number; the npm/engine version is not an instruction to renumber it. Use [release-family guidance](../../../docs/RELEASING.md#browser-version-constraints).

Open the intended developer account and item. For a first item, Google's documented sequence is **Add new item → Choose file → Upload**. For an existing item, use its **Package** page and reconcile the actual item identity; do not create a duplicate listing. Record the resulting item ID and provider package version with the local hash. An upload alone does not submit for review.

## 2. Store listing

| Dashboard field | Exact source/input |
| --- | --- |
| Name | `diffdevil for GitHub`; agrees with the manifest |
| Short description | The Short description block in [listing.md](listing.md#short-description) |
| Detailed description | The complete Detailed description block in [listing.md](listing.md#detailed-description) |
| Language / category | English / Developer Tools |
| Homepage | `https://diffdevil.dev/extension/`, after its recorded readback |
| Support | `https://contact.wolfsblvt.works/?product=diffdevil`, after the contact journey's readback |
| Official URL | The verified `https://diffdevil.dev/` property only if offered; otherwise unset |
| Mature content / in-app purchases / video | No / No / none selected |
| Store icon | `assets/store-icon-128.png`, 128 × 128 |
| Screenshots | The five PNGs below, in order, all 1280 × 800 |
| Small promotional image | `assets/promo/small-promo-440x280.png`, 440 × 280 |
| Optional marquee | `assets/promo/marquee-1400x560.png`, 1400 × 560 |

Screenshot order:

1. `assets/screenshots/01-changed-on-github.png`
2. `assets/screenshots/02-inspect-the-report.png`
3. `assets/screenshots/03-large-pr-coverage.png`
4. `assets/screenshots/04-your-policy-bands.png`
5. `assets/screenshots/05-local-data-control.png`

Use the committed hashes, captions and fixture standing in the asset manifest. Do not crop, recompress or relabel the screenshots as live/private captures during upload. The editable promotional SVGs are retained source, not upload images.

## 3. Privacy practices

Use the Single purpose block from [listing.md](listing.md#single-purpose), the matching permission blocks and full declaration map in [privacy-answers.md](privacy-answers.md). Remote code is **No, I am not using remote code**. Policy text and diffs are data interpreted by packaged code.

Set **Privacy policy URL** to `https://github.com/Wolfsblvt/diffdevil/blob/main/apps/browser-extension/privacy.md` unless the public-link readback records an accepted dedicated extension notice. Inspect the actual notice before continuing. The website privacy URL and a source-resolver landing page are not silent substitutions.

The extension handles website content, limited GitHub PR-route activity and user-provided configuration, including local data and the small Chrome-sync preference subset. Do not select an all-data-free answer. Match the actual dashboard categories to the source declaration map; an unavailable or differently scoped category is a visible mismatch to reconcile, not a new checkbox to invent.

The owner reviews each actual certification against the exact package and public notice. The Limited Use affirmation is already in the notice; this packet does not sign it on anyone's behalf.

**Stop condition:** the cache is not independently encrypted. If any mandatory field or certification would assert strong independent at-rest encryption, or that this unmet requirement has been satisfied, stop before making it and return the exact wording. A general compliance certification can also create that conflict. Local-only processing, HTTPS, Chrome storage and a protected browser profile do not supply the missing claim. Do not alter the continuity model, add an unlock burden or create a support case to get past the field.

## 4. Distribution and test instructions

Select Public, free distribution in all supported regions unless a current legal/provider restriction requires an explicitly recorded narrower set. Do not use a visibility change as a substitute for deferred publication.

The **Test instructions** page receives the reviewer instructions in [submission.md](submission.md#reviewer-instructions), including the actual public example `https://github.com/Wolfsblvt/diffdevil/pull/48`. Local counts and virtual bands require no diffdevil account, token or writable repository. Private-repository credentials are never pasted into public source, this packet or the ZIP. If the provider needs restricted test access, arrange its exact supported channel under separate authority.

## 5. Save, compare and request review with publication deferred

Save the tabs and compare the provider readback with the source: identity/version, descriptions, all URLs, image order, declarations, distribution and test instructions. Resolve validation errors in their owning source; preserve exact provider wording when it changes a required claim.

Only under the later owner submission authority, choose **Submit for Review**. Google's documented confirmation offers automatic publishing after approval: **uncheck that option** so publication is deferred. Read back that setting before confirming and record review state afterward. Do not infer deferred publication merely because it was intended.

Approval leaves a separate owner publication decision. Google's current guidance gives an approved staged item a 30-day publication window before returning to draft; record the actual deadline and hand it back rather than publishing automatically or creating a reminder without a request. A rejection returns its exact package-specific reason before product changes. Review acceptance does not certify an exemption from every policy.

## Documentation basis

Google's [listing fields](https://developer.chrome.com/docs/webstore/cws-dashboard-listing), [privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) and [upload/review/deferred-publishing procedure](https://developer.chrome.com/docs/webstore/publish) were checked on 2026-10-23. This is a documentation-based walkthrough; the signed-in dashboard has not been inspected by this preparation. If its actual controls or required statements differ, preserve that exact mismatch before continuing.
