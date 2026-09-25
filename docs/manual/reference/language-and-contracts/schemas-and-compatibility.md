# Schemas and compatibility

Locate the artifact's kind and semantic identities before reading fields. Structural
validation answers whether a document has an allowed shape. Semantic readers also
check whether its fields can be true together. Neither proves trust, freshness or
permission to apply an effect.

## Version identities

This exact table comes from the versioned profile metadata. Its contract date,
parser candidate and design standing are retained as metadata, not a claim about
which implementation is currently available. The current engine implements detail;
built package declarations, executable conformance and emitted artifacts establish
that separate fact. Package and Action distribution versions remain independent.

<!-- manual:generated detail-versions -->
[Canonical profile metadata](../../../../src/diffdevil/contracts/detail/v1/profile.json)

| Field | Value |
| --- | --- |
| `displayName` | `detail` |
| `description` | `The diffdevil expression language` |
| `language` | `diffdevil-expr/1` |
| `expressionExtension` | `.ddexpr` |
| `numbers` | `diffdevil-number/1` |
| `paths` | `diffdevil-glob/1` |
| `replacementLines` | `replacement-lines-v1` |
| `limits` | `diffdevil-limits/1` |
| `defaultPreset` | `size@1` |
| `parserToolkit` | `Chevrotain` |
| `toolkitCandidateVersion` | `13.2.0` |
| `contractDate` | `2026-09-09` |
| `standing` | `selected design; no runtime implementation supplied` |
<!-- /manual:generated detail-versions -->

Policy configuration uses integer `version: 1`. Canonical report, query and plan
artifacts carry their own kind, schema version and semantic profiles. Do not infer
compatibility merely because both objects contain `1`. The expression source
language, number semantics, path matching, replacement counting, preset and selected
host budgets must remain supported for the operation you request.

## Policy schema and compilation

Configuration is strict. Unknown keys are often mistakes; extra declarations must
have explicit IDs and allowed shapes. JSON and YAML both lower to inert policy.
YAML core 1.2 uses bounded non-cyclic aliases and rejects duplicate keys, executable
tags and unsupported merge semantics. A parsed object still needs compilation to
check references, graph cycles, types, bands, groups and conflicting effects.

The complete [rules policy](../../../examples/policies/story/rules.yml) is valid.
Changing its `sourceReview.scope` to an undeclared scope can still satisfy a structural
string field, but compilation rejects the missing reference. A structurally valid
`metrics` graph can likewise be cyclic. This is why shape validation cannot replace
`compilePolicy`.

## Report and query envelopes

A report contains normalized observed files plus `fileSet` completeness/count evidence.
An observed array length does not establish the total file set. Duplicate IDs,
contradictory totals, impossible bounds or scope references to nonexistent files
are reader errors, not unknown evidence. Scope records reference observed file IDs
rather than duplicating entire file records. Primitive relationships are validated
before a reader reconstructs supported correlations.

A numeric measurement is exact, bounded, unknown or unmeasurable. Bound endpoints
are finite and type-compatible; numeric state is not a type. `metrics` and
`metricTypes` must appear together with identical keys, preserving integer/float
meaning that JSON's `1` alone cannot recover. This is the pre-release repair recorded
as D018, not a backwards-compatible change to an already released report profile.

Query JSON carries one typed value. It distinguishes number, boolean, string, null,
missing, typed nonnumeric unknown, record and collection. Collections retain definite
and possible observed members, unseen count bounds, order and any justified cardinality
constraint. Exactly one selected item can still have unresolved identity. Plain path
output may refuse while `count` is exact.

The [exact report](../../../examples/reports/exact.json),
[bounded report](../../../examples/reports/bounded.json),
[incomplete report](../../../examples/reports/incomplete.json),
[unmeasurable report](../../../examples/reports/unmeasurable.json) and
[query fixtures](../../../examples/reports/query-bounded.json) are complete canonical
specimens. Reversing a bounded value's endpoints is an important relational-invalid
case even when both fields remain valid numbers. A typed query's structural success
does not prove that a fabricated collection's cardinality matches its membership.

## Plans and effects

A plan identifies its source/report/policy and target, rule decisions, holds and
supported operations. Its stage distinguishes desired state from a materialized plan
that relied on observed provider preconditions. `readPlan` checks its model; a target
or hash that is structurally plausible can still disagree with its bound source.
An unknown effect kind is not a harmless additive field to skip.

Application additionally needs trusted policy, compatible current evidence,
permissions, ownership and freshness. An effects result retains attempted requests
and actual readback. A valid plan with no attempted request is not an applied result.
The full [plan specimen](../../../examples/reports/plan.json) is not a live-provider
receipt. A tampered policy/source identity or inconsistent target must be refused
rather than repaired by silently changing the artifact.

## Exact structural inventories

The tables enumerate canonical schema nodes and their JSON pointers, including
references, definitions, union branches, constraints and branch-local requiredness.
“Required in this object/branch” does not mean globally unconditional: `oneOf`,
`anyOf`, `allOf` and conditional branches retain their own context. A `$ref` remains
an explicit reference, never an invented scalar type. Boolean schemas retain true
or false. Read the complete canonical schema for evaluation across those nodes.
Edit schemas and regenerate only the bounded inventories below.

<!-- manual:generated schemas -->
### plan-v1.schema.json

[Canonical JSON Schema](../../../../src/diffdevil/contracts/schemas/plan-v1.schema.json)

| Field / branch | Type | Requiredness | Description | Schema pointer | Constraints |
| --- | --- | --- | --- | --- | --- |
| `$` | `object` | Not required here | Closed operation union; freshness, ownership, group membership and trusted provenance require adapter validation. A hash does not authenticate an artifact. | `#` | `{"required":["kind","schemaVersion","semantics","stage","source","reportId","policyId","target","rules","held","operations"]}` |
| `$.kind` | `unspecified` | Required in this object/branch |  | `#/properties/kind` | `{"const":"diffdevil.plan"}` |
| `$.schemaVersion` | `unspecified` | Required in this object/branch |  | `#/properties/schemaVersion` | `{"const":"1.0"}` |
| `$.semantics` | `object` | Required in this object/branch |  | `#/properties/semantics` | `{"required":["language","numbers","replacementLines","paths"]}` |
| `$.semantics.language` | `unspecified` | Required in this object/branch |  | `#/properties/semantics/properties/language` | `{"const":"diffdevil-expr/1"}` |
| `$.semantics.numbers` | `unspecified` | Required in this object/branch |  | `#/properties/semantics/properties/numbers` | `{"const":"diffdevil-number/1"}` |
| `$.semantics.replacementLines` | `unspecified` | Required in this object/branch |  | `#/properties/semantics/properties/replacementLines` | `{"const":"replacement-lines-v1"}` |
| `$.semantics.paths` | `unspecified` | Required in this object/branch |  | `#/properties/semantics/properties/paths` | `{"const":"diffdevil-glob/1"}` |
| `$.semantics.presets` | `array` | Not required here |  | `#/properties/semantics/properties/presets` | `{}` |
| `$.semantics.presets[]` | `string` | Not required here |  | `#/properties/semantics/properties/presets/items` | `{}` |
| `$.semantics.limits` | `string` | Not required here |  | `#/properties/semantics/properties/limits` | `{}` |
| `$.semantics.additionalProperties` | `true` | Not required here |  | `#/properties/semantics/additionalProperties` | Boolean schema |
| `$.stage` | `unspecified` | Required in this object/branch |  | `#/properties/stage` | `{"enum":["desired","materialized"]}` |
| `$.source` | `object` | Required in this object/branch |  | `#/properties/source` | `{"required":["kind","comparisonId"]}` |
| `$.source.kind` | `unspecified` | Required in this object/branch |  | `#/properties/source/properties/kind` | `{"enum":["git","unified-diff","github-api"]}` |
| `$.source.comparisonId` | `string` | Required in this object/branch |  | `#/properties/source/properties/comparisonId` | `{"minLength":1}` |
| `$.source.base` | `string` | Not required here |  | `#/properties/source/properties/base` | `{}` |
| `$.source.head` | `string` | Not required here |  | `#/properties/source/properties/head` | `{}` |
| `$.source.comparison` | `unspecified` | Not required here |  | `#/properties/source/properties/comparison` | `{"enum":["three-dot","direct","worktree","staged","supplied"]}` |
| `$.source.repository` | `string` | Not required here |  | `#/properties/source/properties/repository` | `{}` |
| `$.source.pullRequest` | `integer` | Not required here |  | `#/properties/source/properties/pullRequest` | `{"minimum":1,"maximum":9007199254740991}` |
| `$.source.baseTip` | `string` | Not required here | Current pull-request base tip when a Git three-dot diff begins at an older merge base. | `#/properties/source/properties/baseTip` | `{}` |
| `$.source.additionalProperties` | `true` | Not required here |  | `#/properties/source/additionalProperties` | Boolean schema |
| `$.reportId` | `string` | Required in this object/branch |  | `#/properties/reportId` | `{"minLength":1}` |
| `$.policyId` | `string` | Required in this object/branch |  | `#/properties/policyId` | `{"minLength":1}` |
| `$.target` | `object` | Required in this object/branch |  | `#/properties/target` | `{"required":["repository","pullRequest"]}` |
| `$.target.repository` | `string` | Required in this object/branch |  | `#/properties/target/properties/repository` | `{"minLength":1}` |
| `$.target.pullRequest` | `integer` | Required in this object/branch |  | `#/properties/target/properties/pullRequest` | `{"minimum":1,"maximum":9007199254740991}` |
| `$.target.additionalProperties` | `false` | Not required here |  | `#/properties/target/additionalProperties` | Boolean schema |
| `$.rules` | `object` | Required in this object/branch |  | `#/properties/rules` | `{}` |
| `$.rules.additionalProperties` | `object` | Not required here |  | `#/properties/rules/additionalProperties` | `{"required":["disposition"]}` |
| `$.rules.additionalProperties.decision` | `reference` | Not required here |  | `#/properties/rules/additionalProperties/properties/decision` | `{"$ref":"urn:diffdevil:values:1#/$defs/decision"}` |
| `$.rules.additionalProperties.band` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/properties/band` | `{}` |
| `$.rules.additionalProperties.band.oneOf[0]` | `object` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/0` | `{"required":["status","id"]}` |
| `$.rules.additionalProperties.band.oneOf[0].status` | `unspecified` | Required in this object/branch |  | `#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/status` | `{"const":"resolved"}` |
| `$.rules.additionalProperties.band.oneOf[0].id` | `string` | Required in this object/branch |  | `#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/id` | `{"minLength":1}` |
| `$.rules.additionalProperties.band.oneOf[0].lower` | `number` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/lower` | `{"minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}` |
| `$.rules.additionalProperties.band.oneOf[0].upper` | `number` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/upper` | `{"minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}` |
| `$.rules.additionalProperties.band.oneOf[0].additionalProperties` | `true` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/0/additionalProperties` | Boolean schema |
| `$.rules.additionalProperties.band.oneOf[1]` | `object` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1` | `{"required":["status","candidates","reasons"]}` |
| `$.rules.additionalProperties.band.oneOf[1].status` | `unspecified` | Required in this object/branch |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/status` | `{"const":"unknown"}` |
| `$.rules.additionalProperties.band.oneOf[1].candidates` | `array` | Required in this object/branch |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/candidates` | `{}` |
| `$.rules.additionalProperties.band.oneOf[1].candidates[]` | `string` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/candidates/items` | `{}` |
| `$.rules.additionalProperties.band.oneOf[1].reasons` | `array` | Required in this object/branch |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons` | `{"minItems":1}` |
| `$.rules.additionalProperties.band.oneOf[1].reasons[]` | `object` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items` | `{"required":["code"]}` |
| `$.rules.additionalProperties.band.oneOf[1].reasons[].code` | `string` | Required in this object/branch |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/properties/code` | `{"minLength":1}` |
| `$.rules.additionalProperties.band.oneOf[1].reasons[].subject` | `string` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/properties/subject` | `{}` |
| `$.rules.additionalProperties.band.oneOf[1].reasons[].message` | `string` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/properties/message` | `{}` |
| `$.rules.additionalProperties.band.oneOf[1].reasons[].additionalProperties` | `true` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/additionalProperties` | Boolean schema |
| `$.rules.additionalProperties.band.oneOf[1].additionalProperties` | `true` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/additionalProperties` | Boolean schema |
| `$.rules.additionalProperties.band.oneOf[1].not` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/not` | `{"required":["id"]}` |
| `$.rules.additionalProperties.disposition` | `unspecified` | Required in this object/branch |  | `#/properties/rules/additionalProperties/properties/disposition` | `{"enum":["matched","unmatched","held","fallback"]}` |
| `$.rules.additionalProperties.additionalProperties` | `true` | Not required here |  | `#/properties/rules/additionalProperties/additionalProperties` | Boolean schema |
| `$.rules.propertyNames` | `unspecified` | Not required here |  | `#/properties/rules/propertyNames` | `{"minLength":1}` |
| `$.rules.propertyNames.not` | `unspecified` | Not required here |  | `#/properties/rules/propertyNames/not` | `{"enum":["__proto__","constructor","prototype"]}` |
| `$.held` | `array` | Required in this object/branch |  | `#/properties/held` | `{}` |
| `$.held[]` | `object` | Not required here |  | `#/properties/held/items` | `{"required":["rule","reasons"]}` |
| `$.held[].rule` | `string` | Required in this object/branch |  | `#/properties/held/items/properties/rule` | `{}` |
| `$.held[].reasons` | `array` | Required in this object/branch |  | `#/properties/held/items/properties/reasons` | `{"minItems":1}` |
| `$.held[].reasons[]` | `object` | Not required here |  | `#/properties/held/items/properties/reasons/items` | `{"required":["code"]}` |
| `$.held[].reasons[].code` | `string` | Required in this object/branch |  | `#/properties/held/items/properties/reasons/items/properties/code` | `{"minLength":1}` |
| `$.held[].reasons[].subject` | `string` | Not required here |  | `#/properties/held/items/properties/reasons/items/properties/subject` | `{}` |
| `$.held[].reasons[].message` | `string` | Not required here |  | `#/properties/held/items/properties/reasons/items/properties/message` | `{}` |
| `$.held[].reasons[].additionalProperties` | `true` | Not required here |  | `#/properties/held/items/properties/reasons/items/additionalProperties` | Boolean schema |
| `$.held[].additionalProperties` | `false` | Not required here |  | `#/properties/held/items/additionalProperties` | Boolean schema |
| `$.operations` | `array` | Required in this object/branch |  | `#/properties/operations` | `{}` |
| `$.operations[]` | `unspecified` | Not required here |  | `#/properties/operations/items` | `{}` |
| `$.operations[].oneOf[0]` | `object` | Not required here |  | `#/properties/operations/items/oneOf/0` | `{"required":["kind","name","definition"]}` |
| `$.operations[].oneOf[0].kind` | `unspecified` | Required in this object/branch |  | `#/properties/operations/items/oneOf/0/properties/kind` | `{"const":"label.ensure"}` |
| `$.operations[].oneOf[0].rule` | `string` | Not required here |  | `#/properties/operations/items/oneOf/0/properties/rule` | `{}` |
| `$.operations[].oneOf[0].name` | `string` | Required in this object/branch |  | `#/properties/operations/items/oneOf/0/properties/name` | `{}` |
| `$.operations[].oneOf[0].definition` | `object` | Required in this object/branch |  | `#/properties/operations/items/oneOf/0/properties/definition` | `{"required":["color","description"]}` |
| `$.operations[].oneOf[0].definition.color` | `string` | Required in this object/branch |  | `#/properties/operations/items/oneOf/0/properties/definition/properties/color` | `{"pattern":"^[0-9a-fA-F]{6}$"}` |
| `$.operations[].oneOf[0].definition.description` | `string` | Required in this object/branch |  | `#/properties/operations/items/oneOf/0/properties/definition/properties/description` | `{"maxLength":100}` |
| `$.operations[].oneOf[0].definition.additionalProperties` | `false` | Not required here |  | `#/properties/operations/items/oneOf/0/properties/definition/additionalProperties` | Boolean schema |
| `$.operations[].oneOf[0].additionalProperties` | `false` | Not required here |  | `#/properties/operations/items/oneOf/0/additionalProperties` | Boolean schema |
| `$.operations[].oneOf[1]` | `object` | Not required here |  | `#/properties/operations/items/oneOf/1` | `{"required":["kind","name","definition"]}` |
| `$.operations[].oneOf[1].kind` | `unspecified` | Required in this object/branch |  | `#/properties/operations/items/oneOf/1/properties/kind` | `{"const":"label.sync"}` |
| `$.operations[].oneOf[1].rule` | `string` | Not required here |  | `#/properties/operations/items/oneOf/1/properties/rule` | `{}` |
| `$.operations[].oneOf[1].name` | `string` | Required in this object/branch |  | `#/properties/operations/items/oneOf/1/properties/name` | `{}` |
| `$.operations[].oneOf[1].definition` | `object` | Required in this object/branch |  | `#/properties/operations/items/oneOf/1/properties/definition` | `{"required":["color","description"]}` |
| `$.operations[].oneOf[1].definition.color` | `string` | Required in this object/branch |  | `#/properties/operations/items/oneOf/1/properties/definition/properties/color` | `{"pattern":"^[0-9a-fA-F]{6}$"}` |
| `$.operations[].oneOf[1].definition.description` | `string` | Required in this object/branch |  | `#/properties/operations/items/oneOf/1/properties/definition/properties/description` | `{"maxLength":100}` |
| `$.operations[].oneOf[1].definition.additionalProperties` | `false` | Not required here |  | `#/properties/operations/items/oneOf/1/properties/definition/additionalProperties` | Boolean schema |
| `$.operations[].oneOf[1].additionalProperties` | `false` | Not required here |  | `#/properties/operations/items/oneOf/1/additionalProperties` | Boolean schema |
| `$.operations[].oneOf[2]` | `object` | Not required here |  | `#/properties/operations/items/oneOf/2` | `{"required":["kind","rule","name"]}` |
| `$.operations[].oneOf[2].kind` | `unspecified` | Required in this object/branch |  | `#/properties/operations/items/oneOf/2/properties/kind` | `{"const":"label.add"}` |
| `$.operations[].oneOf[2].rule` | `string` | Required in this object/branch |  | `#/properties/operations/items/oneOf/2/properties/rule` | `{}` |
| `$.operations[].oneOf[2].name` | `string` | Required in this object/branch |  | `#/properties/operations/items/oneOf/2/properties/name` | `{}` |
| `$.operations[].oneOf[2].additionalProperties` | `false` | Not required here |  | `#/properties/operations/items/oneOf/2/additionalProperties` | Boolean schema |
| `$.operations[].oneOf[3]` | `object` | Not required here |  | `#/properties/operations/items/oneOf/3` | `{"required":["kind","rule","name"]}` |
| `$.operations[].oneOf[3].kind` | `unspecified` | Required in this object/branch |  | `#/properties/operations/items/oneOf/3/properties/kind` | `{"const":"label.remove"}` |
| `$.operations[].oneOf[3].rule` | `string` | Required in this object/branch |  | `#/properties/operations/items/oneOf/3/properties/rule` | `{}` |
| `$.operations[].oneOf[3].name` | `string` | Required in this object/branch |  | `#/properties/operations/items/oneOf/3/properties/name` | `{}` |
| `$.operations[].oneOf[3].additionalProperties` | `false` | Not required here |  | `#/properties/operations/items/oneOf/3/additionalProperties` | Boolean schema |
| `$.operations[].oneOf[4]` | `object` | Not required here |  | `#/properties/operations/items/oneOf/4` | `{"required":["kind","rule","group","members","selected"]}` |
| `$.operations[].oneOf[4].kind` | `unspecified` | Required in this object/branch |  | `#/properties/operations/items/oneOf/4/properties/kind` | `{"const":"label.select"}` |
| `$.operations[].oneOf[4].rule` | `string` | Required in this object/branch |  | `#/properties/operations/items/oneOf/4/properties/rule` | `{}` |
| `$.operations[].oneOf[4].group` | `string` | Required in this object/branch |  | `#/properties/operations/items/oneOf/4/properties/group` | `{}` |
| `$.operations[].oneOf[4].members` | `array` | Required in this object/branch |  | `#/properties/operations/items/oneOf/4/properties/members` | `{}` |
| `$.operations[].oneOf[4].members[]` | `string` | Not required here |  | `#/properties/operations/items/oneOf/4/properties/members/items` | `{}` |
| `$.operations[].oneOf[4].selected` | `string` | Required in this object/branch |  | `#/properties/operations/items/oneOf/4/properties/selected` | `{}` |
| `$.operations[].oneOf[4].additionalProperties` | `false` | Not required here |  | `#/properties/operations/items/oneOf/4/additionalProperties` | Boolean schema |
| `$.operations[].oneOf[5]` | `object` | Not required here |  | `#/properties/operations/items/oneOf/5` | `{"required":["kind","rule","mode","trigger","body"]}` |
| `$.operations[].oneOf[5].kind` | `unspecified` | Required in this object/branch |  | `#/properties/operations/items/oneOf/5/properties/kind` | `{"const":"comment.reconcile"}` |
| `$.operations[].oneOf[5].rule` | `string` | Required in this object/branch |  | `#/properties/operations/items/oneOf/5/properties/rule` | `{}` |
| `$.operations[].oneOf[5].mode` | `unspecified` | Required in this object/branch |  | `#/properties/operations/items/oneOf/5/properties/mode` | `{"enum":["create","once","upsert","once-per-transition"]}` |
| `$.operations[].oneOf[5].trigger` | `unspecified` | Required in this object/branch |  | `#/properties/operations/items/oneOf/5/properties/trigger` | `{"enum":["always","matched","band-changed"]}` |
| `$.operations[].oneOf[5].body` | `string` | Required in this object/branch |  | `#/properties/operations/items/oneOf/5/properties/body` | `{}` |
| `$.operations[].oneOf[5].occasionId` | `string` | Not required here |  | `#/properties/operations/items/oneOf/5/properties/occasionId` | `{}` |
| `$.operations[].oneOf[5].additionalProperties` | `false` | Not required here |  | `#/properties/operations/items/oneOf/5/additionalProperties` | Boolean schema |
| `$.preconditions` | `object` | Not required here |  | `#/properties/preconditions` | `{"required":[]}` |
| `$.preconditions.head` | `string` | Not required here |  | `#/properties/preconditions/properties/head` | `{}` |
| `$.preconditions.base` | `string` | Not required here |  | `#/properties/preconditions/properties/base` | `{}` |
| `$.preconditions.providerStateId` | `string` | Not required here |  | `#/properties/preconditions/properties/providerStateId` | `{}` |
| `$.preconditions.additionalProperties` | `false` | Not required here |  | `#/properties/preconditions/additionalProperties` | Boolean schema |
| `$.additionalProperties` | `false` | Not required here |  | `#/additionalProperties` | Boolean schema |

### policy-v1.schema.json

[Canonical JSON Schema](../../../../src/diffdevil/contracts/schemas/policy-v1.schema.json)

| Field / branch | Type | Requiredness | Description | Schema pointer | Constraints |
| --- | --- | --- | --- | --- | --- |
| `$` | `object` | Not required here | Strict authoring schema. Semantic validation additionally checks names, types, metric cycles, path patterns, band ordering, cross references, preset overrides, and effect conflicts. | `#` | `{"required":["version"]}` |
| `$.version` | `unspecified` | Required in this object/branch |  | `#/properties/version` | `{"const":1}` |
| `$.language` | `unspecified` | Not required here |  | `#/properties/language` | `{"const":"diffdevil-expr/1"}` |
| `$.presets` | `array` | Not required here |  | `#/properties/presets` | `{"uniqueItems":true}` |
| `$.presets[]` | `unspecified` | Not required here |  | `#/properties/presets/items` | `{"enum":["size@1"]}` |
| `$.size` | `object` | Not required here |  | `#/properties/size` | `{}` |
| `$.size.metric` | `string` | Not required here |  | `#/properties/size/properties/metric` | `{"minLength":1}` |
| `$.size.thresholds` | `object` | Not required here |  | `#/properties/size/properties/thresholds` | `{"required":["xs","s","m","l"]}` |
| `$.size.thresholds.xs` | `number` | Required in this object/branch |  | `#/properties/size/properties/thresholds/properties/xs` | `{"minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}` |
| `$.size.thresholds.s` | `number` | Required in this object/branch |  | `#/properties/size/properties/thresholds/properties/s` | `{"minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}` |
| `$.size.thresholds.m` | `number` | Required in this object/branch |  | `#/properties/size/properties/thresholds/properties/m` | `{"minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}` |
| `$.size.thresholds.l` | `number` | Required in this object/branch |  | `#/properties/size/properties/thresholds/properties/l` | `{"minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}` |
| `$.size.thresholds.additionalProperties` | `false` | Not required here |  | `#/properties/size/properties/thresholds/additionalProperties` | Boolean schema |
| `$.size.labels` | `object` | Not required here |  | `#/properties/size/properties/labels` | `{"required":["xs","s","m","l","xl","unknown"]}` |
| `$.size.labels.xs` | `string` | Required in this object/branch |  | `#/properties/size/properties/labels/properties/xs` | `{"minLength":1}` |
| `$.size.labels.s` | `string` | Required in this object/branch |  | `#/properties/size/properties/labels/properties/s` | `{"minLength":1}` |
| `$.size.labels.m` | `string` | Required in this object/branch |  | `#/properties/size/properties/labels/properties/m` | `{"minLength":1}` |
| `$.size.labels.l` | `string` | Required in this object/branch |  | `#/properties/size/properties/labels/properties/l` | `{"minLength":1}` |
| `$.size.labels.xl` | `string` | Required in this object/branch |  | `#/properties/size/properties/labels/properties/xl` | `{"minLength":1}` |
| `$.size.labels.unknown` | `string` | Required in this object/branch |  | `#/properties/size/properties/labels/properties/unknown` | `{"minLength":1}` |
| `$.size.labels.additionalProperties` | `false` | Not required here |  | `#/properties/size/properties/labels/additionalProperties` | Boolean schema |
| `$.size.additionalProperties` | `false` | Not required here |  | `#/properties/size/additionalProperties` | Boolean schema |
| `$.measurement` | `object` | Not required here |  | `#/properties/measurement` | `{"required":["replacementLines"]}` |
| `$.measurement.replacementLines` | `unspecified` | Required in this object/branch |  | `#/properties/measurement/properties/replacementLines` | `{"const":"replacement-lines-v1"}` |
| `$.measurement.additionalProperties` | `false` | Not required here |  | `#/properties/measurement/additionalProperties` | Boolean schema |
| `$.defaults` | `object` | Not required here |  | `#/properties/defaults` | `{}` |
| `$.defaults.paths` | `object` | Not required here |  | `#/properties/defaults/properties/paths` | `{}` |
| `$.defaults.paths.includeOnly` | `array` | Not required here |  | `#/properties/defaults/properties/paths/properties/includeOnly` | `{"uniqueItems":true}` |
| `$.defaults.paths.includeOnly[]` | `string` | Not required here |  | `#/properties/defaults/properties/paths/properties/includeOnly/items` | `{}` |
| `$.defaults.paths.exclude` | `array` | Not required here |  | `#/properties/defaults/properties/paths/properties/exclude` | `{"uniqueItems":true}` |
| `$.defaults.paths.exclude[]` | `string` | Not required here |  | `#/properties/defaults/properties/paths/properties/exclude/items` | `{}` |
| `$.defaults.paths.forceInclude` | `array` | Not required here |  | `#/properties/defaults/properties/paths/properties/forceInclude` | `{"uniqueItems":true}` |
| `$.defaults.paths.forceInclude[]` | `string` | Not required here |  | `#/properties/defaults/properties/paths/properties/forceInclude/items` | `{}` |
| `$.defaults.paths.additionalProperties` | `false` | Not required here |  | `#/properties/defaults/properties/paths/additionalProperties` | Boolean schema |
| `$.defaults.additionalProperties` | `false` | Not required here |  | `#/properties/defaults/additionalProperties` | Boolean schema |
| `$.scopes` | `object` | Not required here |  | `#/properties/scopes` | `{}` |
| `$.scopes.additionalProperties` | `object` | Not required here |  | `#/properties/scopes/additionalProperties` | `{}` |
| `$.scopes.additionalProperties.includeOnly` | `array` | Not required here |  | `#/properties/scopes/additionalProperties/properties/includeOnly` | `{"uniqueItems":true}` |
| `$.scopes.additionalProperties.includeOnly[]` | `string` | Not required here |  | `#/properties/scopes/additionalProperties/properties/includeOnly/items` | `{}` |
| `$.scopes.additionalProperties.exclude` | `array` | Not required here |  | `#/properties/scopes/additionalProperties/properties/exclude` | `{"uniqueItems":true}` |
| `$.scopes.additionalProperties.exclude[]` | `string` | Not required here |  | `#/properties/scopes/additionalProperties/properties/exclude/items` | `{}` |
| `$.scopes.additionalProperties.forceInclude` | `array` | Not required here |  | `#/properties/scopes/additionalProperties/properties/forceInclude` | `{"uniqueItems":true}` |
| `$.scopes.additionalProperties.forceInclude[]` | `string` | Not required here |  | `#/properties/scopes/additionalProperties/properties/forceInclude/items` | `{}` |
| `$.scopes.additionalProperties.additionalProperties` | `false` | Not required here |  | `#/properties/scopes/additionalProperties/additionalProperties` | Boolean schema |
| `$.scopes.propertyNames` | `unspecified` | Not required here |  | `#/properties/scopes/propertyNames` | `{"minLength":1}` |
| `$.scopes.propertyNames.not` | `unspecified` | Not required here |  | `#/properties/scopes/propertyNames/not` | `{"enum":["__proto__","constructor","prototype"]}` |
| `$.parameters` | `object` | Not required here |  | `#/properties/parameters` | `{}` |
| `$.parameters.additionalProperties` | `object` | Not required here |  | `#/properties/parameters/additionalProperties` | `{"required":["type"]}` |
| `$.parameters.additionalProperties.type` | `unspecified` | Required in this object/branch |  | `#/properties/parameters/additionalProperties/properties/type` | `{"enum":["integer","float","boolean","string"]}` |
| `$.parameters.additionalProperties.default` | `number` \| `boolean` \| `string` | Not required here |  | `#/properties/parameters/additionalProperties/properties/default` | `{}` |
| `$.parameters.additionalProperties.required` | `unspecified` | Not required here |  | `#/properties/parameters/additionalProperties/properties/required` | `{"const":true}` |
| `$.parameters.additionalProperties.additionalProperties` | `false` | Not required here |  | `#/properties/parameters/additionalProperties/additionalProperties` | Boolean schema |
| `$.parameters.additionalProperties.oneOf[0]` | `unspecified` | Not required here |  | `#/properties/parameters/additionalProperties/oneOf/0` | `{"required":["default"]}` |
| `$.parameters.additionalProperties.oneOf[0].not` | `unspecified` | Not required here |  | `#/properties/parameters/additionalProperties/oneOf/0/not` | `{"required":["required"]}` |
| `$.parameters.additionalProperties.oneOf[1]` | `unspecified` | Not required here |  | `#/properties/parameters/additionalProperties/oneOf/1` | `{"required":["required"]}` |
| `$.parameters.additionalProperties.oneOf[1].not` | `unspecified` | Not required here |  | `#/properties/parameters/additionalProperties/oneOf/1/not` | `{"required":["default"]}` |
| `$.parameters.additionalProperties.allOf[0]` | `unspecified` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/0` | `{}` |
| `$.parameters.additionalProperties.allOf[0].if` | `object` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/0/if` | `{"required":["type"]}` |
| `$.parameters.additionalProperties.allOf[0].if.type` | `unspecified` | Required in this object/branch |  | `#/properties/parameters/additionalProperties/allOf/0/if/properties/type` | `{"const":"integer"}` |
| `$.parameters.additionalProperties.allOf[0].then` | `object` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/0/then` | `{}` |
| `$.parameters.additionalProperties.allOf[0].then.default` | `integer` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/0/then/properties/default` | `{"minimum":-9007199254740991,"maximum":9007199254740991}` |
| `$.parameters.additionalProperties.allOf[1]` | `unspecified` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/1` | `{}` |
| `$.parameters.additionalProperties.allOf[1].if` | `object` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/1/if` | `{"required":["type"]}` |
| `$.parameters.additionalProperties.allOf[1].if.type` | `unspecified` | Required in this object/branch |  | `#/properties/parameters/additionalProperties/allOf/1/if/properties/type` | `{"const":"float"}` |
| `$.parameters.additionalProperties.allOf[1].then` | `object` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/1/then` | `{}` |
| `$.parameters.additionalProperties.allOf[1].then.default` | `number` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/1/then/properties/default` | `{"minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}` |
| `$.parameters.additionalProperties.allOf[2]` | `unspecified` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/2` | `{}` |
| `$.parameters.additionalProperties.allOf[2].if` | `object` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/2/if` | `{"required":["type"]}` |
| `$.parameters.additionalProperties.allOf[2].if.type` | `unspecified` | Required in this object/branch |  | `#/properties/parameters/additionalProperties/allOf/2/if/properties/type` | `{"const":"boolean"}` |
| `$.parameters.additionalProperties.allOf[2].then` | `object` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/2/then` | `{}` |
| `$.parameters.additionalProperties.allOf[2].then.default` | `boolean` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/2/then/properties/default` | `{}` |
| `$.parameters.additionalProperties.allOf[3]` | `unspecified` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/3` | `{}` |
| `$.parameters.additionalProperties.allOf[3].if` | `object` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/3/if` | `{"required":["type"]}` |
| `$.parameters.additionalProperties.allOf[3].if.type` | `unspecified` | Required in this object/branch |  | `#/properties/parameters/additionalProperties/allOf/3/if/properties/type` | `{"const":"string"}` |
| `$.parameters.additionalProperties.allOf[3].then` | `object` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/3/then` | `{}` |
| `$.parameters.additionalProperties.allOf[3].then.default` | `string` | Not required here |  | `#/properties/parameters/additionalProperties/allOf/3/then/properties/default` | `{}` |
| `$.parameters.propertyNames` | `unspecified` | Not required here |  | `#/properties/parameters/propertyNames` | `{"minLength":1}` |
| `$.parameters.propertyNames.not` | `unspecified` | Not required here |  | `#/properties/parameters/propertyNames/not` | `{"enum":["__proto__","constructor","prototype"]}` |
| `$.metrics` | `object` | Not required here |  | `#/properties/metrics` | `{}` |
| `$.metrics.additionalProperties` | `unspecified` | Not required here |  | `#/properties/metrics/additionalProperties` | `{}` |
| `$.metrics.additionalProperties.oneOf[0]` | `object` | Not required here |  | `#/properties/metrics/additionalProperties/oneOf/0` | `{"required":["measure"]}` |
| `$.metrics.additionalProperties.oneOf[0].measure` | `unspecified` | Required in this object/branch |  | `#/properties/metrics/additionalProperties/oneOf/0/properties/measure` | `{"enum":["raw.added","raw.deleted","raw.churn","lines.added","lines.deleted","lines.modified","lines.changed","files.total","files.included","files.excluded","files.added","files.deleted","files.modified","files.renamed","files.copied","files.binary","files.unmeasurable"]}` |
| `$.metrics.additionalProperties.oneOf[0].scope` | `string` | Not required here |  | `#/properties/metrics/additionalProperties/oneOf/0/properties/scope` | `{"minLength":1}` |
| `$.metrics.additionalProperties.oneOf[0].additionalProperties` | `false` | Not required here |  | `#/properties/metrics/additionalProperties/oneOf/0/additionalProperties` | Boolean schema |
| `$.metrics.additionalProperties.oneOf[1]` | `object` | Not required here |  | `#/properties/metrics/additionalProperties/oneOf/1` | `{"required":["formula"]}` |
| `$.metrics.additionalProperties.oneOf[1].formula` | `string` | Required in this object/branch |  | `#/properties/metrics/additionalProperties/oneOf/1/properties/formula` | `{"minLength":1}` |
| `$.metrics.additionalProperties.oneOf[1].additionalProperties` | `false` | Not required here |  | `#/properties/metrics/additionalProperties/oneOf/1/additionalProperties` | Boolean schema |
| `$.metrics.propertyNames` | `unspecified` | Not required here |  | `#/properties/metrics/propertyNames` | `{"minLength":1}` |
| `$.metrics.propertyNames.not` | `unspecified` | Not required here |  | `#/properties/metrics/propertyNames/not` | `{"enum":["__proto__","constructor","prototype"]}` |
| `$.bands` | `object` | Not required here |  | `#/properties/bands` | `{}` |
| `$.bands.additionalProperties` | `object` | Not required here |  | `#/properties/bands/additionalProperties` | `{"required":["value","ranges"]}` |
| `$.bands.additionalProperties.value` | `string` | Required in this object/branch |  | `#/properties/bands/additionalProperties/properties/value` | `{"minLength":1}` |
| `$.bands.additionalProperties.minimum` | `number` | Not required here |  | `#/properties/bands/additionalProperties/properties/minimum` | `{"minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}` |
| `$.bands.additionalProperties.ranges` | `array` | Required in this object/branch |  | `#/properties/bands/additionalProperties/properties/ranges` | `{"minItems":1}` |
| `$.bands.additionalProperties.ranges[]` | `unspecified` | Not required here |  | `#/properties/bands/additionalProperties/properties/ranges/items` | `{}` |
| `$.bands.additionalProperties.ranges[].oneOf[0]` | `object` | Not required here |  | `#/properties/bands/additionalProperties/properties/ranges/items/oneOf/0` | `{"required":["id","lt"]}` |
| `$.bands.additionalProperties.ranges[].oneOf[0].id` | `string` | Required in this object/branch |  | `#/properties/bands/additionalProperties/properties/ranges/items/oneOf/0/properties/id` | `{"minLength":1}` |
| `$.bands.additionalProperties.ranges[].oneOf[0].lt` | `number` | Required in this object/branch |  | `#/properties/bands/additionalProperties/properties/ranges/items/oneOf/0/properties/lt` | `{"minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}` |
| `$.bands.additionalProperties.ranges[].oneOf[0].additionalProperties` | `false` | Not required here |  | `#/properties/bands/additionalProperties/properties/ranges/items/oneOf/0/additionalProperties` | Boolean schema |
| `$.bands.additionalProperties.ranges[].oneOf[1]` | `object` | Not required here |  | `#/properties/bands/additionalProperties/properties/ranges/items/oneOf/1` | `{"required":["id","otherwise"]}` |
| `$.bands.additionalProperties.ranges[].oneOf[1].id` | `string` | Required in this object/branch |  | `#/properties/bands/additionalProperties/properties/ranges/items/oneOf/1/properties/id` | `{"minLength":1}` |
| `$.bands.additionalProperties.ranges[].oneOf[1].otherwise` | `unspecified` | Required in this object/branch |  | `#/properties/bands/additionalProperties/properties/ranges/items/oneOf/1/properties/otherwise` | `{"const":true}` |
| `$.bands.additionalProperties.ranges[].oneOf[1].additionalProperties` | `false` | Not required here |  | `#/properties/bands/additionalProperties/properties/ranges/items/oneOf/1/additionalProperties` | Boolean schema |
| `$.bands.additionalProperties.additionalProperties` | `false` | Not required here |  | `#/properties/bands/additionalProperties/additionalProperties` | Boolean schema |
| `$.bands.propertyNames` | `unspecified` | Not required here |  | `#/properties/bands/propertyNames` | `{"minLength":1}` |
| `$.bands.propertyNames.not` | `unspecified` | Not required here |  | `#/properties/bands/propertyNames/not` | `{"enum":["__proto__","constructor","prototype"]}` |
| `$.queries` | `object` | Not required here |  | `#/properties/queries` | `{}` |
| `$.queries.additionalProperties` | `object` | Not required here |  | `#/properties/queries/additionalProperties` | `{"required":["expression"]}` |
| `$.queries.additionalProperties.expression` | `string` | Required in this object/branch |  | `#/properties/queries/additionalProperties/properties/expression` | `{"minLength":1}` |
| `$.queries.additionalProperties.additionalProperties` | `false` | Not required here |  | `#/properties/queries/additionalProperties/additionalProperties` | Boolean schema |
| `$.queries.propertyNames` | `unspecified` | Not required here |  | `#/properties/queries/propertyNames` | `{"minLength":1}` |
| `$.queries.propertyNames.not` | `unspecified` | Not required here |  | `#/properties/queries/propertyNames/not` | `{"enum":["__proto__","constructor","prototype"]}` |
| `$.labelGroups` | `object` | Not required here |  | `#/properties/labelGroups` | `{}` |
| `$.labelGroups.additionalProperties` | `array` | Not required here |  | `#/properties/labelGroups/additionalProperties` | `{"minItems":1,"uniqueItems":true}` |
| `$.labelGroups.additionalProperties[]` | `string` | Not required here |  | `#/properties/labelGroups/additionalProperties/items` | `{"minLength":1}` |
| `$.labelGroups.propertyNames` | `unspecified` | Not required here |  | `#/properties/labelGroups/propertyNames` | `{"minLength":1}` |
| `$.labelGroups.propertyNames.not` | `unspecified` | Not required here |  | `#/properties/labelGroups/propertyNames/not` | `{"enum":["__proto__","constructor","prototype"]}` |
| `$.labelDefinitions` | `object` | Not required here |  | `#/properties/labelDefinitions` | `{}` |
| `$.labelDefinitions.additionalProperties` | `object` | Not required here |  | `#/properties/labelDefinitions/additionalProperties` | `{"required":["color","description"]}` |
| `$.labelDefinitions.additionalProperties.color` | `string` | Required in this object/branch |  | `#/properties/labelDefinitions/additionalProperties/properties/color` | `{"pattern":"^[0-9a-fA-F]{6}$"}` |
| `$.labelDefinitions.additionalProperties.description` | `string` | Required in this object/branch |  | `#/properties/labelDefinitions/additionalProperties/properties/description` | `{"maxLength":100}` |
| `$.labelDefinitions.additionalProperties.additionalProperties` | `false` | Not required here |  | `#/properties/labelDefinitions/additionalProperties/additionalProperties` | Boolean schema |
| `$.labelDefinitions.propertyNames` | `unspecified` | Not required here |  | `#/properties/labelDefinitions/propertyNames` | `{"minLength":1}` |
| `$.labelDefinitions.propertyNames.not` | `unspecified` | Not required here |  | `#/properties/labelDefinitions/propertyNames/not` | `{"enum":["__proto__","constructor","prototype"]}` |
| `$.rules` | `object` | Not required here |  | `#/properties/rules` | `{}` |
| `$.rules.additionalProperties` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties` | `{}` |
| `$.rules.additionalProperties.oneOf[0]` | `object` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0` | `{"required":["when"]}` |
| `$.rules.additionalProperties.oneOf[0].when` | `string` | Required in this object/branch |  | `#/properties/rules/additionalProperties/oneOf/0/properties/when` | `{"minLength":1}` |
| `$.rules.additionalProperties.oneOf[0].onUnknown` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/onUnknown` | `{"enum":["hold","fail"]}` |
| `$.rules.additionalProperties.oneOf[0].effects` | `object` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects` | `{"required":[]}` |
| `$.rules.additionalProperties.oneOf[0].effects.labels` | `object` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/labels` | `{"required":["add"]}` |
| `$.rules.additionalProperties.oneOf[0].effects.labels.add` | `array` | Required in this object/branch |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/labels/properties/add` | `{"minItems":1,"uniqueItems":true}` |
| `$.rules.additionalProperties.oneOf[0].effects.labels.add[]` | `string` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/labels/properties/add/items` | `{"minLength":1}` |
| `$.rules.additionalProperties.oneOf[0].effects.labels.removeWhenFalse` | `boolean` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/labels/properties/removeWhenFalse` | `{}` |
| `$.rules.additionalProperties.oneOf[0].effects.labels.additionalProperties` | `false` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/labels/additionalProperties` | Boolean schema |
| `$.rules.additionalProperties.oneOf[0].effects.comment` | `object` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment` | `{"required":["mode"]}` |
| `$.rules.additionalProperties.oneOf[0].effects.comment.mode` | `unspecified` | Required in this object/branch |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/properties/mode` | `{"enum":["create","once","upsert","once-per-transition"]}` |
| `$.rules.additionalProperties.oneOf[0].effects.comment.trigger` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/properties/trigger` | `{"enum":["always","matched","band-changed"]}` |
| `$.rules.additionalProperties.oneOf[0].effects.comment.template` | `string` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/properties/template` | `{}` |
| `$.rules.additionalProperties.oneOf[0].effects.comment.templateFile` | `string` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/properties/templateFile` | `{"minLength":1}` |
| `$.rules.additionalProperties.oneOf[0].effects.comment.additionalProperties` | `false` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/additionalProperties` | Boolean schema |
| `$.rules.additionalProperties.oneOf[0].effects.comment.oneOf[0]` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/oneOf/0` | `{"required":["template"]}` |
| `$.rules.additionalProperties.oneOf[0].effects.comment.oneOf[0].not` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/oneOf/0/not` | `{"required":["templateFile"]}` |
| `$.rules.additionalProperties.oneOf[0].effects.comment.oneOf[1]` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/oneOf/1` | `{"required":["templateFile"]}` |
| `$.rules.additionalProperties.oneOf[0].effects.comment.oneOf[1].not` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/properties/comment/oneOf/1/not` | `{"required":["template"]}` |
| `$.rules.additionalProperties.oneOf[0].effects.additionalProperties` | `false` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/properties/effects/additionalProperties` | Boolean schema |
| `$.rules.additionalProperties.oneOf[0].additionalProperties` | `false` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/0/additionalProperties` | Boolean schema |
| `$.rules.additionalProperties.oneOf[1]` | `object` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1` | `{"required":["band"]}` |
| `$.rules.additionalProperties.oneOf[1].band` | `string` | Required in this object/branch |  | `#/properties/rules/additionalProperties/oneOf/1/properties/band` | `{"minLength":1}` |
| `$.rules.additionalProperties.oneOf[1].onUnknown` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/onUnknown` | `{"enum":["hold","fail"]}` |
| `$.rules.additionalProperties.oneOf[1].effects` | `object` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects` | `{"required":[]}` |
| `$.rules.additionalProperties.oneOf[1].effects.labels` | `object` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels` | `{"required":["group","byBand"]}` |
| `$.rules.additionalProperties.oneOf[1].effects.labels.group` | `string` | Required in this object/branch |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/group` | `{"minLength":1}` |
| `$.rules.additionalProperties.oneOf[1].effects.labels.byBand` | `object` | Required in this object/branch |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/byBand` | `{}` |
| `$.rules.additionalProperties.oneOf[1].effects.labels.byBand.additionalProperties` | `string` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/byBand/additionalProperties` | `{"minLength":1}` |
| `$.rules.additionalProperties.oneOf[1].effects.labels.byBand.propertyNames` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/byBand/propertyNames` | `{"minLength":1}` |
| `$.rules.additionalProperties.oneOf[1].effects.labels.byBand.propertyNames.not` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/byBand/propertyNames/not` | `{"enum":["__proto__","constructor","prototype"]}` |
| `$.rules.additionalProperties.oneOf[1].effects.labels.unknown` | `string` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/properties/unknown` | `{"minLength":1}` |
| `$.rules.additionalProperties.oneOf[1].effects.labels.additionalProperties` | `false` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/labels/additionalProperties` | Boolean schema |
| `$.rules.additionalProperties.oneOf[1].effects.comment` | `object` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment` | `{"required":["mode"]}` |
| `$.rules.additionalProperties.oneOf[1].effects.comment.mode` | `unspecified` | Required in this object/branch |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/properties/mode` | `{"enum":["create","once","upsert","once-per-transition"]}` |
| `$.rules.additionalProperties.oneOf[1].effects.comment.trigger` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/properties/trigger` | `{"enum":["always","matched","band-changed"]}` |
| `$.rules.additionalProperties.oneOf[1].effects.comment.template` | `string` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/properties/template` | `{}` |
| `$.rules.additionalProperties.oneOf[1].effects.comment.templateFile` | `string` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/properties/templateFile` | `{"minLength":1}` |
| `$.rules.additionalProperties.oneOf[1].effects.comment.additionalProperties` | `false` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/additionalProperties` | Boolean schema |
| `$.rules.additionalProperties.oneOf[1].effects.comment.oneOf[0]` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/oneOf/0` | `{"required":["template"]}` |
| `$.rules.additionalProperties.oneOf[1].effects.comment.oneOf[0].not` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/oneOf/0/not` | `{"required":["templateFile"]}` |
| `$.rules.additionalProperties.oneOf[1].effects.comment.oneOf[1]` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/oneOf/1` | `{"required":["templateFile"]}` |
| `$.rules.additionalProperties.oneOf[1].effects.comment.oneOf[1].not` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/properties/comment/oneOf/1/not` | `{"required":["template"]}` |
| `$.rules.additionalProperties.oneOf[1].effects.additionalProperties` | `false` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/properties/effects/additionalProperties` | Boolean schema |
| `$.rules.additionalProperties.oneOf[1].additionalProperties` | `false` | Not required here |  | `#/properties/rules/additionalProperties/oneOf/1/additionalProperties` | Boolean schema |
| `$.rules.propertyNames` | `unspecified` | Not required here |  | `#/properties/rules/propertyNames` | `{"minLength":1}` |
| `$.rules.propertyNames.not` | `unspecified` | Not required here |  | `#/properties/rules/propertyNames/not` | `{"enum":["__proto__","constructor","prototype"]}` |
| `$.additionalProperties` | `false` | Not required here |  | `#/additionalProperties` | Boolean schema |

### query-result-v1.schema.json

[Canonical JSON Schema](../../../../src/diffdevil/contracts/schemas/query-result-v1.schema.json)

| Field / branch | Type | Requiredness | Description | Schema pointer | Constraints |
| --- | --- | --- | --- | --- | --- |
| `$` | `object` | Not required here |  | `#` | `{"required":["kind","schemaVersion","semantics","value","evidence"]}` |
| `$.kind` | `unspecified` | Required in this object/branch |  | `#/properties/kind` | `{"const":"diffdevil.query"}` |
| `$.schemaVersion` | `unspecified` | Required in this object/branch |  | `#/properties/schemaVersion` | `{"const":"1.0"}` |
| `$.semantics` | `object` | Required in this object/branch |  | `#/properties/semantics` | `{"required":["language","numbers","replacementLines","paths"]}` |
| `$.semantics.language` | `unspecified` | Required in this object/branch |  | `#/properties/semantics/properties/language` | `{"const":"diffdevil-expr/1"}` |
| `$.semantics.numbers` | `unspecified` | Required in this object/branch |  | `#/properties/semantics/properties/numbers` | `{"const":"diffdevil-number/1"}` |
| `$.semantics.replacementLines` | `unspecified` | Required in this object/branch |  | `#/properties/semantics/properties/replacementLines` | `{"const":"replacement-lines-v1"}` |
| `$.semantics.paths` | `unspecified` | Required in this object/branch |  | `#/properties/semantics/properties/paths` | `{"const":"diffdevil-glob/1"}` |
| `$.semantics.presets` | `array` | Not required here |  | `#/properties/semantics/properties/presets` | `{}` |
| `$.semantics.presets[]` | `string` | Not required here |  | `#/properties/semantics/properties/presets/items` | `{}` |
| `$.semantics.limits` | `string` | Not required here |  | `#/properties/semantics/properties/limits` | `{}` |
| `$.semantics.additionalProperties` | `true` | Not required here |  | `#/properties/semantics/additionalProperties` | Boolean schema |
| `$.reportId` | `string` | Not required here |  | `#/properties/reportId` | `{}` |
| `$.source` | `object` | Not required here |  | `#/properties/source` | `{"required":["kind","comparisonId"]}` |
| `$.source.kind` | `unspecified` | Required in this object/branch |  | `#/properties/source/properties/kind` | `{"enum":["git","unified-diff","github-api"]}` |
| `$.source.comparisonId` | `string` | Required in this object/branch |  | `#/properties/source/properties/comparisonId` | `{"minLength":1}` |
| `$.source.base` | `string` | Not required here |  | `#/properties/source/properties/base` | `{}` |
| `$.source.head` | `string` | Not required here |  | `#/properties/source/properties/head` | `{}` |
| `$.source.comparison` | `unspecified` | Not required here |  | `#/properties/source/properties/comparison` | `{"enum":["three-dot","direct","worktree","staged","supplied"]}` |
| `$.source.repository` | `string` | Not required here |  | `#/properties/source/properties/repository` | `{}` |
| `$.source.pullRequest` | `integer` | Not required here |  | `#/properties/source/properties/pullRequest` | `{"minimum":0,"maximum":9007199254740991}` |
| `$.source.additionalProperties` | `true` | Not required here |  | `#/properties/source/additionalProperties` | Boolean schema |
| `$.value` | `reference` | Required in this object/branch |  | `#/properties/value` | `{"$ref":"urn:diffdevil:values:1#/$defs/value"}` |
| `$.evidence` | `array` | Required in this object/branch |  | `#/properties/evidence` | `{}` |
| `$.evidence[]` | `object` | Not required here |  | `#/properties/evidence/items` | `{"required":["code"]}` |
| `$.evidence[].code` | `string` | Required in this object/branch |  | `#/properties/evidence/items/properties/code` | `{"minLength":1}` |
| `$.evidence[].subject` | `string` | Not required here |  | `#/properties/evidence/items/properties/subject` | `{}` |
| `$.evidence[].message` | `string` | Not required here |  | `#/properties/evidence/items/properties/message` | `{}` |
| `$.evidence[].additionalProperties` | `true` | Not required here |  | `#/properties/evidence/items/additionalProperties` | Boolean schema |
| `$.additionalProperties` | `true` | Not required here |  | `#/additionalProperties` | Boolean schema |

### report-v1.schema.json

[Canonical JSON Schema](../../../../src/diffdevil/contracts/schemas/report-v1.schema.json)

| Field / branch | Type | Requiredness | Description | Schema pointer | Constraints |
| --- | --- | --- | --- | --- | --- |
| `$` | `object` | Not required here | Reader accepts additive fields; executable reader must additionally validate supported semantics, integer counts, paths, evidence identities, completeness, and references. | `#` | `{"required":["kind","schemaVersion","semantics","source","measurement","fileSet","totals","files"],"dependentRequired":{"metrics":["metricTypes"],"metricTypes":["metrics"]}}` |
| `$.kind` | `unspecified` | Required in this object/branch |  | `#/properties/kind` | `{"const":"diffdevil.report"}` |
| `$.schemaVersion` | `unspecified` | Required in this object/branch |  | `#/properties/schemaVersion` | `{"const":"1.0"}` |
| `$.semantics` | `object` | Required in this object/branch |  | `#/properties/semantics` | `{"required":["language","numbers","replacementLines","paths"]}` |
| `$.semantics.language` | `unspecified` | Required in this object/branch |  | `#/properties/semantics/properties/language` | `{"const":"diffdevil-expr/1"}` |
| `$.semantics.numbers` | `unspecified` | Required in this object/branch |  | `#/properties/semantics/properties/numbers` | `{"const":"diffdevil-number/1"}` |
| `$.semantics.replacementLines` | `unspecified` | Required in this object/branch |  | `#/properties/semantics/properties/replacementLines` | `{"const":"replacement-lines-v1"}` |
| `$.semantics.paths` | `unspecified` | Required in this object/branch |  | `#/properties/semantics/properties/paths` | `{"const":"diffdevil-glob/1"}` |
| `$.semantics.presets` | `array` | Not required here |  | `#/properties/semantics/properties/presets` | `{}` |
| `$.semantics.presets[]` | `string` | Not required here |  | `#/properties/semantics/properties/presets/items` | `{}` |
| `$.semantics.limits` | `string` | Not required here |  | `#/properties/semantics/properties/limits` | `{}` |
| `$.semantics.additionalProperties` | `true` | Not required here |  | `#/properties/semantics/additionalProperties` | Boolean schema |
| `$.source` | `object` | Required in this object/branch |  | `#/properties/source` | `{"required":["kind","comparisonId"]}` |
| `$.source.kind` | `unspecified` | Required in this object/branch |  | `#/properties/source/properties/kind` | `{"enum":["git","unified-diff","github-api"]}` |
| `$.source.comparisonId` | `string` | Required in this object/branch |  | `#/properties/source/properties/comparisonId` | `{"minLength":1}` |
| `$.source.base` | `string` | Not required here |  | `#/properties/source/properties/base` | `{}` |
| `$.source.head` | `string` | Not required here |  | `#/properties/source/properties/head` | `{}` |
| `$.source.comparison` | `unspecified` | Not required here |  | `#/properties/source/properties/comparison` | `{"enum":["three-dot","direct","worktree","staged","supplied"]}` |
| `$.source.repository` | `string` | Not required here |  | `#/properties/source/properties/repository` | `{}` |
| `$.source.pullRequest` | `integer` | Not required here |  | `#/properties/source/properties/pullRequest` | `{"minimum":0,"maximum":9007199254740991}` |
| `$.source.baseTip` | `string` | Not required here | Current pull-request base tip when a Git three-dot diff begins at an older merge base. | `#/properties/source/properties/baseTip` | `{}` |
| `$.source.additionalProperties` | `true` | Not required here |  | `#/properties/source/additionalProperties` | Boolean schema |
| `$.measurement` | `object` | Required in this object/branch |  | `#/properties/measurement` | `{"required":["status","reasons"]}` |
| `$.measurement.status` | `unspecified` | Required in this object/branch |  | `#/properties/measurement/properties/status` | `{"enum":["exact","bounded","unknown","unmeasurable"]}` |
| `$.measurement.reasons` | `array` | Required in this object/branch |  | `#/properties/measurement/properties/reasons` | `{}` |
| `$.measurement.reasons[]` | `object` | Not required here |  | `#/properties/measurement/properties/reasons/items` | `{"required":["code"]}` |
| `$.measurement.reasons[].code` | `string` | Required in this object/branch |  | `#/properties/measurement/properties/reasons/items/properties/code` | `{"minLength":1}` |
| `$.measurement.reasons[].subject` | `string` | Not required here |  | `#/properties/measurement/properties/reasons/items/properties/subject` | `{}` |
| `$.measurement.reasons[].message` | `string` | Not required here |  | `#/properties/measurement/properties/reasons/items/properties/message` | `{}` |
| `$.measurement.reasons[].additionalProperties` | `true` | Not required here |  | `#/properties/measurement/properties/reasons/items/additionalProperties` | Boolean schema |
| `$.measurement.additionalProperties` | `true` | Not required here |  | `#/properties/measurement/additionalProperties` | Boolean schema |
| `$.fileSet` | `object` | Required in this object/branch |  | `#/properties/fileSet` | `{"required":["complete","total"]}` |
| `$.fileSet.complete` | `boolean` | Required in this object/branch |  | `#/properties/fileSet/properties/complete` | `{}` |
| `$.fileSet.total` | `reference` | Required in this object/branch |  | `#/properties/fileSet/properties/total` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.fileSet.additionalProperties` | `true` | Not required here |  | `#/properties/fileSet/additionalProperties` | Boolean schema |
| `$.totals` | `object` | Required in this object/branch |  | `#/properties/totals` | `{"required":["raw","lines","files"]}` |
| `$.totals.raw` | `object` | Required in this object/branch |  | `#/properties/totals/properties/raw` | `{"required":["added","deleted","churn"]}` |
| `$.totals.raw.added` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/raw/properties/added` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.raw.deleted` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/raw/properties/deleted` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.raw.churn` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/raw/properties/churn` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.raw.additionalProperties` | `true` | Not required here |  | `#/properties/totals/properties/raw/additionalProperties` | Boolean schema |
| `$.totals.lines` | `object` | Required in this object/branch |  | `#/properties/totals/properties/lines` | `{"required":["added","deleted","modified","changed"]}` |
| `$.totals.lines.added` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/lines/properties/added` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.lines.deleted` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/lines/properties/deleted` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.lines.modified` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/lines/properties/modified` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.lines.changed` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/lines/properties/changed` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.lines.additionalProperties` | `true` | Not required here |  | `#/properties/totals/properties/lines/additionalProperties` | Boolean schema |
| `$.totals.files` | `object` | Required in this object/branch |  | `#/properties/totals/properties/files` | `{"required":["total","included","excluded","added","deleted","modified","renamed","copied","binary","unmeasurable"]}` |
| `$.totals.files.total` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/files/properties/total` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.files.included` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/files/properties/included` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.files.excluded` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/files/properties/excluded` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.files.added` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/files/properties/added` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.files.deleted` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/files/properties/deleted` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.files.modified` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/files/properties/modified` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.files.renamed` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/files/properties/renamed` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.files.copied` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/files/properties/copied` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.files.binary` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/files/properties/binary` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.files.unmeasurable` | `reference` | Required in this object/branch |  | `#/properties/totals/properties/files/properties/unmeasurable` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.totals.files.additionalProperties` | `true` | Not required here |  | `#/properties/totals/properties/files/additionalProperties` | Boolean schema |
| `$.totals.additionalProperties` | `true` | Not required here |  | `#/properties/totals/additionalProperties` | Boolean schema |
| `$.files` | `array` | Required in this object/branch |  | `#/properties/files` | `{}` |
| `$.files[]` | `object` | Not required here |  | `#/properties/files/items` | `{"required":["id","path","changeType","kind","included","raw","lines","measurement"]}` |
| `$.files[].id` | `string` | Required in this object/branch |  | `#/properties/files/items/properties/id` | `{"minLength":1}` |
| `$.files[].path` | `string` | Required in this object/branch |  | `#/properties/files/items/properties/path` | `{"minLength":1}` |
| `$.files[].oldPath` | `string` | Not required here |  | `#/properties/files/items/properties/oldPath` | `{}` |
| `$.files[].changeType` | `unspecified` | Required in this object/branch |  | `#/properties/files/items/properties/changeType` | `{"enum":["added","deleted","modified","renamed","copied","type-changed","unmerged"]}` |
| `$.files[].kind` | `unspecified` | Required in this object/branch |  | `#/properties/files/items/properties/kind` | `{"enum":["text","binary","submodule","unknown"]}` |
| `$.files[].included` | `boolean` | Required in this object/branch |  | `#/properties/files/items/properties/included` | `{}` |
| `$.files[].raw` | `object` | Required in this object/branch |  | `#/properties/files/items/properties/raw` | `{"required":["added","deleted","churn"]}` |
| `$.files[].raw.added` | `reference` | Required in this object/branch |  | `#/properties/files/items/properties/raw/properties/added` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.files[].raw.deleted` | `reference` | Required in this object/branch |  | `#/properties/files/items/properties/raw/properties/deleted` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.files[].raw.churn` | `reference` | Required in this object/branch |  | `#/properties/files/items/properties/raw/properties/churn` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.files[].raw.additionalProperties` | `true` | Not required here |  | `#/properties/files/items/properties/raw/additionalProperties` | Boolean schema |
| `$.files[].lines` | `object` | Required in this object/branch |  | `#/properties/files/items/properties/lines` | `{"required":["added","deleted","modified","changed"]}` |
| `$.files[].lines.added` | `reference` | Required in this object/branch |  | `#/properties/files/items/properties/lines/properties/added` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.files[].lines.deleted` | `reference` | Required in this object/branch |  | `#/properties/files/items/properties/lines/properties/deleted` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.files[].lines.modified` | `reference` | Required in this object/branch |  | `#/properties/files/items/properties/lines/properties/modified` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.files[].lines.changed` | `reference` | Required in this object/branch |  | `#/properties/files/items/properties/lines/properties/changed` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.files[].lines.additionalProperties` | `true` | Not required here |  | `#/properties/files/items/properties/lines/additionalProperties` | Boolean schema |
| `$.files[].measurement` | `object` | Required in this object/branch |  | `#/properties/files/items/properties/measurement` | `{"required":["status","reasons"]}` |
| `$.files[].measurement.status` | `unspecified` | Required in this object/branch |  | `#/properties/files/items/properties/measurement/properties/status` | `{"enum":["exact","bounded","unknown","unmeasurable"]}` |
| `$.files[].measurement.reasons` | `array` | Required in this object/branch |  | `#/properties/files/items/properties/measurement/properties/reasons` | `{}` |
| `$.files[].measurement.reasons[]` | `object` | Not required here |  | `#/properties/files/items/properties/measurement/properties/reasons/items` | `{"required":["code"]}` |
| `$.files[].measurement.reasons[].code` | `string` | Required in this object/branch |  | `#/properties/files/items/properties/measurement/properties/reasons/items/properties/code` | `{"minLength":1}` |
| `$.files[].measurement.reasons[].subject` | `string` | Not required here |  | `#/properties/files/items/properties/measurement/properties/reasons/items/properties/subject` | `{}` |
| `$.files[].measurement.reasons[].message` | `string` | Not required here |  | `#/properties/files/items/properties/measurement/properties/reasons/items/properties/message` | `{}` |
| `$.files[].measurement.reasons[].additionalProperties` | `true` | Not required here |  | `#/properties/files/items/properties/measurement/properties/reasons/items/additionalProperties` | Boolean schema |
| `$.files[].measurement.additionalProperties` | `true` | Not required here |  | `#/properties/files/items/properties/measurement/additionalProperties` | Boolean schema |
| `$.files[].inclusionReasons` | `array` | Not required here |  | `#/properties/files/items/properties/inclusionReasons` | `{}` |
| `$.files[].inclusionReasons[]` | `object` | Not required here |  | `#/properties/files/items/properties/inclusionReasons/items` | `{"required":["code"]}` |
| `$.files[].inclusionReasons[].code` | `string` | Required in this object/branch |  | `#/properties/files/items/properties/inclusionReasons/items/properties/code` | `{"minLength":1}` |
| `$.files[].inclusionReasons[].subject` | `string` | Not required here |  | `#/properties/files/items/properties/inclusionReasons/items/properties/subject` | `{}` |
| `$.files[].inclusionReasons[].message` | `string` | Not required here |  | `#/properties/files/items/properties/inclusionReasons/items/properties/message` | `{}` |
| `$.files[].inclusionReasons[].additionalProperties` | `true` | Not required here |  | `#/properties/files/items/properties/inclusionReasons/items/additionalProperties` | Boolean schema |
| `$.files[].family` | `object` | Not required here |  | `#/properties/files/items/properties/family` | `{"required":["id","rawCountsExact","blocksComplete"]}` |
| `$.files[].family.id` | `string` | Required in this object/branch |  | `#/properties/files/items/properties/family/properties/id` | `{"minLength":1}` |
| `$.files[].family.rawCountsExact` | `boolean` | Required in this object/branch |  | `#/properties/files/items/properties/family/properties/rawCountsExact` | `{}` |
| `$.files[].family.blocksComplete` | `boolean` | Required in this object/branch |  | `#/properties/files/items/properties/family/properties/blocksComplete` | `{}` |
| `$.files[].family.additionalProperties` | `true` | Not required here |  | `#/properties/files/items/properties/family/additionalProperties` | Boolean schema |
| `$.files[].additionalProperties` | `true` | Not required here |  | `#/properties/files/items/additionalProperties` | Boolean schema |
| `$.metrics` | `object` | Not required here |  | `#/properties/metrics` | `{}` |
| `$.metrics.additionalProperties` | `reference` | Not required here |  | `#/properties/metrics/additionalProperties` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.metrics.propertyNames` | `unspecified` | Not required here |  | `#/properties/metrics/propertyNames` | `{"minLength":1}` |
| `$.metrics.propertyNames.not` | `unspecified` | Not required here |  | `#/properties/metrics/propertyNames/not` | `{"enum":["__proto__","constructor","prototype"]}` |
| `$.bands` | `object` | Not required here |  | `#/properties/bands` | `{}` |
| `$.bands.additionalProperties` | `unspecified` | Not required here |  | `#/properties/bands/additionalProperties` | `{}` |
| `$.bands.additionalProperties.oneOf[0]` | `object` | Not required here |  | `#/properties/bands/additionalProperties/oneOf/0` | `{"required":["status","id"]}` |
| `$.bands.additionalProperties.oneOf[0].status` | `unspecified` | Required in this object/branch |  | `#/properties/bands/additionalProperties/oneOf/0/properties/status` | `{"const":"resolved"}` |
| `$.bands.additionalProperties.oneOf[0].id` | `string` | Required in this object/branch |  | `#/properties/bands/additionalProperties/oneOf/0/properties/id` | `{"minLength":1}` |
| `$.bands.additionalProperties.oneOf[0].lower` | `number` | Not required here |  | `#/properties/bands/additionalProperties/oneOf/0/properties/lower` | `{"minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}` |
| `$.bands.additionalProperties.oneOf[0].upper` | `number` | Not required here |  | `#/properties/bands/additionalProperties/oneOf/0/properties/upper` | `{"minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}` |
| `$.bands.additionalProperties.oneOf[0].additionalProperties` | `true` | Not required here |  | `#/properties/bands/additionalProperties/oneOf/0/additionalProperties` | Boolean schema |
| `$.bands.additionalProperties.oneOf[1]` | `object` | Not required here |  | `#/properties/bands/additionalProperties/oneOf/1` | `{"required":["status","candidates","reasons"]}` |
| `$.bands.additionalProperties.oneOf[1].status` | `unspecified` | Required in this object/branch |  | `#/properties/bands/additionalProperties/oneOf/1/properties/status` | `{"const":"unknown"}` |
| `$.bands.additionalProperties.oneOf[1].candidates` | `array` | Required in this object/branch |  | `#/properties/bands/additionalProperties/oneOf/1/properties/candidates` | `{}` |
| `$.bands.additionalProperties.oneOf[1].candidates[]` | `string` | Not required here |  | `#/properties/bands/additionalProperties/oneOf/1/properties/candidates/items` | `{}` |
| `$.bands.additionalProperties.oneOf[1].reasons` | `array` | Required in this object/branch |  | `#/properties/bands/additionalProperties/oneOf/1/properties/reasons` | `{"minItems":1}` |
| `$.bands.additionalProperties.oneOf[1].reasons[]` | `object` | Not required here |  | `#/properties/bands/additionalProperties/oneOf/1/properties/reasons/items` | `{"required":["code"]}` |
| `$.bands.additionalProperties.oneOf[1].reasons[].code` | `string` | Required in this object/branch |  | `#/properties/bands/additionalProperties/oneOf/1/properties/reasons/items/properties/code` | `{"minLength":1}` |
| `$.bands.additionalProperties.oneOf[1].reasons[].subject` | `string` | Not required here |  | `#/properties/bands/additionalProperties/oneOf/1/properties/reasons/items/properties/subject` | `{}` |
| `$.bands.additionalProperties.oneOf[1].reasons[].message` | `string` | Not required here |  | `#/properties/bands/additionalProperties/oneOf/1/properties/reasons/items/properties/message` | `{}` |
| `$.bands.additionalProperties.oneOf[1].reasons[].additionalProperties` | `true` | Not required here |  | `#/properties/bands/additionalProperties/oneOf/1/properties/reasons/items/additionalProperties` | Boolean schema |
| `$.bands.additionalProperties.oneOf[1].additionalProperties` | `true` | Not required here |  | `#/properties/bands/additionalProperties/oneOf/1/additionalProperties` | Boolean schema |
| `$.bands.additionalProperties.oneOf[1].not` | `unspecified` | Not required here |  | `#/properties/bands/additionalProperties/oneOf/1/not` | `{"required":["id"]}` |
| `$.bands.propertyNames` | `unspecified` | Not required here |  | `#/properties/bands/propertyNames` | `{"minLength":1}` |
| `$.bands.propertyNames.not` | `unspecified` | Not required here |  | `#/properties/bands/propertyNames/not` | `{"enum":["__proto__","constructor","prototype"]}` |
| `$.rules` | `object` | Not required here |  | `#/properties/rules` | `{}` |
| `$.rules.additionalProperties` | `object` | Not required here |  | `#/properties/rules/additionalProperties` | `{"required":["disposition"]}` |
| `$.rules.additionalProperties.decision` | `reference` | Not required here |  | `#/properties/rules/additionalProperties/properties/decision` | `{"$ref":"urn:diffdevil:values:1#/$defs/decision"}` |
| `$.rules.additionalProperties.band` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/properties/band` | `{}` |
| `$.rules.additionalProperties.band.oneOf[0]` | `object` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/0` | `{"required":["status","id"]}` |
| `$.rules.additionalProperties.band.oneOf[0].status` | `unspecified` | Required in this object/branch |  | `#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/status` | `{"const":"resolved"}` |
| `$.rules.additionalProperties.band.oneOf[0].id` | `string` | Required in this object/branch |  | `#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/id` | `{"minLength":1}` |
| `$.rules.additionalProperties.band.oneOf[0].lower` | `number` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/lower` | `{"minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}` |
| `$.rules.additionalProperties.band.oneOf[0].upper` | `number` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/0/properties/upper` | `{"minimum":-1.7976931348623157e+308,"maximum":1.7976931348623157e+308}` |
| `$.rules.additionalProperties.band.oneOf[0].additionalProperties` | `true` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/0/additionalProperties` | Boolean schema |
| `$.rules.additionalProperties.band.oneOf[1]` | `object` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1` | `{"required":["status","candidates","reasons"]}` |
| `$.rules.additionalProperties.band.oneOf[1].status` | `unspecified` | Required in this object/branch |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/status` | `{"const":"unknown"}` |
| `$.rules.additionalProperties.band.oneOf[1].candidates` | `array` | Required in this object/branch |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/candidates` | `{}` |
| `$.rules.additionalProperties.band.oneOf[1].candidates[]` | `string` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/candidates/items` | `{}` |
| `$.rules.additionalProperties.band.oneOf[1].reasons` | `array` | Required in this object/branch |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons` | `{"minItems":1}` |
| `$.rules.additionalProperties.band.oneOf[1].reasons[]` | `object` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items` | `{"required":["code"]}` |
| `$.rules.additionalProperties.band.oneOf[1].reasons[].code` | `string` | Required in this object/branch |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/properties/code` | `{"minLength":1}` |
| `$.rules.additionalProperties.band.oneOf[1].reasons[].subject` | `string` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/properties/subject` | `{}` |
| `$.rules.additionalProperties.band.oneOf[1].reasons[].message` | `string` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/properties/message` | `{}` |
| `$.rules.additionalProperties.band.oneOf[1].reasons[].additionalProperties` | `true` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/properties/reasons/items/additionalProperties` | Boolean schema |
| `$.rules.additionalProperties.band.oneOf[1].additionalProperties` | `true` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/additionalProperties` | Boolean schema |
| `$.rules.additionalProperties.band.oneOf[1].not` | `unspecified` | Not required here |  | `#/properties/rules/additionalProperties/properties/band/oneOf/1/not` | `{"required":["id"]}` |
| `$.rules.additionalProperties.disposition` | `unspecified` | Required in this object/branch |  | `#/properties/rules/additionalProperties/properties/disposition` | `{"enum":["matched","unmatched","held","fallback"]}` |
| `$.rules.additionalProperties.additionalProperties` | `true` | Not required here |  | `#/properties/rules/additionalProperties/additionalProperties` | Boolean schema |
| `$.rules.propertyNames` | `unspecified` | Not required here |  | `#/properties/rules/propertyNames` | `{"minLength":1}` |
| `$.rules.propertyNames.not` | `unspecified` | Not required here |  | `#/properties/rules/propertyNames/not` | `{"enum":["__proto__","constructor","prototype"]}` |
| `$.scopes` | `object` | Not required here |  | `#/properties/scopes` | `{}` |
| `$.scopes.additionalProperties` | `object` | Not required here |  | `#/properties/scopes/additionalProperties` | `{"required":["fileIds","fileSet","totals"]}` |
| `$.scopes.additionalProperties.fileIds` | `array` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/fileIds` | `{"uniqueItems":true}` |
| `$.scopes.additionalProperties.fileIds[]` | `string` | Not required here |  | `#/properties/scopes/additionalProperties/properties/fileIds/items` | `{}` |
| `$.scopes.additionalProperties.fileSet` | `object` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/fileSet` | `{"required":["complete","total"]}` |
| `$.scopes.additionalProperties.fileSet.complete` | `boolean` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/fileSet/properties/complete` | `{}` |
| `$.scopes.additionalProperties.fileSet.total` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/fileSet/properties/total` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.fileSet.additionalProperties` | `true` | Not required here |  | `#/properties/scopes/additionalProperties/properties/fileSet/additionalProperties` | Boolean schema |
| `$.scopes.additionalProperties.totals` | `object` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals` | `{"required":["raw","lines","files"]}` |
| `$.scopes.additionalProperties.totals.raw` | `object` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/raw` | `{"required":["added","deleted","churn"]}` |
| `$.scopes.additionalProperties.totals.raw.added` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/raw/properties/added` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.totals.raw.deleted` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/raw/properties/deleted` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.totals.raw.churn` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/raw/properties/churn` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.totals.raw.additionalProperties` | `true` | Not required here |  | `#/properties/scopes/additionalProperties/properties/totals/properties/raw/additionalProperties` | Boolean schema |
| `$.scopes.additionalProperties.totals.lines` | `object` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/lines` | `{"required":["added","deleted","modified","changed"]}` |
| `$.scopes.additionalProperties.totals.lines.added` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/lines/properties/added` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.totals.lines.deleted` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/lines/properties/deleted` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.totals.lines.modified` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/lines/properties/modified` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.totals.lines.changed` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/lines/properties/changed` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.totals.lines.additionalProperties` | `true` | Not required here |  | `#/properties/scopes/additionalProperties/properties/totals/properties/lines/additionalProperties` | Boolean schema |
| `$.scopes.additionalProperties.totals.files` | `object` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/files` | `{"required":["included","added","deleted","modified","renamed","copied","binary","unmeasurable"]}` |
| `$.scopes.additionalProperties.totals.files.included` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/files/properties/included` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.totals.files.added` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/files/properties/added` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.totals.files.deleted` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/files/properties/deleted` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.totals.files.modified` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/files/properties/modified` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.totals.files.renamed` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/files/properties/renamed` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.totals.files.copied` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/files/properties/copied` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.totals.files.binary` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/files/properties/binary` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.totals.files.unmeasurable` | `reference` | Required in this object/branch |  | `#/properties/scopes/additionalProperties/properties/totals/properties/files/properties/unmeasurable` | `{"$ref":"urn:diffdevil:values:1#/$defs/measurement"}` |
| `$.scopes.additionalProperties.totals.files.additionalProperties` | `true` | Not required here |  | `#/properties/scopes/additionalProperties/properties/totals/properties/files/additionalProperties` | Boolean schema |
| `$.scopes.additionalProperties.totals.additionalProperties` | `true` | Not required here |  | `#/properties/scopes/additionalProperties/properties/totals/additionalProperties` | Boolean schema |
| `$.scopes.additionalProperties.additionalProperties` | `true` | Not required here |  | `#/properties/scopes/additionalProperties/additionalProperties` | Boolean schema |
| `$.scopes.propertyNames` | `unspecified` | Not required here |  | `#/properties/scopes/propertyNames` | `{"minLength":1}` |
| `$.scopes.propertyNames.not` | `unspecified` | Not required here |  | `#/properties/scopes/propertyNames/not` | `{"enum":["__proto__","constructor","prototype"]}` |
| `$.policyId` | `string` | Not required here |  | `#/properties/policyId` | `{}` |
| `$.reportId` | `string` | Not required here |  | `#/properties/reportId` | `{}` |
| `$.producer` | `object` | Not required here |  | `#/properties/producer` | `{"required":[]}` |
| `$.producer.name` | `string` | Not required here |  | `#/properties/producer/properties/name` | `{}` |
| `$.producer.version` | `string` | Not required here |  | `#/properties/producer/properties/version` | `{}` |
| `$.producer.additionalProperties` | `true` | Not required here |  | `#/properties/producer/additionalProperties` | Boolean schema |
| `$.metricTypes` | `object` | Not required here |  | `#/properties/metricTypes` | `{}` |
| `$.metricTypes.additionalProperties` | `unspecified` | Not required here |  | `#/properties/metricTypes/additionalProperties` | `{"enum":["integer","float"]}` |
| `$.additionalProperties` | `true` | Not required here |  | `#/additionalProperties` | Boolean schema |
<!-- /manual:generated schemas -->

## Structural versus semantic reading

The public `validateSchema` API checks product-owned structural families and freezes
inert data. Use `readReport`, `readPlan` and policy compilation for their additional
semantic obligations. For expression AST/value transport, syntax/type/environment
validation still belongs to the binder/evaluator. A TypeScript assertion does none
of these checks.

Tests exercise complete valid specimens and structurally allowed but relationally
invalid report bounds, policy references and plan identity. Errors stay with their
own family/phase. They do not become default settings, zero values or valid holds.
No schema alone proves provider freshness, comment ownership, arithmetic identities
or a hosted consumer journey.

## Transport distinctions

`analyze --format jsonl` has a typed header, observed file records and a required
final summary. An interrupted stream lacking that summary is incomplete. Query JSONL
instead emits a strict determined collection as plain values, without report headers;
it cannot carry unresolved membership.

Action compact summary kinds are `diffdevil.action-report-summary`,
`diffdevil.action-plan-summary` and `diffdevil.action-effects-summary`, version `1.0`.
Their paths refer to full artifacts. They are not accepted by full report/plan
readers. Human, agent, Markdown, env and strict scalar formats each have their own
information boundary; changing presentation does not create stronger evidence.

## Forward reading and strict execution

Within a supported report major, readers can accept additive fields while validating
the fields and semantic identities they use. An unknown measurement state or a source
kind changing comparison semantics is not merely cosmetic addition. Configuration
and plan execution remain strict; ignoring an unknown effect can violate desired state.

A profile must not silently change precedence, promotion, empty-collection meaning,
truthiness, unknown handling, path semantics or observable proof precision. Turning
an unresolved rule into a resolved write can be a semantic change even when the
implementation calls it an optimization. A defect fix restores the selected contract;
it is not permission to redefine the contract under the same identifier.

## Migration standing

Persist original expressions/policies, declared identities and canonical artifacts.
Do not persist parser CSTs, closures, VM instructions or fabricated compiled handles
as portable executable data. Caches are disposable and bound to implementation.

No current `migrate` command is implemented. A future migration interface would
produce a reviewable candidate and explain semantic choices; analyze/query/apply do
not rewrite configuration silently. Pre-release provisional names are not an excuse
to invent compatibility adapters, while an actual released consumer requires an
explicit supported-profile or migration policy. The [interface reference](../README.md)
identifies the actual operation to qualify; this manual publication does not itself
release a package, move a tag or certify an old saved artifact.
