# Language and contracts

Choose the contract for the object you have. Policy configuration, an expression,
a report, a selected query value and a desired plan are related, but they are not
one interchangeable JSON shape or one phase of execution.

## Which contract owns the question

| Object | Contract and reader job |
| --- | --- |
| JSON/YAML policy | Strict configuration schema, preset expansion, declaration replacement, typed parameters and compilation. |
| detail expression | `diffdevil-expr/1`, its numeric/path profiles, static environment and deterministic evaluation. |
| Report | Observed comparison, measurements, file-set completeness and compatible policy results; structural and relational reading. |
| Query | One typed selected value, including optional values and uncertain collection membership. |
| Plan | Desired/materialized operation data with identities, held decisions and target; not provider authorization. |
| Action summary | Compact host output linked to full runner files, not a report or plan substitute. |

Start with [Schemas and compatibility](schemas-and-compatibility.md) for envelopes,
fields and readers. Use [detail language](detail-language.md) for syntax, types,
operators and function semantics. The [policy chapters](../../policy/README.md)
teach the ordinary progression without requiring the full grammar first.

## Configuration has phases

Parsing JSON or YAML creates inert source with locations. Preset expansion and
host layering choose effective declarations. Binding resolves names and typed
parameters; type/dependency checks reject invalid references and cycles. Validation
checks all declarations, even if a later query would not evaluate them.

A later declaration with the same ID replaces the whole declaration, not arbitrary
nested pieces of its predecessor. Lists replace except for documented invocation
append modes. `presets: []` opts out before expansion. An unknown key or an unreadable
explicitly selected file is an error, not silent inheritance. Current size convenience
maps still require complete threshold or label sets.

## Expressions have phases too

Metrics read facts, scopes, parameters and metric dependencies. Bands consume
numeric values. Conditions may read completed band results but do not create cycles
through other rules. Queries and templates can inspect completed rule results.
`analyze` and rules-phase evaluation are different operations; a query calculates
its required dependencies rather than triggering every effect.

Expressions are data, not JavaScript. Compiling valid syntax does not establish that
a needed report context exists. A missing context is a binding/availability problem;
an unknown measurement inside an available context is an evidence state. Preserve
the phase and original span when reporting the distinction.

## Identities are independent

The package version identifies distribution, the preset identifies selected default
meaning, the language identifies expression semantics, the number/path/replacement
profiles identify their domains, the limit profile identifies deterministic budgets,
and schema versions identify transport. An Action major and Skill release are
additional host/distribution identities, not aliases for the language version.

The [profile table](schemas-and-compatibility.md#version-identities) lists exact
metadata, including its historical design standing. Current implementation evidence
comes from the corresponding executable and contracts, not a stale design-status
sentence promoted into a claim that the language is unimplemented.

## Envelopes do not grant execution

A valid report can retain incomplete evidence. A valid query can be unknown.
A valid plan can be held. An additive field readable by a compatible report reader
is not necessarily an unknown operation safe to ignore during application. An
artifact hash connects bytes; it does not authenticate a carrier or grant a write.

Use structured diagnostics for invalid input and typed evidence for valid uncertainty.
Limits produce errors rather than partial fabricated results, and acquisition
limits remain distinct from evaluator budgets. No automatic migration command
rewrites configuration while analyzing. Enter the exact [interface reference](../README.md)
for the host's reader, output and process semantics.
