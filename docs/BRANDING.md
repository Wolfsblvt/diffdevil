# diffdevil Branding Reference

## Meaning

This document is the canonical textual branding reference for **diffdevil**. It defines the product name, written identity, message hierarchy, reusable descriptions, terminology, voice, operational writing style, and boundaries for how the product is presented.

It governs public and repository-facing language across the root README, GitHub repository metadata, npm, GitHub Marketplace, documentation, command-line output, workflow summaries, logs, errors, pull-request comments, release material, and future website copy.

This is deliberately not a compact handoff, launch blurb, or list of slogans. It preserves the full brand system so future copy can be derived consistently without gradually turning diffdevil into either a sterile enterprise utility or a novelty demon living in somebody’s CI pipeline.

The document defines the **textual brand**. It does not settle the final icon, logo construction, illustration style, or whether diffdevil receives a full mascot. Those visual decisions may be developed later, but they must preserve the written identity established here.

## Standing

- **Canonical product name:** `diffdevil`
- **Canonical repository path for this document:** `docs/BRANDING.md`
- **Textual brand status:** settled
- **Visual brand status:** intentionally open beyond the constraints in this document
- **Primary product category:** composable diff analysis and automation
- **Primary surfaces:** CLI, TypeScript library, GitHub Action, CI pipelines, scripts, and coding-agent workflows

The core rule is:

> **The name carries the personality. The product language carries the trust.**

A second useful editorial rule follows from it:

> **One good pun, then competent software.**

## Brand at a glance

### Name

> **diffdevil**

### Hero slogan

> **The devil is in the diff.**

### Functional strapline

> **Measure changes. Match rules. Act on the result.**

### Public category descriptor

> **Composable diff analysis and automation for the CLI and GitHub Actions.**

### Technical category descriptor

> **A portable diff analysis and policy engine.**

### Canonical short description

> **Measure and query Git diffs, evaluate rules, and automate GitHub labels and comments.**

### Canonical one-sentence description

> **diffdevil turns Git diffs into stable metrics, queryable facts, policy decisions, and optional GitHub labels and comments.**

### Canonical long description

> **diffdevil is a composable CLI, TypeScript library, and GitHub Action for turning Git diffs into stable, queryable facts. It calculates raw and replacement-aware line metrics, file facts, and scoped aggregates; evaluates custom metrics, queries, bands, and rules; emits structured reports and effect plans; and can optionally reconcile configured pull-request labels and comments. The same deterministic core works locally, in scripts, in CI pipelines, and in GitHub Actions.**

### Voice

> **Precise, candid, composed, and mildly mischievous.**

## Canonical naming

The product name is **`diffdevil`**, written in lowercase everywhere the product itself is named.

Do not maintain separate “friendly” and “technical” spellings. The lowercase form is both.

| Surface | Canonical form |
| --- | --- |
| Product name | **diffdevil** |
| Repository | `Wolfsblvt/diffdevil` |
| npm package | `@wolfsblvt/diffdevil` |
| CLI command | `diffdevil` |
| Default configuration file | `.diffdevil.yml` |
| Root GitHub Action | `Wolfsblvt/diffdevil@v1` |
| Analyze sub-action | `Wolfsblvt/diffdevil/actions/analyze@v1` |
| Apply sub-action | `Wolfsblvt/diffdevil/actions/apply@v1` |
| Label synchronization sub-action | `Wolfsblvt/diffdevil/actions/sync-labels@v1` |
| Environment-variable prefix | `DIFFDEVIL_*` |
| Human report heading | `diffdevil analysis` |
| Example owned-comment marker | `<!-- diffdevil:rule=<id> -->` |
| Wordmark text | `diffdevil` |

### Use in prose

Correct:

> diffdevil analyzes the current Git diff.

Correct at the beginning of a sentence:

> diffdevil can emit either a human-readable summary or a versioned JSON report.

Prefer rewriting an awkward sentence rather than capitalizing the name:

> With diffdevil, the same analysis works locally and in GitHub Actions.

Do not write:

- `DiffDevil`
- `Diffdevil`
- `diffDevil`
- `Diff Devil`
- `Diff-Devil`

`DiffDevil` is acceptable only where a programming language or host convention genuinely requires a PascalCase identifier. That is an implementation identifier, not a second display name.

Examples:

```csharp
public sealed class DiffDevilReport
{
}
```

```typescript
export interface DiffDevilOptions {
}
```

Documentation surrounding those identifiers must still refer to the product as `diffdevil`.

### Typography

- Use backticks for commands, package names, configuration paths, identifiers, field names, rule ids, and literal values.
- Use bold for the product name only when the surrounding layout benefits from emphasis.
- Do not force the name into all caps in headings or promotional material.
- `DIFFDEVIL` is reserved for conventional uppercase technical surfaces such as environment variables.
- Prefer sentence case for headings and interface copy.

## The brand idea

The phrase **“The devil is in the details”** already expresses the product’s central truth. Git exposes a diff, but the useful consequences live inside its details:

- which lines were only added;
- which were only deleted;
- which were replaced;
- which files and scopes were touched;
- whether evidence is complete;
- which metrics can be derived;
- which configured rules match;
- and which effects should follow.

The name does not imply that diffdevil is hostile, destructive, dangerous, or morally judging a change. The “devil” is the consequential detail hidden inside blunt summaries and simplistic counters.

The product does not hunt developers, police pull requests, or declare code sinful. It examines a diff carefully, turns it into explicit facts, applies declared policy, and shows its work.

This is why the name succeeds:

- **`diff` is exact and immediately legible.** It names the substrate rather than an abstract promise.
- **`devil` supplies character and memorability.** It adds dark-cute mischief without requiring the product to become unserious.
- **The full phrase provides a truthful semantic hook.** The product genuinely exists because details inside diffs matter.
- **The name remains broad enough for the complete product.** It is not trapped inside pull-request size labels, one metric, one CI provider, or one effect type.

The brand must continue to communicate a serious developer tool that happens to have personality, not a mascot project looking for a reason to exist.

## Message hierarchy

The brand uses three layers. They may appear together, but they serve different jobs.

### 1. Hero slogan

> **The devil is in the diff.**

The hero is memorable and conceptual. It should usually be the first personality-bearing line on a public surface.

It must not be asked to explain the product alone.

### 2. Functional strapline

> **Measure changes. Match rules. Act on the result.**

The strapline explains the product’s basic movement:

```text
analyze and query
        ↓
evaluate metrics, bands, and rules
        ↓
plan or apply effects
```

It is compact enough for a README opening, website hero, social card, release image, or presentation title.

### 3. Category or product description

> **Composable diff analysis and automation for the CLI and GitHub Actions.**

The descriptor establishes what kind of product this is. It prevents the hero from being interpreted as an empty joke or a cute wrapper around a single PR-size counter.

For technical audiences already inside the documentation, use:

> **A portable diff analysis and policy engine.**

### Recommended combined hero

```markdown
# diffdevil

> **The devil is in the diff.**

**Measure changes. Match rules. Act on the result.**

Composable diff analysis and automation for the CLI and GitHub Actions.
```

Not every surface needs all three layers. The hero must not be repeated so often that it becomes verbal wallpaper.

## Canonical copy library

The following copy is approved for direct reuse. Small grammatical adaptation is allowed when a host imposes a character limit or sentence shape, but the product meaning must remain intact.

### GitHub repository description

> **Measure and query Git diffs, evaluate rules, and automate GitHub labels and comments.**

This is the preferred repository metadata description. It is clear, searchable, and broad enough for the full product.

### npm package description

> **Composable Git diff analysis and policy for Node.js, CI pipelines, and GitHub Actions.**

### GitHub Marketplace title

> **diffdevil: Diff metrics, rules, labels, and comments**

### GitHub Marketplace description

> **Measure Git diffs, evaluate configurable rules, and optionally apply pull-request labels and comments.**

### One-sentence product description

> **diffdevil turns Git diffs into stable metrics, queryable facts, policy decisions, and optional GitHub labels and comments.**

Use this in introductions, comparison pages, release summaries, and places where one sentence must carry the complete product shape.

### Longer product description

> **diffdevil is a composable CLI, TypeScript library, and GitHub Action for turning Git diffs into stable, queryable facts. It calculates raw and replacement-aware line metrics, file facts, and scoped aggregates; evaluates custom metrics, queries, bands, and rules; emits structured reports and effect plans; and can optionally reconcile configured pull-request labels and comments. The same deterministic core works locally, in scripts, in CI pipelines, and in GitHub Actions.**

### Short “why it exists” paragraph

> **Git gives you a patch and a pair of raw counters. diffdevil turns the details inside that diff into facts your scripts and workflows can inspect, query, evaluate, and act on.**

This belongs near the beginning of the root README, after the hero and before the detailed feature inventory.

### Compact social or metadata description

> **The devil is in the diff. Measure changes, evaluate rules, and automate what follows.**

### Technical architecture description

> **diffdevil normalizes Git or unified-diff input into stable change facts, derives configurable metrics and rule results, emits versioned reports and effect plans, and applies optional GitHub effects through a separate adapter.**

### CLI-focused description

> **A composable CLI for measuring, querying, filtering, and evaluating Git diffs without reimplementing diff logic in every script.**

### GitHub Action-focused description

> **A configurable GitHub Action for measuring pull-request diffs, evaluating repository policy, and reconciling selected labels and comments.**

### Library-focused description

> **A TypeScript API for normalized diff facts, replacement-aware line metrics, scoped queries, policy evaluation, reports, and effect plans.**

### Agent-facing description

> **A stable machine-readable interface for coding agents that need to inspect, query, or gate changes without parsing human prose or recreating diff semantics.**

## Canonical README opening

The preferred root README opening is:

```markdown
# diffdevil

> **The devil is in the diff.**

**Measure changes. Match rules. Act on the result.**

`diffdevil` is a composable CLI, TypeScript library, and GitHub Action
that turns Git diffs into stable metrics, queryable facts, policy
decisions, and optional pull-request labels and comments.

Git gives you a patch and a pair of raw counters. `diffdevil` turns the
details inside that diff into facts your scripts and workflows can
inspect, query, evaluate, and act on.
```

The README may place badges between the H1 and hero when repository convention or visual balance requires it. The hero, strapline, and product explanation should otherwise remain together as one opening unit.

The opening must establish, in order:

1. the name;
2. the memorable brand idea;
3. the functional movement;
4. the actual product category;
5. the reason the product exists.

Do not open with an implementation inventory, installation command, mascot joke, or a paragraph about how GitHub’s counters are stupid. Those may all become relevant later, because humans apparently need evidence before accepting that a number can be misleading.

## Brand voice

The canonical voice is:

> **Precise, candid, composed, and mildly mischievous.**

### Precise

Use exact product terms. Distinguish raw churn from replacement-aware change counts. Distinguish analysis from planning and application. Distinguish an exact measurement from a bounded or unmeasurable result.

Do not simplify away a distinction that affects what the product means.

### Candid

Say what the tool knows, what it could not establish, and what consequence follows. Do not hide uncertainty behind a plausible number or a vague warning.

Examples:

```text
Measurement status: exact
```

```text
Measurement status: bounded
Proven range: 460–532 lines
```

```text
The configured band could not be established because the proven range
crosses the 500-line boundary.
```

### Composed

Operational language is calm. Errors do not panic. Success messages do not celebrate basic arithmetic. Warnings do not scold the contributor.

Avoid:

- excessive exclamation marks;
- emoji in default operational output;
- dramatic wording;
- fake urgency;
- cute filler;
- vague reassurance;
- conversational apologies from the tool.

### Mildly mischievous

The brand may use dry wit and the central devil metaphor in public-facing material, headings, examples, and occasional non-operational copy.

The product itself should not perform a character during analysis, errors, logs, comments, or machine output.

Mischief is seasoning, not protocol.

## The devil-language budget

Use devil imagery **once prominently per surface**, usually through the hero slogan. Then let the product behave like competent infrastructure.

### Suitable uses

- **The devil is in the diff.**
- “Details matter.”
- “No mystery numbers.”
- A restrained reference to hidden details in launch or website copy.
- A subtle `+`, `−`, and `~` motif in visual material.
- A restrained horn, tail, or imp-like silhouette in a future icon, if the visual design earns it.
- A rare dry line in long-form editorial copy where it does not obscure meaning.

### Uses to avoid

- “Raise hell.”
- “Sinful diffs.”
- “Exorcise bad code.”
- “Possessed pipelines.”
- “Summon your metrics.”
- “Demonic automation.”
- “Sacrifice your churn.”
- Inferno, damnation, souls, ritual, sacrifice, possession, or religious imagery as a vocabulary system.
- Renaming technical concepts after demons, circles of hell, sins, curses, or occult objects.
- A mascot voice speaking through CLI output or GitHub comments.
- Emoji-heavy devil branding.

The central metaphor is already strong. Repeating it makes the product less distinctive, not more.

### The seriousness test

A company should be able to place this in a workflow without the action name or default output making its engineering system look unserious.

This is acceptable:

```yaml
- name: Analyze diff policy
  uses: Wolfsblvt/diffdevil@v1
```

This is not:

```yaml
- name: Summon the tiny code demon 😈
  uses: Wolfsblvt/diffdevil@v1
```

Users may write whatever cursed workflow names bring them joy. The product must not require it.

## Messaging pillars

Three ideas should remain visible across the README, Marketplace listing, documentation, examples, and future website.

### Trust the measurement

**diffdevil distinguishes different kinds of change and reports the quality of its evidence.**

Relevant supporting messages include:

- raw additions and deletions remain available;
- raw churn is not falsely renamed to replacement-aware changed lines;
- modified lines use stable, versioned semantics;
- exclusions and scopes are explicit;
- incomplete evidence is surfaced honestly;
- exact, bounded, and unmeasurable results remain distinct;
- outputs can explain how a result was produced.

Recommended language:

> **Know what was measured, how it was measured, and whether the result is exact.**

Avoid claims such as “perfect accuracy” or “always exact.” The product’s honesty includes reporting when exactness is impossible.

### Use the facts anywhere

**The same deterministic core serves humans, scripts, CI systems, GitHub Actions, TypeScript consumers, and coding agents.**

Relevant supporting messages include:

- human-readable terminal output;
- scalar values for shell assignment;
- boolean checks through exit status;
- versioned JSON and JSONL;
- per-file queries and path lists;
- reusable reports and plans;
- native GitHub Action outputs;
- public TypeScript interfaces;
- compact agent-facing output without a second semantic model.

Recommended language:

> **Analyze once. Read the result as prose, data, a value, a condition, or a reusable plan.**

Do not describe the CLI as a secondary convenience wrapper around the GitHub Action. The CLI and library are first-class product surfaces.

### Apply effects deliberately

**Analysis, policy evaluation, planning, and mutation are separate and inspectable.**

Relevant supporting messages include:

- analysis does not imply mutation;
- `plan` shows intended effects;
- `apply` is explicit;
- labels are reconciled only within declared managed groups;
- comments use deliberate lifecycle modes;
- trusted policy remains distinct from hostile diff input;
- unrelated labels and comments are preserved;
- applied effects are reported and read back where the product contract requires it.

Recommended language:

> **Inspect the facts, evaluate the policy, and apply only the effects you configured.**

Avoid “set it and forget it” claims. The product is designed to be reliable and low-toil, but repository policy remains a deliberate configuration owned by its users.

## Product truths the brand must preserve

Branding must describe the actual product horizon rather than collapsing it into the first use case.

### diffdevil is not merely a PR-size labeler

Pull-request size classification is a flagship example, not the product category.

The product can support:

- raw and replacement-aware line measurements;
- file counts and per-file facts;
- named path scopes;
- custom numeric metrics;
- scalar and collection queries;
- boolean checks;
- bands and rules;
- structured reports;
- reusable effect plans;
- GitHub labels and comments;
- label-definition validation and synchronization;
- local Git, unified-diff, GitHub API, and normalized-report inputs;
- human, script, CI, library, and agent consumption.

Do not use “PR size labeler” as the lead description of the whole product.

Acceptable:

> Use diffdevil to maintain PR-size labels from replacement-aware line counts.

Not acceptable:

> diffdevil is a PR-size labeling action.

### diffdevil is a workflow engine only within its domain

The coherent boundary is:

> **diffdevil is a workflow engine for facts derived from code changes.**

It is not:

- a general replacement for GitHub Actions;
- a general CI orchestrator;
- a code-review bot;
- a static analyzer;
- a semantic code-understanding system;
- an AI reviewer;
- a command-execution engine;
- a repository-governance platform;
- a mandatory repository-wide label taxonomy.

The root Action ships a replaceable size-label preset with missing-definition creation and no automatic comments. That convenience does not impose a repository-wide taxonomy.

The brand should celebrate breadth inside the diff-policy domain without implying a platform that does everything because one YAML file was not already enough suffering.

### The deterministic core is important

Prefer phrases such as:

- “deterministic core”;
- “stable facts”;
- “versioned report”;
- “explicit metric semantics”;
- “declared policy”;
- “inspectable effect plan.”

Avoid:

- “smart analysis”;
- “intelligent metrics”;
- “magic”;
- “AI-powered”;
- “understands your changes”;
- “knows what matters.”

## Terminology and vocabulary

The following terms form the canonical product vocabulary. Their distinctions are intentional and should remain stable across documentation, output, schemas, examples, and APIs.

### `diff`

The comparison input or substrate from which change facts are derived.

Use “Git diff” when referring specifically to Git comparison semantics. Use “unified diff” when referring to the textual interchange format.

Avoid using “patch” as a universal synonym when the distinction between a provider patch fragment, a complete unified diff, and a normalized report matters.

### `diff source`

The origin from which diffdevil obtains change data.

Examples:

- local Git;
- unified-diff file;
- standard input;
- GitHub pull-request API;
- normalized JSON report.

### `diff facts`

Normalized, stable data derived from the diff before user-defined policy interpretation.

Examples include line counts, file paths, file statuses, and measurement status.

Prefer “facts” over “insights” for deterministic output.

### `raw additions`

The number of added lines as represented by the underlying diff.

Canonical field neighborhood:

```text
raw.added
```

### `raw deletions`

The number of deleted lines as represented by the underlying diff.

Canonical field neighborhood:

```text
raw.deleted
```

### `raw churn`

The sum of raw additions and raw deletions.

```text
raw.churn = raw.added + raw.deleted
```

“Raw changed lines” may be tolerated when matching an external provider’s established field name, but **raw churn** is the preferred human-facing term because it does not imply replacement-aware semantics.

Do not call raw churn simply “changed lines” in diffdevil-owned copy.

### `added-only lines`

Lines added without being paired with deleted lines inside the selected replacement-aware metric’s edit-block semantics.

Canonical field neighborhood:

```text
lines.added
```

Use “added-only” in explanatory prose when contrast with raw additions matters.

### `deleted-only lines`

Lines deleted without being paired with added lines inside the selected replacement-aware metric’s edit-block semantics.

Canonical field neighborhood:

```text
lines.deleted
```

Use “deleted-only” in explanatory prose when contrast with raw deletions matters.

### `modified lines`

Paired additions and deletions within a contiguous edit block under the selected, versioned replacement-aware metric.

Canonical field neighborhood:

```text
lines.modified
```

The meaning must not silently change. Alternative algorithms require another named metric version.

### `replacement-aware changed lines`

The mutually exclusive sum of added-only, deleted-only, and modified lines.

```text
lines.changed = lines.added + lines.deleted + lines.modified
```

This is the preferred full phrase when the distinction from raw churn matters.

After the distinction is established in a local context, “changed lines” may be used as a compact label where the schema or heading makes the replacement-aware meaning unambiguous.

### `file facts`

Normalized facts attached to an individual changed file, such as path, previous path, status, line counts, binary standing, inclusion standing, and measurement quality.

### `scope`

A named selection of files against which metrics, queries, or rules operate.

Examples:

- `source`;
- `tests`;
- `documentation`;
- `authored`;
- `production`.

Use “scope” for meaningful named selections. Use “filter” for an immediate query operation.

### `metric`

A named numeric value calculated from diff facts, scopes, or other permitted metrics.

Examples:

- replacement-aware review lines;
- raw churn;
- destructive lines;
- included file count;
- source-only changed lines.

Do not use “metric” as a synonym for every output field.

### `query`

An operation that selects or projects facts, metrics, files, paths, scopes, rule results, or other report data.

A query returns data. It does not necessarily evaluate policy or produce an effect.

### `check`

A boolean evaluation intended for scripts, CI conditions, or direct human use.

A valid false result is not an error. CLI exit codes must preserve that distinction.

### `rule`

A declared policy condition evaluated against facts and metrics.

A rule may produce a match result, select a band, and contribute intended effects to a plan.

### `band`

One result from an ordered numeric classification.

Examples:

- `xs`;
- `small`;
- `medium`;
- `large`;
- `xl`.

The replaceable `size@1` preset supplies neutral default band IDs and labels. Repositories can replace the thresholds, visible names, definitions, or entire preset.

### `measurement status`

The quality or completeness of the evidence behind a result.

Canonical statuses include:

- `exact`;
- `bounded`;
- `unmeasurable`.

Do not overload `unknown` to mean configuration error, provider failure, semantic risk, or general uncertainty. Where a band cannot be established, the band result may be `unknown`; the underlying measurement status still states why.

### `report`

A versioned, structured record of diff facts, metrics, scopes, queries, and rule results.

A report is an analysis artifact. It does not imply that external effects were applied.

### `plan`

A structured declaration of intended effects produced from a report and policy.

A plan is inspectable and non-mutating.

### `effect`

An intended or applied external change, such as adding or removing an explicitly managed label or creating or updating an owned comment.

Use “effect” in architecture and technical documentation. Use “labels and comments” in introductory copy where concrete language is clearer.

### `apply`

The explicit mutation stage that carries an effect plan to a supported provider and reports the outcome.

A token being available must never be described as implicit permission to apply. Selecting the root GitHub Action selects its documented no-config size-label application; `/analyze` is the read-only entry point. Comments remain opt-in.

### `managed label group`

An explicit set of mutually related labels that diffdevil may reconcile as one policy result.

Selecting one member permits removal only of other declared members in that group. Unrelated labels remain untouched.

### `owned comment`

A pull-request comment that diffdevil can identify through an explicit marker and manage according to its configured lifecycle.

Do not imply ownership of arbitrary comments written by people or other tools.

## Claims and interpretation boundaries

### What diffdevil measures

Depending on the selected source, metric, scope, and policy, diffdevil may measure or report:

- raw additions;
- raw deletions;
- raw churn;
- added-only lines;
- deleted-only lines;
- modified lines;
- replacement-aware changed lines;
- changed files;
- included and excluded files;
- per-file values;
- scoped aggregates;
- configured metrics;
- bands and rule results;
- measurement quality.

### What diffdevil does not measure by default

A line count or file count does not establish:

- importance;
- risk;
- complexity;
- review difficulty;
- code quality;
- semantic meaning;
- architectural impact;
- correctness;
- maintainability;
- contributor skill;
- whether a pull request should be merged;
- whether a change should be split.

Copy must not smuggle those judgments into neutral measurements.

Correct:

> This pull request contains 728 replacement-aware changed lines across 24 included files.

Incorrect:

> This is a high-risk pull request.

Correct:

> The repository’s `pull-request-size` rule classified this result as `large`.

Incorrect:

> diffdevil determined that the pull request is too large.

A repository may deliberately define policy based on measured facts. The policy owns that judgment; diffdevil evaluates it.

### Orientation, not accusation

Size bands and labels should be described as orientation and workflow signals, not moral grades.

Prefer:

- “classified as `large`”;
- “matched the `large` band”;
- “exceeded the configured threshold”;
- “triggered the configured review note.”

Avoid:

- “bad PR”;
- “dangerous change” unless the user explicitly named a metric that means that in their policy;
- “unacceptable size”;
- “failed quality”; 
- “developer submitted too much code.”

## General writing style

### Lead with the concrete result

State what happened before explaining architecture or intent.

Good:

> Rule `pull-request-size` matched band `large` at 728 replacement-aware changed lines.

Weaker:

> Based on the configured evaluation process and the selected metric, diffdevil has determined a result.

### Use short, explicit sentences

Prefer direct subject-verb-object wording.

Good:

> GitHub omitted patches for two included files.

Bad:

> It appears that complete patch information may not have been made available for all of the relevant files.

### Name the exact subject

Use the rule id, metric id, source, path, threshold, or effect when it matters.

Good:

> Metric `destructive` evaluated to `512`.

Bad:

> The value was high.

### Distinguish fact, policy, and effect

Good:

```text
Fact: 512 deleted-only or modified lines.
Rule: `destructive-change` matched at >= 500.
Planned effect: add `review/large-destructive-change`.
```

Do not collapse the three into:

> diffdevil found a destructive pull request and labeled it.

### Prefer evidence over adjectives

Use numbers, paths, ids, states, and reasons. Avoid “huge,” “tiny,” “significant,” “massive,” or “concerning” unless the text is explicitly quoting or naming a user-defined band.

### Use the user’s configured vocabulary

When a repository names a band `gigantic-gremlin`, report that id faithfully. Do not make it the product’s global language.

### Avoid corporate fog

Do not write:

- leverage;
- empower;
- unlock developer velocity;
- seamless;
- robust, unless the statement names what is robust and why;
- enterprise-grade;
- next-generation;
- single pane of glass;
- actionable insights;
- intelligent automation;
- shift left;
- revolutionize your workflow.

The product’s actual capabilities are more persuasive than a cloud of management vocabulary drifting over a screenshot.

## Writing by surface

### README and website copy

Public overview copy may carry the strongest personality.

Use:

- the hero slogan once;
- the functional strapline;
- concrete product examples;
- restrained dry wit;
- clear distinctions between metrics and policy;
- screenshots or examples that demonstrate inspectability.

Do not:

- make every heading a devil joke;
- force a mascot into the explanation;
- open with implementation architecture;
- imply that diffdevil performs semantic code review;
- describe ordinary features as magic.

### Repository metadata

Repository metadata should be direct and searchable. Do not spend scarce description characters on personality that the name already carries.

Preferred:

> Measure and query Git diffs, evaluate rules, and automate GitHub labels and comments.

### npm metadata

Package metadata should emphasize Node.js, CLI/library use, policy, and CI portability.

Preferred:

> Composable Git diff analysis and policy for Node.js, CI pipelines, and GitHub Actions.

### GitHub Marketplace copy

Marketplace copy should establish immediate workflow value and optional mutation.

Preferred title:

> diffdevil: Diff metrics, rules, labels, and comments

Preferred description:

> Measure Git diffs, evaluate configurable rules, and optionally apply pull-request labels and comments.

Avoid leading with “cute,” “devil,” “imp,” or mascot language. The listing must remain credible to an engineering team evaluating an action dependency.

### CLI human output

Human output should be compact, readable, and calm.

Recommended style:

```text
diffdevil analysis

Comparison
  Source       git
  Base         origin/main
  Head         HEAD
  Measurement  exact

Lines
  Added only      42
  Deleted only    18
  Modified       113
  Changed        173
  Raw additions  155
  Raw deletions  131
  Raw churn      286

Files
  Total           19
  Included        16
  Excluded         3
  Unmeasurable     0
```

Rules:

- use the lowercase product name;
- use aligned values where terminal width permits;
- use color only when attached to an interactive terminal;
- do not require color to understand status;
- do not include banners, ASCII mascots, jokes, or animation in normal output;
- do not write human prose to stdout in machine formats;
- send diagnostics to stderr where piping semantics require it.

### Machine output

Machine output is a contract, not a branding surface.

Rules:

- stdout contains only the selected result;
- no logo, hero, banner, emoji, commentary, or version greeting;
- fields use stable, documented names;
- schema and metric versions are explicit;
- status is represented as data, not inferred from wording;
- errors use a distinct non-zero exit code and stderr;
- boolean false remains distinct from evaluation failure.

Correct scalar output:

```text
173
```

Incorrect scalar output:

```text
The devil found 173 changed lines! 😈
```

### Agent-facing output

Agent-facing output should be compact, deterministic, and semantically identical to the canonical report.

It may optimize for context efficiency, but it must not:

- add generated review judgment;
- anthropomorphize the tool;
- omit measurement status;
- silently rename raw churn;
- invent semantic importance;
- become a second incompatible data model.

Suitable:

```text
DIFFDEVIL REPORT
schema: 1
source: git origin/main...HEAD
measurement: exact
lines: +only 42 | -only 18 | modified 113 | changed 173
raw: +155 | -131 | churn 286
files: 16 included | 3 excluded | 0 unmeasurable
```

### Workflow summaries

Workflow summaries should make the result explainable at a glance.

Recommended order:

1. source and compared revisions;
2. measurement status;
3. raw line facts;
4. replacement-aware line facts;
5. file facts;
6. active scope and exclusion policy;
7. configured metric values;
8. matched rules and bands;
9. planned effects;
10. applied effects and readback.

Use a heading such as:

```text
diffdevil analysis
```

or:

```text
diffdevil policy result
```

Do not use:

```text
The devil’s verdict
```

### Logs

Logs should explain behavior without drowning normal runs in implementation detail.

Normal log examples:

```text
Loaded policy from `.diffdevil.yml`.
Analyzed 19 changed files; 16 included, 3 excluded.
Rule `pull-request-size` matched band `medium`.
Planned 2 label effects and 1 comment update.
Applied 3 effects successfully.
```

Debug log examples:

```text
`src/Foo.cs`: edit block 1, +3/-3 -> modified 3.
`src/Foo.cs`: edit block 2, +5/-0 -> added-only 5.
`package-lock.json`: excluded by `defaults.paths.exclude[0]`.
```

Avoid:

```text
Tiny devil rummaging through 19 files...
Found some spicy changes!
```

### Errors

Errors should be specific, actionable, and emotionally neutral.

A strong error usually contains:

1. the failed operation or unavailable claim;
2. the concrete reason;
3. the affected subject;
4. the consequence;
5. the next valid action when one exists.

Good:

```text
Could not establish an exact line count because GitHub omitted patches
for 2 included files. The proven range, 460–532, crosses the configured
500-line boundary, so rule `pull-request-size` has no band result.
```

Good:

```text
Configuration error in `.diffdevil.yml`: `rules[2].bands` overlap at
500. Adjust the upper or lower boundary so each value selects one band.
```

Good:

```text
Cannot apply plan `plan-01J...`: the analyzed head `7ac1e3d` no longer
matches the current pull-request head `b91f8a2`. Analyze and plan the
current head before applying effects.
```

Good:

```text
Unknown placeholder `metrics.reveiw` in comment template for rule
`pull-request-size`. Did you mean `metrics.review`?
```

Bad:

```text
Something hellish happened.
```

Bad:

```text
Oops! The little devil got confused 😈
```

Bad:

```text
An unexpected error occurred.
```

The last form may appear only as a final fallback around an unknown exception, followed by a stable error id and preserved technical cause where safe.

### Warnings

Warnings should name the retained limitation and whether processing continues.

Good:

```text
Measurement is bounded, not exact. The proven range 1,200–2,100 remains
entirely within band `xl`; policy evaluation continues with that band.
```

Good:

```text
`src/generated/client.ts` matched both `exclude` and `forceInclude`.
`forceInclude` takes precedence, so the file is included.
```

Avoid vague warnings such as:

```text
Some results may be inaccurate.
```

### Success messages

Success copy should report the achieved state, not congratulate the product for existing.

Good:

```text
Applied 2 label changes and updated 1 owned comment.
```

Good:

```text
Label definitions already match the configured policy. No changes applied.
```

Avoid:

```text
Success! diffdevil worked its magic!
```

### GitHub labels and comments

Default labels and comments should be neutral, concise, and attributable to configured policy.

Suitable default comment language:

```markdown
**Pull-request size: L**

- Replacement-aware changed lines: 728
- Raw churn: 1,104
- Modified lines: 241
- Included files: 24

Matched rule: `pull-request-size`
```

Suitable explanatory note:

> This result is calculated from the repository’s configured metric and path policy. It does not measure importance, risk, or code quality.

Do not write as a mascot:

> I found a wickedly huge PR! 😈🔥

Do not shame contributors or instruct them to split work unless the repository’s configured template explicitly chooses that policy language.

Comments managed through `upsert`, transition, or band-change modes must remain clearly owned and should avoid needless repeated noise.

### Documentation and API reference

Technical documentation should prefer exact names and examples over brand language.

The hero slogan does not belong at the top of every page. One repository has enough devils.

Use:

- explicit schema names;
- metric-version names;
- invariants;
- field semantics;
- source limitations;
- exit-code behavior;
- complete examples;
- clear trust and mutation boundaries.

Dry wit is acceptable in explanatory prose when it does not blur the contract. It should never appear in schema definitions, normative requirements, or error-code tables.

### Release notes

Release notes may carry a little more personality in their introduction, but change descriptions remain factual.

Suitable:

> The devil acquired a new source adapter. More importantly, `diffdevil analyze` can now consume GitHub pull-request diffs without a checkout.

Also suitable, and usually better:

> `diffdevil analyze` can now consume GitHub pull-request diffs without a checkout.

Do not turn every release into infernal fan fiction.

## Command and concept naming

Command names should use ordinary developer-tool verbs. Their clarity reinforces the seriousness of the brand.

Preferred command neighborhood:

```text
diffdevil analyze
diffdevil query
diffdevil check
diffdevil plan
diffdevil apply
diffdevil labels validate
diffdevil labels sync
diffdevil schema
diffdevil explain
```

These verbs express the actual transition:

- `analyze` creates facts and reports;
- `query` selects values or records;
- `check` evaluates a boolean result;
- `plan` produces intended effects without mutation;
- `apply` performs explicit effects;
- `validate` checks declared state without changing it;
- `sync` reconciles explicitly managed definitions;
- `schema` exposes machine contracts;
- `explain` shows how a result or limitation was derived.

Avoid themed command names such as:

- `summon`;
- `judge`;
- `punish`;
- `possess`;
- `banish`;
- `confess`;
- `damn`;
- `exorcise`.

The brand should never make an operator translate a joke before understanding whether a command writes to GitHub.

## Approved copy patterns

### Explaining the product

> diffdevil turns Git diffs into stable facts that can be read directly, queried from scripts, evaluated as policy, or used to plan and apply selected GitHub effects.

### Explaining raw versus replacement-aware values

> Raw churn counts additions and deletions separately. Replacement-aware changed lines classify adjacent replacements once, while preserving added-only, deleted-only, and modified counts as separate facts.

### Explaining a rule result

> Rule `pull-request-size` matched band `large` because metric `review` evaluated to `728` and the configured range begins at `500`.

### Explaining bounded evidence

> The exact value is unavailable, but every possible value falls within band `xl`, so the band result is proven even though the measurement is bounded.

### Explaining no result

> The proven range crosses more than one configured band, so diffdevil cannot establish a band without inventing precision.

### Explaining analysis versus mutation

> `analyze` produces a report. `plan` evaluates policy and records intended effects. `apply` performs those effects explicitly.

### Explaining portability

> The same report model powers terminal output, scalar queries, boolean checks, JSON, GitHub Action outputs, TypeScript consumers, and coding-agent workflows.

### Explaining GitHub effects

> diffdevil may reconcile only labels and comments explicitly declared by the selected policy. Unrelated repository metadata remains untouched.

## Copy anti-patterns

Avoid copy that turns a narrow fact into a grand claim.

| Avoid | Prefer |
| --- | --- |
| “Understand your code changes.” | “Turn Git diffs into queryable facts.” |
| “Detect risky pull requests.” | “Evaluate repository-defined rules against diff facts.” |
| “Accurate changed-line count.” | “Replacement-aware changed lines with explicit measurement status.” |
| “Automatically manage your PR.” | “Optionally reconcile configured labels and owned comments.” |
| “Powerful workflow engine.” | “Composable diff analysis and policy.” |
| “Smart filters.” | “Named path scopes and explicit include/exclude rules.” |
| “Actionable insights.” | “Metrics, rule results, reports, and effect plans.” |
| “Zero-config magic.” | “Useful defaults where selected; explicit policy where consequences matter.” |
| “Works everywhere.” | “Works locally, in scripts, in CI pipelines, and in GitHub Actions.” |
| “Never wrong.” | “Reports exact, bounded, or unmeasurable evidence honestly.” |

## Product-page and README structure

A public product page or mature root README should generally follow this narrative:

```markdown
# diffdevil

> The devil is in the diff.

Measure changes. Match rules. Act on the result.

[short product description]

## Turn diffs into useful facts
[raw and replacement-aware metrics]

## Query what changed
[CLI values, files, scopes, JSON, and checks]

## Define what matters
[metrics, bands, and rules]

## Plan before applying
[reports, effect plans, and dry runs]

## Automate GitHub cleanly
[managed labels, owned comments, and label definitions]

## Use the same engine everywhere
[CLI, TypeScript API, GitHub Action, CI, and agents]

## Know what the result means
[measurement status, metric versions, and interpretation boundaries]

## Get started
[installation and first useful examples]
```

The exact headings may change as the implemented product develops. The narrative should remain:

1. trustworthy facts;
2. flexible consumption;
3. declared policy;
4. deliberate effects;
5. portable core;
6. honest interpretation.

Do not structure the README as a directory of every command before the reader understands why the product exists.

## Visual-brand boundary

The final visual identity is not settled by this document.

The following textual constraints already apply to future visual work:

- the written wordmark remains lowercase `diffdevil`;
- the product must still read as serious developer infrastructure;
- personality should be restrained rather than childish or aggressive;
- a logo or icon may use diff-native symbols such as `+`, `−`, and `~`;
- subtle horns, a tail, or an imp-like silhouette are available directions, not requirements;
- the devil should not appear violent, satanic, horror-oriented, or religiously confrontational;
- a full mascot is optional, not assumed;
- the icon must work without mascot lore;
- visual cuteness must not reduce legibility at GitHub Action, package, favicon, and terminal-adjacent sizes;
- the brand should avoid the visual language of a novelty npm package, crypto token, gaming clan, or security threat actor.

The likely visual neighborhood is **dark-cute, geometric, compact, and precise**. That is a direction for later design exploration, not an approved icon specification.

## Brand non-goals

The diffdevil brand is not trying to be:

- aggressively edgy;
- religious or anti-religious;
- horror-themed;
- childish;
- meme-first;
- corporate-neutral;
- anthropomorphic in operational use;
- a fake AI personality;
- a moral judge of contributors;
- a security product by implication;
- a generic automation platform;
- another developer tool whose documentation mistakes jokes for information.

The desired tension is deliberate:

> **Memorable enough to feel authored. Serious enough to trust in production workflows.**

## Maintenance and governance

### Canonical status

This document is the normative source for textual branding. README snippets, package metadata, Marketplace copy, websites, release assets, and other surfaces may derive from it but must not become competing sources.

### Changes that require updating this document

Update this reference when changing any of the following:

- product spelling or capitalization;
- hero slogan;
- functional strapline;
- category descriptor;
- canonical short or long descriptions;
- messaging pillars;
- voice or devil-language boundaries;
- canonical terminology;
- claims about what the product measures or decides;
- cross-surface naming rules;
- visual constraints that materially affect the written brand.

### Changes that do not normally require updating this document

Do not edit the branding reference for every:

- new command option;
- added report field;
- implementation dependency;
- bug fix;
- release version;
- supported source adapter;
- example configuration;
- internal architecture refinement.

Update ordinary product and technical documentation instead unless the change alters how diffdevil should be described.

### Truthful implementation language

Canonical descriptions express the selected complete product identity. Individual public surfaces must remain truthful to the released implementation.

Before a capability ships, wording may describe it as planned only in roadmap or design material. Do not copy the full long description into a release surface if that release does not yet provide the named capability.

A smaller first implementation tranche does not redefine the brand destination, but public copy must distinguish current and planned behavior honestly.

## Canonical brand block

```yaml
name: diffdevil

hero: The devil is in the diff.

strapline: Measure changes. Match rules. Act on the result.

category: Composable diff analysis and automation for the CLI and GitHub Actions.

technicalCategory: A portable diff analysis and policy engine.

shortDescription: >-
  Measure and query Git diffs, evaluate rules, and automate GitHub
  labels and comments.

packageDescription: >-
  Composable Git diff analysis and policy for Node.js, CI pipelines,
  and GitHub Actions.

marketplaceTitle: >-
  diffdevil: Diff metrics, rules, labels, and comments

marketplaceDescription: >-
  Measure Git diffs, evaluate configurable rules, and optionally apply
  pull-request labels and comments.

oneSentenceDescription: >-
  diffdevil turns Git diffs into stable metrics, queryable facts,
  policy decisions, and optional GitHub labels and comments.

description: >-
  diffdevil is a composable CLI, TypeScript library, and GitHub Action
  for turning Git diffs into stable, queryable facts. It calculates raw
  and replacement-aware line metrics, file facts, and scoped aggregates;
  evaluates custom metrics, queries, bands, and rules; emits structured
  reports and effect plans; and can optionally reconcile configured
  pull-request labels and comments. The same deterministic core works
  locally, in scripts, in CI pipelines, and in GitHub Actions.

why: >-
  Git gives you a patch and a pair of raw counters. diffdevil turns the
  details inside that diff into facts your scripts and workflows can
  inspect, query, evaluate, and act on.

voice:
  - precise
  - candid
  - composed
  - mildly mischievous

messagingPillars:
  - Trust the measurement.
  - Use the facts anywhere.
  - Apply effects deliberately.

rules:
  - The name carries the personality. The product language carries the trust.
  - One good pun, then competent software.
  - Lowercase diffdevil everywhere the product itself is named.
  - Never imply that line counts measure importance, risk, complexity, or quality.
  - Keep analysis, policy, planning, and mutation distinct.
  - Use devil imagery once prominently per surface, then stop.
```

## Final editorial test

Before publishing diffdevil copy, verify that it answers the following questions:

1. Is the product name written as `diffdevil`?
2. Does the copy explain what the product actually does after any personality-bearing line?
3. Does it preserve the distinction between facts, policy, plans, and effects?
4. Does it use canonical terminology for raw churn and replacement-aware changed lines?
5. Does it avoid claiming semantic understanding, risk assessment, or code-quality judgment?
6. Does it state uncertainty or incomplete evidence honestly?
7. Is the operational language calm and specific?
8. Is any devil imagery earning its place, or has the joke already been made?
9. Could a serious engineering team put this wording in a production workflow without embarrassment?
10. Does the copy still feel authored rather than sanded into generic developer-tool paste?

The intended answer to all ten is yes.
