# Collections, scopes, and paths

## Meaning

This document defines how detail selects, projects, aggregates, and orders file data when both values and membership may be uncertain. It also defines named scope selection and the versioned path-matching profile. The central rule is that unobserved or uncertain files do not disappear merely because ordinary arrays are easier to process.

## Logical collection model

A collection contains ordered observed entries and an explicit remainder description. Each observed entry has **definite** or **possible** membership. The remainder records whether unseen entries can exist and any justified cardinality bounds. A collection also records whether its output order can be established.

An ordinary list literal is complete, ordered, and has only definite members. The root `files` collection is constructed from observed report files and file-list completeness metadata. The JSON report stores observed file records as a normal array plus `fileSet` metadata; the evaluator presents the richer logical collection.

A report with 100 observed files and a proven total of 120 is not a complete 100-item collection. A report with uncertain selection of an observed file is not the same as an unseen file. Preserve both distinctions in queries and explanations.

## Stable file order

Source adapters normalize observed files into ascending canonical `path`, then `oldPath`, then file ID, using Unicode scalar lexicographic order. IDs are deterministic within a comparison, not random. This canonical order removes provider pagination order from evaluation and floating-point aggregate behavior.

`filter` and `map` preserve source order. `sortBy` is stable for equal keys. A file collection with unseen items may have an unresolved final order because unseen paths could sort before observed paths. The observed order is still useful but must not be represented as the complete global ordering.

## Filtering

```text
filter(files, f => f.included && f.lines.changed > 100)
```

For each observed input entry, evaluate the predicate once in order:

| Input membership | Predicate | Output membership |
| --- | --- | --- |
| definite | true | definite |
| definite | false | absent |
| definite | unknown | possible |
| possible | true | possible |
| possible | false | absent |
| possible | unknown | possible |

An encountered predicate error aborts the query; it does not drop the file. The unseen remainder remains possible unless the compiler can prove the predicate is the literal false expression. Version 1 requires only that syntactic constant case, not arbitrary theorem proving over unseen files.

Filtering does not change the values attached to a retained file. It changes membership. This distinction matters when a later sum includes a potentially selected negative custom metric.

## Mapping

```text
map(scopes.production.files, f => {path: f.path, changed: f.lines.changed})
```

`map` preserves membership, order, and cardinality information. The selector is evaluated for every observed entry, including possible members, in input order. Errors encountered while projecting possible members remain errors. Users can choose `certain(...)` before `map` to narrow the question explicitly.

Optional fields stay optional. A missing `oldPath` is retained as missing in the typed result; it is not silently removed and does not shrink the collection. A singleton result remains a collection. A record field order is its authored order for output, not engine-specific dictionary order.

## Any and all

```text
any(files, f => f.included && f.lines.changed > 100)
all(scopes.tests.files, f => f.lines.changed <= 100)
```

A **definite** member with a true predicate proves `any`; a definite member with a false predicate disproves `all`. Possible members cannot supply those decisive witnesses because they might not belong to the collection.

Without a decisive witness, possible membership, unknown predicates, or unseen entries can leave the result unknown. A complete collection whose members all definitely fail makes `any` false. A complete collection whose members all definitely pass makes `all` true.

For a complete empty collection, `any` is false and `all` is true. Thus “all selected files are small” does not assert that any selected files exist. Add `count(selection) > 0` when non-emptiness matters.

Evaluate in collection order and short-circuit on a decisive witness. A later invalid operation is not evaluated after a witness has settled the result, but an earlier encountered error is not erased. Possible membership still requires evaluation where its predicate may affect the result.

## Count

`count(collection)` measures membership, not the presence of projected scalar values. A mapped missing optional field still occupies an entry.

For a complete collection with `d` definite and `p` possible entries, count is `[d, d+p]`, normalized to exact where equal. Add known unseen count bounds. Without an upper bound for unseen selected items, retain an unknown count with its proven lower bound.

An unfiltered file collection can have an exact count while its paths remain incomplete if a trusted source supplied the total cardinality. Filtering normally loses that exact total unless its selection can be established. Do not make list completeness and cardinality exactness synonyms.

## Sum and numeric aggregation

For complete exact input, numeric aggregation follows canonical input order. Integer sums use checked integer arithmetic; a float selector produces a float accumulation in that order. `sum([])` is exact integer zero.

A definite entry contributes its entire numeric domain. A possible entry contributes the union of zero and that domain, conservatively represented by its interval hull. For a value in `[-10,-5]`, a possible contribution is `[-10,0]`, not `[0,-5]`. Combining contributions uses the numeric arithmetic and supported family-correlation model.

An unmeasurable definite or possible contribution makes the aggregate unmeasurable: the line sum is not defined in worlds where that material is selected. An unseen remainder with applicable but unavailable measurements yields unknown with justified constraints. A nonnegative selector can preserve a lower bound from observed definite contributions.

`min` and `max` return missing on a definitely empty complete collection. When non-emptiness is certain and all item domains are available, use the conservative extremum domain across mandatory/optional entries. The implementation guide defines the reference interval calculation. An incomplete remainder without usable value bounds leaves the extremum unknown. Do not pretend that the largest observed file is necessarily the largest file in the comparison.

`avg` returns missing for a definitely empty complete collection. If the collection may be empty, the result has uncertain optional presence. If count is proven positive, evaluate the sum divided by count with shared selection evidence retained conservatively. Independent interval division may overestimate the range; that is the fixed version-1 fallback, not permission to report a narrower guess.

## Sorting and taking a prefix

```text
take(sortBy(scopes.production.files, f => f.path), 10)
```

`sortBy` accepts present exact numeric, string, or boolean keys of one compatible type. Its optional direction argument is the literal `"asc"` or `"desc"`, default `"asc"`. Boolean order is false before true; string order is locale-independent.

An unknown key does not make the input invalid, but it prevents establishing the sorted order. Preserve entries with unresolved ordering. An unmeasurable numeric key has the same ordering consequence. A missing key is a type/requirement error unless explicitly replaced.

`take` requires an exact nonnegative integer count. Taking zero returns the complete empty collection. Taking a positive prefix requires enough ordering and membership evidence. If possible or unseen entries can change which entries occupy that prefix, preserve that selection uncertainty instead of presenting observed entries as the proven top N.

For ordinary complete collections with only definite entries and exact keys, sort/take produce ordinary complete results. The language does not require advanced users to reason about uncertainty when the evidence is exact.

## Explicit definite-only projection

```text
certain(filter(files, f => f.included && f.lines.changed > 100))
```

`certain` drops possible observed members and all unseen remainder, retaining definite observed entries in their observed order. The returned collection is complete **for that explicitly narrower question** and carries a `DEFINITE_OBSERVED_ONLY` evidence note. It does not claim the original selection was complete.

When the original global order was unresolved, the selected observed entries retain a determinate observed order. Applying `sortBy` afterward sorts those entries only. This makes strict path output possible without hiding what was omitted.

The equivalent shortcut is `--certain`. No default query or effect rule inserts it automatically.

## Included files and scopes

The expression root `files` includes excluded file records so an author can inspect path-policy decisions. Normal shortcuts begin from the included selection. These roots are explicit:

```text
files
filter(files, f => f.included)
scopes.production.files
```

Each file has `included` and an inclusion explanation. `totals.raw` and `totals.lines` aggregate included files only. `totals.files.total` counts all changed files; `included` and `excluded` refer to global policy. Scope totals describe that scope's selected collection, not global acquisition counts.

Scopes have an optional `includeOnly` boundary and additional `exclude` and `forceInclude` patterns. Global policy runs first. A scope selects only globally included files. Its `includeOnly` boundary is then a hard scope boundary; within that boundary, scope `forceInclude` overrides scope exclusions. A scope cannot reintroduce a globally excluded file or pull an unrelated file across its include-only boundary. Change the global policy explicitly when that is intended.

This refines the earlier broad “force include wins” sketch: force inclusion wins inside its own policy layer, not across an unrelated scope definition.

## Path matching profile

`diffdevil-glob/1` is shared by configuration and the functions `glob` and `pathMatches`.

| Form | Meaning |
| --- | --- |
| `*` | Zero or more non-separator Unicode scalar characters. |
| `?` | Exactly one non-separator scalar character. |
| `[abc]` | One listed character. |
| `[a-z]` | One scalar in an ascending range. |
| `[!abc]` | One non-separator character not in the class. |
| `**` as a whole path segment | Zero or more complete path segments. |

Patterns are anchored to the whole repository-relative path. `/` is the only separator. Matching is case-sensitive on every platform. Dotfiles have no special exclusion. `src/**` includes `src/Foo.cs`; `**/*.md` includes root `README.md`. An embedded `ab**cd` segment is invalid rather than having accidental globstar meaning.

Backslash is an ordinary character, not a Windows separator or an escape. Literal wildcard characters use classes, such as `[*]`, `[?]`, and `[[]`. A closing bracket can be listed first in a class. A dash is literal first or last. Reject unterminated classes, descending ranges, empty classes, absolute paths, empty segments, `.`/`..` path segments, brace expansion, extglob, and patterns beginning with standalone negation syntax. Use the `exclude` field for exclusions.

Actual Git paths are not normalized through the host filesystem. Do not change case, resolve symlinks, collapse a literal backslash, or resolve `..` segments. A valid repository path from a source adapter must already meet the normalized path contract; malformed paths are source errors, not globs to repair.

## Renames

For a file rename, `path` is the destination and `oldPath` is the source. For a deletion, `path` is the old path and `oldPath` is absent unless the source describes a meaningful prior endpoint.

`glob(f.path, pattern)` intentionally tests only the selected path. `pathMatches(f, pattern)` returns true when either rename endpoint matches.

For global inclusion, evaluate each available endpoint with global precedence: force-include, then include-only restriction, then exclusion, then default inclusion. The file is included when either endpoint is included. Thus a rename from authored source into excluded generated output does not disappear. Scope selection applies the same any-endpoint principle inside its additional scope boundary.

A pure detected rename contributes zero lines only when content identity is proven. A rename with edits contributes its edit blocks. Path selection never changes the measurement algorithm.

## Strict output boundary

Lossless query JSON retains possible membership, unresolved values, and unseen remainder. Plain scalar, lines, NUL-delimited strings, and plain JSONL records require a determined selected result. They fail with exit `3` instead of emitting an apparently complete partial answer.

The CLI validates a strict result before writing semantic output. Files with newline characters use NUL or JSON. A collection of records is not implicitly joined into a path list. Formatting does not add new evidence.

## Cardinality constraints and deterministic prefix precision

A logical collection may additionally carry a justified `cardinality` measurement for its total selected count. This is distinct from which observed entries belong. It is nonnegative integer evidence and never unmeasurable. The reader intersects it with the lower/upper count derived from definite entries, possible entries, and unseen bounds; an empty intersection is invalid input. `count` returns the intersection, normalized to exact when its endpoints coincide. This allows “exactly one result, identity not yet established” without pretending there are zero known results or two results.

`map` preserves a cardinality constraint. `filter` preserves it only for the syntactic literal-true predicate, sets it to exact zero for literal false, and otherwise recomputes conservative selection bounds. `certain` replaces it with the exact number of retained definite observed items. `sortBy` preserves cardinality, even when the order remains unknown. No helper may keep a stale constraint after changing membership.

For `take(c, n)`, transform the input count interval by `min(count,n)`. Retain this as an output cardinality constraint even when item identity cannot be resolved. For known order with no unseen remainder, an entry at a candidate position is definitely in the prefix when it is definite and the maximum number of preceding selected entries is less than `n`. It is possibly in the prefix when the minimum preceding count is less than `n`. Otherwise omit it. These prefix count bounds use preceding entry memberships without inventing dependencies between their selection predicates.

With unknown global order or an unseen remainder, version 1 conservatively marks all observed candidate entries possible, bounds the unseen prefix contribution by `n`, and retains the transformed total cardinality. If the complete input is proven to contain at most `n` entries, preserve its membership unchanged because the whole collection is selected. `take(c, 0)` is always a complete, known-order empty collection. Do not infer precise ranks for uncertain numeric sort keys in this profile.

For example, two definite records with unresolved ordering have a count of two. Taking one produces two possible identities plus an exact cardinality of one. JSON can represent that result; plain path output cannot choose either record. A subsequent count is exactly one. This is a collection constraint, not a general symbolic relationship solver.

Aggregates may use the resulting proven non-emptiness. The version-1 sum fallback otherwise uses the documented independent optional-contribution hull and may be wider than a cardinality-aware optimizer. That conservative precision is explicit. A later optimizer must not silently alter decisions under an already released semantic profile.
