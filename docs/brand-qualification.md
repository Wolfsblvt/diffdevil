# Brand qualification

## Meaning

This record holds the background-compatibility evidence behind the exported diffdevil identity bundle at
`brand/bundle/diffdevil/`. Each variant in its `manifest.json` points at one section here through
`qualificationEvidence.sourcePath`. [Branding](branding.md) owns what the identity means and how it is used; the masters
live in `brand/source/diffdevil/` and `tools/brand-export.mjs` exports them. This record proves what was inspected, not
legal clearance, contrast compliance at every size, or how a particular consumer renders the files.

## How it was inspected

[`brand/qualification-sheet.png`](brand/qualification-sheet.png) renders every master drawing, at a representative
size, on four grounds: near-white `#fafbfc`, light colour `#f3e8dc`, near-black `#0c0f17` and dark colour `#2a1f3d`.
The drawings are the same geometry the exporter writes; export only removes the inert C2PA metadata and prefixes ids.
Inspected on 2026-10-22.

A master named `-dark` is artwork for a dark background and exports as `on-dark`; `-light` is artwork for a light
background and exports as `on-light`. The sheet confirms that reading: each drawing is clear on its own background class
and fades into the other, so consumers select an appearance rather than recolouring one.

## Marks

`mark.primary` (master symbol) and its monochrome drawings, and `mark.compact` (the micro symbol drawn for 16–32 px).
The `on-dark` artwork reads clearly on near-black and dark colour; the `on-light` artwork on near-white and light colour.
The micro drawing stays legible at 16 px on its own background class.

## Wordmark and lockups

`wordmark`, `lockup.default` (horizontal) and `lockup.compact` (stacked). Each `on-dark` drawing reads on near-black
and dark colour, each `on-light` drawing on near-white and light colour. The tailed footer wordmark has no identity role
and is not exported.

## Favicon

`icon.favicon` exports the micro drawing for each background class and the adaptive tab drawing that switches between
them with `prefers-color-scheme`. Both fixed drawings were inspected on both background classes; in each scheme state
the adaptive drawing shows the artwork for that scheme's background.

## Application tiles

`icon.application`, `icon.touch` and `icon.maskable` are opaque tiles: the master mark on the midnight ground
`#0c0f17`, framed by the website's measured occupancy rules (40–56 % of the canvas, inside the maskable safe zone).
The mark reads on all four grounds; on near-black the tile edge merges with the page while the mark stays clear. These
are therefore `universal`.
