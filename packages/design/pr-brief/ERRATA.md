# PR brief r4.1 errata

## Meaning

These are the explicit corrections the implementation applies to the preserved `pr-brief-r4.1` candidate. The preserved bytes stay unchanged; `apps/shared/pr-brief/specimens.mjs` applies exactly the specimen corrections below when tests compare the composer with a specimen. Content order, formatting and the ratified values are unchanged by every entry. Corrections to proposals (not ratified content) are listed separately; a material product change would return to the product owner rather than appear here.

## Specimen corrections

| ID | Specimens | Correction | Reason |
| --- | --- | --- | --- |
| E1 | `bounded--basic`, `bounded--basic-history` | Remove “The 60–69% share rounds outward from 168/280 through 168/244.” from the Measurement detail. | The sentence explains the neighbour share, which only the context variant shows. A basic brief has no share to explain. |
| E2 | `partial--context`, `partial--basic`, `partial--basic-history` | An unmeasured file follows the measured files, in the comparison's own order. | Files are ordered by descending Changed. The specimen kept the fixture's authoring order, which no evidence available at runtime can reproduce. |
| E3 | `unknown--context`, `unknown--basic`, `unknown--basic-history` | The policy line does not define the M band. | With no measured lower bound, naming M was arbitrary. A partial measurement still names the band its proven lower bound reaches (“at least 202” → M). |
| E4 | `exact--context`, `bounded--context`, `partial--context`, `unknown--context`, and the old comment inside `lifecycle-stale` | `src/report.ts` (**5 merged PRs**, 0.1× Turnover) joins the file-activity table as its third row, leaves the core's other-files line, and the Turnover detail names it. | Consequence of removing P1's share floor (below). **Pending Nyxara's product-fidelity disposition**; reversible by restoring a relevance restriction. |

Every other byte of the 16 specimens is reproduced exactly; trailing file newlines are not message copy. Evaluated through the real engine and a policy that excludes the lockfile (as the fixture's repository does), the synthetic evidence reproduces the exact, bounded and partial basic specimens byte for byte; with every file unmeasured, the engine orders the files by path rather than the fixture's authoring order.

## Proposal qualifications

| ID | Proposal (handoff §5–§7) | Implementation | Reason |
| --- | --- | --- | --- |
| P1 | File activity: at least three distinct merged PRs, top three by frequency. | As proposed: an absolute minimum of three merged PRs, descending frequency, at most three rows, each against its visible denominator. The earlier extra floor (one in five recovered merged PRs) is removed (E4). | A share floor has no statistical basis: it hides real history in a busy repository (5 of 40 is five observations) and admits noise in a young one (1 of 3 passes). The absolute count beside the shown denominator separates signal from coincidence. Removal returns to Nyxara for product disposition. |
| P2 | Companion: rank by conditional excess over background, then support. | Rank by co-change support (`together`), then excess, among companions that pass every gate. | Excess alone selects 12 of 12 (`src/config.ts`) over the ratified, better-evidenced 14 of 18 (`src/policy.ts`). All proposed gates (5 anchor PRs, 3 co-changes, 50 %, 1.25× lift) are kept. |
| P3 | Snapshot time in the Comparison detail. | Printed only for explicitly synthetic previews; a live body states the comparison identity alone. | A per-evaluation time would make identical facts look changed and force a write on every event (A09). |
| P4 | Standard control vocabulary. | `mode` (`off`, `standard`, `advanced`), `modules`, `priority`, `historyWindowDays` (30, 90, 180, 365; default 90, clipped to retention), `finalSummary` (default off). `priority` orders which context module is kept under the body budget; it never changes the ratified reading order. | A concrete, validated seam for Account/Manage to present. Its layout is still owner co-design. |
| P5 | Same-file neighbours from an open-PR index. | The index is read live for each evaluation: the open PRs (most recently updated first) and the current paths of at most 50 of them, reduced to the paths the effective policy includes. It needs no history consent and stores nothing; a bound, truncated or unreadable PR makes it partial (non-totalizing headline). | Current neighbours are current operation, not history. Titles, draft state and paths are transient provider facts; retained analyses are never presented as the current index. |
| P6 | Preview over the synthetic fixture (A15). | The fixture's current comparison is supplied as provider-shaped evidence and evaluated through the observed effective trusted policy; the fixture's unnamed lockfile change gets synthetic counts (12 modified, 4 added-only, 2 deleted-only) so a policy that does not exclude it measures it. Without an observed policy the preview is labelled a design specimen. | A preview that names the effective policy must show that policy's bands, thresholds, exclusions and explanation, not the design's. |
