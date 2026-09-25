# Troubleshooting

Start with the stage that failed, not the largest number on the screen. A source or configuration error, valid unknown evidence, a held rule, and an unobserved provider write need different repairs. Keep the exact version, source comparison, policy identity, stable diagnostic code, and phase together while investigating.

For a shorter product question, use the [FAQ](https://diffdevil.dev/faq/). This page returns you to the task or concept that owns the repair; it does not replace the command, policy, or operator references.

## The command cannot find or read its input

Check which source you selected: a local Git comparison, patch file, saved report, or GitHub PR. Run from the intended checkout or give an explicit path/comparison. A missing explicit source is `E_SOURCE`, not an empty diff. A command reading stdin cannot also obtain another independent input from that same stream.

Read the source diagnostic before changing a policy. Git acquisition, malformed patch data, an invalid report, and a denied GitHub read are different failures. A private or inaccessible resource returning 404 is not proof of absence. Confirm the credential, API host, repository, immutable revisions, and actual access through the supported host; never paste a token into a support report.

Return to [CLI source selection](../reference/cli.md#invocation-and-source-families) or [Analyze local changes](../start/analyze-local-changes.md). A report copied from another comparison cannot repair a missing source for privileged effects.

## Configuration is invalid or different from what you expected

The ordinary repository filename is `.diffdevil.yml` at its root. Explicitly selected files and a host's defaults still matter. Use the applicable host's effective policy and origins instead of assuming the same filename means the same result everywhere. Actions do not inherit App dashboard defaults; extension personal settings are not repository automation.

Validate the complete canonical policy specimen without contacting GitHub:

```sh
npx diffdevil validate --config docs/examples/policies/story/rules.yml --format json
```

This validates configuration and declarations; it does not acquire a PR or authorize writes. Duplicate keys, cyclic YAML aliases, invalid declarations, metric dependency cycles, invalid band cut points, and a misspelled field are errors even when the declaration would not be used on this PR. Bounded ordinary YAML aliases are data reuse, not permission to execute code.

Check the diagnostic's configuration path and source span. Explicit empty arrays and replaced declarations must remain explicit; an invalid or unreadable policy must not be “fixed” by silently switching to a default preset. Return to [Configure policy](../policy/configure.md) and [From measurements to rules](../policy/from-measurements-to-rules/README.md).

## An expression is rejected

Use the code and phase to distinguish lexical syntax, parsing, name binding, type checking, and a reached evaluation failure. A spelling suggestion is advice, not an automatically repaired expression. For example, this deliberately misspells a field and must fail rather than analyze a different formula:

```sh
npx diffdevil query --diff-file docs/examples/diffs/review.diff --no-config --expr 'totals.lines.modifed' --format json
```

`E_UNKNOWN_FIELD` points to `modifed`; the correct field is `modified`. Function calls use bare names such as `startsWith(f.path, "src/")`, not JavaScript methods. Bracket access takes a literal string, not a dynamic index. `0 < x < 100`, top-level lambdas, JavaScript comments, interpolation, and `round(...)` are not supported language features.

A `.ddexpr` file holds one complete UTF-8 expression, without Markdown fences or YAML syntax. Production compilation consumes the full expression and rejects lexer/parser errors; editor recovery is not executable input. Every branch binds and type-checks, so `false && missingSymbol` is still invalid even though a valid right operand would not be evaluated.

Wrong arity and overloads should lead you to the declared function signatures. A metric cycle needs its dependency path broken, not a retry. `E_FORBIDDEN_NAME` rejects keys such as `constructor`; it is not an ordinary missing-field error. The [detail reference](../reference/language-and-contracts/detail-language.md#syntax-and-source-locations) preserves the full syntax, type, function, and diagnostic catalogues.

## A diagnostic points into YAML, an expression, or a Unicode line

Canonical source ranges are zero-based UTF-16 offsets with an exclusive end. Display lines and columns are one-based UTF-16 positions, not terminal cells or grapheme counts. CRLF is one line break. EOF can have a zero-width span, and unavailable positions are omitted rather than invented as zero.

An expression decoded from YAML or JSON has a different coordinate space from its original scalar. Folding, indentation, escapes, and aliases can move visible characters. Preserve the original source and the diagnostic's precision: `precision: scalar` identifies a scalar-level source range, not an exact caret within it. Alias declaration and use-site spans remain distinct.

Configuration compilation can report independent errors in deterministic source-path, offset, phase, and code order. A bounded diagnostic result states omitted errors instead of flooding output. Evaluation stops at its first reached fatal error; a later decisive boolean cannot erase it. Messages can improve while codes keep their meaning. Return to [Diagnostics](../reference/language-and-contracts/detail-language.md#diagnostics); compiler/token implementation details belong to [parser architecture](../../language/parser-architecture.md).

## A count or decision is unknown

Unknown is not a generic failure message. Inspect the evidence for the particular value used by your rule. A report can have exact raw counts, bounded replacement-aware Changed, an incomplete path set, and unmeasurable binary lines at the same time.

For the retained bounded specimen, lossless JSON can report the interval while a strict scalar cannot select one number:

```sh
npx diffdevil query --report docs/examples/reports/bounded.json --no-config --expr 'totals.lines.changed' --format json
npx diffdevil query --report docs/examples/reports/bounded.json --no-config --expr 'totals.lines.changed' --format value
```

The first succeeds with evidence; the second exits `3` without a scalar. It is not permission to substitute a midpoint or zero. A threshold inside an interval can remain unknown; one outside it can already be proven. `requireExact` deliberately turns unresolved evidence into an error, while `lowerBound` and `upperBound` are explicit projections with their own provenance.

A missing optional field, explicit null, numeric unknown, and unmeasurable material are different states. `orElse` handles missing/null, not numeric uncertainty. An unavailable rename `oldPath` can use an explicit fallback to `path`; a binary line count cannot become zero through that same idea. Return to [Evidence and uncertainty](../understand/evidence-and-uncertainty.md).

## File lists, exclusions, or top results look incomplete

Inspect file-set completeness independently of line evidence. An exact total cardinality does not supply the missing paths. A filter can leave observed entries only possibly selected; `map` does not erase that uncertainty. An incomplete collection is not a complete array of the files the provider happened to return.

Strict lines, NUL, scalar, and plain-record formats require a determined selected result and can exit `3`. Use lossless query JSON to inspect possible membership and unseen remainder. `certain(...)` or an appropriate `--certain` projection explicitly narrows the question to definite observed entries; it is not a completeness repair. Newline-bearing paths need NUL or JSON, not a line-oriented list.

An uncertain sort key or unseen entry can change the first result. `take(..., 1)` can therefore have exact cardinality one without establishing which file it is. `all` over a complete empty set is true and does not prove that matching files exist; add a count condition when that matters.

For exclusions, check global inclusion first, then a named scope's hard include-only boundary and additional rules. A scope cannot reintroduce a globally excluded file. Rename-aware `pathMatches` checks either endpoint; `glob(f.path, ...)` intentionally checks only the selected path. Patterns are case-sensitive repository paths on every OS, not native filesystem globs. Return to [Paths and scopes](../policy/paths-and-scopes.md) or [Collections and scopes](../reference/language-and-contracts/detail-language.md#collections).

## Arithmetic fails or a budget is exhausted

`E_DIVIDE_ZERO`, `E_POSSIBLE_DOMAIN`, and `E_NUMERIC_OVERFLOW` describe invalid reached operations or domains, not unknown measurements. Safe-integer counts must not lose precision before validation. Float arithmetic is finite binary64, with no hidden tolerance for equality or thresholds. Unmeasurable input does not become measured by multiplying it by zero.

`E_LIMIT` means no completed semantic result for that evaluation. Reduce unnecessary nesting, repeated collection comparisons, materialized output, or expression size; inspect the selected host profile before retrying. A policy cannot raise its own limits. Source acquisition, expression work, whole-policy work, output bytes, and diagnostic counts have separate budgets.

Logical work is deterministic: short-circuiting skips unreached work, but a warm cache does not buy extra semantic allowance. Nested collection operations can multiply cost. A provider file ceiling needs an evidence/acquisition repair, not a larger expression budget. Return to [Deterministic limits](../reference/language-and-contracts/detail-language.md#deterministic-limits) and the [source/host boundary](../understand/trust-and-mutation.md).

## An Action never starts or cannot write

For no run, inspect workflow activation, selected events, repository restrictions, and the revision containing the workflow. A workflow file committed to one branch does not prove that an eligible event used it. The [first labeling workflow](../start/label-pull-requests.md) owns the working setup.

For a denied operation, identify the credential and actual permission that owns it. Analyze remains read-only even in a job with write permissions. The optional `policy-token` reads trusted base/pinned policy and relative templates; `github-token` still owns PR acquisition and all effects. Giving the policy credential write access is not a repair for a denied effect credential.

Privileged workflows do not need to check out or execute PR-head code to label a PR. Workspace policy cannot authorize Action writes, and apply revalidates supplied report/plan artifacts against current trusted policy and provider state. Do not bypass that boundary to make a job green. Return to [GitHub Actions](../use/github-actions.md) and its [reference](../reference/github-actions.md).

## A script mistakes output or an exit code for success

Human summaries are for reading. Use versioned JSON reports/query envelopes for evidence, strict formats for a determined machine result, and explicit exit handling. CLI check exits distinguish true, false, invalid input, and unresolved evidence; Actions deliberately have a different exit contract. [CLI output and exits](../reference/cli.md#exit-codes-and-recovery) owns the exact meanings.

Strict semantic output is validated before emission, but a broken pipe, interrupted process, or filesystem failure can still interrupt transport. Do not call truncated JSON a partial valid report. Preserve stderr separately, check the process result, and validate a saved artifact before consuming it.

Report, query, plan, and effect-observation envelopes are different contracts. A hash proves byte identity, not authorization. Read compatible artifacts through the declared readers and reacquire privileged evidence as required. Return to [Use results in scripts](../start/use-results-in-scripts.md) or [Reports, plans, and apply](../use/shared-workflows/reports-plans-and-apply.md).

## Labels or comments disagree with a successful analysis

Analysis, desired effects, performed requests, and provider readback are separate. Inspect the effect journal and current GitHub state. A valid no-op is not a missing write; a successful request acknowledgment is not necessarily observed final state.

A stale head or policy requires a fresh comparison and plan. `E_EFFECT_INCOMPLETE` or ambiguous transport needs reconciliation before retry, especially for comment creation. Do not replay a saved plan blindly. Owned comments require the expected actor and lifecycle identity; another actor's old comment is not adopted or deleted. Preserve unrelated labels and existing definition presentation.

Multiple writers can undo each other despite each having a valid policy. Pause only the overlapping owner and resolve in-flight work before switching. Return to [Labels, comments, and definitions](../use/shared-workflows/labels-comments-and-definitions.md) or [App migration](../use/managed-app/service.md#move-between-actions-and-the-app).

## The extension is absent, stale, or uses different settings

First distinguish a published Store installation from an unpacked source build. The source extension exists, but Store publication is a separate release effect. For an unpacked update, reload the extension and already-open PR tabs; replacing files does not replace an injected content script. Respect managed-browser restrictions rather than bypassing them.

Confirm a supported GitHub PR view and comparison. Commit-only or narrowed comparisons must not inherit full-PR file measurements. Dynamic page replacement, an inaccessible base, a moving head, missing patch material, and a private API fallback can affect acquisition. A missing or incomplete source should remain visible, not produce a fabricated zero.

Inspect personal, repository, and explicit per-repository settings and their origins. Invalid advanced YAML does not overwrite saved configuration. Local augmentation and a virtual band are not an applied GitHub label. A native label-picker handoff still needs the user's own GitHub selection. The current extension has no authenticated App report-delivery integration, so a preference cannot manufacture a matching App result.

Clearing a rebuildable cache can remove stale local evidence, but not change repository truth; a settings export can expose private policy. Return to [diffdevil for GitHub](../use/browser-extension.md) and its [privacy notice](../../../apps/browser-extension/privacy.md).

## The Playground cannot load a pull request or export an expected result

Use a public GitHub PR or the repository-owned examples. Private PRs are not supported by the public service; do not paste a credential or private patch into a supposed workaround. Installation in the managed App does not authorize private Playground access.

Separate input validation, GitHub acquisition, an upstream rate limit, and the Playground's own abuse/compute limits. A throttle is not a parser failure. Retry according to the actual response rather than repeatedly submitting the same request. A frozen example is a published specimen, not current provider state.

The complete configurable website Playground and the earlier deployed measurement Worker have distinct release standing. A source-supported API or view is not automatically live at the deployed endpoint. Exports are portable policy/CLI/Action inputs, not permission to enable automation. Return to [Playground](../use/playground.md) and [Releases](releases.md#application-and-website-standing).

## An agent has the Skill but cannot execute diffdevil

Instruction files, persistent host installation, loaded knowledge, runtime availability, and actual CLI execution are separate outcomes. A transient sandbox file is not automatically the user's personal Skill installation. Resolve the real harness's supported route and verify the complete source folder and its versioned references.

For an install-free carrier, verify the release manifest and archive digest before execution. A repository build of the carriers is not their publication. Do not substitute mutable `main` for a stable manifest or assume the Skill's version equals npm's. A development installation needs an explicit immutable source coordinate and that standing.

A restricted harness may permit attached source but not persistent installation, package restoration, or native execution. Report the precise unavailable boundary; do not claim a tool run from merely reading its instructions. Return to [With a coding agent](../use/coding-agent.md).

## The App is installed but does not run

Check installation approval, actual repository access, explicit execution consent, effective policy, and the chosen writer before retrying a PR. Authentication is not administrator authority. `E_ACCESS_DISABLED` can mean the repository is intentionally not enabled; it is not necessarily a broken token. Imported/restored settings do not auto-enable execution or history.

An unavailable public dashboard or configured-but-unexposed URL is not something to repair by guessing an endpoint. The complete managed experience remains in development; the source backend and contained canary do not prove public admission. Use the operator's actual supported administration route, and preserve the dashboard's unsettled interaction details.

For admission, `E_ADMISSION_UNAUTHORIZED` needs current authority, `E_ADMISSION_STALE` needs a fresh revision/readback, and `E_ADMISSION_WRITER_UNRESOLVED` needs exclusive-writer resolution before enablement. A tombstone or removed installation is not permission to bypass consent in SQL. Return to [Use the managed service](../use/managed-app/service.md).

## An App operation needs repair

For no admitted work, inspect webhook delivery separately from queue consumption. A signature failure (`E_WEBHOOK_SIGNATURE`) needs a matching protected webhook-secret configuration and exact-byte verification, not disabled validation. `E_ENQUEUE` means admission failed; an `ignored` event selected no work. Readiness currently proves database reachability, not a functioning repository lifecycle.

For admitted work, keep the stable code and phase. The following fallback inventory is generated from the actual execution-stage boundary. A more specific core/provider code can be preserved instead of the fallback; the phase still tells you which operation was being attempted.

<!-- manual:generated app-execution-stages -->
[Canonical execution boundary](../../../apps/github-app/app.mjs)

| Fallback diagnostic | Execution phase |
| --- | --- |
| `E_APP_INSTALLATION_CREDENTIAL` | `installation-credential` |
| `E_APP_REPOSITORY_TARGET` | `repository-target` |
| `E_APP_PULL_SNAPSHOT` | `pull-snapshot` |
| `E_APP_REPOSITORY_CONFIGURATION` | `repository-configuration` |
| `E_APP_POLICY` | `trusted-policy` |
| `E_CHECK_PUBLICATION` | `check-publication` |
| `E_APP_CHECK_REREQUEST` | `check-rerequest` |
| `E_APP_POLICY_EXECUTION` | `policy-execution` |
<!-- /manual:generated app-execution-stages -->

A credential or repository-target failure belongs with the operator's App identity, grant, or access checks. A snapshot/policy failure needs fresh source and valid trusted policy; never promote PR-head policy or missing data to write authority. `E_CHECK_STALE` and `E_PULL_REQUEST_CLOSED` can terminate obsolete work without effects. `E_GITHUB_RATE_LIMIT` and `E_LEASE_LOST` require the supported retry/claim path, not an unfenced second worker.

`E_CHECK_PUBLICATION` is distinct from earlier label/comment results. `E_EFFECT_INCOMPLETE` requires provider readback and reconciliation. A history-store failure after observed effects must not repeat those effects merely to fill a history row. Queue exhaustion and open repair are not completed operations, and missing ingress is not repaired by replaying unrelated admitted work.

Operators should preserve minimized diagnostic/readback records inside the recovery lifetime, inspect the actual repair state, and follow [Self-host recovery](../use/managed-app/self-hosting.md#observe-and-repair-by-stage). Never post raw webhook bodies, report dumps, secret values, or unrestricted logs to a public issue.

## Report a useful problem safely

Include the affected surface and version or exact source commit, the failing command or user task with sensitive values removed, source/comparison and policy standing, stable code/phase, expected versus observed result, and a minimal non-sensitive reproduction. A redacted support snapshot is different from an unredacted settings export. Do not upload private paths, source, PR prose, credentials, or account-wide state to make a report look complete.

For `E_INTERNAL`, preserve a supplied safe correlation identifier and minimal reproduction; ordinary output must not expose a full stack or secret-bearing input. Report ordinary product defects through the repository's Issues route in [Technical and project documentation](technical-and-project-documentation.md). Suspected vulnerabilities use the private route in [Security and data](security-and-data.md#report-a-vulnerability), not a public issue.
