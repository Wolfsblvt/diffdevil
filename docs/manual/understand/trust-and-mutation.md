# Source identity, trust, and mutation

A result needs an identity before it can be compared or reused. A write needs more: trusted policy, fresh evidence, the correct target and authority to perform the selected effects. A valid file, a familiar PR number or possession of a token does not establish all of those.

## Identify the comparison, not just the repository

Read the report's source kind and comparison mode. For Git-backed changes, inspect the resolved revisions. For GitHub, also inspect the repository, PR, head/base and file-set completeness. A supplied patch has its own comparison identity; it does not become a fresh GitHub acquisition because a plan names a PR target.

Keep the report, effective policy and version identities with the result. A report ID identifies particular report content. A comparison ID distinguishes the analyzed source. Policy identity distinguishes the question and configuration. A head moving, a different merge base, an exclusion or a policy override can legitimately change the result.

The [local first-success guide](../start/analyze-local-changes.md#verify-what-the-report-describes) shows where to inspect these identities. The complete JSON is preferable to a copied line count when another process must establish what was analyzed.

## Treat proposed changes as data, not trusted policy

A pull request may propose changes to the very workflow or policy that would classify it. Reading that proposal for analysis does not make it a trusted instruction to a writer.

The applying GitHub routes normally read policy from the PR's trusted base, resolving its immutable commit. A deliberately pinned policy names its full revision. Referenced templates follow that trusted source rather than being quietly loaded from hostile head content. Unsupported policy-file objects and acquisition failures are errors, not invitations to execute the repository or silently use another file.

The no-config [label workflow](../start/label-pull-requests.md) uses built-in policy and does not check out code. Keep its privileged context separate from jobs that build or test a PR's proposed code. Read-only local analysis may deliberately inspect workspace policy; that is a different trust choice from applying it to GitHub.

This distinction also explains why two surfaces can disagree. Personal extension policy, a workflow's trusted base policy and service settings need not be identical. Compare origins and revisions before interpreting the difference as a counting defect. The [canonical FAQ answer](../faq.md#different-results) covers the adoption question without duplicating it here.

## Structural validity is not trust

A schema can check the shape of an artifact. A semantic reader can reject inconsistent measurements, incompatible versions or invalid relationships. Neither proves that the sender is authorized, that a hash came from a trustworthy producer, or that GitHub still has the same head.

An immutable artifact can faithfully record an **old** result. That is valuable evidence, not a current write instruction. A plan remains a plan even when every field validates.

Keep sensitive artifacts within their intended audience. Reports can contain private paths, repository identities, revisions and policy material even when they contain no credential or raw source lines. A diagnostic export is not automatically public-safe.

## Reuse deliberately before applying

Read-only queries can reuse a complete saved report and preserve its evidence. Explicitly selecting new policy can recompute the question over those observed facts; it cannot invent omitted files or reacquire a moving PR.

Applying routes have a stronger boundary. Fresh GitHub acquisition is the default. The CLI's `--report` plus `--trust-report` is an explicit host assertion that the bound report is trusted for that operation, not a general repair flag for stale or incomplete artifacts. The caller still owes the target, policy, source and authority checks. Do not add it because a saved file happened to pass validation.

GitHub Actions do not expose that bypass. Their applying path reacquires and revalidates the supplied artifact against trusted current inputs. Selecting local Git acquisition similarly requires the current PR commits to be available locally; it does not fetch, check out or execute the PR to manufacture them.

[Reports, plans, and apply](../use/shared-workflows/reports-plans-and-apply.md) owns the complete operating procedure. The [current GitHub API integration](../../integration/github-api.md) remains the specialist source for acquisition, trust and reconciliation details.

## Freshness lasts only as long as the observation

Check target and source identity at application preflight, before consequential requests, and at completion. If the head or base moves, stop the stale continuation. Do not combine old counts with newly acquired file identities and call the mixture one report.

If a move or failure occurs after some writes, preserve that partial result. There is no atomic transaction across GitHub label and comment requests. An ambiguous response may conceal a successful write; observe before retrying. [From facts to provider state](facts-to-provider-state.md#application-must-establish-more-than-the-plan) separates acknowledged requests, verified state, no-ops and partial completion.

When blocked, return the exact missing fact: an unresolved target, stale source, untrusted policy origin, incompatible artifact, insufficient permission or unobserved effect. Narrow the repair to that stage rather than bypassing every check.

## Give overlapping effects one owner

Several read-only surfaces can coexist. A local report, extension view and analyzing Action do not compete for labels. Two independently configured writers managing the same group or comment lifecycle can.

When changing writers, carry the intended policy and ownership first. Disable the old writer's overlapping effects, inspect a plan from the new owner against current evidence, and verify the resulting provider state after deliberate activation. Preserve unrelated labels and comments. Do not treat the presence of matching names as proof of matching ownership or lifecycle rules.

Return to [How diffdevil reasons](README.md) for the full model, [GitHub Actions](../use/github-actions.md) for trusted workflows, or [Security and data](../help/security-and-data.md) for each surface's data and credential boundary.
