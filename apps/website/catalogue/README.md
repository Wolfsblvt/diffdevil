# Playground example catalogue

## Meaning

This directory owns the public examples the website and playground present: the list of frozen fixtures and the captured real-PR snapshots. It is AGPL application data. It stores identities, lessons and provenance; every measurement shown to a visitor is produced by the shared engine from the named asset or captured report, never typed here.

## Frozen fixtures

[`fixtures.mjs`](fixtures.mjs) lists the deterministic examples. Each names a repository-owned input under `docs/examples/` (a unified diff analyzed at build time, or a saved `diffdevil.report` specimen re-read by the engine) and the policy it is evaluated with. They run without GitHub. Their expected semantic outcomes are asserted by `apps/website/website.test.mjs`.

## Curated real pull requests

`curated/<id>.json` files are teaching snapshots of public pull requests: real repository, number, title and URL; the reason the PR was chosen and what it teaches; the analyzed head/base and time; the engine package, report schema, measurement identity and policy used; the evidence standing; and the complete engine report. The report is the replay source: the playground re-evaluates edited policy against it locally through the same engine, exactly like `diffdevil … --report`.

Capture and audit with the maintainer tool (no daemon, no scheduled job, no GitHub write):

```sh
node tools/snapshot-prs.mjs capture <id> https://github.com/owner/repo/pull/N --reason "…" --teaches "…"
node tools/snapshot-prs.mjs audit
```

`audit` lists heads that moved and engine or measurement identities that changed since capture. A moved head does not make a snapshot wrong; the playground shows the snapshot as the teaching reference, offers **Analyze latest** through the ordinary public-PR route, and allows return to the snapshot. Refreshing is a deliberate recapture with the same id; the previous snapshot stays in Git history with its rationale.

The two current entries are seeds from this project's own repository so the snapshot route is exercised end to end with real data. The researched third-party teaching set is authored separately and replaces or extends them; it is not derived from these files.
