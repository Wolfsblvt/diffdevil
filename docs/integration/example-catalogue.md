# Shared real-PR example catalogue

## Meaning

The public `/examples/` page and Playground use the one catalogue in
[`../examples/catalogue/`](../examples/catalogue/README.md). An example URL carries
both `example` and `variant`, so a card opens the same frozen source edition and
policy in the Playground rather than a page-specific approximation.

Every selected entry is backed by a real public pull request. The catalogue has no
manual-fixture section, controlled source kind, Frozen-versus-Real selector, or
second gallery. Ordinary engine tests may still use purpose-built test data where a
unit test needs it, but that data is not public catalogue membership.

## Capture and replay

`node tools/examples.mjs capture <source-id>` resolves the selected pull request's
base tip, merge base and head, acquires its declared evidence surface, and analyzes
it with the shared engine. `capture-all` performs that deliberate operation for all
selected source editions and then regenerates the observations.

The retained record names the base tip, actual merge base, head, evidence edition,
capture time, engine and report identities, provider file-set standing, payload
digests, inspected notice identities, and a normalized-report-only rights boundary.
It records per-file material dispositions but does not commit raw patch text or
binary bytes.

Some lessons deliberately compare evidence editions of one PR:

- Prettier #13183 contrasts bounded PR-files evidence with an exact pinned raw diff.
- CMake documentation l10n #2 contrasts the comparison endpoint's 300 observed rows
  with a complete paginated 2,171-file inventory.

The source identity does not change between those editions. Only the available
evidence does.

`node tools/examples.mjs audit` compares fixed identities with the current provider
and reports source, merge-base, notice, engine, or evidence-edition drift.
`node tools/examples.mjs verify` performs no GitHub request: it replays every retained
source/policy pair and proves that `observations.json` is deterministic shared-engine
output.

## Evidence boundary

A moved upstream head does not alter a frozen teaching snapshot. Live analysis is a
distinct edition and must name its actual source identity. Binary files remain
records with unmeasurable line facts. Incomplete inventories retain unknown aggregate
and path membership rather than inventing missing rows. Capture or rights failure
holds the affected lesson; it never resurrects a synthetic card.
