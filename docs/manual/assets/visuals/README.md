# Manual visual explanations

## Meaning

This directory owns the editable sources and reproducible static outputs for the four selected visual explanations in the public manual. Mermaid owns relationship and sequence notation; Vega-Lite owns the quantitative chart. The surrounding manual remains authoritative for product behavior, and the retained example catalogue remains authoritative for the chart's observations and source identity.

`apps/manual/visuals/render.mjs` renders every light, dark, and narrow output. Files under `rendered/` are derived and must not be edited by hand. `rendered/receipt.json` binds each committed output to its editable source, appearance, size, and SHA-256.

| Visual | Reader question | Editable source | Canonical manual home |
| --- | --- | --- | --- |
| Bounded evidence and thresholds | Why can one threshold resolve while another holds? | [`evidence-thresholds.vl.json`](evidence-thresholds.vl.json) | `understand/evidence-and-uncertainty.md` |
| Proposed data and trusted policy | How can a writer inspect a PR without obeying its proposed policy? | [`trust-boundary.mmd`](trust-boundary.mmd) | `understand/trust-and-mutation.md` |
| Global and scoped selection | Why can an observed file remain unavailable to a scope? | [`selection-boundaries.mmd`](selection-boundaries.mmd) | `policy/paths-and-scopes.md` |
| Acknowledgment and readback | What is known after an ambiguous or partial provider write? | [`provider-readback.mmd`](provider-readback.mmd) | `understand/facts-to-provider-state.md` |

The chart uses retained observations for Prettier pull request 13183 at immutable base/head revisions. The PR-files edition establishes `metrics.focusChanged` as `[8,679, 11,330]`; the raw-diff edition establishes exact `9,603`. The `9,500` and `12,000` boundaries are configured policy thresholds, not measurements or estimates. No midpoint, probability, confidence score, or live upstream state is inferred.
