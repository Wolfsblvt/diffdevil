# diffdevil Chart Grammar v1.1

## Meaning

This is the canonical reusable design authority for every analytical chart and the cloud in the signed-in diffdevil App. It extends Surface Grammar v1 as its v1.1 chart section: the shared readout frame, the tokens in [`tokens-chart-v1.1.css`](tokens-chart-v1.1.css), each chart recipe, the page compositions those recipes changed, the interaction, loading and motion rules, and the alternatives that were tried and not selected. It preserves the owner-accepted system so production and later surfaces consume one authority instead of re-deriving charts from a prototype or from chart-library defaults. It is design material, not executable source; the App implements it under `apps/app/`.

## Standing and sources

- **Accepted:** 2026-10-10, as the final candidate of the chart co-design that continued from the ratified App handoff. Owner acceptance, verbatim: “Yep, looks all good. We can wrap this up, you can make the final candidate for this.” and “There is nothing left for charts.”
- **Authority chain:** the source-ready handoff and its product acceptance under the managed-App Plan; the chart Work is #787. The prototype that carried the co-design (`proto5`: the converged App reference, the comparison lab with rejected concepts, round captures) is implementation input and evidence, not the continuing authority; this document is.
- **Scope:** Overview, History, Files, Pull requests, PR detail and File detail at desktop width in the dark theme. Narrow screens, the light theme, the public read-only view and the operator view are not designed; charts there reuse this language where they show data and otherwise wait for their design occasion.
- **Qualified so far:** the synthetic reference at 1440 px, dark, headless Chromium and the Desktop Browser pane, all six pages, Pro and Free, 7 days to 1 year; constant readout geometry under a keyboard walk over every mark; period morph; the reduced-motion path; no console errors. Real repository distributions, narrow layouts, light appearance and screen readers were explicitly not qualified by the design; the App's own qualification record owns what production has exercised since.

## Owner direction that shaped the system

In order, exact:

- Brief: “This time, we focus on expanding the charts. **Exactly** the charts. […] they need to be **usable**, must feel **modern** and of course still also **pretty**.”
- Cloud concept: “I like the word cloud of A. That is much better.” · “C should be gone. The toggle for B would be really, really nice.”
- No floating tooltip: “the tooltip is currently very weirdly anchored, and hides most of the cloud, including the word you are hovering.” Then: “Yes, it's better to have no tooltip.” · “readout is much better than floating.”
- Frame: “For the charts I like F1 too […] Tooltip should only be there if you really need additional info that is not being present without it.”
- Rail and width: “the pinned legend on the right, it should be either a pinned slide-out or like.. another optional toggle.” · “Agreed on making the cloud full-width, so the 12 col is the right version.” · Top: “can we actually make it not an overlay, but also move the cloud further left, so it uses the actual real space and still showing the full cloud?”
- Partner strength: “Do you have any idea if we can get it to somehow indicate which number is higher” · “They should all be the same width, and *roughly* double the width they are right now. Then the scale is visible.”
- Structure may change: “You are allowed to re-open the page structure, btw. […] There are good reasons for better diagrams to switch it.”
- Flow: “what you actually want to see is how the opened versus closed compare, right?” · “Is it *wrong* to make a small overlay line over all the days/weeks that shows what was open” · “The small chart below as the range strip is great. I like it. A lot.”
- Time to merge: “it really needs to show you on a glance "how long does it usually take this repository (or me) to merge PRs?", and yes, combined with the size of the PRs.” Then: “Wow, the "Time to merge" is great. This time. This is what I was looking for.” · “The bands for the label size, they are like, dynamic. So if there are more, they need to allow more lines to display” · “Is there a way to show or indicate in any way that the scale for the x-axis is not linear?”
- Stability: “I want that charts stay the same height overall whatever you are hovering or selecting.”
- Loading: “we should have some kind of visual indicator saying "this is rendering" […] Not the page being unresponsive, but that the data actually takes time. Similarly, this should *likely* also work for some of the switches/modes of the charts” · “The progress drawing line is very nice, I like it”.
- Change volume on Pro: “Why is the "change volume" chart gone on Pro now though? It's like... one of the most useful/sexy charts for me”.
- Merged PRs by size on Pro: “I am kinda missing it not being on Pro. Why not make it on pro and be... longer?”
- Motion: “We do not want confetti movements everywhere […] But animations look modern and flexible.”

## The shared frame: F1 readout

Every analytical chart is one frame inside the ratified panel:

```text
panel header   title · plan chip · chart/table switch     (two-line panel grammar, unchanged)
               metadata line: population · window · scope · basis
readout        line 1: what is focused + tags            fixed 20 px
               line 2: values with colour keys           fixed 40 px, never wraps
plot           the chart, one tab stop                   fixed height per recipe
teach line     the encoding in words
footer         optional: metric switch, legend, drill link
```

There is no floating tooltip anywhere in the App.

- **Readout** is legend, tooltip and keyboard announcement at once. Line 1 names what is focused (bucket, PR, file, size) plus tags: `partial · 4/7 recovered`, `bounded`, `current`, a size chip. Line 2 lists values with their colour keys; the decisive value carries the `sum` emphasis (a divider and a larger figure).
- **Default state** (nothing focused) states the whole window: totals, “usually …”, “top 10 carry …”. A short hint says how to inspect: `hover or ← → to inspect`.
- **Fixed geometry.** The readout is 66 px: line 1 is 20 px, values 40 px, values never wrap, tags and chips share one 18 px height. Hover, keyboard and pin never move the plot. This is a layout contract and is tested as one.
- **Focus.** Hover or ←/→ (Home/End) moves focus; other marks dim to about 30–42 %. **Click or Enter pins** (magenta frame or ring, and a pin icon in the readout); a pinned readout offers the drill-down (`3 merged PRs →`); Enter again or the button drills; Esc clears. A chart whose selection drives other panels keeps its pin (`keepSel`): Esc does not clear, and a click on the pinned mark does not unpin.
- **Linked charts.** Charts over the same buckets share hover and selection (History: Change volume ↔ File growth, plus the lanes band).
- **Table view.** Every frame has a chart/table switch with an equivalent table of the same rows, server-rendered from the same model. The table is what a reader without scripting sees.
- **Teach line** under the plot says the encoding in words: `bar height = Changed · colour area = composition · outline = raw churn · hatch = bounded, drawn at its proven minimum`.

### Readout grammar

```text
.fr-readout                       height 66px; overflow hidden
  .fr-when      [pin] <b>what</b> tag tag … [clear]|[hint]      height 20px; nowrap; hint ellipsises first
  .fr-vals      dt/dd pairs; .sum = emphasised; dd.unk = unknown  height 40px; nowrap; never wraps
                [drill →] when pinned and the chart drills
```

`unknown` reads as a state (quiet italic, `--ch-ink-3`), never as `0`. A partial value reads `≥ n`. A bounded value reads `lo–hi`.

## Tokens

[`tokens-chart-v1.1.css`](tokens-chart-v1.1.css) is canonical; its values derive from v1 tokens and keep their meaning. In short: an ink ramp `--ch-ink-1..3`, `--ch-grid`, `--ch-focus-wash`, `--ch-dim`; motion `--ch-glide`, `--ch-quick`, `--ch-morph`, `--ch-enter`; the evidence fill `--ch-unres`; PR-state colours `--ch-open`, `--ch-merged`, `--ch-closed` (+ hatch); the readout geometry `--ch-readout-h` 66 px, `--ch-readout-line` 20 px, `--ch-readout-vals` 40 px, `--ch-chip-h` 18 px; the meter widths `--ch-meter-w` 74 px and `--ch-meter-row-w` 118 px; the Top column `--ch-top-w` 300 px.

**Colour use.** `--diff-mod` / `--diff-add` / `--diff-del` for composition and growth/shrinkage; GitHub state colours for PR flow (open `--ch-open`, merged `--ch-merged`, closed unmerged `--ch-closed` hatched); size-v1 label colours for size chips, rows and dots (Unknown dashed). **Magenta is selection and focus only** (pin frame, pinned dot ring, keyboard ring, the selected-bucket band). Neutral white is the median, the backlog line and lead values.

**Type.** Axis words are IBM Plex Mono 10.5 px in `--ch-ink-3`; no axis ticks; hairline grid. Readout values are IBM Plex Sans 600, 17 px (21 px for `sum`); readout labels Mono 10.5 px. Cloud words are Plex Sans with a small Mono qualifier.

## Renderer

ECharts 6.1 with the SVG renderer and one registered `diffdevil` theme; marks are mostly **custom series** with `renderItem`, so they are authored rather than defaults. d3-cloud is the one bounded specialist: it packs the cloud, the App renders, animates and explains the words. The App owns readouts, chips, skeletons and busy states as HTML around the chart; chart-library tooltips, legends, toolboxes and default animations are not used.

Mechanics worth keeping: positions under the pointer come from `convertFromPixel({ gridIndex: 0 }, p)` (an xAxis finder returns `null` on category axes), or from a nearest-mark `pick` for dot charts; a chart instance survives a period change and receives the new option with `replaceMerge: ["series", "graphic"]` and a longer update animation; resize observers disconnect when a panel leaves the page.

## Chart recipes

### Where change lands (cloud, Pro)

Full width on Overview and Files.

- **Packing** by d3-cloud with rotation 0. Positions are **steered**: d3-cloud draws three random numbers per word (start x, start y, spiral direction), so the layout feeds each word its previous centre. A metric switch then glides words from where they were; the first layout uses a hashed home, so it is deterministic. Pin d3-cloud, because the steering relies on its call order.
- **Fit:** binary search on a type scale (capped) until every word places, so the cloud fills its stage. Unplaced words are counted (`+n not drawn at this size · still counted · in list`); files that are n/a for Turnover are named.
- **Labels:** the shortest unique path suffix; the qualifier (`lexer-kit/`, `src/`) is a small Mono prefix. A canvas-context adapter measures and rasterises the two-run label so collision boxes match what is drawn. The **composition underline** (~/+/− shares, bounded hatch) is drawn into the collision sprite too. Words below 17 px have no underline.
- **Type:** size ∝ √value between min and max; three tiers by brightness (`--ch-ink-1..3`), weights 500/400. All fonts must be loaded before measuring.
- **Readout above the cloud** (no lens): path, rank, bounded tag, merged-ago; values merged PRs · Changed · raw churn · Turnover (the active metric emphasised) · composition bar · **often with** chips. Default: files, top-10 share, totals, most changed.
- **Partners:** hovering a file lights its co-change partners with **fixed-width meter chips** (74 px, translucent plate, filled to the together/of share, strongest partner with a brighter border). Partner words brighten in proportion to the share.
- **Arrange:** `cloud | by folder` (`by repository` in multi-repository scopes). Groups become treemap cells (area = metric share, label `src/ 52%`); each cell packs its own words, the heaviest cell sets the type scale and smaller cells may only shrink. Words glide between arrangements.
- **Top:** a real column (300 px) that opens beside the cloud; the cloud re-packs into the remaining width. **List:** the equivalent ranked table.
- **Metric switch:** merged PRs (default), Changed (proven minimum), raw churn, Turnover. **Keyboard:** the stage is one tab stop; arrows walk rank order; Enter opens (Files: selects the file card in place); Esc clears.
- **Performance:** the synchronous fit (several packs) cost about 0.4 s on the main thread in the prototype. Production packs in a Worker with `OffscreenCanvas` (d3-cloud accepts a canvas factory) and keeps the busy and skeleton states; a main-thread pack remains the fallback where the Worker route is unavailable.

### Change volume (mosaic, custom series)

Ratified mosaic grammar, now in the frame: bar height = Changed; width split modified | added-over-deleted; raw churn outline; bounded hatch cap at the proven minimum; partial buckets dashed with `partial a/b` (`a/b` when narrow). Buckets follow the page period (7 days daily, 30 days 2-day, 90 days weekly, 1 year monthly from first history). Overview Pro 220 px plot, Free 300 px, History 320 px. **File detail** uses the same chart with one bar per merged PR and an **aligned file-size strip** below (step line from the period start; the readout adds `file size after · 1,681 (+21)`).

### Pull-request flow

Paired bars per week on one count axis: opened (green) beside merged (lavender) + closed unmerged (red hatch) stacked; the **net** (`+2`, `−1`, `±0`) written above each pair; the **open-at-week-end backlog as a white step line over the bars** (dark halo so it reads over every colour, `9 open` end label); a **range strip** below (an ECharts `dataZoom` slider whose background is the backlog over the available history; dragging chooses the weeks shown). Readout: opened, merged, closed unmerged, net, open at week end.

### Time to merge by size

Rows: `all PRs`, then one row per size label of the **active policy** (only labels with merged PRs; the chart grows by 34 px per row). Each row: faint dots (single PRs), a capsule for the middle half, a bright median tick, median and `n` at the right; dashed capsule and `few PRs · read loosely` below 3 PRs; a dashed line for the overall median. **Log time axis** fitted to the data with human ticks (1 h, 3 h, 6 h, 12 h, 1 d, 2 d, 3 d, 5 d, 1 w, 2 w); its non-linearity is shown by a **ruler** of alternating equal-time blocks (3 h below a day, days to a week, then weeks) and log-paper gridlines at the same boundaries. Readout default: `usually 22 h – 2.7 d · median 1.8 d · slowest size · ≥3 PRs S · 2.7 d`, plus a dashed tag when a smaller sample is slower (`XL 3.3 d · only 2 PRs`).

### PR size mix

Same row grammar: top row = the whole mix as one 100 % bar with labelled segments; rows = count capsule, share, median Changed. Unknown keeps its own dashed row and is outside the shares. Readout: most common, XS-or-S share, median Changed; `n not recovered · not counted` when coverage is incomplete.

### PR lifecycle by size (Pull requests page)

Same rows: typical draft time (dotted, among PRs that were drafts), then typical ready → merged time (solid), and the **median total as its own bright tick**, because stage medians do not add up. Readout: started as draft %, typical draft, typical review, median total. Teach line keeps “Elapsed time between observed transitions. Not effort, not anyone's speed.”

### File growth and shrinkage (History, Pro)

Lines added above the axis (`--diff-add`), lines removed below (`--diff-del`), a bright net tick per bucket. Readout: growth, shrinkage, net, grew · shrank file counts, the file that moved most. Shares the History buckets with Change volume (linked hover and selection).

### Concentration over time (History, Pro)

Top-10 share of Changed per bucket as a soft line with gradient area, previous period dashed. Readout default: `top 10 carry 57% · previous 49% · +8 pp · change is gathering in fewer files`; hovering a bucket names its three most-changed files.

### Merged PRs by size (History, Pro and Free)

One lane per size label, one dot per merged PR at its merge time (hollow dashed = bounded or not recovered), 42 px lanes, evenly spaced explicit date ticks (automatic time ticks collide at month boundaries). On History the **selected bucket is a soft magenta band** across the lanes. Hover gives the PR; Enter opens it.

### Turnover map (Overview 6 columns, Files 12 columns, Pro)

Each file at its time-weighted average size (x, log) against Changed (y, log). **Every diagonal is one Turnover value** (turnover-v1 = Changed ÷ average size); the 1× line is solid and the others dashed, labelled where they leave the plot. Files at or above 1× are brighter; dot size = merged PRs; bounded files draw their Changed range as a dotted stem; the top files are labelled; new or deleted files are n/a and counted in the header. Each axis fits its own data.

### Development (PR detail)

Changed per analysed head as a line over **tinted size zones** (the current label's zone brighter, zone labels at the right); a chip where the label changed (`S→M`). Readout: head, sha, age, Changed, vs previous head, since opened.

### Recent activity on these files (PR detail, Pro)

One row per file in this PR, one dot per merged PR in 90 days (coloured by that PR's size label), other open PRs on the same files as state-coloured **rings at their last activity**; hovering a dot lights that PR in every row it touched. Readout: Changed in that file, PR total, files shared.

### Often changed with (PR detail, File detail, file card)

Meter rows: path, then a 118 px meter plate filled to `n/N` with the percentage. PR detail splits *not in this PR* | *in this PR, as usual*. Replaces the donut rings and the ratified orbit.

### Hero line (Overview)

Cumulative merged PRs, this period solid against the previous dashed; hover or arrows rewrite the delta line (`by 26 Sept · 17 merged · previous by then 19 · −2`), restored on leave.

### Selected bucket panel (History, HTML)

Bucket totals in readout grammar; **Changed per merged PR** as ranked rows (size chip, composition bar, bounded range hatch); **Files touched** with composition and PR count; **Not recovered** listed separately.

## Page compositions

Against the ratified App layout (the owner reopened the structure for better charts):

| Page | Composition (12-column grid; numbers are spans) |
| --- | --- |
| Overview (Pro) | hero (live line) → Where change lands 12 → Change volume 12 (compact) → Pull-request flow 8 + Pull requests activity 4 → Time to merge by size 6 + PR size mix 6 → Turnover map 6 + Repositories or Size labels 6. The ranked hotspot rail is gone (Top column instead). PR lifecycle moved off Overview; time to merge by size replaces it here. |
| Overview (Free) | Change volume 12 in the cloud's place, then the same rows with Free panels. |
| History | Change volume 12 (picks the bucket) → Merged PRs by size 12 (Pro and Free) → selected bucket 5 + growth and concentration 7 (Pro) or period comparison and See Pro (Free) → period comparison 12 (Pro). |
| Files | filter → Where change lands 12 (selects the card in place) → Turnover map 12 → Ranked files 8 + selected-file card 4. The toolbar's metric and group controls are gone (the panel owns them). |
| Pull requests | Pull-request flow 8 + Analysed heads 4 → PR lifecycle by size 6 + PR size mix 6 → list (unchanged). |
| PR detail | result 5 + policy 7 (unchanged) → Recent activity 8 + Also in progress 4 → Files 6 + Development 6 at 1361 px and wider, Files 7 + Development 5 from 1181–1360 px, and the existing stacked full-width panels through 1180 px → Often changed with 12. |
| File detail | tiles (unchanged) → Changed per merged PR with size strip 8 + Often changed with 4 → Contributing merged PRs 12. |

The PR-detail row gives Development the width needed for complete bounded values. At 1361 px and wider both panels use six columns and Development uses canonical 17 px values / 21 px sum values. From 1181–1360 px the row remains seven/five, with uniform 13 px / 15 px compact Development type and dense value spacing. At 1180 px and below the existing stacked full-width layout and canonical type apply. Files keeps its full retained or pathless presentation in each layout; interval text, no-wrap behavior and the fixed 66 px readout (including its 40 px value line) do not change.

**Source:** [Nyxara's PR116 design disposition](https://github.com/Wolfsblvt/emergency-meeting/issues/476#issuecomment-6182057713) selects this responsive composition and preserves the complete interval grammar.

## Interaction and state rules

- **Unknown is not zero.** A bucket whose merged PRs have no recovered comparison reads `unknown` (quiet italic), never `0`. A partial bucket reads `≥` its observed amount (composition and raw churn too); net growth of a partial bucket is unknown. Bounded values read as ranges and size by their proven minimum.
- **Populations and windows** stay as ratified and are named in each panel's metadata line (merged PRs in period; flow's 13-week context; co-change's 90 days).
- **Small samples** are drawn dashed and say so; “slowest size” names its ≥3 PRs rule and the slower small sample.
- **Hover never moves layout** (fixed readout geometry; chips, tags and drill buttons never wrap).
- **Every mark drills down** (bucket → PRs, PR → PR detail, file → file detail, row → filtered list).
- **Keyboard:** each chart is one tab stop; arrows move, Enter pins then drills, Esc clears; a visible focus outline on the plot. Keyboard and pin changes are announced; pointer movement is not a screen-reader event.
- **Plans:** Pro-only charts carry the Pro chip; Free gets useful panels, never blockers (unchanged ratified rule).

## Loading rules

- Navigation answers immediately: the side-nav entry becomes current, the old page dims (`.45` opacity) and a **page line** runs under the fixed header before the next page is computed.
- New pages render frames at once: real panel titles, and a **skeleton in each chart's own shape** (word pills, bars, chip rows) at the final height with one slow light sweep and a small `drawing` spinner in the header. Charts mount one per frame, top to bottom, and the frame never jumps.
- In production the same states cover network time: each panel loads its own data into the skeleton → chart sequence.
- Slow switches inside a chart (cloud metric, arrange, Top column, period re-read) show a **busy pill** (`resizing…`, `grouping…`, `making room…`, `re-reading the period…`) before the work blocks, then glide.
- Resize observers disconnect when a panel leaves the page (a detached cloud must never re-pack at width 0).

## Motion rules

Motion explains state, continuity and feedback; nothing loops or decorates.

| Moment | Motion |
| --- | --- |
| Period change (authored moment) | Charts update **in place**: bars re-bucket and resize, rows stretch, lines re-flow (620 ms ease-in-out); the cloud re-reads and glides; readout totals count to their new values (620 ms). Hover values never tween. |
| First draw | Grows out of the skeleton's shape: columns rise from the baseline, rows unfold from the axis, lines draw left to right, dots and bars in a capped sibling stagger (≤ 220 ms); 460–480 ms ease-out. Cloud words settle out of a 3 px blur (stagger ≤ 300 ms). Panel body hands over with a 220 ms opacity rise, no blur. |
| Hover, dim, selection | ~160 ms ease-out (ECharts `animationDurationUpdate`); cloud dim 140 ms. |
| Segmented switches | One thumb slides to the pressed option (260 ms), including the period switch across a re-render. |
| Partner chips | Meter fills from empty to its share (340 ms) when it first appears. |
| Pin | Pin icon settles with a small turn (220 ms). |
| Layout (Top column, arrange, metric) | Words glide (560 ms expo-out). |

`prefers-reduced-motion`: no movement (charts `animation: false`, no entrances, thumb, sweep or spinner motion; the period switch redraws directly); state changes remain visible.

## Rejected alternatives (kept in the lab, not selected)

- Cloud concepts **B as primary** (islands: every word starts its spiral at its directory's anchor) and **C** (a ranked typographic index with no packing). B survives as the `by folder` / `by repository` arrangement of concept A.
- The **floating delayed lens** beside the hovered word, and the **F2 tooltip frame** (a legend row above the plot and a floating card that follows the pointer): the owner chose no floating tooltip anywhere.
- **Mirrored flow** (merged and closed as a second direction of the same columns): it did not answer “how do opened and closed compare?”.
- **Time to merge as dots** (one dot per PR on a log axis) and as **aligned lengths** (one bar per PR from opened, dotted draft head): neither answered “how long does it usually take, and for what size?” at a glance.
- The **pinned legend rail** on the right of the cloud and the **overlay drawer**: replaced by the Top column that takes real space.
- **Donut rings** and the ratified **co-change orbit**: replaced by meter rows.

## Not designed yet

Unchanged from the App handoff: Manage/settings, plans and subscription states, the public read-only view, the operator view, light theme and narrow screens. The charts above define the visual language those surfaces should reuse where they show data.

## Implementation map (production)

The App implements this grammar under `apps/app/`: server-side models and readout text in `src/lib/charts/`, the frame component `src/components/ChartFrame.astro`, the client renderer in `src/client/charts/` (theme, frame, recipes, the mount), and the styles in `src/styles/charts.css`, which imports [`tokens-chart-v1.1.css`](tokens-chart-v1.1.css). The premium file charts (growth and shrinkage, concentration, the Turnover map, recent file activity) and the cloud with its layout Worker are the App's premium extension (`premium/app/lib/charts/`, `premium/app/client/`, the cloud's styles in `premium/app/styles/premium.css`); they draw in the same frame by registering their readouts and recipes, so the grammar is one whichever edition is built. The App's README and `docs/qualification.md` record what has been exercised against real data; this document records what was accepted.
