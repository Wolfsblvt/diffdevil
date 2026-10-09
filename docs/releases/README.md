# diffdevil releases

## Meaning

This directory is the maintainer map for repository-owned dated release notes. Current reader guidance is [Releases](../manual/help/releases.md); this map is not a second current adoption guide. Each note explains the useful product result, compatibility boundary, qualification standing, and deliberately unfinished product surfaces for one published family version.

Release notes do not replace the maintained [Vision](../VISION.md), [Direction](../DIRECTION.md), [Decisions](../DECISIONS.md), the current manual, or [Qualification](../qualification.md). A prepared note is not proof that npm, a Git tag, GitHub release, Action alias, Marketplace entry, or any hosted service exists; those coordinates become current only after provider readback.

## One product history, explicit release families

[Release families and versioning](../RELEASING.md) governs version ownership and publication selection. Keep the history joined here while identifying the family in each note's title and filename: `vX.Y.Z.md` for the open tool, `extension-vX.Y.Z.md`, `app-vX.Y.Z.md`, and `skill-vX.Y.Z.md` for the other families. Existing dated notes and exact release identities are not renamed or rewritten to align unrelated versions.

Explain what changed for that tool, its included engine or runtime when relevant, compatibility and migration consequences, and the exact release/channel availability. A shared feature can have a coordinated announcement naming several family releases; it does not require a fictional suite version. A documentation-only guidance change need not invent an executable release note. Prepared, published, deployed and available in a browser Store remain separate facts.

## Maintainer release map

- [`v1.0.0`](v1.0.0.md) — first stable package, CLI, TypeScript API, and four
  GitHub Actions, published from exact source `0827485`.
