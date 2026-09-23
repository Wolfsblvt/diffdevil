# Store privacy declarations

## Meaning

These are source-grounded answers for the Store review of the exact release, not a claim of legal or platform certification. Local-only processing still counts as handling user data. Do not select “no user data handled” merely because the extension has no developer-controlled backend.

The provider dashboard must agree with this file, the bundled/public privacy notice, the listing copy and the exact uploaded package. A dashboard answer that exists only in Google is a release defect.

## Purpose and permissions

The single purpose is local measurement and inspection of the GitHub pull request the user is viewing. `storage` preserves preferences, recoverable local policy and disposable reports. The github.com content-script scope supports GitHub's client-side navigation into PR views; the controller exits unrelated routes without reading their content for analysis. The api.github.com host permission supports a narrowly constructed, unauthenticated, read-only public fallback. No cookies, history API, tabs enumeration, unlimited storage, all-sites host access or clipboard permission is requested.

## Privacy-dashboard data categories

| Category | Declare | Exact standing |
| --- | --- | --- |
| Website content | Yes | Available diff text, file identities, revisions, trusted repository policy/templates and relevant native label controls are processed for the visible PR feature. Raw patches and template contents are not persisted by the report cache. |
| Web browsing activity | Yes, limited | Processing is confined to supported GitHub PR routes. Cache keys and last-analysis identity can reveal which PRs were used. The extension does not build or transmit a general browsing history. |
| User-provided content | Yes | Display/guided settings, advanced policy, repository overrides and deliberate imports/exports are handled. Small preferences may synchronize through Chrome; advanced policy and repository overrides remain local. |
| Authentication information | No | The extension does not collect a PAT, password, authentication cookie or OAuth token. Ordinary browser/GitHub requests may use the user's existing signed-in browser context without exposing those credentials to diffdevil storage. |
| Personally identifiable information | Not intentionally collected as a category | Repository/account names and paths may contain personal identifiers and must therefore still be protected as website content. Do not claim that private source cannot contain sensitive material. |
| Personal communications | No intended product use | PR source and policy are measured as code/configuration, not collected for communication analysis. |
| Health, financial/payment, precise location | No | No corresponding feature or field exists. |

## Use, sharing and safeguards

Data is used only to provide the visible PR-analysis feature and its local settings, cache and diagnostics.

| Provider declaration | Source answer |
| --- | --- |
| Sold to third parties | No |
| Used or transferred for advertising | No |
| Used or transferred for creditworthiness or lending | No |
| Used for an unrelated purpose | No |
| Human access by Wolfsblvt Works | No routine access; user-initiated support/export material is shared only when the user deliberately sends it |
| Transmitted to a developer-controlled backend | No |
| Shared with GitHub | Only ordinary HTTPS requests for GitHub's own comparison/configuration resources |
| Shared with Chrome sync | Only the small settings explicitly assigned to Chrome synchronized storage |

There is no telemetry endpoint, sale, advertising use, creditworthiness use or unrelated transfer. The extension does not transmit source to Wolfsblvt Works or a hosted diffdevil analyzer. A user-requested export/copy remains the user's deliberate action.

Support diagnostics persist codes, timestamps, phase, frame, document and tab identifiers, and coarse sender/tab route standings; they do not keep raw response bodies, policy expressions or full route URLs. Full settings exports are not support snapshots and must not be described as redacted. Rebuildable storage has a visible limit, LRU eviction and independent clear controls; reset and destructive override removal require confirmation. Incognito is disabled. There is no independent cache encryption, and no universal encrypted-profile assertion is made. The release owner must assess the exact package's storage/security posture against current Store requirements before publication.

## Remote code

No remotely hosted executable code is used. JavaScript, compiled validators, CSS, images and optional fonts are packaged. Diffs and policy documents are data handled by the bundled, bounded language implementation. They cannot introduce new JavaScript or change the extension's host permissions.

## Public notice and owner attestations

The bundled privacy notice is `apps/browser-extension/privacy.md`. The current public source URL selected in `listing.md` is valid until the accepted public privacy route is deployed and read back. The owner must complete the provider's Limited Use certification only after reviewing the exact package and public notice; source authorship does not fabricate an owner's legal certification. Reviewer access and any required test account must be arranged without putting credentials in the repository or source archive.

## Primary references checked 2026-09-22

- [Listing requirements](https://developer.chrome.com/docs/webstore/program-policies/listing-requirements)
- [Local processing and user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Disclosure requirements](https://developer.chrome.com/docs/webstore/program-policies/disclosure-requirements)
- [Handling requirements](https://developer.chrome.com/docs/webstore/program-policies/data-handling)
- [Complete the Store listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing)
- [Publish in the Chrome Web Store](https://developer.chrome.com/docs/webstore/publish/)

Dashboard wording and requirements must be checked at actual submission. The committed manifest and Store source establish intended values; they do not prove provider acceptance.
