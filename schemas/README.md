# diffdevil structural schemas

## Meaning

These Draft 2020-12 schemas define the selected configuration, report, query-result, and plan shapes. They are authored groundwork for validators and editors. They do not replace expression parsing, type checking, metric graph analysis, evidence validation, or provider trust checks.

## Schemas

- [Policy](policy-v1.schema.json): strict authored configuration, with defaults/presets applied by the policy compiler rather than a schema mutation feature.
- [Report](report-v1.schema.json): complete normalized report; additive fields are readable, but unsupported semantic values remain errors.
- [Query result](query-result-v1.schema.json): typed lossless result, including unresolved membership and optional presence.
- [Plan](plan-v1.schema.json): closed known effect operations, desired/materialized standing, target and source identity.
- [Typed values](../spec/detail/v1/values.schema.json): numeric evidence, decisions, and recursive query values.
- [Internal AST](../spec/detail/v1/ast.schema.json): compiler/test structure, not a public persisted program.

Schema IDs are URNs resolved to these packaged files. No network fetch is necessary. Build-time standalone validator generation is appropriate for these fixed trusted schemas. Schema validation must not coerce values, remove unknown fields, fill defaults that change authored meaning, or execute user-provided schemas.

## Additional semantic checks

The compiler/reader checks ordered non-singleton bounds; safe integer categories; exact measurement invariants; primitive-family applicability; file ID uniqueness; normalized paths and canonical order; fileSet/cardinality consistency; scope membership and references; parameter defaults; declaration names; metric dependencies/cycles; expression types; band cut-point ordering and final otherwise; label group mappings; effect conflicts; template ownership; and source/policy freshness for apply.

A schema-valid complete report with a total different from its observed files is still invalid. A schema-valid band list with descending cut points is still invalid. A schema-valid plan whose head is stale or whose provenance is untrusted cannot be applied.

The package's qualification evidence states which structural and semantic asset checks were performed and which require the future runtime.
