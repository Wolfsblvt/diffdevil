# Example catalogue

## Meaning

This is diffdevil's one lesson-led example catalogue. The website and Playground
consume its selected sources, policies, guide, and snapshots; no page-specific
measurement or second example list is authoritative.

Every catalogue source and visible teaching variant is backed by a real public pull
request. There is no controlled-fixture, manual-fixture, or Frozen-versus-Real
catalogue estate. If a selected lesson cannot be supported by honest public evidence,
it is reshaped to the observed facts or removed rather than replaced with invented
source material.

## Capture and evidence editions

`node tools/examples.mjs capture <id>` deliberately captures one selected public
source edition into `snapshots/`. `capture-all` captures every selected edition and
regenerates `observations.json`.

A single pull request may have more than one evidence edition when the acquisition
surface itself is the lesson. Prettier #13183 retains a bounded PR-files edition and
an exact raw-comparison edition. CMake documentation l10n #2 retains an incomplete
comparison-file inventory and a complete paginated PR-files inventory. Those are
separate evidence standings for the same immutable source identity, not synthetic
alternatives.

Captures keep a normalized diffdevil report, provider inventory facts, pinned notice
identities, payload digests, and one per-file retained-material disposition. They do
not vendor raw third-party patches, executable bytes, discussion, credentials, or
whole provider responses. Offline replay therefore supports policy evaluation, not
fresh remeasurement.

`audit` distinguishes moved provider identity, merge-base, evidence-edition, engine,
policy, report, or measurement facts. `verify` proves that every real-PR variant
replays offline and regenerates the retained observations.

No command polls, executes third-party code, writes upstream, or silently substitutes
a different lesson when capture fails.
