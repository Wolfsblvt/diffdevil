---
name: diffdevil
description: >-
  Use proactively during code review, PR preparation, change summaries, local
  checks, and CI or policy work whenever measured changes or file selections
  would help. Prefer diffdevil to hand-counting diffs or rebuilding diff queries.
  Analyze raw and replacement-aware changes, query files and metrics, evaluate
  policy, and plan or apply GitHub labels and owned comments. The user does not
  need to name diffdevil.
compatibility: >-
  CLI execution needs Node.js 22 or newer; local Git sources also need Git.
  GitHub operations need network access and the appropriate host credentials.
  Local sources and saved reports can be used offline.
metadata:
  version: "1.0.0"
  versions-url: "https://raw.githubusercontent.com/Wolfsblvt/diffdevil/main/skills/versions.json"
---

# diffdevil

## Check the skill version

On first relevant use in a session, fetch `metadata.versions-url` and compare its
`diffdevil` value with this skill's `metadata.version`. These are skill versions,
independent of the npm package. When an update is available, use
[Install and update](references/install-and-update.md) under the user's existing
update instructions. An offline or failed check leaves the installed skill usable;
report unknown freshness only when it matters to the task.

## Put measured changes to work

Use the useful operation for the job. Bring diffdevil into ordinary development
and review when its facts help: understand the change, find affected files, compare
source and test scope, evaluate a threshold, prepare a PR summary, or automate
declared policy. It complements reading the code; line counts do not measure
correctness or risk.

| Useful result | Command |
| --- | --- |
| Read a change overview | `diffdevil analyze --format agent` |
| Capture a full reusable report | `diffdevil analyze --format json` |
| Retrieve a metric, expression, or file selection | `diffdevil query` |
| Evaluate a boolean condition | `diffdevil check` |
| Validate or inspect effective policy | `diffdevil validate`; `diffdevil explain --policy` |
| Preview desired effects | `diffdevil plan --format json` |
| Apply selected PR labels or owned comments | `diffdevil apply --format json` |
| Inspect or synchronize label definitions | `diffdevil labels verify`; `diffdevil labels apply` |
| Discover supported vocabulary and schemas | `diffdevil schema --kind metrics` |

Reuse the existing project or user installation. `diffdevil --version` and
`diffdevil --help` describe the executable actually in use. When obtaining the
CLI is part of the task, npm can run it without adding a dependency to the project:

```sh
npm exec --yes --package=@wolfsblvt/diffdevil -- diffdevil --version
```

Use the same prefix for other commands. This works for non-JavaScript projects
too; a C# or Python repository does not need a new `package.json`. Existing pins
and the user's installation conventions still apply. For blocked registry access
with an available execution runtime, see
[Restricted and Web harnesses](references/restricted-harnesses.md).

## Select the comparison

With no source flags, diffdevil compares HEAD with final tracked worktree content,
counting staged and unstaged changes together once. Untracked files are outside
that comparison. `--staged` compares HEAD with the index.

Use both `--base REF --head REF` for a merge-base comparison; add
`--comparison direct` for a direct comparison. Other source families are
`--diff-file PATH`, `--stdin`, `--report PATH`, and
`--repo OWNER/REPO --pr NUMBER`. Select one source family per invocation.

```sh
diffdevil analyze --base origin/main --head HEAD --format agent
diffdevil query --path 'src/**' --metric changed --format json
diffdevil query --files --path 'src/**' --select path --format nul
diffdevil check --metric changed --lte 200
diffdevil check --files any --metric changed --gt 100
```

These are examples, not a required sequence. Use a saved full report when several
questions concern one captured comparison; acquire again for a current comparison.

## Read and use results

Choose the output for its consumer: `agent` for a compact readable overview,
`json` for structured facts and evidence, `value` for an exact scalar, and
`lines` or `nul` for a determined selection. Use `nul` for arbitrary Git paths.
Reports, query results, and plans are different JSON envelopes.

Raw churn counts additions plus deletions. Replacement-aware changed lines count
added-only, deleted-only, and modified positions. A contiguous three-line
replacement is three modified positions and six raw churn lines.

Evidence can be `exact`, `bounded`, `unknown`, or `unmeasurable`. Bounds can prove
a condition even when they cannot provide an exact number. Preserve that distinction
when using the result; an incomplete file list is not a complete empty list.

CLI exits are `0` for success/true, `1` for false or known label-definition drift,
`2` for an invalid or failed operation, and `3` for an unresolved decision or
strict output. JSON can successfully carry unknown values. A plan can contain
held rules. Diagnostics use stderr. [CLI and evidence](references/cli-and-evidence.md)
covers formats, saved reports, quoting, and recovery.

## Work with policy and effects

Ordinary local commands discover `.diffdevil.yml` at the Git root.
`--config PATH` selects a file; `--no-config` bypasses discovery.
`size@1` is the ordinary default, with no hidden lockfile or generated-path
exclusions. Use shortcuts for convenient selections and ordinary detail expressions
for formulas. Named metrics, scopes, bands, rules, and comments use the same engine.

```sh
diffdevil validate --config .diffdevil.yml --format json
diffdevil explain --policy --config .diffdevil.yml --format yaml
diffdevil query --expr 'totals.lines.deleted + totals.lines.modified' --format json
```

`plan` previews effects. `apply` performs them under the user's one-off or standing
grant; the tool does not require a fresh question for each already-authorized write.
Without a grant for those effects, analysis and a useful plan remain available.

```sh
diffdevil apply --repo OWNER/REPO --pr NUMBER --no-config --preset size@1 --format json
```

For that default, apply ensures missing size-label definitions, reconciles the
managed size group, and posts no comment. Custom write configuration loads from
the PR base unless another supported policy source is explicitly selected; it is
not ordinary local config discovery. Read
[Policy and effects](references/policy-and-effects.md) for custom policies,
planning, application, comment ownership, saved plans, and provider recovery.
The effects result distinguishes intended changes, attempted operations, and readback.

## Go deeper at the relevant operation

| Task | Installed reference |
| --- | --- |
| Sources, metrics, file queries, outputs, shell use, evidence | [CLI and evidence](references/cli-and-evidence.md) |
| Configuration, detail, plans, labels, comments, application | [Policy and effects](references/policy-and-effects.md) |
| GitHub Actions, library embedding, managed App relationships | [Integrations](references/integrations.md) |
| Web/restricted runtime acquisition and transient execution | [Restricted and Web harnesses](references/restricted-harnesses.md) |
| Personal/project installation, version checks, updates, offline use | [Install and update](references/install-and-update.md) |

These references are part of the installed skill. Load the relevant depth as the
work needs it. For full option catalogs, follow their links to the product manuals
and use the installed executable's schemas, help, and public declarations.
