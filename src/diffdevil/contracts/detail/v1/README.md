# detail version 1 contract assets

## Meaning

These assets encode the selected finite language contract for `diffdevil-expr/1`: grammar, tokens, operators, functions, input catalogs, diagnostics, limits, value/AST shapes, API declarations, and conformance cases. They are the shipped contract assets, not executable parser code or a substitute for the maintained semantic reference. Production code implements them under `src/diffdevil/language/`.

`grammar.ebnf` is grammatical structure. `lexical.json` defines token spellings and decoding rules. `operators.json` and `functions.json` define signatures and semantic dispatch IDs. `environment.json` and `shortcuts.json` define name resolution and shorthand. `values.schema.json` defines typed query values; `ast.schema.json` defines an internal syntax shape, not a public serialized program format. `public-api.d.ts` contains declarations only.

The policy/report/query/plan schemas live in [schemas](../../schemas/README.md). [Conformance](conformance/README.md) separates parsing, binding, evaluation, collection, band, path, template, and shorthand expectations. Some cases are intentionally invalid. A schema-valid case is not evidence its expression has been evaluated.

## Integration rules

Keep one compiled function/operator catalog in the implementation and derive completion/signature documentation from it where useful. Do not load JSON catalogs from arbitrary policies at runtime. These are trusted shipped product assets.

All paths and schema IDs are local/static; no remote schema fetch is required for validation. Build tooling resolves the declared URNs to package files. Structural validation and relational semantic checks remain separate.

The [language reference](../../../../../docs/language.md) defines human-readable meaning. If a case or schema contradicts it, reconcile that defect rather than introducing two interpretations.
