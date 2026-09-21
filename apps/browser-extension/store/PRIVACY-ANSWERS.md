# Store privacy declarations

## Meaning

These are source-grounded draft answers for the Store review of the exact release, not a claim of legal or platform certification. Local-only processing still counts as handling user data. Do not select “no user data handled” merely because the extension has no developer-controlled backend.

## Purpose and permissions

The single purpose is local measurement and inspection of the GitHub pull request the user is viewing. `storage` preserves preferences, recoverable local policy and disposable reports. The github.com content-script scope supports GitHub's client-side navigation into PR views; the controller exits unrelated routes without reading their content for analysis. The api.github.com host permission supports a narrowly constructed, unauthenticated, read-only public fallback. No cookies, history API, tabs enumeration, unlimited storage, all-sites host access or clipboard permission is requested.

## Data categories to disclose

Website content: the available diff, file identities, revision metadata, trusted repository-policy text, explicitly referenced templates and relevant native label controls are processed to supply the visible feature. Numeric reports, paths and trusted policy may be cached. Raw patches and template contents are not persisted by the analysis cache.

Web browsing activity: processing is confined to the active supported GitHub PR route, but comparison cache keys and the last-analysis identity can reveal which PRs were used. Disclose that limited activity rather than claiming that absence of the browser-history permission means no URL-associated user data exists. The extension does not build or transmit an unrelated browsing history.

User-provided configuration: small display/guided settings can synchronize through Chrome's own sync service; advanced YAML and per-repository overrides remain local. Exports deliberately contain their configuration and repository identifiers. The redacted support snapshot is a separate, user-initiated operation.

No payment, health, authentication secret, advertising identifier or general personal-communications collection is implemented. Private source or policy may itself contain sensitive material; do not claim that the extension can guarantee its absence merely because the feature does not seek that category.

## Use, sharing and safeguards

Data is used to provide the visible PR-analysis feature and its local settings, cache and diagnostics. There is no sale, advertising use, creditworthiness use, telemetry endpoint or unrelated transfer. GitHub receives ordinary requests for its own resources. Chrome may synchronize the small synchronized preferences. The extension does not transmit source to Wolfsblvt Works or a hosted diffdevil analyzer. A user-requested export/copy remains the user's deliberate action.

Support diagnostics persist codes and timestamps, not raw response bodies or policy expressions. Full settings exports are not support snapshots and must not be described as redacted. Rebuildable storage has a visible limit, LRU eviction and independent clear controls; reset and destructive override removal require confirmation. Incognito is disabled. There is no independent cache encryption, and no universal encrypted-profile assertion is made. The owner must assess the exact release's storage/security posture against Store requirements before publication.

## Remote code

No remotely hosted executable code is used. JavaScript, compiled validators, CSS, images and optional fonts are packaged. Diffs and policy documents are data handled by the bundled, bounded language implementation. They cannot introduce new JavaScript or change the extension's host permissions.

## Public notice and owner attestations

The bundled privacy notice is `apps/browser-extension/PRIVACY.md`. A public, reachable version is required for the dashboard. The owner must attest to the current Limited Use requirements only after reviewing the exact package and public notice; this source session does not fabricate an owner's legal certification. Reviewer access and any required test account must be arranged by the owner without putting credentials in the repository or source archive.

## Primary references checked 2026-09-19

[Privacy policy requirement](https://developer.chrome.com/docs/webstore/program-policies/privacy/), [local processing and user-data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq), [Limited Use](https://developer.chrome.com/docs/webstore/program-policies/limited-use), and [privacy troubleshooting](https://developer.chrome.com/docs/webstore/troubleshooting). Dashboard category wording and requirements must be checked at actual submission; the generated asset and source manifest are not a Store decision.
