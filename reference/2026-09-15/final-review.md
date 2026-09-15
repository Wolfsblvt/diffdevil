# Final source, documentation, and publication-boundary review

## Meaning

This records the September 15, 2026 final local review: defects repaired, useful
user journeys added, references preserved, and the precise boundary handed to the
release operator. It is not an independent review, live GitHub canary, licence
selection, or public release. Current executed totals belong in
[Qualification](../../docs/QUALIFICATION.md).

## Runtime and qualification findings

The CLI version was a hardcoded development string. It now reads installed
package metadata, and installed-consumer proof exercises a different version
before restoring exact consumer bytes. The package journey also assumed a POSIX
launcher; its Windows path now delegates to npm's installed executable dispatch.
Native Windows execution remains required rather than inferred from that repair.

The Action summary already separated planned operations and observed provider
results, but lacked enough measurement/source context for a user to understand
its number. It now includes comparison revisions, individual raw and replacement
facts, file counts/completeness, and configured metrics. Existing escaping,
unknown/bounded distinctions, size limits, and full JSON artifacts remain intact.

The existing parser, policy, Git, GitHub acquisition/application, Action input and
output transport, stale evidence, owned comments, and distribution seams were
read against their maintained contracts. No additional production semantic change
was selected in this pass. This is a same-author inspection supported by executable
regressions, not a claim that every race, platform or hostile input was exhausted.

## User-facing result

The quickstart has one complete workflow, no repository checkout, no manual label
creation, no policy file, and no explicit token setup. Root defaults deliberately
apply the size preset; analysis remains independently read-only. Edited events
and non-canceling per-PR concurrency address retargeting and overlapping writes.
The intended Action ref is clearly marked unavailable until publication.

Local examples use an actual four-file patch with 10 changed lines and 16 raw
churn. Custom policies teach source/test-scoped signals and one owned upserted
comment without presenting a line count as code quality. Tests execute actual
CLI specimens and policy/workflow files, not manually translated approximations.
The root README links these first-use tasks; the detailed manuals remain available.

`docs/DOCUMENTATION.md` owns the teaching plan and canonical source boundary for a
future small site and wiki-like help. No separately maintained wiki or placeholder
website was created. The complete portable engine remains the product, not merely
its shortest labeling example.

## Public/private preservation

Founding research, implementation guidance, schemas, conformance assets, and
substantive earlier qualification/comparison returns have durable public homes.
Public editions identify their historical standing and do not silently upgrade
old evidence. Original conversations, source bundles, former repository documents,
returns, and local Git history remain preserved privately, with exact hashes for
the separate data-only records package. No source or old commit is discarded.

A clean-root publication carrier is prepared from the final tracked tree. The
private development repository retains its original ancestry; it must not be
pushed wholesale to a public remote. The publication carrier is inspected for
exact tree equality, independent Git objects, no remotes, and no private ancestors.

## Dependency and workflow review boundary

No new npm package, bundler, toolkit, or global tool was installed. The existing
15-package lock and 12-package shipped runtime closure remain unchanged. The
read-only CI workflow pins official checkout and setup-node commits inspected at
their metadata surfaces, with no credential persistence or cache upload. See the
[dated provider check](github-workflows.md).

A limited advisory lookup checked
[GHSA-2g4f-4pwh-qvx6](https://github.com/advisories/GHSA-2g4f-4pwh-qvx6): its affected
Ajv 7/8 range ends before 8.18.0; the lock uses 8.20.0. This does not constitute a
whole-lock advisory scan. Other broad searches and unavailable upstream advisory
indexes were insufficient to establish a clean dependency bill of health. Refresh
exact-lock advisory evidence at release time; no network audit or dependency
update was substituted for the offline qualification.

## Remaining release consequences

The remaining operator work is native Windows qualification, an independent
trust/effects read, an authorized disposable-repository hosted canary, owner-selected
licence/version/publication metadata, and the actual selected publication effects.
A source push can activate the included read-only verification workflow, but does
not itself publish npm, create `v1`, establish Marketplace availability, or prove
private security-reporting intake. Website and visual delivery may follow from
these maintained sources. The [release procedure](../../docs/PUBLICATION-BOUNDARY.md)
is the compact operator path.
