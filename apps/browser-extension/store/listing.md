# Chrome Web Store listing copy

## Meaning

This file keeps the public Chrome Web Store text and provider-field values versioned with the repository. The Store dashboard receives these exact fields; it must not become an independent copy source. Publication still requires the accepted release gate and provider readback.

The visual asset set renders the Extension Grammar v1 implementation against authored fixtures. Review it against the accepted in-place experience before any Store submission; regenerate it deliberately whenever the rendered interface changes.

## v1.0.0

### Provider fields

| Field | Source value |
| --- | --- |
| Name | `diffdevil for GitHub` |
| Primary language | `English` |
| Category | `Developer Tools` |
| Distribution | Public; free; all supported regions unless a current legal/provider restriction requires an explicit narrower set |
| Mature content | No |
| In-app purchases | No |
| Homepage URL | Final: `https://diffdevil.dev/extension/`. Temporary draft fallback: `https://github.com/Wolfsblvt/diffdevil/blob/main/apps/browser-extension/README.md` until that page is deployed and read back |
| Support URL | Final: `https://contact.wolfsblvt.works/?product=diffdevil`. Temporary draft fallback: `https://github.com/Wolfsblvt/diffdevil/issues` until the Works contact journey is deployed and qualified |
| Privacy policy URL | `https://github.com/Wolfsblvt/diffdevil/blob/main/apps/browser-extension/privacy.md`. Keep this direct extension notice until a dedicated extension-specific public route is accepted and read back; the generic website privacy page is not a substitute |
| Official URL | Select the verified `https://diffdevil.dev/` property only if offered by the provider's verified-site selector; otherwise leave unset |
| Promotional video | None selected. Do not add a provider-only URL; any later video and exact URL must first be admitted here. |

If the live dashboard vocabulary or required category list differs, stop at that visible provider mismatch and update this source before submission. Do not silently choose a nearby provider value.

[Public links](public-links.md) owns the complete package/site/contact URL matrix and finite cutover readback. [Dashboard walkthrough](dashboard.md) places these fields beside the exact package and asset handoff. The source values above do not assert live availability or verified domain ownership.

### Name

```text
diffdevil for GitHub
```

### Short description

```text
See replacement-aware Changed lines, personal size bands and inspectable diff reports directly in GitHub pull requests.
```

### Single purpose

```text
Help users understand the size and evidence of the GitHub pull request they are viewing by measuring available diffs locally and presenting the results in GitHub's interface.
```

### Detailed description

```text
GitHub shows added and removed lines. diffdevil also shows what changed.

A replaced line is one changed position, not two units of churn. diffdevil displays Changed with added-only, deleted-only and modified components, while keeping raw additions and deletions available separately. Pull-request totals and each acquired file use the same deterministic diffdevil engine.

Understand the comparison. See replacement-aware Changed in GitHub's own pull-request and file diffstat seats, keeping the host's right-edge placement. Open an anchored report for the decomposition, raw churn, file facts, immutable revisions, metrics, scopes, rules and policy provenance. Exact, bounded, incomplete and unmeasurable evidence stay distinct; missing source never becomes zero or an unsupported exact total.

Keep working across ordinary browser life. Bounded, rebuildable local reports can reappear across navigation, tabs, extension-worker restart and browser restart. Cached facts visibly revalidate against GitHub before becoming current. If GitHub cannot be reached or the comparison has moved, the extension tells you instead of silently treating an old report as fresh.

Handle large pull requests honestly. A configurable automatic file budget bounds the opening work. Files you scroll onto can use the remaining budget, and a file's report offers on-demand measurement. Analyze remaining files starts one explicit continuation. The report names measured, bounded and provider-declined coverage; a collapsed, unavailable or binary diff is not counted as fully measured simply because you asked for it.

Choose your own policy. Use personal defaults, the repository's trusted base-revision configuration, or a deliberate composition with your own repository override. Optional existing-label mappings can open GitHub's visible native picker, but you make the actual selection. The extension does not automatically add, remove, create or reconcile labels.

Own your settings and data. Edit guided size bands and path rules or use the full diffdevil YAML policy language. Search and deep-link Basic and Advanced settings, and import or export your configuration. Pause a repository to stop analysis and restore GitHub's counters; resume it when you choose. Pausing deletes nothing. Inspect stored reports by repository and pull request, clear one PR or repository, or clear all reports and trusted-policy cache separately. Clearing data does not resume a paused repository or change GitHub.

No diffdevil account or local daemon is required. First install opens a Ready page explaining the active policy, file budget, cache and data controls, with a public example PR to try. The extension does not collect a personal access token, trigger hosted App analysis or send your source to Wolfsblvt Works. It reads the current GitHub comparison, trusted configuration and explicitly referenced templates from GitHub and processes them locally. Raw diffs are never persisted. Bounded rebuildable reports retain counts, file paths, revision identities, coverage and last-confirmed comparisons; trusted-policy text/templates are also cached. Small preferences may synchronize through Chrome; advanced policy, repository overrides and paused repositories remain local. Stored data can reveal private paths and repository identifiers to someone with access to your browser profile. It has a configurable size limit and least-recently-used eviction, and is not independently encrypted.

The extension supports github.com in normal Chrome profiles. It does not support Incognito or GitHub Enterprise hosts. Very large or incomplete provider responses remain qualified explicitly. The current candidate presents local results; authenticated hosted-App report delivery is not included.

An open-source product from Wolfsblvt Works. It is not affiliated with, endorsed by or provided by GitHub or Google.
```

### Screenshot set

Chrome Web Store accepts up to five screenshots. Submit the committed source-backed set in this order:

1. `assets/screenshots/01-changed-on-github.png`
2. `assets/screenshots/02-inspect-the-report.png`
3. `assets/screenshots/03-large-pr-coverage.png`
4. `assets/screenshots/04-your-policy-bands.png`
5. `assets/screenshots/05-local-data-control.png`

The committed manifest records the exact SHA-256, dimensions, colour format, caption and provenance of each image. The set renders the production UI against explicitly authored fixtures and must retain that disclosure; it is not presented as a live private-repository capture.

### Promotional images

- Small tile: `assets/promo/small-promo-440x280.png`
- Optional marquee: `assets/promo/marquee-1400x560.png`
- Editable sources: the sibling `.svg` files
- Store icon: `assets/store-icon-128.png`

### Provider consistency

Before submission, compare every dashboard field, listing image and privacy answer with this source, the exact uploaded package and the public privacy notice. A provider value that cannot be reconstructed from the repository is a release defect, not convenient dashboard state.
