# Policies, metrics, bands, and rules

## Meaning

This document defines the structured policy around detail expressions. It owns configuration compilation, named metrics, scope references, ordered bands, rule evaluation, and the non-mutating effect-plan boundary. Preset selection and shortcut lowering are specified in [Presets and shortcuts](../integration/presets-and-shortcuts.md), so the easy path and advanced configuration remain one engine.

## Configuration entry

The default configuration name is `.diffdevil.yml`. No file is required for ordinary use. A file begins with `version: 1`; `language` may be omitted because schema version 1 binds a frozen default `diffdevil-expr/1` profile. An explicitly different unsupported language is an error, not a best-effort parse.

```yaml
version: 1
language: diffdevil-expr/1
```

Configuration is data. No executable YAML tags, remote includes, JavaScript modules, dynamic imports, or environment interpolation occurs inside it. Typed parameter bindings are separate input. Local and privileged Action configuration loading differ in source trust, not meaning.

## Main sections

| Section | Meaning |
| --- | --- |
| `version`, `language` | Structural and language profile selection. |
| `presets` | Built-in preset identities; absent means `[size@1]`, empty means no preset. |
| `size` | Small, structured overrides for the size preset. |
| `measurement` | Explicit named measurement profile, not custom primitive redefinition. |
| `defaults.paths` | Global file inclusion policy. |
| `scopes` | Named additional file selections. |
| `parameters` | Declared types, defaults, and required parameter values. |
| `metrics` | Named numeric measures or formulas. |
| `bands` | Named ordered numeric classifications. |
| `queries` | Named saved query expressions. |
| `labelGroups`, `labelDefinitions` | Explicit managed label membership and desired metadata. |
| `rules` | Conditions or band selection and resulting structured effects. |

Unknown configuration properties are errors. Report readers may tolerate future additive fields; authored policy is deliberately stricter to catch misspellings before they become missing effects.

## Metrics

A metric chooses exactly one of a standard measure or a formula:

```yaml
metrics:
  review:
    measure: lines.changed
  productionReview:
    measure: lines.changed
    scope: production
  weighted:
    formula: metrics.review + 2 * metrics.productionReview
```

`scope` is valid only with `measure`. It does not secretly rebind roots inside a formula. The formula equivalent is explicit:

```yaml
formula: scopes.production.totals.lines.changed
```

A metric must produce a numeric value. It may be exact, bounded, unknown, or unmeasurable. String, boolean, record, optional, and collection results are type errors for a metric. An author can explicitly make an optional aggregate present with a fallback when that is the intended metric.

### Standard measure catalog

The canonical measure IDs are `raw.added`, `raw.deleted`, `raw.churn`, `lines.added`, `lines.deleted`, `lines.modified`, `lines.changed`, and file counts such as `files.included`, `files.total`, `files.excluded`, `files.added`, `files.deleted`, `files.modified`, `files.renamed`, `files.copied`, `files.binary`, and `files.unmeasurable`.

The `measure` field accepts canonical IDs only. Friendly CLI/Action aliases such as `changed` or `raw-churn` are shortcut names, not new fact fields. Their lowering is fixed in the shortcut catalog.

A scope can use `files.included` and the change-kind/material counts. It cannot use global acquisition-only `files.total` or `files.excluded`; those are intentionally different questions. The checker reports an invalid scope/measure combination rather than quietly changing its meaning.

## Dependency graph and phases

Collect all declarations before binding so definition order does not change name resolution. Build a metric dependency graph, reject all cycles, and evaluate required nodes once. Use deterministic lexical ID order to break ties among independent nodes.

| Phase | May reference |
| --- | --- |
| Metric formulas | Facts, scopes, parameters, and other metrics. |
| Band input | Facts, scopes, parameters, and metrics. |
| Rule condition | Facts, scopes, parameters, metrics, and bands. |
| Saved/CLI query and check | Available facts and all completed policy results. |
| Template placeholders | Read-only facts and completed results supported by the template format. |

Rule conditions do not read other rule results. Rules are parallel policy decisions, not a workflow state machine. Band inputs do not read bands. Metrics do not read mutation outcomes or current GitHub labels.

Compilation checks every declaration, including unused declarations, for structural validity, names, types, cycles, and literal pattern validity. Runtime evaluates only requested roots and dependencies for a query/check; full `analyze` evaluates declared metrics and bands; `plan` additionally evaluates rules and renders intended effects. `analyze` does not evaluate rules merely to post or prepare comments. A full policy evaluation API may request those results without applying them.

A saved query referencing `rules.<id>` asks the host to perform the necessary read-only policy evaluation. A report without the needed policy source or compatible stored results produces `E_REPORT_CONTEXT`; it does not treat an absent rule as false.

## Parameters

```yaml
parameters:
  destructiveLimit:
    type: integer
    default: 500
  targetPath:
    type: string
    required: true
```

Supported parameter types are integer, float, boolean, and string in configuration version 1. A parameter must have exactly one of a default or `required: true`. Explicit required false without a default is invalid. Values are bound and checked before expression evaluation. Configured defaults are inert literal values, never expressions.

CLI `--param name=value` parses according to the declaration, not heuristics. A string `001` stays a string when its declared type is string. A boolean accepts `true` or `false` exactly. Numeric bindings obey safe integer and finite float rules. A missing required binding is `E_PARAMETER_REQUIRED`.

Paths, PR titles, and other dynamic text must be passed as parameters instead of interpolated into expression source. Typed binding solves language injection; host shell quoting still must transport the original value faithfully.

## Bands

```yaml
bands:
  size:
    value: metrics.review
    minimum: 0
    ranges:
      - { id: xs, lt: 20 }
      - { id: s, lt: 100 }
      - { id: m, lt: 500 }
      - { id: l, lt: 1000 }
      - { id: xl, otherwise: true }
```

`value` is one numeric expression. `minimum`, when present, states the accepted numeric domain floor. Each `lt` is an exclusive upper boundary. The next range begins at the previous boundary. The final `otherwise` covers the remaining numeric tail.

With `minimum: 0`, the example defines `[0,20)`, `[20,100)`, `[100,500)`, `[500,1000)`, and `[1000,+∞)`. Without a minimum, the first range begins at negative infinity. Infinity is a mathematical range endpoint, not a numeric literal or serialized measurement.

The representation intentionally disallows independently authored lower bounds. Once the cut points are ordered, gaps and overlaps cannot occur. This is more usable than validating a collection of nearly matching interval endpoints.

### Validation

Reject an empty range list, duplicate IDs, non-finite thresholds, duplicate or decreasing thresholds, a cut point not greater than the stated minimum, any range with both `lt` and `otherwise`, a non-final `otherwise`, repeated `otherwise`, or a missing final `otherwise`.

An exact value below `minimum` is `E_BAND_DOMAIN`. A bounded value whose domain partly or wholly violates the floor is `E_POSSIBLE_DOMAIN` or `E_BAND_DOMAIN`, respectively. An unknown value without evidence proving the declared floor yields an unresolved band with a domain-evidence reason; it is not silently clipped to the minimum. A known nonnegative line metric naturally proves a zero minimum.

### Resolution with evidence

Select an ID only when every admissible value lies in its range. For the default bands:

| Input | Result |
| --- | --- |
| exact `19` | resolved `xs` |
| exact `20` | resolved `s` |
| bounded `[60,70]` | resolved `s` |
| bounded `[15,30]` | unknown; candidates `xs`, `s` |
| bounded `[1200,2100]` | resolved `xl` |
| applicable unknown, lower bound `1200` | resolved `xl` |
| unmeasurable | unknown with applicability reason |

The one-sided lower-bound case can prove the unbounded tail. This extends the earlier two-sided examples without inventing an upper bound. Classification uses the declared domain constraints, not a requirement that the numeric state be named `bounded`.

`otherwise` never means unknown or invalid. A band result is `{status: resolved, id, ...}` or `{status: unknown, candidates, reasons}`. `id` is structurally absent on an unresolved result. Candidate IDs are all ranges not ruled out, in range order; if none can be bounded more narrowly, all valid ranges remain candidates.

## Rules

A rule declares exactly one of `when` or `band`:

```yaml
rules:
  destructive:
    when: metrics.destructive >= params.destructiveLimit
    onUnknown: hold
    effects:
      labels:
        add: [review/destructive]
        removeWhenFalse: true
```

```yaml
rules:
  size:
    band: size
    effects:
      labels:
        group: size
        byBand:
          xs: size/XS
          s: size/S
          m: size/M
          l: size/L
          xl: size/XL
        unknown: size/Unknown
```

`onUnknown` defaults to `hold`. A held rule preserves its managed effects; it does not execute the false branch or remove old labels. `onUnknown: fail` refuses the plan with `E_RULE_UNRESOLVED`. An explicit unknown-band label mapping is a resolved authored fallback action, not automatic false behavior, and can be used with the default hold posture.

No rule may perform arbitrary commands or function calls for effects. Numeric facts are not judgments about code quality. Rule IDs and templates may use a repository's chosen vocabulary, but the engine reports fact, policy decision, and effect separately.

## Labels and conflicts

A managed label group is an explicit list of names. A band mapping must cover every declared band ID and use only members of that group. An unknown mapping, when given, must also be a member. Duplicate label names and duplicate group members are invalid.

A boolean label effect owns its explicitly listed names and may remove them on a resolved false result only when `removeWhenFalse` is true. Unrelated labels are always preserved. A rule may not replace the whole PR label set.

Resolve all requested label additions/removals before performing writes. If two evaluated rules require incompatible assignments within one exclusive group, or require both adding and removing the same managed label, report `E_EFFECT_CONFLICT`. Do not let configuration order choose the winner.

Label definitions describe repository label metadata; assignments describe PR membership. The default root Action composes ensure-missing definitions with assignment application. The pure policy engine merely plans those operations. `labels verify` is read-only; `labels apply` explicitly reconciles configured definitions. See the integration reference for their modes.

## Comments and templates

Comments are absent unless explicitly configured. The shipped size preset contains no comment effect. Templates are validated during policy compilation, including placeholder names and available result types. Rendering produces text in the plan, not a network call.

Supported comment modes are `create`, `once`, `upsert`, and `once-per-transition`; `trigger: always`, `matched`, or `band-changed` selects the occasion compatible with the rule. Precise lifecycle behavior and ownership live in [Templates](../integration/templates.md). A host must not interpret a comment template as a detail expression or executable Markdown.

## Plan boundary

A plan contains the report/source identity, selected semantic versions, normalized policy identity, rule decisions, held effects, resolved intended operations, and evidence needed to explain them. Planning performs no provider mutation.

An effect adapter validates the target, supported operation kinds, trusted policy source, current comparison identity, and relevant current provider state before application. Existing-state reads may be needed to turn desired state into a concrete operation list; those are adapter concerns outside expression evaluation.

Plan hashes are integrity/identity tools, not authentication. An untrusted report with a self-consistent hash is still untrusted input. A privileged Action must obtain artifacts through its declared trusted route.

## Complete specimens and evolution

The [expanded default policy](../../src/diffdevil/presets/size-v1.yml), [minimal customization](../examples/policies/minimal.yml), and [complete custom policy](../examples/policies/full.yml) show all layers without requiring every user to author them.

Preset replacement, explicit opt-out, merge precedence, and migration are defined alongside [shortcut lowering](../integration/presets-and-shortcuts.md) and [versioning](versioning-and-interchange.md). Once released, changing a formula's meaning or a preset's thresholds requires explicit semantic/version selection, not a quiet dependency update.

## Current implementation standing

The shared compiler/evaluator executes this contract from inert objects and
JSON/YAML source. It includes preset expansion, scopes, metric dependency checking
and numeric inference, typed parameters, lazy saved queries/checks, ordered bands,
rules, templates and desired effect plans. JSON escapes and YAML folding, aliases,
quoting and CRLF map diagnostics back to original configuration positions.
Standalone Ajv validators are generated from fixed schemas at build time; policy
or detail text never becomes arbitrary JavaScript.

CLI, API and the four Action hosts use the same compiler. The GitHub adapter
reconciles explicit effects with current-policy/source checks, scoped ownership
and readback; provider evidence is currently mocked. Pure evaluation and planning
remain free of provider mutation. See [CLI](../integration/cli.md),
[Actions](../integration/github-actions.md), [TypeScript](../integration/typescript-api.md)
and [Qualification](../qualification.md) for their distinct executable boundaries.
