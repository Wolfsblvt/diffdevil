# Interfaces

Choose the contract for the consumer you are building. CLI commands, Action step
inputs, TypeScript calls and serialized artifacts use the same measurements and
policy engine, but they do not have interchangeable transport or success rules.

## Choose by the operation

| You need to… | Read | Do not substitute |
| --- | --- | --- |
| Run a command or consume stdout and exit status | [CLI commands and output formats](cli.md) | A human transcript for a canonical data format. |
| Configure a workflow step or carry results between jobs | [GitHub Actions reference](github-actions.md) | Compact step outputs for a full report or plan. |
| Embed analysis, compile policy or apply through a host adapter | [TypeScript API reference](typescript-api.md) | Internal imports or a cast for a validated opaque handle. |
| Validate or retain structured data | [Schemas and compatibility](language-and-contracts/schemas-and-compatibility.md) | Schema success for relational validity, freshness or authority. |
| Write or inspect an expression | [detail language](language-and-contracts/detail-language.md) | JavaScript evaluation or interpolated host strings. |

For your first working journey, start with [Surfaces](../use/README.md), not an
exhaustive option list. Use this family when the exact argument, field, type,
version or failure behavior matters.

## Reading output is not replayable data

Human and agent output are reading interfaces. They preserve useful evidence but
are not full report or plan transports. Canonical report JSON retains observed
files, identities, measurements and compatible results. Query JSON carries a typed
selected value, including uncertain membership. Plan JSON carries desired or
materialized operations, not a claim that a provider applied them.

Strict scalar, path and plain JSONL output intentionally refuses results it cannot
represent. An exact count may be available while the identity of the selected file
is unresolved. One number does not prove a complete path list. `analyze` JSONL and
`query` JSONL are different protocols; selecting the command selects the protocol.

## Process success is not the semantic answer

A successful analysis can contain unknown measurements. A successfully evaluated
check can be false. A valid desired plan can contain holds. A request accepted by a
provider can still lack successful readback. Keep these distinctions at the call
site rather than hiding them behind one `success` flag.

CLI `check` communicates true, false, error and unresolved through exits 0, 1, 2
and 3. Actions normally expose false or unknown analysis decisions as outputs,
not automatic job failures. A TypeScript `Result<T>` communicates evaluation
success separately from the evidence inside `T`.

## Select versions by identity

The installed npm version, Action major or immutable reference, preset, expression
language, numeric/path/measurement profiles and serialized schema version identify
different contracts. An Action reference does not change `size@1` into a new preset;
a patch release does not make an incompatible saved report compatible by wishful
casting. Start with [Language and contracts](language-and-contracts/README.md), then
check the exact inventory for the artifact you have.

The inventories in this family are committed inside explicit generated boundaries
and remain readable on GitHub. Their surrounding explanations, examples, trust
judgments and recovery guidance are authored. A generated symbol or field existing
is not by itself proof that an installed older distribution contains it.
