# Presets and shortcuts

## Meaning

Presets and shortcuts are the language-free abstraction over diffdevil's full policy engine. They make ordinary CLI and GitHub Action use small while retaining a direct, inspectable route to custom metrics, scopes, and expressions. This document owns defaults, override precedence, option validation, and the equivalence contract between short and expanded forms.

## The three authoring levels

**Use a preset.** The default `size@1` defines review-line measurement, six label definitions, five numeric bands plus an unresolved label, and managed label reconciliation. The root Action applies it; read-only commands can inspect its metric and band without effects.

**Use a shortcut.** Select a metric, comparison, file quantifier, scope, path, or projection with ordinary flags/inputs. This covers most script conditions and one-rule Actions without expression strings.

**Use a policy and detail.** Define named metrics, multiple rules, custom bands, queries, and templates. This is additional depth, not a different product mode with different arithmetic.

Every level lowers to the same normalized policy, AST, binder, checker, evaluator, and plan model. A shortcut must not implement its own addition, interval comparison, or unknown handling.

## Preset identity and default selection

The built-in default is `size@1`. The `@1` belongs to the preset's semantic identity, not the npm release. A preset release freezes its thresholds, metric, path defaults, label names, and comment behavior.

No configuration file means the default preset. In a file, an omitted `presets` field also means `[size@1]`. To opt out:

```yaml
version: 1
presets: []
```

The expanded asset [size-v1.yml](../../src/diffdevil/presets/size-v1.yml) uses `presets: []` because it already contains the full policy. It must not recursively include itself.

Only bundled known preset IDs are accepted. Configuration cannot fetch a URL, npm package, or repository module as a preset. Future external preset distribution would need an explicit data/trust contract, not a dynamic import hidden in this field.

## Default size policy

The preset defines `metrics.review = totals.lines.changed`, `bands.size`, `labelGroups.size`, the six label definitions, and `rules.size`. Its intervals are `[0,20)`, `[20,100)`, `[100,500)`, `[500,1000)`, and `[1000,+∞)`. An unresolved band maps to `size/Unknown`.

It includes all tracked diff files by default, including lockfiles, generated-looking files, binaries, and submodules. Line applicability is reported honestly. There is no hidden extension-based exclusion or fuzzy generated-file detector. Projects can add named, inspectable path exclusions without replacing the preset.

The default colors are a restrained non-alarm progression. Exact color choices do not imply increasing risk. Existing repository label metadata is preserved by the root Action's default ensure-missing mode.

Comments are absent. XL has no default failure effect. Every unrelated PR label is preserved. A complete zero count selects XS.

## Small size overrides

```yaml
version: 1
size:
  metric: raw-churn
  thresholds: {xs: 10, s: 80, m: 300, l: 800}
  labels:
    xs: 'PR size: XS'
    s: 'PR size: S'
    m: 'PR size: M'
    l: 'PR size: L'
    xl: 'PR size: XL'
    unknown: 'PR size: Unknown'
```

`size.metric` accepts a friendly numeric metric alias, a canonical measure ID, or an explicit named reference such as `metrics.weighted`. It does not accept a formula string. Use a named custom metric for a formula.

Thresholds, when supplied, contain all four finite increasing cut points. Label mappings, when supplied, contain all six names, preventing partial renames from leaving an unclear managed group. `size` overrides require `size@1` to be selected.

The size override rewrites the preset's generated metric/band/group/definition references coherently. If a caller also supplies explicit definitions for those same generated IDs, reject `E_CONFIG_CONFLICT`. To replace the preset entirely, use `presets: []` and ordinary policy sections. Do not guess whether a short override or a full replacement should win.

## Configuration layering

This section separates the current compiler contract from the selected multi-host configuration experience. The App/dashboard resolver described below is planned, not a claim that hosted settings or partial convenience maps are already implemented.

### Current compiler and invocation behavior

Resolve in this order:

1. Built-in preset data in declared order.
2. Structured `size` overrides of the selected size preset.
3. User configuration sections.
4. Explicit invocation overrides permitted for that surface.

Dictionary declarations such as a metric or rule replace the **whole declaration with the same ID**. Arrays replace rather than concatenate unless an option explicitly says append. A user metric named `review` may replace the preset's review metric when no conflicting `size.metric` override is present. Reserved preset-owned IDs are not globally forbidden; replacement must simply be deliberate and type-correct.

For path patterns, invocation `--exclude`/Action `exclude` append by default. `--exclude-mode replace` or `exclude-mode: replace` replaces the effective exclusion list. The same named mode applies to `include-only` and `force-include` where exposed. An explicit empty list can clear a list in structured configuration; an omitted field leaves the preceding layer intact.

All effective patterns, origin layers, preset IDs, metric versions, and replacements appear in `diffdevil explain --policy`. The compiler retains provenance rather than manufacturing a flattened file that hides where behavior came from.

### One conventional repository file

Keep `.diffdevil.yml` at repository root as the single documented conventional file. It serves the provider-neutral CLI as well as GitHub consumers. Do not add fallback discovery of `.github/diffdevil.yml`, `.github/.diffdevil.yml`, or another spelling. This is a selected location, not a prerelease backward-compatibility obligation.

Explicit `--config` or Action `config` may still name a deliberate file path; that does not create another automatically discovered convention. The current Actions load only explicitly selected configuration. Omitting `config` retains the bundled no-config route rather than adding an unexpected Contents read or workspace-policy lookup.

Do not automatically fetch configuration from `<owner>/.github` or another organization-wide repository. An account-wide discovery layer would introduce hidden network, trust, precedence, and version changes. Existing explicit immutable external policy sources remain supported: convenience is not withheld to encourage App subscriptions.

### Selected host-specific resolution

The intended user-facing order is:

| Host | Increasing precedence |
| --- | --- |
| CLI | Selected/bundled preset, explicitly loaded repository policy, supported command-invocation overrides |
| Actions | Selected/bundled preset, explicitly selected repository/trusted policy, supported Action step-level overrides |
| Managed App | Selected/bundled preset, account/organization dashboard defaults, explicitly supplied trusted repository settings |

An Action does not read dashboard defaults. An App event has no Action step. No fourth hidden per-repository dashboard-default layer is selected. Inline workflow configuration and its supported overrides remain an ordinary self-operated route.

The selected App defaults use the size preset, its managed size labels, a native check summary, comments off, and persistent history off. Check presentation and history enrollment are host behavior, not extra fields silently injected into the reusable size preset.

### Partial settings without accidental policy merging

A higher layer changes only fields it actually supplies. Omitted settings inherit; explicit `false`, zero, and supported empty collections are not treated as omission. Invalid or unknown fields are diagnosed, not silently discarded.

For convenience settings, including individual size thresholds and label names, the selected shared resolution behavior fills omitted members from lower layers before validating the complete effective group. This must be shared lowering, not a dashboard-only second interpretation. A partial label rename must also update the generated group and definitions coherently.

The current `size` compiler still requires complete supplied threshold/label maps as documented above. Implementing partial convenience maps across the shared resolver, schema, CLI/Actions, and App is an explicit remaining change; do not advertise an incomplete map as runnable against the current release.

Named executable declarations retain a deliberate boundary: a supplied metric/rule declaration replaces the same-ID declaration as a whole; unrelated IDs remain inherited. Do not recursively splice half of one rule's expression/effects into a different rule. Arrays replace unless an established option explicitly selects append, including the current invocation path modes.

Resolve preset selection before expansion. Explicit `presets: []` removes inherited preset selection rather than leaving generated size rules behind. Preserve conflict diagnostics between incompatible shorthand and full policy declarations. Step-level overrides remain limited to the combinations the Action exposes; partial layering does not legalize currently forbidden full-policy plus inline-single-rule combinations.

### Explain and export the result

The App dashboard and policy explanation should show effective settings, their source layer, selected preset/version, replaced declarations, and validation errors. Export one complete ordinary policy with explicit selected meaning, suitable for CLI/Actions without a hosted account.

Read automatic-write repository overrides and relative templates from the trusted base or explicit immutable source. A config read failure is not the absence of configuration. Previewing proposed PR-head settings never makes those settings trusted write authority.

These choices extend the current compiler contract without adding a remote preset system, executable configuration, arbitrary inheritance depth, or a new policy language.

## Metric shortcut catalog

| Shortcut | Canonical meaning |
| --- | --- |
| `changed` | `lines.changed` |
| `added-only` | `lines.added` |
| `deleted-only` | `lines.deleted` |
| `modified` | `lines.modified` |
| `raw-added` | `raw.added` |
| `raw-deleted` | `raw.deleted` |
| `raw-churn` | `raw.churn` |
| `destructive` | `lines.deleted + lines.modified` |
| `files` | Included selected-file count. |
| `files-added`, `files-deleted`, `files-modified`, `files-renamed`, `files-copied` | Counts of the corresponding file change type. |
| `files-binary`, `files-unmeasurable` | Material/applicability file counts. |
| `metrics.<id>` | Explicit named metric, evaluated in its declared scope. |

Canonical standard measure IDs are also accepted in shortcut metric positions. Bare unknown names are errors, not speculative named-metric lookup. This lets new standard aliases be added without silently stealing a user metric's name.

A named metric already has a declared scope. Combining it with invocation `--scope`, `--path`, or `--all-files` is invalid unless that named metric is selected merely as a comparison constant in a full expression. A standard per-file metric can be aggregated over an invocation selection. Global-only file measures cannot be used as a per-file predicate.

## CLI scalar and threshold lowering

```text
diffdevil query --metric changed --format value
```

Equivalent selected expression:

```text
totals.lines.changed
```

```text
diffdevil check --metric changed --gt 100
```

Equivalent condition:

```text
totals.lines.changed > 100
```

Comparators are `--gt`, `--gte`, `--lt`, `--lte`, `--eq`, and `--ne`. Exactly one is permitted. Threshold values are typed numeric data, not source snippets. `--status exact|bounded|unknown|unmeasurable` is an alternative evidence-state predicate and cannot be combined with a numeric comparator.

A check requires a comparator, status predicate, or boolean expression selector. A query may use a metric without a comparator. A metric query with a comparator is invalid unless it is a file-filter query; use `check` for a scalar decision.

## File shortcut lowering

```text
diffdevil check --files any --metric changed --gt 100
```

Equivalent:

```text
any(filter(files, f => f.included), f => f.lines.changed > 100)
```

```text
diffdevil query --files --metric modified --gt 20 --select path --format lines
```

Equivalent:

```text
map(filter(files, f => f.included && f.lines.modified > 20), f => f.path)
```

The query command's `--files` is a flag. The check command's `--files` takes `any` or `all`. These are different command parsers with explicit help, not one argument that changes interpretation based on whether the next word is a file.

A file query defaults to `--select path`. Supported projection fields are `path`, `old-path`, `change-type`, `changed`, `modified`, `added-only`, `deleted-only`, `raw-added`, `raw-deleted`, and `raw-churn`. One selected field produces scalar items. Several comma-separated fields produce records using canonical field names such as `oldPath`, `changeType`, and `changed`.

A file query comparator defaults to metric `changed` when no metric is specified. No comparator means no numeric filter. The default inclusion filter still applies. `--all-files` removes that inclusion filter explicitly; it does not bypass a named scope's boundary.

`--certain` inserts a `certain` projection after filtering and before output projection. Its evidence note remains attached. It is incompatible with boolean checks because that would silently change an incomplete universal/existential decision into an observed-only one; write an explicit expression when that is the desired policy.

## Scopes and immediate paths

`--scope tests` begins from `scopes.tests.files`. `--path 'src/**'` filters by rename-aware `pathMatches`. Multiple `--path` flags are OR alternatives. The resulting selection can be used by a file query/check or by a standard metric aggregate:

```text
diffdevil query --path 'src/**' --metric changed --format value
```

Equivalent:

```text
sum(filter(files, f => f.included && pathMatches(f, "src/**")), f => f.lines.changed)
```

For a named scope, `--all-files` is invalid because the scope already expresses its inclusion contract. For global acquisition-only measures such as total files, an immediate selection is invalid; use the selected count alias `files` instead.

A shortcut selection uses the same path matcher, interval aggregation, and unknown behavior as a full expression. It does not ask a shell to expand a filesystem glob.

## Action shortcuts

The root Action with no policy inputs selects the size preset and application mode. A `metric` alone changes the size measurement. A single-rule invocation supplies `metric`, `threshold`, and at least one explicit effect such as `label`; that selects only the generated single rule, not an additional hidden size rule.

```yaml
- uses: Wolfsblvt/diffdevil@v1
  with:
    metric: destructive
    threshold: '500'
    comparison: gte
    label: review/destructive
```

This reconciles the specified label for the threshold and posts no comment. The root Action ensures that label exists using an explicit generated neutral definition if no custom definition is provided. It does not edit an existing label's metadata by default.

`/analyze` accepts metric/threshold/comparison to produce a decision without effects. A label/comment input on `/analyze` is rejected rather than ignored.

Explicit `config`/`policy` mode may select named rules through `rule`. It cannot be combined with an inline single-rule definition. These conflicts are errors, not precedence puzzles.

## Expression selectors

`--expr`, `--expr-file`, `--expr-stdin`, and `--name` are mutually exclusive selectors. They cannot be mixed with shortcut metric/comparator/file/scope/projection flags. Source selection, typed parameter binding, output format, and diagnostic options remain valid with either path.

The compiler constructs shortcut AST nodes directly and binds threshold/path values as literals or parameters. It never concatenates untrusted input into source. `explain` can show an equivalent expression for learning and debugging without making that string the implementation.

## Growth without a rewrite

A project can begin with no configuration, add an exclusion, change a size threshold, add a named formula, then introduce multiple rules. Each step exposes more of the same policy model. Exporting the expanded policy through `diffdevil explain --policy --format yaml` gives a complete ordinary configuration with `presets: []`, so users can take full ownership without hidden inheritance.

Exported configuration is not a migration obligation for unshipped prototypes. Once a preset/language version is released, existing pinned meaning remains stable. New defaults use a new preset identity; they do not silently alter old rule results.
