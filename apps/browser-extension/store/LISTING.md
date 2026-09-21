# Store listing copy

## Meaning

Authored copy for the browser application. Publish only after the exact candidate passes the release gate. This document does not assert that a Store listing exists.

## Name

diffdevil for GitHub

## Short description

See replacement-aware Changed lines, personal size bands and inspectable diff reports directly in GitHub pull requests.

## Single purpose

Help users understand the size and evidence of the GitHub pull requests they are viewing by measuring available diffs locally and presenting the results in GitHub's interface.

## Detailed description

GitHub shows added and removed lines. diffdevil also shows what changed.

A replaced line is one changed position, not two units of churn. diffdevil displays **Changed** with added-only, deleted-only and modified components, while keeping raw additions and deletions available as a separate view. Pull-request totals and each acquired file use the same reusable diffdevil engine.

Choose your own size policy. Use personal defaults, the repository's trusted base-revision configuration, or a deliberate composition with your own repository override. Edit thresholds, optional existing-label mappings and path rules, or use the full diffdevil YAML policy language. Local size classifications work without owning the repository and do not apply GitHub labels.

Open the anchored report for revisions, measurement evidence, files, metrics, scopes, bands, rules and policy provenance. Incomplete or unmeasurable material stays explicit. Missing source never becomes a reassuring exact zero.

The full settings application includes search, Basic and Advanced views, shareable stable-setting links, authored light/dark themes, monochrome/full-colour/no-icon preferences, import/export, cache controls and redacted support diagnostics. Native GitHub counters can be left alone, dimmed or deliberately hidden.

No account or local daemon is required. The extension does not collect a personal access token, trigger hosted App analysis or send your source to a diffdevil service. It reads the current GitHub comparison, its trusted configuration and explicitly referenced templates from GitHub, processes them locally, and stores bounded rebuildable numeric reports and policy data in your browser. Small preferences may synchronize through Chrome; advanced policy and repository overrides remain local. Cached reports can include private paths and repository identifiers. You can inspect and clear that data in Settings.

An optional native-label handoff opens and searches GitHub's visible picker. You make the actual GitHub selection. There are no automatic label mutations, new-label creation or hidden provider writes.

This candidate supports github.com in normal Chrome profiles. It does not support Incognito or GitHub Enterprise hosts. Very large or incomplete provider responses are qualified or rejected explicitly. The interface currently presents local results; it does not claim authenticated hosted-App report delivery. This is an independent tool, not a GitHub or Google product.

## Links and fields

The source, issues and product links point to the existing `Wolfsblvt/diffdevil` repository. The owner must supply an actually reachable public privacy-policy URL for the accepted source and the real developer/contact identity in the Store dashboard. Do not enter the unpublished local options URL as the public privacy-policy URL. No new website inclusion or deployment is part of this Work.
