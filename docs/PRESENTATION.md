# Human and agent presentation

## Meaning

This document defines diffdevil's maintained textual presentation contract for reports and desired effect plans. It owns the distinction between the compact human terminal summary, the expanded human aggregate view, the context-efficient agent projection, and canonical structured data. It also owns the terminal-colour boundary and the independent versioning of textual projections.

The presenters are projections of `diffdevil.report` and `diffdevil.plan`. They do not add measurement, policy, risk, importance, quality, review, or provider-effect meaning. JSON and JSONL remain the exhaustive stable extraction contracts.

## One semantic result, several reading surfaces

The same canonical report can be consumed as:

| Surface | Purpose | Stability |
| --- | --- | --- |
| Human summary | Read the important result and relevant policy standing quickly | Public textual interface; layout may evolve deliberately |
| Human full detail | Inspect complete aggregate identity, evidence, categories, scopes, metrics, bands, and rules | Public textual interface; not a file-record dump |
| Agent projection | Give a coding agent deterministic, context-efficient facts without human prose | Versioned textual projection |
| JSON | Preserve the complete versioned report or plan object | Canonical structured contract |
| JSONL | Stream typed report records or selected query values | Canonical command-specific structured contract |
| Scalar, lines, NUL, env | Shell and CI composition | Exact machine contracts |

Human and agent views must never become separate semantic models. A website, Action, Skill, or other consumer uses these shared presenters rather than rebuilding their meaning in display code.

## Human report summary

`diffdevil analyze` defaults to the compact human summary. `Changed` is always the primary metric: the canonical replacement-aware changed-line result. Configured metrics may describe repository policy, but they do not replace the report's visual and reading focus.

An exact report is presented in this shape:

```text
diffdevil analysis
git · fixture-base..fixture-head · direct · = exact

Changed    178 lines
  +45 added only · -18 deleted only · ~115 modified

Raw        +160 additions · -133 deletions · 293 churn
Files      3 total · 2 included · 1 excluded

Policy
  Band       size → m
  Metrics    review 178 · churn 293 · destructive 133 · … 2 more
```

The primary result is one two-line unit. There is no blank line between `Changed` and its decomposition because the second line explains the first. The blank line after the decomposition separates the primary result from lower-priority raw and file facts.

The normal summary applies these density rules:

- Show total, included, and excluded file standing.
- Add binary, unmeasurable, or incomplete file standing when it is non-zero, non-exact, or otherwise consequential.
- Show the first three configured metrics in policy order.
- Also show any later non-exact metric rather than hiding a limitation behind `… N more`.
- Show all configured bands, with unknown bands first.
- Show matched, held, fallback, unknown-decision, and unknown-band rules; summarize ordinary unmatched rules by count.
- Omit ordinary zero-valued exception rows such as `0 unmeasurable` or `0 held`.
- Use natural terminal wrapping. No line requires horizontal scrolling to preserve meaning.

The human report does not derive a provider label from a band. A report may know `size → m`; the desired effect plan separately knows whether the configured provider label is `size/M`.

## Human full aggregate detail

Use:

```text
diffdevil analyze --detail full
```

`full` expands the human projection with:

- report, policy, source, schema, and semantic identities;
- complete aggregate file categories;
- scopes and their aggregate changed-line and file standing;
- every configured metric and numeric evidence standing;
- every band, candidate, and evidence reason;
- every rule disposition, optional decision, and band result;
- plan preconditions and every desired operation when formatting a plan.

It still does not print every individual file record. Canonical JSON and JSONL own exhaustive record-level consumption. The option is named `--detail`, not `--verbose`, because it controls presentation density rather than logging or diagnostics.

`--detail summary` is the explicit form of the default.

## Evidence vocabulary

Human evidence always uses a glyph and a word:

```text
= exact
≈ bounded
? unknown
∅ unmeasurable
```

The glyph never replaces the word, and colour never replaces either. The aggregate status appears beside the source identity. A locally different non-exact measurement repeats its own standing. Evidence reason codes remain visible where they explain a bounded, unknown, or unmeasurable result.

These states are not interchangeable:

- `exact` has one established value;
- `bounded` has a proven lower and upper bound;
- `unknown` retains reasons and any established one-sided bounds;
- `unmeasurable` states that the selected measurement cannot be represented from the available source.

A configuration error, provider failure, or generic warning does not become `unknown` merely because the operation failed.

## Human effect-plan summary

A desired effect plan is presented as a separate non-mutating artifact:

```text
diffdevil effect plan
example/repository#42 · desired · nothing applied

Select     size/M
  managed group size · rule size
Ensure     6 label definitions
Readback   not observed
```

The selected provider label receives the strongest plan emphasis because it is the concrete proposed effect. It remains distinct from the report's internal band id.

The summary:

- promotes selected managed labels first;
- shows explicit label additions, removals, and comment reconciliation;
- summarizes label-definition ensure or sync operations by count;
- shows held rules only when a rule is actually held;
- always states that readback was not observed;
- never presents `desired` or `materialized` plan standing as evidence that a provider effect occurred.

Provider application results own applied and readback language. A plan does not.

## Terminal colour

Human report and plan output support:

```text
--color auto|always|never
```

The default is `auto`.

`auto` emits colour only when stdout is an interactive terminal with true-colour support. It emits plain text when output is redirected or written through `--output`. `NO_COLOR` disables automatic colour. A present `FORCE_COLOR` value other than `0` explicitly enables colour; `FORCE_COLOR=0` disables it. `always` deliberately emits colour even when the destination cannot be detected. `never` guarantees plain text.

Colour reinforces the plain hierarchy:

- the lowercase `diffdevil` name in the heading receives the single brand-magenta gesture;
- additions use the established semantic green;
- deletions use the established semantic rose;
- modified and primary values remain strong neutral text;
- source identity, raw facts, file facts, and readback use quieter neutral emphasis.

Brand magenta is not used for a metric, band, label, evidence state, success, warning, or error. Configured values such as `size/M` gain prominence through position and weight rather than becoming brand-coloured data.

Colour is never emitted by agent, JSON, JSONL, env, scalar, lines, NUL, or Markdown output. Plain output remains complete and is the form embedded by the website and copied into documentation.

## Agent report projection

`diffdevil analyze --format agent` is a materially different reading interface, not the human table with whitespace removed. It uses fixed-order line-oriented records, lowercase keys, explicit identities, JSON quoting for dynamic strings, and typed non-exact values.

```text
diffdevil.agent-report/1 schema=1.0
semantics language=diffdevil-expr/1 numbers=diffdevil-number/1 replacement_lines=replacement-lines-v1 paths=diffdevil-glob/1
source kind=git comparison=direct id="fixture-exact-comparison" base="fixture-base" head="fixture-head"
identity report="fixture-report-exact" policy="fixture-policy-full"
evidence status=exact file_set=complete
lines changed=178 modified=115 added_only=45 deleted_only=18
raw churn=293 added=160 deleted=133
files total=3 included=2 excluded=1 added=0 deleted=0 modified=2 renamed=0 copied=0 binary=0 unmeasurable=0
metrics "review"=178 "churn"=293 "destructive"=133 "productionReview"=173 "weighted"=524
bands "size"=resolved("m",lower=100,upper=500)
```

Non-exact measurements are typed inline:

```text
bounded(60,70)
unknown(lower=5,reasons=[{"code":"PATCH_INCOMPLETE"}])
unmeasurable(reasons=[{"code":"BINARY_FILE"}])
```

The agent projection obeys these rules:

- no ANSI colour;
- no appearance-only alignment padding;
- no Markdown table;
- no generated review judgment or human advice;
- no anthropomorphic or brand-performance prose;
- no renaming of raw churn;
- stable record-group order;
- bare numeric values mean exact measurements;
- semantic, source, report/policy identity, evidence, replacement-aware facts, raw facts, files, scopes, metrics, bands, and rules remain recoverable;
- JSON and JSONL remain the correct interfaces for exhaustive field extraction and long-lived automation.

The agent format is designed for model context, but it is not a substitute schema or a promise that arbitrary scripts should scrape whitespace. Consumers requiring stable structured fields use JSON or JSONL.

## Agent plan projection

`diffdevil plan --format agent` preserves desired effects without copying the human plan:

```text
diffdevil.agent-plan/1 schema=1.0 stage=desired applied=false
semantics language=diffdevil-expr/1 numbers=diffdevil-number/1 replacement_lines=replacement-lines-v1 paths=diffdevil-glob/1
source kind=github-api comparison=supplied id="fixture-bounded-comparison" base="fixture-base" head="fixture-head" repository="example/repository" pull_request=42
target repository="example/repository" pull_request=42
identity report="fixture-report-bounded" policy="fixture-policy-size"
rule id="size" disposition=matched band=resolved("s",lower=20,upper=100)
effect kind=label.select rule="size" group="size" selected="size/S" members=["size/XS","size/S","size/M","size/L","size/XL","size/Unknown"]
held count=0
readback observed=false
```

Every desired operation is emitted as an `effect` record. Comment bodies and dynamic strings use JSON quoting. Held rules retain their reason objects. The header and readback record independently make the non-applied standing explicit.

## Presentation versioning

`diffdevil.report` and `diffdevil.plan` schema `1.0` describe canonical data. The textual agent projections have their own identities:

```text
diffdevil.agent-report/1
diffdevil.agent-plan/1
```

A compatible wording, spacing, or grouping correction to human output does not claim a report-schema change. An incompatible change to the agent record grammar requires a new agent-presentation major identity, even when the canonical report schema remains unchanged.

Human and agent formats are public interfaces, so release notes describe material projection changes. Machine formats remain unchanged unless their own versioned contract is deliberately revised.

## Consumer contract

The CLI, library, website playground, workflow summaries where applicable, documentation examples, and future Agent Skill consume the shared presenters or the canonical structured forms. They must not maintain a second semantic display model.

The website may syntax-highlight or visually frame plain presenter text. It does not rewrite measurements, infer labels from bands, suppress evidence standing, or substitute a hand-authored transcript for real output.

## Settled interface decisions

The presentation contract rests on four durable product choices:

1. **Changed is permanently primary.** A configurable policy-focus metric is not part of this interface. Repository metrics remain policy facts rather than presentation authority.
2. **Human and agent formats optimize for different readers.** Human output uses visual hierarchy and selective density; agent output uses stable semantic grouping and low context cost. They remain projections of one canonical report.
3. **Colour is restrained reinforcement.** One brand-colour gesture identifies diffdevil; semantic addition/deletion colours assist scanning; every meaning survives without colour.
4. **A band is not a provider label.** Reports show configured band results. Plans show concrete desired provider effects. Applied and read-back state belongs to provider results.

The rejected alternatives are a single flat row list for both readers, agents receiving verbose human output by default, magenta metrics or status, colour-only evidence, a website-only formatter, deriving provider labels from band ids, and treating JSON as the only useful agent interface merely because it already exists.

These choices were settled through owner co-design on 2026-09-19. Reopen them only for a material usability result, consumer contract, or semantic consequence, not because another surface would find a locally different layout easier to implement.
