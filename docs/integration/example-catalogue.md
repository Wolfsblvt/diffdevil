# Shared example catalogue

## Meaning

The public `/examples/` page and Playground use the one catalogue in
[`../examples/catalogue/`](../examples/catalogue/README.md). An example URL carries
both `example` and `variant`, so a card opens the same frozen input and policy in the
Playground rather than a page-specific approximation.

## Capture and replay

`node tools/examples.mjs capture <source-id>` resolves the selected pull request's
base tip, merge base and head, reads its public diff, and analyzes that diff with the
shared engine. It records the normalized report, policy-replay identity, and root
notice identities in `docs/examples/catalogue/snapshots/`; it does not commit a raw
third-party patch or execute upstream code. A selected source cannot be silently
omitted: a failed acquisition or notice read is a capture hold.

`node tools/examples.mjs audit` compares the fixed base tip, merge base and head
with the current provider PR and identifies engine or measurement drift. `node tools/examples.mjs
verify` replays every source and policy variant without a GitHub request
and checks that the committed observations are the deterministic engine output.
Snapshot recapture is deliberate; Git history retains the preceding provenance.

## Evidence boundary

Each frozen real case names base tip, actual merge base, head, capture time, engine
and report identities, provider file-set counters, source and payload digests,
inspected notice identities, and a normalized-report-only rights record. It also
records a per-file material disposition: normalized facts are retained, but patch
text and binary bytes are not. The resulting record supports offline policy replay,
not fresh remeasurement. A moved upstream head does not change the taught snapshot.
The Playground may offer a live analysis and return to the snapshot, but it never
presents that fresh read as the frozen example. Binary files remain records with
unmeasurable lines, and incomplete source inventories retain their unknown membership.
