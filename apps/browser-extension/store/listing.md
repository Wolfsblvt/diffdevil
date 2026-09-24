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
| Homepage URL | `https://github.com/Wolfsblvt/diffdevil` until the accepted public `/extension/` page is deployed and read back |
| Support URL | `https://github.com/Wolfsblvt/diffdevil/issues` |
| Privacy policy URL | `https://github.com/Wolfsblvt/diffdevil/blob/main/apps/browser-extension/privacy.md` until the accepted public privacy route is deployed and read back |
| Official URL | Leave unset until a verified public `diffdevil.dev` property is available in the provider dashboard |
| Promotional video | None selected. Do not add a provider-only URL; any later video and exact URL must first be admitted here. |

If the live dashboard vocabulary or required category list differs, stop at that visible provider mismatch and update this source before submission. Do not silently choose a nearby provider value.

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

Highlights:
- See replacement-aware Changed beside GitHub's native diff facts.
- Inspect added-only, deleted-only, modified and raw-churn measurements.
- Classify the pull request and individual files with your configured size bands.
- Open one anchored report for revisions, evidence, files, metrics, scopes, rules and policy provenance.
- Keep incomplete or unmeasurable evidence explicit instead of turning missing source into zero.
- Search and deep-link the complete Basic and Advanced settings catalogue.
- Edit guided thresholds and path rules or use the full diffdevil YAML policy language.
- Import, export and clear your local configuration and rebuildable report cache.

Choose your own policy. Use personal defaults, the repository's trusted base-revision configuration, or a deliberate composition with your own repository override. Optional existing-label mappings can open GitHub's visible native picker, but you make the actual selection. The extension does not automatically add, remove, create or reconcile labels.

No diffdevil account or local daemon is required. The extension does not collect a personal access token, trigger hosted App analysis or send your source to a diffdevil service. It reads the current GitHub comparison, trusted configuration and explicitly referenced templates from GitHub, processes them locally, and stores bounded rebuildable numeric reports and policy data in your browser. Small preferences may synchronize through Chrome; advanced policy and repository overrides remain local. Cached reports can include private paths and repository identifiers. You can inspect and clear that data in Settings.

The extension supports github.com in normal Chrome profiles. It does not support Incognito or GitHub Enterprise hosts. Very large or incomplete provider responses are qualified or rejected explicitly. The current release presents local results and does not claim authenticated hosted-App report delivery.

This is an independent open-source product. It is not affiliated with, endorsed by or provided by GitHub or Google.
```

### Screenshot set

Chrome Web Store accepts up to five screenshots. Submit the committed source-backed set in this order:

1. `assets/screenshots/01-changed-on-github.png`
2. `assets/screenshots/02-inspect-the-report.png`
3. `assets/screenshots/03-your-icon-preference.png`
4. `assets/screenshots/04-your-policy-bands.png`
5. `assets/screenshots/05-honest-uncertainty.png`

The committed manifest records the exact SHA-256, dimensions, colour format, caption and provenance of each image. The set renders the production UI against explicitly authored fixtures and must retain that disclosure; it is not presented as a live private-repository capture.

### Promotional images

- Small tile: `assets/promo/small-promo-440x280.png`
- Optional marquee: `assets/promo/marquee-1400x560.png`
- Editable sources: the sibling `.svg` files
- Store icon: `assets/store-icon-128.png`

### Provider consistency

Before submission, compare every dashboard field, listing image and privacy answer with this source, the exact uploaded package and the public privacy notice. A provider value that cannot be reconstructed from the repository is a release defect, not convenient dashboard state.
