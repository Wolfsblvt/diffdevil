# pr-brief-r4.1

## Meaning

This is the public source copy of the ratified PR-brief design bundle. It preserves the executable specimens and design meaning, with private coordination references omitted and checksums recomputed for these exact public files. It is a synthetic design reference, not live provider evidence.

Ratified diffdevil App PR-message design candidate, 10 October 2026. Start with `HANDOFF.md` and open `diffdevil-pr-message-reference.html` for the editable reference. It is a frozen synthetic design preview, not a qualified GitHub renderer or an App implementation.

## Contents

- `HANDOFF.md`: complete decisions, accepted/proposed/deferred standing, surface division, controls, lifecycle, data/privacy, source links and acceptance cases.
- `diffdevil-pr-message-reference.html`: complete standalone visual reference with exact Markdown, 12 primary states and desktop/360 px/320 px preview controls. Links are inert synthetic destinations. No App settings are changed.
- `candidate.json`: accepted design metadata, fixture, primary Markdown/pre-rendered HTML, and additional acceptance specimens.
- `fixture.json`: the complete synthetic current comparison and all 40 final merged comparisons with per-file observations.
- `specimens/`: 12 primary native Markdown files plus context-unavailable, file-population-unavailable, stale-head and optional final-summary acceptance specimens.
- `reference.template.html` and `reference.fragment.html`: editable preview source. The template has `INITIAL_COMMENT` and `STATE_DATA` insertion markers. These are a design approximation only; generated HTML is not the portable product template language.
- `SHA256SUMS`: SHA-256 for every bundled file except the manifest itself.

## Edit and adopt

Treat `HANDOFF.md` as the decision boundary and `specimens/*.md` as the exact native-copy reference. If you change a primary specimen, synchronize its Markdown and pre-rendered HTML in `candidate.json` and the reference. The preview used the already-available Marked 17.0.5 renderer plus a small explicit top-level NOTE approximation; no prepared Studio engine was run or replaced.

The standalone reference embeds its frame document in the iframe's `data-srcdoc` attribute. A text editor can edit the source template/candidate rather than hand-editing that escaped wrapper. To reproduce the current fragment, substitute `candidate.states['exact/context'].html` for `<!-- INITIAL_COMMENT -->` and JSON-serialize the full candidate into `<!-- STATE_DATA -->`, escaping literal `<` as `\u003c` inside that JSON script payload. The current complete standalone file is included so use does not depend on any host-only renderer or plugin. No source execution is necessary to read or recover the design.

Actual provider rendering, assistive-technology behavior, deterministic selection, lifecycle and App joins retain their own qualification. This design reference authorizes no provider effect, migration or deployment.

## Recovery and integrity

Recover this public copy from the exact repository commit and verify its SHA256SUMS. The private transfer archive is a different carrier; its checksums are not asserted for these redacted documentation files. Reading and extraction do not execute code.

The archive and manifest establish byte identity only. They do not establish acceptance of proposed algorithms, a browser render, a prepared Studio engine run, or a real provider launch. The source comments and readable handoff remain the owning room's chronology; later product adoption should put the accepted grammar in diffdevil's maintained design source through its normal implementation custody.
