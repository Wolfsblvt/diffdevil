# diffdevil design reference

Canonical, reusable design language for every diffdevil surface. Two reference sheets, one token file, one asset set. Open the HTML files in a browser (self-contained; pan and zoom).

| File | What it is |
|---|---|
| `surface-grammar-v1.html` | **diffdevil Surface Grammar v1** — identity in product, typography, surface hierarchy, colour roles, spacing / radius / hairlines, interaction grammar, information grammar (policy-focus metric, evidence, lanes, line kinds, snapshot standing), code and machine surfaces, editable policy grammar, work-surface and narrative-surface grammar, composition patterns, responsive, accessibility, navigation and footer, do / avoid, v1 → v1.1 boundary, machine-readable summary. |
| `identity-grammar-v1.html` | **diffdevil Identity Grammar v1** — the mark (E3), construction, wordmark W1 and tail T2, lockups, sizes and the micro drawing, colour, clear space and placement, identity in product surfaces, do / never, file index. |
| `tokens.css` | Canonical CSS custom properties for both themes (dark reference, light authored), type, spacing, radii, breakpoints, semantic and syntax colours, hairline meanings. Where the sheets and this file disagree, this file wins and the sheet is corrected. |
| `assets/identity/` | Production identity SVGs (dark / light: master, micro, mono symbols; plain and tailed wordmarks; horizontal and stacked lockups). Referenced by `tokens.css` `--logo-*` and by the website. Brand and visual assets remain reserved; they are not covered by the repository's software licences. |

## Rules of use
- Fonts: IBM Plex Sans and IBM Plex Mono, **self-hosted** in production (SIL OFL). The HTML sheets load them from Google Fonts for preview only.
- Theme: system by default, header control persists an explicit override; machine surfaces stay midnight in both themes.
- Magenta is interaction only (act = solid, selected / open = outline, focus ring). Never data, status or evidence.
- Evidence (`= ≈ ? ∅`), lanes (`■ ▣ § → ⟲`) and line kinds (`+ − ~`) are glyph + word + border; never colour alone.
- Identity: one primary treatment at a surface's entrance, one quiet closing wordmark allowed in the footer, never repeated through content.

## Scope
This package is the design authority for public pages (`/`, `/playground/`, `/examples/`, docs, `/app/`) and the foundation for later surfaces (authenticated dashboard, repository / organisation views, history and run surfaces), which may extend it as Surface Grammar v1.1 without re-deriving it. Page-level design rounds and the website builder package are project history and are not part of this reference.

## Owed by production (not design decisions)
Favicon rasters (16, 32) and `favicon.svg` from the micro drawing; apple-touch 180 and GitHub App logo 512 from the master on #0c0f17; Open Graph 1200 × 630; self-hosted woff2 subsets of IBM Plex; the reserved-asset licence note beside `assets/identity/`. The footer licence sentence must be reconciled with the repository's final licensing decision before publication.
