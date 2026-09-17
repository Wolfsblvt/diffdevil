# TypeScript embedding

## Meaning

This document defines how the single `@wolfsblvt/diffdevil` package exposes
detail compilation, structured shortcuts, policy evaluation, GitHub acquisition,
and typed results without requiring GitHub Actions or shell execution. The
[declaration asset](../../src/diffdevil/contracts/detail/v1/public-api.d.ts) is
a versioned contract reference; generated declarations are the shipped package
surface.

## Current implemented API

The installed package exports the root, `/core`, `/language`, `/policy`, `/git`,
and `/github`. Generated declarations are the current executable signature
source. The standalone contract asset remains useful for the versioned detail
surface, but generated declarations and the release qualification determine what
the package actually ships.

```typescript
import { analyzeDiff, unwrap, environmentFromReport } from '@wolfsblvt/diffdevil';
import { compileExpression, evaluateExpression } from '@wolfsblvt/diffdevil/language';

const report = unwrap(analyzeDiff(unifiedDiffText));
const environment = unwrap(environmentFromReport(report));
const compiled = compileExpression(
  'totals.lines.changed > 100',
  { context: 'condition', environment: environment.schema },
);
if (compiled.ok) {
  const result = evaluateExpression(compiled.value, environment);
  // result.ok means successful evaluation, not a true or exact result.
  if (result.ok) console.log(result.value.value);
}
```

Current functions use `Result<T>` with `ok`, `value`, and `diagnostics`. Evaluation
returns a value payload containing `value`, `evidence`, and `work`. The double
`result.value.value` above is deliberate. `unwrap` provides a concise throwing
boundary when a host chooses one. `parseExpression` returns an immutable AST;
`compileExpression` returns an opaque program through the existing binder and
checker. Both accept a string or `{ text, language: 'diffdevil-expr/1', name? }`.
`sourcePosition` computes one-based line and UTF-16 column from an original offset.
Advanced hosts may also use `ast` and `compileAst`; ordinary use does not need them.

Object/JSON/YAML policy composition, original-source maps and desired plans are
implemented. `/github` remains unavailable. Text parsing has no recovery,
requires the entire input and does not expose Chevrotain types through public
arguments or return values.

### Executable policy API

```typescript
import { analyzeDiff, unwrap } from '@wolfsblvt/diffdevil';
import {
  readPolicyJson, compilePolicy, evaluatePolicy, evaluatePolicyQuery,
  createPlan, readPlan, explainPolicy, compileActionShortcut,
} from '@wolfsblvt/diffdevil/policy';

const report = unwrap(analyzeDiff(unifiedDiffText));
const source = unwrap(readPolicyJson(policyJsonText, { name: 'policy.json' }));
const policy = unwrap(compilePolicy(source));
const evaluated = unwrap(evaluatePolicy(policy, report, {
  parameters: { threshold: 200 },
}));
const plan = unwrap(createPlan(evaluated, {
  repository: 'example/repository', pullRequest: 42,
}, { definitions: 'ensure' }));
const transported = unwrap(readPlan(JSON.stringify(plan)));
```

`compilePolicy` also accepts an inert version-1 object and optionally exact
`templateFiles` text already acquired by the host. It performs no file or network
access. JSON sources preserve configuration pointers, original UTF-16 ranges,
decoded escape mapping and line/column diagnostics. Handles cannot be fabricated
by casting or deserializing them.

`evaluatePolicy` defaults to the read-only rules phase. `{phase: 'analyze'}`
calculates all metrics and bands but no rules. `evaluatePolicyQuery` accepts detail
source, an expression source object, a structured shortcut, `{query: 'savedName'}`
or `{band: 'bandName'}`. It evaluates only necessary dependencies. With
`{context: 'condition'}`, it still has read-only query access to completed rules
but requires a boolean result; this is not a rule declaration's restricted phase.

`createPlan` requires a genuine rules-phase result and builds desired operations,
not provider requests. `readPlan` validates transport, not freshness, policy trust,
comment ownership or permission. Policy identity changes with bound parameter
values and resolved template contents. Formula provenance stays private within
one evaluation request. Persisted metrics keep types but do not inherit guessed
correlations.

`explainPolicy` returns normalized declarations, semantic profiles and replacement
origins. `compileActionShortcut` accepts supported single-rule string inputs and
lowers them to that same compiler; it is not a GitHub Action runner or arbitrary
Action-input dispatcher. The supplied [weighted JSON example](../examples/policies/weighted.json)
and package-consumer tests exercise these current functions. The proposed API
specimens below remain design context wherever they differ from the generated
declarations.

## One package, explicit boundaries

Recommended subpaths are the root product API, `/language`, `/policy`, `/git`, and `/github`. Language/policy imports do not eagerly initialize GitHub credentials, Actions output handlers, or Git processes. The root CLI `bin` is another entry point into the same package, not a separate measurement implementation.

A consumer that only evaluates a saved report should not acquire a network dependency or mutate a repository. Adapters perform acquisition and application explicitly. Package bundling should preserve this import boundary; actual installed/bundled size must be measured before making size claims.

## Compilation and evaluation

```typescript
const compiled = compileExpression(
  { text: 'totals.lines.changed >= 100', language: 'diffdevil-expr/1' },
  { context: 'condition', environment: schema },
);

if (!compiled.ok) {
  return { diagnostics: compiled.diagnostics };
}

const result = evaluateExpression(compiled.value, environment, { limits });
```

This uses the implemented expression API. Compilation returns diagnostics rather than a half-bound program. Evaluation accepts only a successfully compiled immutable program and a schema-compatible normalized environment.

An unknown decision is a successful evaluated value, not a thrown exception. A division error or resource failure is an evaluation failure. The TypeScript return type must preserve that difference:

```typescript
type Decision =
  | { status: 'resolved'; value: boolean }
  | { status: 'unknown'; reasons: readonly Reason[] };
```

A caller must not receive a plain JavaScript boolean with unknown already coerced to false.

## Numeric measurements

```typescript
type NumericMeasurement =
  | { status: 'exact'; value: number }
  | { status: 'bounded'; lower: number; upper: number }
  | { status: 'unknown'; reasons: readonly Reason[]; lower?: number; upper?: number }
  | { status: 'unmeasurable'; reasons: readonly Reason[] };
```

The compiled type schema distinguishes integer and float. Runtime validation rejects unsafe integers, non-finite floats, inconsistent endpoints, and unsupported tags. A TypeScript `number` declaration alone does not prove these constraints.

The internal domain may carry validated affine primitive-family information beyond this public display shape. Public reports carry the underlying normalized facts/provenance needed to reconstruct that domain. Do not expose mutable interpreter nodes as the serialized API.

## Structured shortcuts

```typescript
const shortcut = {
  kind: 'check',
  metric: 'changed',
  files: 'any',
  comparison: { operator: 'gt', value: 100 },
} as const;

const compiled = compileShortcut(shortcut, { environment: schema });
```

This contains no expression string and cannot inject one. Paths and thresholds are typed data. The shortcut compiler constructs AST/policy nodes and uses the same binding/type/evaluation path as source expressions.

Expose shortcut expansion for explanation and parity tests. Do not make public consumers depend on the internal AST or require them to learn compiler node constructors for ordinary operations.

## Policies and artifacts

The following is the current policy/source joining path. `sourceMap` and
`policy.program` in the original proposal are not public runtime fields.

```typescript
const source = unwrap(readPolicyYaml(yamlText, { name: '.diffdevil.yml' }));
const policy = unwrap(compilePolicy(source));
const result = unwrap(evaluatePolicy(policy, report, { parameters }));
const plan = createPlan(result, target);
```

These operations return `Result<T>` unions. `unwrap` above selects a throwing host boundary; callers can instead inspect `ok` and return diagnostics. The plan result still requires its own success handling.

`evaluatePolicy` and `createPlan` are pure. An adapter may read current provider state to materialize exact changes, but no policy function directly calls GitHub. Application belongs to `/github` and requires an explicit authenticated target and trusted artifact context.

Reader functions validate report/query/plan schema versions and semantic capabilities. They tolerate permitted additive report fields while rejecting unknown critical tags or unsupported execution operations. A generic `JSON.parse(...) as Report` cast is not the public validation route.

## Source and diagnostic types

Expression sources include text, language identity, and an optional display name.
`readPolicyYaml` and `readPolicyJson` return immutable source handles accepted by
`compilePolicy`. They retain original coordinates through decoding. For aliases,
the primary span names the declaration and related spans name use sites. Diagnostics expose phase, stable code, severity, primary range, related ranges, configuration path, and structured details.

A compiled program is opaque and immutable. The current program exposes its kind,
language identity, result type, compatible schema identity, and dependency paths,
not a writable operation array. Additional proposed explanation metadata is not a
current export contract; retain original source alongside a program when a host
needs to display it. Programs are tied to a compatible environment schema fingerprint, which detects mismatched member slots rather than authorizing input contents.

A program cache may be local to a consumer. It is not a serialized public executable format. Cache keys include source, context, environment schema, and semantic profile. Never load arbitrary cached host code from a saved report.

## Host-supplied facts

A trusted host may add declared inert input records to an explicit `params`/extension environment at compile time. The initial configuration format exposes scalar parameters; a direct library schema can describe richer records when its consumer owns that contract. Such programs record the required schema and are not advertised as portable to CLI/Actions lacking those declared inputs.

Do not expose `registerFunction(name, arbitraryCallback)` as portable detail. A callback can read files, call the network, inspect the clock, or execute commands and would defeat the language's deterministic/security contract. Host programs remain free to calculate data outside the evaluator and pass it in explicitly.

## Runtime/tooling choices

Chevrotain 13.2.0 is the parser dependency, YAML 2.9.1 is the loader, and Ajv 8.20.0 generates fixed-schema validators at build time. Their current primary-source details are in the [research register](../reference/2026-09-09/sources-and-research.md). TypeScript/module configuration must be aligned with the actual maintained repository and the selected supported Node runtime at implementation time.

The package should publish declarations for the public subpaths, maintain a pure language import, and include schemas as static assets. The Action bundles its execution path separately. This package does not prescribe a frontend framework, dependency-injection container, code-generation framework, or separate release train for the language.

## Testable integration promises

The same normalized report and parameters must produce the same semantic result through source expressions, shortcuts, policy metrics, the CLI, and Actions. Differences in formatting or host error transport do not justify different arithmetic.

Qualification covers public import smoke tests, declaration checking, program
reuse, schema mismatch rejection, inert-data validation, unknown/result unions,
and absence of provider effects from language/policy imports. The released npm
consumer also exercises the public subpaths and strict declarations; live GitHub
provider behavior remains a separately bounded Action-canary claim.

`validateSchema(kind, input)` checks one fixed product-owned schema and returns
inert frozen data. It accepts policy, report, plan, query, AST and value schema
families. Use `readReport`, `readPlan` and `compilePolicy` for semantic validation;
shape success alone does not establish arithmetic truth or effect authority.

## Implemented GitHub API

The `/github` export provides `GitHubClient`, `analyzeGitHub`,
`loadGitHubPolicy`, `applyGitHubPolicy` and `syncGitHubLabels`, plus their public
options/result types. Its provider tests use mocked HTTP; selected live provider
reads and bounded effects are qualified separately through the published Action
canaries. See [GitHub API](github-api.md) for source trust, explicit application,
lifecycle scope and partial-result handling.
