# TypeScript API reference

Import from the package's public export map. The declarations below are emitted
from the current build and retain aliases, overloads, generic constraints and
optional/readonly fields. They are not hand-maintained approximations of a historical
API proposal. Use [TypeScript library](../use/typescript-library.md) for installation
and the complete installed-consumer compile/run commands.

## Package and runtime boundaries

The package is ESM and declares Node 22 or newer. Root, core, language, policy, Git,
GitHub and browser-specific entries have different responsibilities; the exact
export list below is authoritative for this source. Language and policy compilation
do not acquire credentials or perform provider writes. Host adapters acquire data
or reconcile effects only when explicitly called. Importing a function is not
invoking it, and an internal path that happens to exist is not a supported export.

The browser entries have their own environment boundary. Do not import a Node Git
process adapter into a browser and call that portable embedding. The isolated manual
uses its declared TypeScript compiler API to inspect emitted declarations; the
application's root build compiler and generated package declarations remain the
source of the exported types. Public dependency re-exports retain the dependency's
declaration and lockfile identity, not an invented project-owned declaration.

## Result, evidence and diagnostics

`Result<T>` distinguishes a successful value from diagnostics. Evaluation results
then contain their own typed value, evidence and work. The two levels matter:
`result.ok` does not imply an exact number, a true condition or an applied effect.
`unwrap` provides an explicit throwing boundary for hosts that choose exceptions;
callers can instead preserve and route structured diagnostics.

A numeric measurement retains exact, bounded, unknown or unmeasurable status.
Optional structural absence and explicit null are different from those states.
Do not cast arbitrary decoded JSON into a public report or opaque compiled handle.
Use readers and compilation, and retain diagnostic source names and original spans.

## Complete lifecycle specimen

The complete [installed consumer](../../examples/library/inspect-change.mts)
accepts a supplied diff or a saved report. It reads and compiles policy, evaluates
rules and a query, constructs a desired plan and reads the serialized plan back.
The example repository/PR is inert: this code does not contact GitHub.

```typescript
// SPDX-License-Identifier: MIT
// Run with: node out/inspect-change.mjs diff change.diff
// Or:       node out/inspect-change.mjs report report.json
// The example target is inert: this program never acquires or mutates GitHub.
import { readFileSync } from 'node:fs';
import { analyzeDiff, readReport, type Result } from '@wolfsblvt/diffdevil';
import {
  readPolicyYaml, compilePolicy, evaluatePolicy, evaluatePolicyQuery,
  createPlan, readPlan,
} from '@wolfsblvt/diffdevil/policy';

function requireResult<T>(result: Result<T>): T {
  if (!result.ok) {
    throw new Error(result.diagnostics.map(item => `${item.code}: ${item.message}`).join('\n'));
  }
  return result.value;
}

try {
  const [kind, path] = process.argv.slice(2);
  if ((kind !== 'diff' && kind !== 'report') || !path) {
    throw new Error('Usage: inspect-change.mjs diff|report PATH');
  }
  const input = readFileSync(path, 'utf8');
  const report = requireResult(kind === 'diff' ? analyzeDiff(input) : readReport(input));
  const source = requireResult(readPolicyYaml('version: 1\npresets: [size@1]\n', { name: 'example-policy.yml' }));
  const policy = requireResult(compilePolicy(source));
  const evaluated = requireResult(evaluatePolicy(policy, report));
  const query = requireResult(evaluatePolicyQuery(policy, report, 'totals.lines.changed < 100', { context: 'condition' }));
  const target = {
    repository: report.source.repository ?? 'example/repository',
    pullRequest: report.source.pullRequest ?? 42,
  };
  const plan = requireResult(createPlan(evaluated, target, { definitions: 'ensure' }));
  const transported = requireResult(readPlan(JSON.stringify(plan)));
  // Successful evaluation may contain an unknown value. Preserve its typed shape.
  console.log(JSON.stringify({
    changed: evaluated.report.totals.lines.changed,
    rawChurn: evaluated.report.totals.raw.churn,
    decision: query.result.value,
    desired: { stage: transported.stage, operations: transported.operations, held: transported.held },
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 2;
}
```

Use the compile/run commands in the [library guide](../use/typescript-library.md).
Against the small payments diff it retains 10 Changed and 16 churn, a resolved
less-than-100 decision and a desired size label. Against incomplete evidence it
must retain uncertainty instead of unwrapping a made-up scalar. A host choosing
`unwrap` catches the failure rather than treating it as an empty successful result.

## Analysis, policy and query lifecycle

`analyzeDiff` normalizes a complete patch; `analyzeChanges` consumes declared change
data; Git and GitHub acquisition are explicit adapter calls. `readReport` validates
a transported report's structure and model relationships before it is reused.
Path policies and scopes select views without deleting the observed comparison.

`readPolicyJson` and `readPolicyYaml` preserve original source locations.
`compilePolicy` also accepts an inert version-1 object, plus explicitly supplied
template text. It does not fetch config/template files. Successful compiled handles
are immutable and cannot be restored by JSON deserialization or manufactured by casts.
`explainPolicy` exposes normalized declarations, profiles and replacement origins.

`evaluatePolicy` defaults to rules phase. `phase: 'analyze'` computes metrics and
bands without rules. `evaluatePolicyQuery` accepts supported text/source objects,
shortcuts, saved queries or band selectors and evaluates required dependencies.
Its condition context enforces a boolean result while permitting query-phase access
to completed rule results; this does not relax a rule declaration's phase boundary.

`createPlan` requires a genuine rules-phase result and a compatible target.
`readPlan` validates transport, not freshness, policy trust, ownership or permissions.
Policy identity includes bound parameter values and resolved template contents.
Saved metrics preserve numeric types, but do not inherit guessed private formula
correlations from a previous evaluator request.

## Public symbols and exact declarations

The export index links each alias to its declaration anchor. Overloads stay together;
full types remain open for intentional lookup without turning every symbol into
another sidebar page. Edit source and regenerate this bounded inventory. Explanations
and examples outside the markers remain authored.

<!-- manual:generated typescript-exports -->
### @wolfsblvt/diffdevil

| Public export | Declared symbol | Signature / type |
| --- | --- | --- |
| `AnalyzeOptions` | `AnalyzeOptions` | [Declaration](#api-report-analyzeoptions) |
| `BandResult` | `BandResult` | [Declaration](#api-model-bandresult) |
| `BooleanValue` | `BooleanValue` | [Declaration](#api-model-booleanvalue) |
| `CollectionValue` | `CollectionValue` | [Declaration](#api-model-collectionvalue) |
| `CommentAuthor` | `CommentAuthor` | [Declaration](#api-github-comments-commentauthor) |
| `CompiledExpression` | `CompiledExpression` | [Declaration](#api-language-compile-compiledexpression) |
| `CompiledPolicy` | `CompiledPolicy` | [Declaration](#api-policy-compile-compiledpolicy) |
| `Decision` | `Decision` | [Declaration](#api-model-decision) |
| `DefinitionResult` | `DefinitionResult` | [Declaration](#api-github-labels-definitionresult) |
| `Diagnostic` | `Diagnostic` | [Declaration](#api-model-diagnostic) |
| `DiffSourceIdentity` | `DiffSourceIdentity` | [Declaration](#api-model-diffsourceidentity) |
| `DiffdevilError` | `DiffdevilError` | [Declaration](#api-errors-diffdevilerror) |
| `EffectObservation` | `EffectObservation` | [Declaration](#api-github-observation-effectobservation) |
| `EffectOperation` | `EffectOperation` | [Declaration](#api-model-effectoperation) |
| `EffectPlan` | `EffectPlan` | [Declaration](#api-model-effectplan) |
| `EvaluationEnvironment` | `EvaluationEnvironment` | [Declaration](#api-language-environment-evaluationenvironment) |
| `EvaluationResult` | `EvaluationResult` | [Declaration](#api-language-evaluate-evaluationresult) |
| `ExpressionSource` | `ExpressionSource` | [Declaration](#api-language-source-expressionsource) |
| `FileRecord` | `FileRecord` | [Declaration](#api-model-filerecord) |
| `FileSet` | `FileSet` | [Declaration](#api-model-fileset) |
| `GitHubApplyOptions` | `GitHubApplyOptions` | [Declaration](#api-github-apply-githubapplyoptions) |
| `GitHubApplyResult` | `GitHubApplyResult` | [Declaration](#api-github-apply-githubapplyresult) |
| `GitHubClient` | `GitHubClient` | [Declaration](#api-github-client-githubclient) |
| `GitHubClientOptions` | `GitHubClientOptions` | [Declaration](#api-github-client-githubclientoptions) |
| `GitHubPolicySource` | `GitHubPolicySource` | [Declaration](#api-github-policy-githubpolicysource) |
| `GitHubRequestError` | `GitHubRequestError` | [Declaration](#api-github-client-githubrequesterror) |
| `GitOptions` | `GitOptions` | [Declaration](#api-sources-git-gitoptions) |
| `LabelDefinition` | `LabelDefinition` | [Declaration](#api-model-labeldefinition) |
| `LineMeasurements` | `LineMeasurements` | [Declaration](#api-model-linemeasurements) |
| `MeasurementSummary` | `MeasurementSummary` | [Declaration](#api-model-measurementsummary) |
| `NumberValue` | `NumberValue` | [Declaration](#api-model-numbervalue) |
| `NumericMeasurement` | `NumericMeasurement` | [Declaration](#api-model-numericmeasurement) |
| `NumericType` | `NumericType` | [Declaration](#api-model-numerictype) |
| `PathPolicy` | `PathPolicy` | [Declaration](#api-model-pathpolicy) |
| `PlanOptions` | `PlanOptions` | [Declaration](#api-policy-plan-planoptions) |
| `PlanTarget` | `PlanTarget` | [Declaration](#api-model-plantarget) |
| `PolicyCompileOptions` | `PolicyCompileOptions` | [Declaration](#api-policy-compile-policycompileoptions) |
| `PolicyDocument` | `PolicyDocument` | [Declaration](#api-policy-types-policydocument) |
| `PolicyEvaluateOptions` | `PolicyEvaluateOptions` | [Declaration](#api-policy-evaluate-policyevaluateoptions) |
| `PolicyQueryResult` | `PolicyQueryResult` | [Declaration](#api-policy-evaluate-policyqueryresult) |
| `PolicyQuerySelector` | `PolicyQuerySelector` | [Declaration](#api-policy-evaluate-policyqueryselector) |
| `PolicyResult` | `PolicyResult` | [Declaration](#api-policy-evaluate-policyresult) |
| `PolicySource` | `PolicySource` | [Declaration](#api-policy-source-policysource) |
| `PresentationDetail` | `PresentationDetail` | [Declaration](#api-presentation-presentationdetail) |
| `RawMeasurements` | `RawMeasurements` | [Declaration](#api-model-rawmeasurements) |
| `Reason` | `Reason` | [Declaration](#api-model-reason) |
| `Report` | `Report` | [Declaration](#api-model-report) |
| `Result` | `Result` | [Declaration](#api-model-result) |
| `RuleResult` | `RuleResult` | [Declaration](#api-model-ruleresult) |
| `SEMANTICS` | `SEMANTICS` | [Declaration](#api-model-semantics) |
| `SchemaKind` | `SchemaKind` | [Declaration](#api-schema-schemakind) |
| `ScopeRecord` | `ScopeRecord` | [Declaration](#api-model-scoperecord) |
| `Semantics` | `Semantics` | [Declaration](#api-model-semantics) |
| `Shortcut` | `Shortcut` | [Declaration](#api-language-shortcuts-shortcut) |
| `SourceRange` | `SourceRange` | [Declaration](#api-model-sourcerange) |
| `TextPresentationOptions` | `TextPresentationOptions` | [Declaration](#api-presentation-textpresentationoptions) |
| `Totals` | `Totals` | [Declaration](#api-model-totals) |
| `TypeDescriptor` | `TypeDescriptor` | [Declaration](#api-model-typedescriptor) |
| `Value` | `Value` | [Declaration](#api-model-value) |
| `analyzeChanges` | `analyzeChanges` | [Declaration](#api-report-analyzechanges) |
| `analyzeDiff` | `analyzeDiff` | [Declaration](#api-report-analyzediff) |
| `analyzeGit` | `analyzeGit` | [Declaration](#api-sources-git-analyzegit) |
| `analyzeGitHub` | `analyzeGitHub` | [Declaration](#api-github-source-analyzegithub) |
| `analyzeGitHubGit` | `analyzeGitHubGit` | [Declaration](#api-github-source-analyzegithubgit) |
| `applyGitHubPolicy` | `applyGitHubPolicy` | [Declaration](#api-github-apply-applygithubpolicy) |
| `attachScopes` | `attachScopes` | [Declaration](#api-report-attachscopes) |
| `compileExpression` | `compileExpression` | [Declaration](#api-language-text-compileexpression) |
| `compilePolicy` | `compilePolicy` | [Declaration](#api-policy-compile-compilepolicy) |
| `compileShortcut` | `compileShortcut` | [Declaration](#api-language-shortcuts-compileshortcut) |
| `createEnvironment` | `createEnvironment` | [Declaration](#api-language-environment-createenvironment) |
| `createPlan` | `createPlan` | [Declaration](#api-policy-plan-createplan) |
| `environmentFromReport` | `environmentFromReport` | [Declaration](#api-language-environment-environmentfromreport) |
| `evaluateExpression` | `evaluateExpression` | [Declaration](#api-language-evaluate-evaluateexpression) |
| `evaluatePolicy` | `evaluatePolicy` | [Declaration](#api-policy-evaluate-evaluatepolicy) |
| `evaluatePolicyQuery` | `evaluatePolicyQuery` | [Declaration](#api-policy-evaluate-evaluatepolicyquery) |
| `expandShortcut` | `expandShortcut` | [Declaration](#api-language-shortcuts-expandshortcut) |
| `explainPolicy` | `explainPolicy` | [Declaration](#api-policy-compile-explainpolicy) |
| `formatPlan` | `formatPlan` | [Declaration](#api-policy-format-formatplan) |
| `formatQuery` | `formatQuery` | [Declaration](#api-format-formatquery) |
| `formatReport` | `formatReport` | [Declaration](#api-format-formatreport) |
| `loadGitHubPolicy` | `loadGitHubPolicy` | [Declaration](#api-github-policy-loadgithubpolicy) |
| `parseExpression` | `parseExpression` | [Declaration](#api-language-text-parseexpression) |
| `parsePatch` | `parsePatch` | [Declaration](#api-sources-patch-parsepatch) |
| `parseUnifiedDiff` | `parseUnifiedDiff` | [Declaration](#api-sources-patch-parseunifieddiff) |
| `readGitHubPolicy` | `readGitHubPolicy` | [Declaration](#api-github-policy-readgithubpolicy) |
| `readPlan` | `readPlan` | [Declaration](#api-policy-plan-readplan) |
| `readPolicyJson` | `readPolicyJson` | [Declaration](#api-policy-source-readpolicyjson) |
| `readPolicyYaml` | `readPolicyYaml` | [Declaration](#api-policy-yaml-readpolicyyaml) |
| `readReport` | `readReport` | [Declaration](#api-report-readreport) |
| `sourcePosition` | `sourcePosition` | [Declaration](#api-language-source-sourceposition) |
| `syncGitHubLabels` | `syncGitHubLabels` | [Declaration](#api-github-labels-syncgithublabels) |
| `unwrap` | `unwrap` | [Declaration](#api-errors-unwrap) |
| `validateSchema` | `validateSchema` | [Declaration](#api-schema-validateschema) |
| `withParameters` | `withParameters` | [Declaration](#api-language-environment-withparameters) |
| `withPathPolicy` | `withPathPolicy` | [Declaration](#api-report-withpathpolicy) |

### @wolfsblvt/diffdevil/core

| Public export | Declared symbol | Signature / type |
| --- | --- | --- |
| `AnalyzeOptions` | `AnalyzeOptions` | [Declaration](#api-report-analyzeoptions) |
| `BandResult` | `BandResult` | [Declaration](#api-model-bandresult) |
| `BooleanValue` | `BooleanValue` | [Declaration](#api-model-booleanvalue) |
| `ChangeInput` | `ChangeInput` | [Declaration](#api-sources-patch-changeinput) |
| `CollectionValue` | `CollectionValue` | [Declaration](#api-model-collectionvalue) |
| `Decision` | `Decision` | [Declaration](#api-model-decision) |
| `Diagnostic` | `Diagnostic` | [Declaration](#api-model-diagnostic) |
| `DiffSourceIdentity` | `DiffSourceIdentity` | [Declaration](#api-model-diffsourceidentity) |
| `EffectOperation` | `EffectOperation` | [Declaration](#api-model-effectoperation) |
| `EffectPlan` | `EffectPlan` | [Declaration](#api-model-effectplan) |
| `FileRecord` | `FileRecord` | [Declaration](#api-model-filerecord) |
| `FileSet` | `FileSet` | [Declaration](#api-model-fileset) |
| `LabelDefinition` | `LabelDefinition` | [Declaration](#api-model-labeldefinition) |
| `LineMeasurements` | `LineMeasurements` | [Declaration](#api-model-linemeasurements) |
| `MeasurementSummary` | `MeasurementSummary` | [Declaration](#api-model-measurementsummary) |
| `NumberValue` | `NumberValue` | [Declaration](#api-model-numbervalue) |
| `NumericMeasurement` | `NumericMeasurement` | [Declaration](#api-model-numericmeasurement) |
| `NumericType` | `NumericType` | [Declaration](#api-model-numerictype) |
| `PathPolicy` | `PathPolicy` | [Declaration](#api-model-pathpolicy) |
| `PlanTarget` | `PlanTarget` | [Declaration](#api-model-plantarget) |
| `RawMeasurements` | `RawMeasurements` | [Declaration](#api-model-rawmeasurements) |
| `Reason` | `Reason` | [Declaration](#api-model-reason) |
| `Report` | `Report` | [Declaration](#api-model-report) |
| `Result` | `Result` | [Declaration](#api-model-result) |
| `RuleResult` | `RuleResult` | [Declaration](#api-model-ruleresult) |
| `SEMANTICS` | `SEMANTICS` | [Declaration](#api-model-semantics) |
| `ScopeRecord` | `ScopeRecord` | [Declaration](#api-model-scoperecord) |
| `Semantics` | `Semantics` | [Declaration](#api-model-semantics) |
| `SourceRange` | `SourceRange` | [Declaration](#api-model-sourcerange) |
| `Totals` | `Totals` | [Declaration](#api-model-totals) |
| `TypeDescriptor` | `TypeDescriptor` | [Declaration](#api-model-typedescriptor) |
| `Value` | `Value` | [Declaration](#api-model-value) |
| `analyzeChanges` | `analyzeChanges` | [Declaration](#api-report-analyzechanges) |
| `analyzeDiff` | `analyzeDiff` | [Declaration](#api-report-analyzediff) |
| `attachScopes` | `attachScopes` | [Declaration](#api-report-attachscopes) |
| `parsePatch` | `parsePatch` | [Declaration](#api-sources-patch-parsepatch) |
| `parseUnifiedDiff` | `parseUnifiedDiff` | [Declaration](#api-sources-patch-parseunifieddiff) |
| `readReport` | `readReport` | [Declaration](#api-report-readreport) |
| `withPathPolicy` | `withPathPolicy` | [Declaration](#api-report-withpathpolicy) |

### @wolfsblvt/diffdevil/language

| Public export | Declared symbol | Signature / type |
| --- | --- | --- |
| `Ast` | `Ast` | [Declaration](#api-language-ast-ast) |
| `CompileOptions` | `CompileOptions` | [Declaration](#api-language-compile-compileoptions) |
| `CompiledExpression` | `CompiledExpression` | [Declaration](#api-language-compile-compiledexpression) |
| `EvaluationEnvironment` | `EvaluationEnvironment` | [Declaration](#api-language-environment-evaluationenvironment) |
| `EvaluationResult` | `EvaluationResult` | [Declaration](#api-language-evaluate-evaluationresult) |
| `ExpressionSource` | `ExpressionSource` | [Declaration](#api-language-source-expressionsource) |
| `Schema` | `Schema` | [Declaration](#api-language-types-schema) |
| `Shortcut` | `Shortcut` | [Declaration](#api-language-shortcuts-shortcut) |
| `Type` | `TypeDescriptor` | [Declaration](#api-model-typedescriptor) |
| `ast` | `ast` | [Declaration](#api-language-ast-ast) |
| `boolValue` | `boolValue` | [Declaration](#api-language-values-boolvalue) |
| `collection` | `collection` | [Declaration](#api-language-types-collection) |
| `compileAst` | `compileAst` | [Declaration](#api-language-compile-compileast) |
| `compileExpression` | `compileExpression` | [Declaration](#api-language-text-compileexpression) |
| `compileShortcut` | `compileShortcut` | [Declaration](#api-language-shortcuts-compileshortcut) |
| `completeCollection` | `completeCollection` | [Declaration](#api-language-values-completecollection) |
| `createEnvironment` | `createEnvironment` | [Declaration](#api-language-environment-createenvironment) |
| `environmentFromReport` | `environmentFromReport` | [Declaration](#api-language-environment-environmentfromreport) |
| `evaluateExpression` | `evaluateExpression` | [Declaration](#api-language-evaluate-evaluateexpression) |
| `expandShortcut` | `expandShortcut` | [Declaration](#api-language-shortcuts-expandshortcut) |
| `integer` | `integer` | [Declaration](#api-numeric-integer) |
| `numberValue` | `numberValue` | [Declaration](#api-numeric-numbervalue) |
| `optional` | `optional` | [Declaration](#api-language-types-optional) |
| `parseExpression` | `parseExpression` | [Declaration](#api-language-text-parseexpression) |
| `recordType` | `recordType` | [Declaration](#api-language-types-recordtype) |
| `recordValue` | `recordValue` | [Declaration](#api-language-values-recordvalue) |
| `sourcePosition` | `sourcePosition` | [Declaration](#api-language-source-sourceposition) |
| `textValue` | `textValue` | [Declaration](#api-language-values-textvalue) |
| `withParameters` | `withParameters` | [Declaration](#api-language-environment-withparameters) |

### @wolfsblvt/diffdevil/policy

| Public export | Declared symbol | Signature / type |
| --- | --- | --- |
| `ActionShortcutOptions` | `ActionShortcutOptions` | [Declaration](#api-policy-action-shortcut-actionshortcutoptions) |
| `BandDefinition` | `BandDefinition` | [Declaration](#api-policy-bands-banddefinition) |
| `BandLabels` | `BandLabels` | [Declaration](#api-policy-types-bandlabels) |
| `BandRange` | `BandRange` | [Declaration](#api-policy-bands-bandrange) |
| `BooleanLabels` | `BooleanLabels` | [Declaration](#api-policy-types-booleanlabels) |
| `CommentDefinition` | `CommentDefinition` | [Declaration](#api-policy-types-commentdefinition) |
| `CompiledBands` | `CompiledBands` | [Declaration](#api-policy-bands-compiledbands) |
| `CompiledPolicy` | `CompiledPolicy` | [Declaration](#api-policy-compile-compiledpolicy) |
| `CompiledTemplate` | `CompiledTemplate` | [Declaration](#api-policy-templates-compiledtemplate) |
| `MetricDefinition` | `MetricDefinition` | [Declaration](#api-policy-types-metricdefinition) |
| `NormalizedPolicy` | `NormalizedPolicy` | [Declaration](#api-policy-types-normalizedpolicy) |
| `ParameterDefinition` | `ParameterDefinition` | [Declaration](#api-policy-types-parameterdefinition) |
| `ParameterType` | `ParameterType` | [Declaration](#api-policy-types-parametertype) |
| `PathOverrides` | `PathOverrides` | [Declaration](#api-policy-types-pathoverrides) |
| `PlanOptions` | `PlanOptions` | [Declaration](#api-policy-plan-planoptions) |
| `PolicyCompileOptions` | `PolicyCompileOptions` | [Declaration](#api-policy-compile-policycompileoptions) |
| `PolicyDocument` | `PolicyDocument` | [Declaration](#api-policy-types-policydocument) |
| `PolicyEvaluateOptions` | `PolicyEvaluateOptions` | [Declaration](#api-policy-evaluate-policyevaluateoptions) |
| `PolicyOrigin` | `PolicyOrigin` | [Declaration](#api-policy-types-policyorigin) |
| `PolicyQueryResult` | `PolicyQueryResult` | [Declaration](#api-policy-evaluate-policyqueryresult) |
| `PolicyQuerySelector` | `PolicyQuerySelector` | [Declaration](#api-policy-evaluate-policyqueryselector) |
| `PolicyResult` | `PolicyResult` | [Declaration](#api-policy-evaluate-policyresult) |
| `PolicySource` | `PolicySource` | [Declaration](#api-policy-source-policysource) |
| `RuleDefinition` | `RuleDefinition` | [Declaration](#api-policy-types-ruledefinition) |
| `SizeOverrides` | `SizeOverrides` | [Declaration](#api-policy-types-sizeoverrides) |
| `commentLifecycle` | `commentLifecycle` | [Declaration](#api-policy-templates-commentlifecycle) |
| `compileActionShortcut` | `compileActionShortcut` | [Declaration](#api-policy-action-shortcut-compileactionshortcut) |
| `compileBands` | `compileBands` | [Declaration](#api-policy-bands-compilebands) |
| `compilePolicy` | `compilePolicy` | [Declaration](#api-policy-compile-compilepolicy) |
| `compileTemplate` | `compileTemplate` | [Declaration](#api-policy-templates-compiletemplate) |
| `createPlan` | `createPlan` | [Declaration](#api-policy-plan-createplan) |
| `evaluatePolicy` | `evaluatePolicy` | [Declaration](#api-policy-evaluate-evaluatepolicy) |
| `evaluatePolicyQuery` | `evaluatePolicyQuery` | [Declaration](#api-policy-evaluate-evaluatepolicyquery) |
| `explainPolicy` | `explainPolicy` | [Declaration](#api-policy-compile-explainpolicy) |
| `formatPlan` | `formatPlan` | [Declaration](#api-policy-format-formatplan) |
| `readPlan` | `readPlan` | [Declaration](#api-policy-plan-readplan) |
| `readPolicyJson` | `readPolicyJson` | [Declaration](#api-policy-source-readpolicyjson) |
| `readPolicyYaml` | `readPolicyYaml` | [Declaration](#api-policy-yaml-readpolicyyaml) |
| `renderTemplate` | `renderTemplate` | [Declaration](#api-policy-templates-rendertemplate) |
| `resolveBand` | `resolveBand` | [Declaration](#api-policy-bands-resolveband) |

### @wolfsblvt/diffdevil/git

| Public export | Declared symbol | Signature / type |
| --- | --- | --- |
| `GitOptions` | `GitOptions` | [Declaration](#api-sources-git-gitoptions) |
| `analyzeGit` | `analyzeGit` | [Declaration](#api-sources-git-analyzegit) |

### @wolfsblvt/diffdevil/github

| Public export | Declared symbol | Signature / type |
| --- | --- | --- |
| `CommentAuthor` | `CommentAuthor` | [Declaration](#api-github-comments-commentauthor) |
| `DefinitionResult` | `DefinitionResult` | [Declaration](#api-github-labels-definitionresult) |
| `EffectObservation` | `EffectObservation` | [Declaration](#api-github-observation-effectobservation) |
| `GitHubApplyOptions` | `GitHubApplyOptions` | [Declaration](#api-github-apply-githubapplyoptions) |
| `GitHubApplyResult` | `GitHubApplyResult` | [Declaration](#api-github-apply-githubapplyresult) |
| `GitHubClient` | `GitHubClient` | [Declaration](#api-github-client-githubclient) |
| `GitHubClientOptions` | `GitHubClientOptions` | [Declaration](#api-github-client-githubclientoptions) |
| `GitHubPolicySource` | `GitHubPolicySource` | [Declaration](#api-github-policy-githubpolicysource) |
| `GitHubRequestError` | `GitHubRequestError` | [Declaration](#api-github-client-githubrequesterror) |
| `analyzeGitHub` | `analyzeGitHub` | [Declaration](#api-github-source-analyzegithub) |
| `analyzeGitHubGit` | `analyzeGitHubGit` | [Declaration](#api-github-source-analyzegithubgit) |
| `applyGitHubPolicy` | `applyGitHubPolicy` | [Declaration](#api-github-apply-applygithubpolicy) |
| `loadGitHubPolicy` | `loadGitHubPolicy` | [Declaration](#api-github-policy-loadgithubpolicy) |
| `readGitHubPolicy` | `readGitHubPolicy` | [Declaration](#api-github-policy-readgithubpolicy) |
| `readPullSnapshot` | `readPullSnapshot` | [Declaration](#api-github-source-readpullsnapshot) |
| `syncGitHubLabels` | `syncGitHubLabels` | [Declaration](#api-github-labels-syncgithublabels) |

### @wolfsblvt/diffdevil/browser

| Public export | Declared symbol | Signature / type |
| --- | --- | --- |
| `AppReportIdentity` | `AppReportIdentity` | [Declaration](#api-browser-app-appreportidentity) |
| `AppStanding` | `AppStanding` | [Declaration](#api-browser-app-appstanding) |
| `BROWSER_ADAPTER` | `BROWSER_ADAPTER` | [Declaration](#api-browser-acquisition-browser_adapter) |
| `BrowserComparison` | `BrowserComparison` | [Declaration](#api-browser-acquisition-browsercomparison) |
| `BrowserInput` | `BrowserInput` | [Declaration](#api-browser-acquisition-browserinput) |
| `BrowserPolicy` | `BrowserPolicy` | [Declaration](#api-browser-policy-browserpolicy) |
| `Diagnostic` | `Diagnostic` | [Declaration](#api-model-diagnostic) |
| `HUMAN_VIEW_VERSION` | `HUMAN_VIEW_VERSION` | [Declaration](#api-browser-view-human_view_version) |
| `HumanReportView` | `HumanReportView` | [Declaration](#api-browser-view-humanreportview) |
| `MAX_ACQUISITION_BYTES` | `MAX_ACQUISITION_BYTES` | [Declaration](#api-browser-acquisition-max_acquisition_bytes) |
| `NumericMeasurement` | `NumericMeasurement` | [Declaration](#api-model-numericmeasurement) |
| `PolicyLayers` | `PolicyLayers` | [Declaration](#api-browser-policy-policylayers) |
| `PolicyMode` | `PolicyMode` | [Declaration](#api-browser-policy-policymode) |
| `Rail` | `Rail` | [Declaration](#api-browser-view-rail) |
| `RailCell` | `RailCell` | [Declaration](#api-browser-view-railcell) |
| `Rendered` | `Rendered` | [Declaration](#api-format-rendered) |
| `Report` | `Report` | [Declaration](#api-model-report) |
| `ReportFormat` | `ReportFormat` | [Declaration](#api-format-reportformat) |
| `Result` | `Result` | [Declaration](#api-model-result) |
| `SEMANTICS` | `SEMANTICS` | [Declaration](#api-model-semantics) |
| `analyzeBrowserInput` | `analyzeBrowserInput` | [Declaration](#api-browser-acquisition-analyzebrowserinput) |
| `appStanding` | `appStanding` | [Declaration](#api-browser-app-appstanding) |
| `comparisonKey` | `comparisonKey` | [Declaration](#api-browser-acquisition-comparisonkey) |
| `compileBrowserPolicy` | `compileBrowserPolicy` | [Declaration](#api-browser-policy-compilebrowserpolicy) |
| `evidenceText` | `evidenceText` | [Declaration](#api-browser-text-evidencetext) |
| `formatReport` | `formatReport` | [Declaration](#api-format-formatreport) |
| `humanReport` | `humanReport` | [Declaration](#api-browser-view-humanreport) |
| `measurementText` | `measurementText` | [Declaration](#api-browser-text-measurementtext) |
| `readComparison` | `readComparison` | [Declaration](#api-browser-acquisition-readcomparison) |
| `readPolicyText` | `readPolicyText` | [Declaration](#api-browser-policy-readpolicytext) |
| `requiredTemplates` | `requiredTemplates` | [Declaration](#api-browser-policy-requiredtemplates) |
| `stringifyPolicy` | `stringify` | [Declaration](#api-node_modules-yaml-dist-public-api-stringify) |

### @wolfsblvt/diffdevil/browser/text

| Public export | Declared symbol | Signature / type |
| --- | --- | --- |
| `evidenceText` | `evidenceText` | [Declaration](#api-browser-text-evidencetext) |
| `measurementText` | `measurementText` | [Declaration](#api-browser-text-measurementtext) |

### Public declarations

<a id="api-browser-acquisition-analyzebrowserinput"></a>

#### `analyzeBrowserInput`

[Canonical source](../../../src/diffdevil/browser/acquisition.ts)

```typescript
export declare function analyzeBrowserInput(json: string): Result<Report>;
```

<a id="api-browser-acquisition-browser_adapter"></a>

#### `BROWSER_ADAPTER`

[Canonical source](../../../src/diffdevil/browser/acquisition.ts)

```typescript
declare const BROWSER_ADAPTER = "diffdevil.browser/1";
```

<a id="api-browser-acquisition-browsercomparison"></a>

#### `BrowserComparison`

[Canonical source](../../../src/diffdevil/browser/acquisition.ts)

```typescript
export interface BrowserComparison {
    readonly host: 'github.com';
    readonly repository: string;
    readonly pullRequest: number;
    readonly base: string;
    readonly head: string;
    readonly changedFiles?: number;
    readonly additions?: number;
    readonly deletions?: number;
}
```

<a id="api-browser-acquisition-browserinput"></a>

#### `BrowserInput`

[Canonical source](../../../src/diffdevil/browser/acquisition.ts)

```typescript
export type BrowserInput = {
    readonly comparison: BrowserComparison;
    readonly complete: boolean;
} & ({
    readonly format: 'diff';
    readonly text: string;
} | {
    readonly format: 'github-files';
    readonly files: readonly unknown[];
    readonly diff?: string;
});
```

<a id="api-browser-acquisition-comparisonkey"></a>

#### `comparisonKey`

[Canonical source](../../../src/diffdevil/browser/acquisition.ts)

```typescript
export declare function comparisonKey(input: BrowserComparison): string;
```

<a id="api-browser-acquisition-max_acquisition_bytes"></a>

#### `MAX_ACQUISITION_BYTES`

[Canonical source](../../../src/diffdevil/browser/acquisition.ts)

```typescript
declare const MAX_ACQUISITION_BYTES: number;
```

<a id="api-browser-acquisition-readcomparison"></a>

#### `readComparison`

[Canonical source](../../../src/diffdevil/browser/acquisition.ts)

```typescript
export declare function readComparison(input: unknown): BrowserComparison;
```

<a id="api-browser-app-appreportidentity"></a>

#### `AppReportIdentity`

[Canonical source](../../../src/diffdevil/browser/app.ts)

```typescript
export interface AppReportIdentity {
    readonly kind: 'diffdevil.browser-report';
    readonly version: 1;
    readonly comparison: BrowserComparison;
    readonly reportId: string;
    readonly policyDigest: string;
    readonly engine: string;
    readonly schema: string;
    readonly measurement: string;
    readonly presenter: string;
}
```

<a id="api-browser-app-appstanding"></a>

#### `AppStanding`

[Canonical source](../../../src/diffdevil/browser/app.ts)

```typescript
export type AppStanding = 'local' | 'matching' | 'policy-mismatch' | 'stale' | 'incompatible';
```

<a id="api-browser-policy-browserpolicy"></a>

#### `BrowserPolicy`

[Canonical source](../../../src/diffdevil/browser/policy.ts)

```typescript
export interface BrowserPolicy {
    readonly program: CompiledPolicy;
    readonly document: PolicyDocument;
    readonly origins: readonly PolicyOrigin[];
    readonly mode: PolicyMode;
    readonly digest: string;
    readonly layers: readonly string[];
}
```

<a id="api-browser-policy-compilebrowserpolicy"></a>

#### `compileBrowserPolicy`

[Canonical source](../../../src/diffdevil/browser/policy.ts)

```typescript
export declare function compileBrowserPolicy(json: string): Result<BrowserPolicy>;
```

<a id="api-browser-policy-policylayers"></a>

#### `PolicyLayers`

[Canonical source](../../../src/diffdevil/browser/policy.ts)

```typescript
export interface PolicyLayers {
    readonly mode: PolicyMode;
    readonly personal: string;
    readonly repository?: string;
    readonly override?: string;
    readonly templateFiles?: Readonly<Record<string, string>>;
}
```

<a id="api-browser-policy-policymode"></a>

#### `PolicyMode`

[Canonical source](../../../src/diffdevil/browser/policy.ts)

```typescript
export type PolicyMode = 'composed' | 'repository' | 'personal-only';
```

<a id="api-browser-policy-readpolicytext"></a>

#### `readPolicyText`

[Canonical source](../../../src/diffdevil/browser/policy.ts)

```typescript
export declare function readPolicyText(text: string, name?: string): Result<PolicyDocument>;
```

<a id="api-browser-policy-requiredtemplates"></a>

#### `requiredTemplates`

[Canonical source](../../../src/diffdevil/browser/policy.ts)

```typescript
export declare function requiredTemplates(json: string): Result<readonly string[]>;
```

<a id="api-browser-text-evidencetext"></a>

#### `evidenceText`

[Canonical source](../../../src/diffdevil/browser/text.ts)

```typescript
export declare function evidenceText(status: NumericMeasurement['status']): string;
```

<a id="api-browser-text-measurementtext"></a>

#### `measurementText`

[Canonical source](../../../src/diffdevil/browser/text.ts)

```typescript
export declare function measurementText(value: NumericMeasurement): string;
```

<a id="api-browser-view-human_view_version"></a>

#### `HUMAN_VIEW_VERSION`

[Canonical source](../../../src/diffdevil/browser/view.ts)

```typescript
declare const HUMAN_VIEW_VERSION = "diffdevil.human-view/1";
```

<a id="api-browser-view-humanreport"></a>

#### `humanReport`

[Canonical source](../../../src/diffdevil/browser/view.ts)

```typescript
export declare function humanReport(input: Report, policy?: BrowserPolicy, path?: string, errors?: readonly Diagnostic[]): Result<HumanReportView>;
```

<a id="api-browser-view-humanreportview"></a>

#### `HumanReportView`

[Canonical source](../../../src/diffdevil/browser/view.ts)

```typescript
export interface HumanReportView {
    readonly kind: typeof HUMAN_VIEW_VERSION;
    readonly report: Report;
    readonly focus?: FileRecord;
    readonly changed: NumericMeasurement;
    readonly added: NumericMeasurement;
    readonly deleted: NumericMeasurement;
    readonly modified: NumericMeasurement;
    readonly raw: Report['totals']['raw'];
    readonly evidence: Report['measurement'];
    readonly rails: readonly Rail[];
    readonly policy?: {
        readonly digest: string;
        readonly mode: string;
        readonly origins: BrowserPolicy['origins'];
        readonly layers: readonly string[];
    };
    readonly errors: readonly Diagnostic[];
}
```

<a id="api-browser-view-rail"></a>

#### `Rail`

[Canonical source](../../../src/diffdevil/browser/view.ts)

```typescript
export interface Rail {
    readonly id: string;
    readonly expression: string;
    readonly cells: readonly RailCell[];
    readonly selected?: string;
    readonly label?: string;
    readonly group?: string;
    readonly members?: readonly string[];
}
```

<a id="api-browser-view-railcell"></a>

#### `RailCell`

[Canonical source](../../../src/diffdevil/browser/view.ts)

```typescript
export interface RailCell {
    readonly id: string;
    readonly name: string;
    readonly lower?: number;
    readonly upper?: number;
    readonly color?: string;
    readonly label?: string;
    readonly selected: boolean;
}
```

<a id="api-errors-diffdevilerror"></a>

#### `DiffdevilError`

[Canonical source](../../../src/diffdevil/errors.ts)

```typescript
export declare class DiffdevilError extends Error {
    readonly diagnostic: Diagnostic;
    constructor(diagnostic: Diagnostic);
}
```

<a id="api-errors-unwrap"></a>

#### `unwrap`

[Canonical source](../../../src/diffdevil/errors.ts)

```typescript
export declare function unwrap<T>(result: Result<T>): T;
```

<a id="api-format-formatquery"></a>

#### `formatQuery`

[Canonical source](../../../src/diffdevil/format.ts)

```typescript
export declare function formatQuery(result: EvaluationResult, options?: {
    command?: 'query' | 'check';
    format?: QueryFormat;
    report?: Report;
}): Result<Rendered>;
```

<a id="api-format-formatreport"></a>

#### `formatReport`

[Canonical source](../../../src/diffdevil/format.ts)

```typescript
export declare function formatReport(report: Report, format?: ReportFormat, options?: TextPresentationOptions): Result<Rendered>;
```

<a id="api-format-rendered"></a>

#### `Rendered`

[Canonical source](../../../src/diffdevil/format.ts)

```typescript
export interface Rendered {
    readonly stdout: string;
    readonly exitCode: 0 | 1 | 2 | 3;
}
```

<a id="api-format-reportformat"></a>

#### `ReportFormat`

[Canonical source](../../../src/diffdevil/format.ts)

```typescript
export type ReportFormat = 'human' | 'markdown' | 'agent' | 'json' | 'jsonl' | 'env';
```

<a id="api-github-apply-applygithubpolicy"></a>

#### `applyGitHubPolicy`

[Canonical source](../../../src/diffdevil/github/apply.ts)

```typescript
export declare function applyGitHubPolicy(client: GitHubClient, target: PlanTarget, policy: CompiledPolicy, options?: GitHubApplyOptions): Promise<Result<GitHubApplyResult>>;
```

<a id="api-github-apply-githubapplyoptions"></a>

#### `GitHubApplyOptions`

[Canonical source](../../../src/diffdevil/github/apply.ts)

```typescript
export interface GitHubApplyOptions extends Pick<PolicyEvaluateOptions, 'parameters' | 'limits'> {
    readonly definitions?: 'none' | 'ensure' | 'sync' | 'verify';
    readonly inputReport?: Report;
    readonly trustReport?: boolean;
    readonly inputPlan?: EffectPlan;
    readonly commentAuthor?: CommentAuthor;
    readonly occasionId?: string;
    readonly rules?: readonly string[];
    readonly expectedPolicyBase?: string;
    readonly localGit?: {
        readonly cwd?: string;
    };
    readonly beforeWrite?: () => Promise<void>;
}
```

<a id="api-github-apply-githubapplyresult"></a>

#### `GitHubApplyResult`

[Canonical source](../../../src/diffdevil/github/apply.ts)

```typescript
export interface GitHubApplyResult {
    readonly kind: 'diffdevil.github-apply';
    readonly schemaVersion: '1.0';
    readonly status: 'verified' | 'incomplete';
    readonly changed: number;
    readonly report: Report;
    readonly plan: EffectPlan;
    readonly observations: readonly EffectObservation[];
    readonly diagnostics: readonly Diagnostic[];
}
```

<a id="api-github-client-githubclient"></a>

#### `GitHubClient`

[Canonical source](../../../src/diffdevil/github/client.ts)

```typescript
export declare class GitHubClient {
    #private;
    readonly apiUrl: string;
    readonly responseBytes: number;
    constructor(options?: GitHubClientOptions);
    url(route: string): URL;
    request(route: string, options?: RequestOptions): Promise<GitHubResponse>;
    private discardBody;
    private retryDelay;
    json(route: string, options?: RequestOptions): Promise<unknown>;
    list(route: string, options?: {
        maximumItems?: number;
    }): Promise<{
        items: unknown[];
        truncated: boolean;
    }>;
}
```

<a id="api-github-client-githubclientoptions"></a>

#### `GitHubClientOptions`

[Canonical source](../../../src/diffdevil/github/client.ts)

```typescript
export interface GitHubClientOptions {
    readonly token?: string;
    readonly apiUrl?: string;
    readonly fetch?: typeof globalThis.fetch;
    readonly signal?: AbortSignal;
    readonly timeoutMs?: number;
    readonly readRetries?: number;
    readonly responseBytes?: number;
    readonly sleep?: (milliseconds: number) => Promise<void>;
    readonly now?: () => number;
}
```

<a id="api-github-client-githubrequesterror"></a>

#### `GitHubRequestError`

[Canonical source](../../../src/diffdevil/github/client.ts)

```typescript
export declare class GitHubRequestError extends DiffdevilError {
    readonly status: number | undefined;
    readonly ambiguous: boolean;
    constructor(status: number | undefined, ambiguous: boolean, message: string, phase: Diagnostic['phase'], rateLimited?: boolean);
}
```

<a id="api-github-comments-commentauthor"></a>

#### `CommentAuthor`

[Canonical source](../../../src/diffdevil/github/comments.ts)

```typescript
export interface CommentAuthor {
    readonly login: string;
    readonly id?: number;
}
```

<a id="api-github-labels-definitionresult"></a>

#### `DefinitionResult`

[Canonical source](../../../src/diffdevil/github/labels.ts)

```typescript
export interface DefinitionResult {
    readonly kind: 'diffdevil.github-definitions';
    readonly schemaVersion: '1.0';
    readonly status: 'verified' | 'incomplete';
    readonly changed: number;
    readonly observations: readonly EffectObservation[];
    readonly diagnostics: readonly Diagnostic[];
}
```

<a id="api-github-labels-syncgithublabels"></a>

#### `syncGitHubLabels`

[Canonical source](../../../src/diffdevil/github/labels.ts)

```typescript
export declare function syncGitHubLabels(client: GitHubClient, repository: string, definitions: Readonly<Record<string, LabelDefinition>>, mode?: 'verify' | 'ensure' | 'sync', options?: {
    readonly assertCurrent?: () => Promise<void>;
}): Promise<Result<DefinitionResult>>;
```

<a id="api-github-observation-effectobservation"></a>

#### `EffectObservation`

[Canonical source](../../../src/diffdevil/github/observation.ts)

```typescript
export interface EffectObservation {
    readonly kind: string;
    readonly subject: string;
    outcome: 'changed' | 'unchanged' | 'unresolved';
    request: 'not-needed' | 'acknowledged' | 'ambiguous' | 'rejected';
    readback: 'verified' | 'failed' | 'unobserved';
}
```

<a id="api-github-policy-githubpolicysource"></a>

#### `GitHubPolicySource`

[Canonical source](../../../src/diffdevil/github/policy.ts)

```typescript
export interface GitHubPolicySource {
    readonly repository: string;
    readonly ref: string;
    readonly path: string;
}
```

<a id="api-github-policy-loadgithubpolicy"></a>

#### `loadGitHubPolicy`

[Canonical source](../../../src/diffdevil/github/policy.ts)

```typescript
export declare function loadGitHubPolicy(client: GitHubClient, source: GitHubPolicySource, options?: Pick<PolicyCompileOptions, 'presets' | 'paths' | 'limits'>): Promise<Result<CompiledPolicy>>;
```

<a id="api-github-policy-readgithubpolicy"></a>

#### `readGitHubPolicy`

[Canonical source](../../../src/diffdevil/github/policy.ts)

```typescript
export declare function readGitHubPolicy(client: GitHubClient, source: GitHubPolicySource, options?: Pick<PolicyCompileOptions, 'presets' | 'paths' | 'limits'>): Promise<CompiledPolicy>;
```

<a id="api-github-source-analyzegithub"></a>

#### `analyzeGitHub`

[Canonical source](../../../src/diffdevil/github/source.ts)

```typescript
export declare function analyzeGitHub(client: GitHubClient, target: PlanTarget, options?: Omit<AnalyzeOptions, 'source' | 'fileSet'>): Promise<Result<Report>>;
```

<a id="api-github-source-analyzegithubgit"></a>

#### `analyzeGitHubGit`

[Canonical source](../../../src/diffdevil/github/source.ts)

```typescript
export declare function analyzeGitHubGit(client: GitHubClient, target: PlanTarget, options?: Pick<GitOptions, 'cwd' | 'paths' | 'scopes' | 'maximumBytes'>): Promise<Result<Report>>;
```

<a id="api-github-source-readpullsnapshot"></a>

#### `readPullSnapshot`

[Canonical source](../../../src/diffdevil/github/source.ts)

```typescript
export declare function readPullSnapshot(client: GitHubClient, target: PlanTarget): Promise<PullSnapshot>;
```

<a id="api-language-ast-ast"></a>

#### `Ast`

[Canonical source](../../../src/diffdevil/language/ast.ts)

```typescript
export type Ast = (Node & {
    readonly kind: 'literal';
    readonly literalType: 'integer' | 'float' | 'string' | 'boolean' | 'null';
    readonly raw: string;
    readonly value: number | string | boolean | null;
}) | (Node & {
    readonly kind: 'identifier';
    readonly name: string;
}) | (Node & {
    readonly kind: 'member';
    readonly object: Ast;
    readonly key: string;
    readonly keySpan: SourceRange;
}) | (Node & {
    readonly kind: 'unary';
    readonly operator: UnaryOperator;
    readonly operatorSpan: SourceRange;
    readonly operand: Ast;
}) | (Node & {
    readonly kind: 'binary';
    readonly operator: BinaryOperator;
    readonly operatorSpan: SourceRange;
    readonly left: Ast;
    readonly right: Ast;
}) | (Node & {
    readonly kind: 'conditional';
    readonly condition: Ast;
    readonly whenTrue: Ast;
    readonly whenFalse: Ast;
}) | (Node & {
    readonly kind: 'call';
    readonly name: string;
    readonly nameSpan: SourceRange;
    readonly arguments: readonly Ast[];
}) | (Node & {
    readonly kind: 'lambda';
    readonly parameter: string;
    readonly parameterSpan: SourceRange;
    readonly body: Ast;
}) | (Node & {
    readonly kind: 'list';
    readonly items: readonly Ast[];
}) | (Node & {
    readonly kind: 'record';
    readonly fields: readonly {
        readonly key: string;
        readonly keySpan: SourceRange;
        readonly value: Ast;
    }[];
});
```

<a id="api-language-compile-compileast"></a>

#### `compileAst`

[Canonical source](../../../src/diffdevil/language/compile.ts)

```typescript
export declare function compileAst(input: Ast, options: CompileOptions): Result<CompiledExpression>;
```

<a id="api-language-compile-compiledexpression"></a>

#### `CompiledExpression`

[Canonical source](../../../src/diffdevil/language/compile.ts)

```typescript
export interface CompiledExpression {
    readonly kind: 'diffdevil.expression';
    readonly language: 'diffdevil-expr/1';
    readonly resultType: Type;
    readonly schemaId: string;
    readonly dependencies: readonly string[];
}
```

<a id="api-language-compile-compileoptions"></a>

#### `CompileOptions`

[Canonical source](../../../src/diffdevil/language/compile.ts)

```typescript
export interface CompileOptions {
    readonly environment: Schema;
    readonly context?: ExpressionContext;
    readonly limits?: EvaluationLimits;
}
```

<a id="api-language-environment-createenvironment"></a>

#### `createEnvironment`

[Canonical source](../../../src/diffdevil/language/environment.ts)

```typescript
export declare function createEnvironment(inputSchema: Schema, inputValues: Readonly<Record<string, Value>>): Result<EvaluationEnvironment>;
```

<a id="api-language-environment-environmentfromreport"></a>

#### `environmentFromReport`

[Canonical source](../../../src/diffdevil/language/environment.ts)

```typescript
export declare function environmentFromReport(input: Report): Result<EvaluationEnvironment>;
```

<a id="api-language-environment-evaluationenvironment"></a>

#### `EvaluationEnvironment`

[Canonical source](../../../src/diffdevil/language/environment.ts)

```typescript
export interface EvaluationEnvironment {
    readonly schema: Schema;
    readonly schemaId: string;
    readonly values: Readonly<Record<string, Value>>;
}
```

<a id="api-language-environment-withparameters"></a>

#### `withParameters`

[Canonical source](../../../src/diffdevil/language/environment.ts)

```typescript
export declare function withParameters(env: EvaluationEnvironment, schema: Schema, values: Readonly<Record<string, Value>>): Result<EvaluationEnvironment>;
```

<a id="api-language-evaluate-evaluateexpression"></a>

#### `evaluateExpression`

[Canonical source](../../../src/diffdevil/language/evaluate.ts)

```typescript
export declare function evaluateExpression(program: CompiledExpression, environment: EvaluationEnvironment, options?: EvaluateOptions): Result<EvaluationResult>;
```

<a id="api-language-evaluate-evaluationresult"></a>

#### `EvaluationResult`

[Canonical source](../../../src/diffdevil/language/evaluate.ts)

```typescript
export interface EvaluationResult {
    readonly value: Value;
    readonly evidence: readonly Reason[];
    readonly work: number;
}
```

<a id="api-language-shortcuts-compileshortcut"></a>

#### `compileShortcut`

[Canonical source](../../../src/diffdevil/language/shortcuts.ts)

```typescript
export declare function compileShortcut(input: Shortcut, options: Omit<CompileOptions, 'context'>): Result<CompiledExpression>;
```

<a id="api-language-shortcuts-expandshortcut"></a>

#### `expandShortcut`

[Canonical source](../../../src/diffdevil/language/shortcuts.ts)

```typescript
export declare function expandShortcut(input: Shortcut): Result<{
    readonly expression: string;
}>;
```

<a id="api-language-shortcuts-shortcut"></a>

#### `Shortcut`

[Canonical source](../../../src/diffdevil/language/shortcuts.ts)

```typescript
export interface Shortcut {
    readonly kind: 'query' | 'check';
    readonly metric?: string;
    readonly files?: true | 'any' | 'all';
    readonly scope?: string;
    readonly paths?: readonly string[];
    readonly allFiles?: boolean;
    readonly certain?: boolean;
    readonly select?: readonly string[];
    readonly comparison?: {
        readonly operator: string;
        readonly value: number;
        readonly numericType?: NumericType;
    };
    readonly status?: 'exact' | 'bounded' | 'unknown' | 'unmeasurable';
}
```

<a id="api-language-source-expressionsource"></a>

#### `ExpressionSource`

[Canonical source](../../../src/diffdevil/language/source.ts)

```typescript
export interface ExpressionSource {
    readonly text: string;
    readonly language: 'diffdevil-expr/1';
    readonly name?: string;
}
```

<a id="api-language-source-sourceposition"></a>

#### `sourcePosition`

[Canonical source](../../../src/diffdevil/language/source.ts)

```typescript
export declare function sourcePosition(text: string, offset: number): {
    line: number;
    column: number;
};
```

<a id="api-language-text-compileexpression"></a>

#### `compileExpression`

[Canonical source](../../../src/diffdevil/language/text.ts)

```typescript
export declare function compileExpression(source: string | ExpressionSource, options: CompileOptions): Result<CompiledExpression>;
```

<a id="api-language-text-parseexpression"></a>

#### `parseExpression`

[Canonical source](../../../src/diffdevil/language/text.ts)

```typescript
export declare function parseExpression(source: string | ExpressionSource, options?: {
    readonly limits?: EvaluationLimits;
}): Result<Ast>;
```

<a id="api-language-types-collection"></a>

#### `collection`

[Canonical source](../../../src/diffdevil/language/types.ts)

```typescript
declare const collection: (item: Type) => Type;
```

<a id="api-language-types-optional"></a>

#### `optional`

[Canonical source](../../../src/diffdevil/language/types.ts)

```typescript
declare const optional: (item: Type) => Type;
```

<a id="api-language-types-recordtype"></a>

#### `recordType`

[Canonical source](../../../src/diffdevil/language/types.ts)

```typescript
declare const recordType: (fields: Schema) => Type;
```

<a id="api-language-types-schema"></a>

#### `Schema`

[Canonical source](../../../src/diffdevil/language/types.ts)

```typescript
export type Schema = Readonly<Record<string, Type>>;
```

<a id="api-language-values-boolvalue"></a>

#### `boolValue`

[Canonical source](../../../src/diffdevil/language/values.ts)

```typescript
declare const boolValue: (value: boolean | Decision) => BooleanValue;
```

<a id="api-language-values-completecollection"></a>

#### `completeCollection`

[Canonical source](../../../src/diffdevil/language/values.ts)

```typescript
declare const completeCollection: (values: readonly Value[]) => CollectionValue;
```

<a id="api-language-values-recordvalue"></a>

#### `recordValue`

[Canonical source](../../../src/diffdevil/language/values.ts)

```typescript
declare const recordValue: (fields: Readonly<Record<string, Value>>) => Value;
```

<a id="api-language-values-textvalue"></a>

#### `textValue`

[Canonical source](../../../src/diffdevil/language/values.ts)

```typescript
declare const textValue: (value: string) => Value;
```

<a id="api-model-bandresult"></a>

#### `BandResult`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export type BandResult = {
    readonly status: 'resolved';
    readonly id: string;
    readonly lower?: number;
    readonly upper?: number;
} | {
    readonly status: 'unknown';
    readonly candidates: readonly string[];
    readonly reasons: readonly Reason[];
};
```

<a id="api-model-booleanvalue"></a>

#### `BooleanValue`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface BooleanValue {
    readonly kind: 'boolean';
    readonly decision: Decision;
}
```

<a id="api-model-collectionvalue"></a>

#### `CollectionValue`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface CollectionValue {
    readonly kind: 'collection';
    readonly items: readonly {
        readonly membership: 'definite' | 'possible';
        readonly value: Value;
    }[];
    readonly unseen: {
        readonly possible: boolean;
        readonly minimum: number;
        readonly maximum?: number;
    };
    readonly order: 'known' | 'unknown';
    readonly cardinality?: NumericMeasurement;
    readonly notes?: readonly Reason[];
}
```

<a id="api-model-decision"></a>

#### `Decision`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export type Decision = {
    readonly status: 'resolved';
    readonly value: boolean;
} | {
    readonly status: 'unknown';
    readonly reasons: readonly Reason[];
};
```

<a id="api-model-diagnostic"></a>

#### `Diagnostic`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface Diagnostic {
    readonly code: string;
    readonly phase: 'source' | 'config' | 'lex' | 'parse' | 'bind' | 'type' | 'evaluate' | 'format' | 'plan' | 'apply';
    readonly severity: 'error' | 'warning' | 'information';
    readonly message: string;
    readonly range?: SourceRange;
    readonly precision?: 'character' | 'scalar';
    readonly configPath?: string;
    readonly related?: readonly {
        readonly message: string;
        readonly range: SourceRange;
    }[];
    readonly details?: Readonly<Record<string, unknown>>;
}
```

<a id="api-model-diffsourceidentity"></a>

#### `DiffSourceIdentity`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface DiffSourceIdentity {
    readonly kind: 'git' | 'unified-diff' | 'github-api';
    readonly comparisonId: string;
    readonly base?: string;
    readonly head?: string;
    readonly baseTip?: string;
    readonly comparison?: 'three-dot' | 'direct' | 'worktree' | 'staged' | 'supplied';
    readonly repository?: string;
    readonly pullRequest?: number;
}
```

<a id="api-model-effectoperation"></a>

#### `EffectOperation`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export type EffectOperation = {
    readonly kind: 'label.ensure' | 'label.sync';
    readonly rule?: string;
    readonly name: string;
    readonly definition: LabelDefinition;
} | {
    readonly kind: 'label.add' | 'label.remove';
    readonly rule: string;
    readonly name: string;
} | {
    readonly kind: 'label.select';
    readonly rule: string;
    readonly group: string;
    readonly members: readonly string[];
    readonly selected: string;
} | {
    readonly kind: 'comment.reconcile';
    readonly rule: string;
    readonly mode: 'create' | 'once' | 'upsert' | 'once-per-transition';
    readonly trigger: 'always' | 'matched' | 'band-changed';
    readonly body: string;
    readonly occasionId?: string;
};
```

<a id="api-model-effectplan"></a>

#### `EffectPlan`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface EffectPlan {
    readonly kind: 'diffdevil.plan';
    readonly schemaVersion: '1.0';
    readonly semantics: Semantics;
    readonly stage: 'desired' | 'materialized';
    readonly source: DiffSourceIdentity;
    readonly reportId: string;
    readonly policyId: string;
    readonly target: PlanTarget;
    readonly operations: readonly EffectOperation[];
    readonly held: readonly {
        readonly rule: string;
        readonly reasons: readonly Reason[];
    }[];
    readonly rules: Readonly<Record<string, RuleResult>>;
    readonly preconditions?: {
        readonly head?: string;
        readonly base?: string;
        readonly providerStateId?: string;
    };
}
```

<a id="api-model-filerecord"></a>

#### `FileRecord`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface FileRecord {
    readonly id: string;
    readonly path: string;
    readonly oldPath?: string;
    readonly changeType: 'added' | 'deleted' | 'modified' | 'renamed' | 'copied' | 'type-changed' | 'unmerged';
    readonly kind: 'text' | 'binary' | 'submodule' | 'unknown';
    readonly included: boolean;
    readonly raw: RawMeasurements;
    readonly lines: LineMeasurements;
    readonly measurement: MeasurementSummary;
    readonly inclusionReasons?: readonly Reason[];
    readonly family?: {
        readonly id: string;
        readonly rawCountsExact: boolean;
        readonly blocksComplete: boolean;
    };
}
```

<a id="api-model-fileset"></a>

#### `FileSet`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface FileSet {
    readonly complete: boolean;
    readonly total: NumericMeasurement;
}
```

<a id="api-model-labeldefinition"></a>

#### `LabelDefinition`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface LabelDefinition {
    readonly color: string;
    readonly description: string;
}
```

<a id="api-model-linemeasurements"></a>

#### `LineMeasurements`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface LineMeasurements {
    readonly added: NumericMeasurement;
    readonly deleted: NumericMeasurement;
    readonly modified: NumericMeasurement;
    readonly changed: NumericMeasurement;
}
```

<a id="api-model-measurementsummary"></a>

#### `MeasurementSummary`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface MeasurementSummary {
    readonly status: NumericMeasurement['status'];
    readonly reasons: readonly Reason[];
}
```

<a id="api-model-numbervalue"></a>

#### `NumberValue`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface NumberValue {
    readonly kind: 'number';
    readonly numericType: NumericType;
    readonly measurement: NumericMeasurement;
}
```

<a id="api-model-numericmeasurement"></a>

#### `NumericMeasurement`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export type NumericMeasurement = {
    readonly status: 'exact';
    readonly value: number;
} | {
    readonly status: 'bounded';
    readonly lower: number;
    readonly upper: number;
} | {
    readonly status: 'unknown';
    readonly reasons: readonly Reason[];
    readonly lower?: number;
    readonly upper?: number;
} | {
    readonly status: 'unmeasurable';
    readonly reasons: readonly Reason[];
};
```

<a id="api-model-numerictype"></a>

#### `NumericType`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export type NumericType = 'integer' | 'float';
```

<a id="api-model-pathpolicy"></a>

#### `PathPolicy`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface PathPolicy {
    readonly includeOnly?: readonly string[];
    readonly exclude?: readonly string[];
    readonly forceInclude?: readonly string[];
}
```

<a id="api-model-plantarget"></a>

#### `PlanTarget`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface PlanTarget {
    readonly repository: string;
    readonly pullRequest: number;
}
```

<a id="api-model-rawmeasurements"></a>

#### `RawMeasurements`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface RawMeasurements {
    readonly added: NumericMeasurement;
    readonly deleted: NumericMeasurement;
    readonly churn: NumericMeasurement;
}
```

<a id="api-model-reason"></a>

#### `Reason`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface Reason {
    readonly code: string;
    readonly subject?: string;
    readonly message?: string;
}
```

<a id="api-model-report"></a>

#### `Report`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface Report {
    readonly kind: 'diffdevil.report';
    readonly schemaVersion: '1.0';
    readonly semantics: Semantics;
    readonly source: DiffSourceIdentity;
    readonly measurement: MeasurementSummary;
    readonly fileSet: FileSet;
    readonly totals: Totals;
    readonly files: readonly FileRecord[];
    readonly scopes?: Readonly<Record<string, ScopeRecord>>;
    readonly rules?: Readonly<Record<string, RuleResult>>;
    readonly metrics?: Readonly<Record<string, NumericMeasurement>>;
    readonly metricTypes?: Readonly<Record<string, NumericType>>;
    readonly bands?: Readonly<Record<string, BandResult>>;
    readonly reportId?: string;
    readonly policyId?: string;
}
```

<a id="api-model-result"></a>

#### `Result`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export type Result<T> = {
    readonly ok: true;
    readonly value: T;
    readonly diagnostics: readonly Diagnostic[];
} | {
    readonly ok: false;
    readonly diagnostics: readonly Diagnostic[];
};
```

<a id="api-model-ruleresult"></a>

#### `RuleResult`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface RuleResult {
    readonly decision?: Decision;
    readonly band?: BandResult;
    readonly disposition: 'matched' | 'unmatched' | 'held' | 'fallback';
}
```

<a id="api-model-scoperecord"></a>

#### `ScopeRecord`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface ScopeRecord {
    readonly fileIds: readonly string[];
    readonly fileSet: FileSet;
    readonly totals: Totals;
}
```

<a id="api-model-semantics"></a>

#### `SEMANTICS`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
declare const SEMANTICS: Semantics;
```

<a id="api-model-sourcerange"></a>

#### `SourceRange`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface SourceRange {
    readonly source?: string;
    readonly start: number;
    readonly end: number;
}
```

<a id="api-model-totals"></a>

#### `Totals`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export interface Totals {
    readonly raw: RawMeasurements;
    readonly lines: LineMeasurements;
    readonly files: Readonly<Record<string, NumericMeasurement>>;
}
```

<a id="api-model-typedescriptor"></a>

#### `TypeDescriptor`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export type TypeDescriptor = 'integer' | 'float' | 'boolean' | 'string' | 'null' | 'never' | {
    readonly kind: 'optional' | 'collection';
    readonly item: TypeDescriptor;
} | {
    readonly kind: 'record';
    readonly fields: Readonly<Record<string, TypeDescriptor>>;
};
```

<a id="api-model-value"></a>

#### `Value`

[Canonical source](../../../src/diffdevil/model.ts)

```typescript
export type Value = NumberValue | BooleanValue | {
    readonly kind: 'string';
    readonly value: string;
} | {
    readonly kind: 'null' | 'missing';
} | {
    readonly kind: 'unknown';
    readonly type: TypeDescriptor;
    readonly reasons: readonly Reason[];
} | {
    readonly kind: 'record';
    readonly fields: Readonly<Record<string, Value>>;
} | CollectionValue;
```

<a id="api-node_modules-yaml-dist-public-api-stringify"></a>

#### `stringify`

`node_modules/yaml/dist/public-api.d.ts` · [Dependency identity](../../../package-lock.json)

```typescript
export declare function stringify(value: any, options?: DocumentOptions & SchemaOptions & ParseOptions & CreateNodeOptions & ToStringOptions): string;
export declare function stringify(value: any, replacer?: Replacer | null, options?: string | number | (DocumentOptions & SchemaOptions & ParseOptions & CreateNodeOptions & ToStringOptions)): string;
```

<a id="api-numeric-integer"></a>

#### `integer`

[Canonical source](../../../src/diffdevil/numeric.ts)

```typescript
declare const integer: (value: number) => NumberValue;
```

<a id="api-numeric-numbervalue"></a>

#### `numberValue`

[Canonical source](../../../src/diffdevil/numeric.ts)

```typescript
export declare function numberValue(measurement: NumericMeasurement, numericType?: NumericType): NumberValue;
```

<a id="api-policy-action-shortcut-actionshortcutoptions"></a>

#### `ActionShortcutOptions`

[Canonical source](../../../src/diffdevil/policy/action-shortcut.ts)

```typescript
export interface ActionShortcutOptions extends Pick<PolicyCompileOptions, 'limits' | 'presets'> {
    readonly entryPoint?: 'root' | 'analyze';
}
```

<a id="api-policy-action-shortcut-compileactionshortcut"></a>

#### `compileActionShortcut`

[Canonical source](../../../src/diffdevil/policy/action-shortcut.ts)

```typescript
export declare function compileActionShortcut(input: Readonly<Record<string, string>>, options?: ActionShortcutOptions): ReturnType<typeof compilePolicyWithSyntax>;
```

<a id="api-policy-bands-banddefinition"></a>

#### `BandDefinition`

[Canonical source](../../../src/diffdevil/policy/bands.ts)

```typescript
export interface BandDefinition {
    readonly minimum?: number;
    readonly ranges: readonly BandRange[];
}
```

<a id="api-policy-bands-bandrange"></a>

#### `BandRange`

[Canonical source](../../../src/diffdevil/policy/bands.ts)

```typescript
export interface BandRange {
    readonly id: string;
    readonly lt?: number;
    readonly otherwise?: true;
}
```

<a id="api-policy-bands-compilebands"></a>

#### `compileBands`

[Canonical source](../../../src/diffdevil/policy/bands.ts)

```typescript
export declare function compileBands(input: BandDefinition): Result<CompiledBands>;
```

<a id="api-policy-bands-compiledbands"></a>

#### `CompiledBands`

[Canonical source](../../../src/diffdevil/policy/bands.ts)

```typescript
export interface CompiledBands {
    readonly ids: readonly string[];
}
```

<a id="api-policy-bands-resolveband"></a>

#### `resolveBand`

[Canonical source](../../../src/diffdevil/policy/bands.ts)

```typescript
export declare function resolveBand(program: CompiledBands, input: NumericMeasurement): Result<BandResult>;
```

<a id="api-policy-compile-compiledpolicy"></a>

#### `CompiledPolicy`

[Canonical source](../../../src/diffdevil/policy/compile.ts)

```typescript
export interface CompiledPolicy {
    readonly kind: 'diffdevil.policy';
    readonly id: string;
    readonly semantics: Semantics;
    readonly requiredParameters: readonly string[];
}
```

<a id="api-policy-compile-compilepolicy"></a>

#### `compilePolicy`

[Canonical source](../../../src/diffdevil/policy/compile.ts)

```typescript
export declare function compilePolicy(input?: unknown, options?: PolicyCompileOptions): Result<CompiledPolicy>;
```

<a id="api-policy-compile-explainpolicy"></a>

#### `explainPolicy`

[Canonical source](../../../src/diffdevil/policy/compile.ts)

```typescript
export declare function explainPolicy(policy: CompiledPolicy): Omit<Normalization, 'generated'>;
```

<a id="api-policy-compile-policycompileoptions"></a>

#### `PolicyCompileOptions`

[Canonical source](../../../src/diffdevil/policy/compile.ts)

```typescript
export interface PolicyCompileOptions extends NormalizeOptions {
    readonly sourceName?: string;
    readonly limits?: EvaluationLimits;
    readonly templateFiles?: Readonly<Record<string, string>>;
}
```

<a id="api-policy-evaluate-evaluatepolicy"></a>

#### `evaluatePolicy`

[Canonical source](../../../src/diffdevil/policy/evaluate.ts)

```typescript
export declare function evaluatePolicy(policy: CompiledPolicy, report: Report, options?: PolicyEvaluateOptions): Result<PolicyResult>;
```

<a id="api-policy-evaluate-evaluatepolicyquery"></a>

#### `evaluatePolicyQuery`

[Canonical source](../../../src/diffdevil/policy/evaluate.ts)

```typescript
export declare function evaluatePolicyQuery(policy: CompiledPolicy, report: Report, selector: PolicyQuerySelector, options?: PolicyEvaluateOptions & {
    readonly context?: 'query' | 'condition';
}): Result<PolicyQueryResult>;
```

<a id="api-policy-evaluate-policyevaluateoptions"></a>

#### `PolicyEvaluateOptions`

[Canonical source](../../../src/diffdevil/policy/evaluate.ts)

```typescript
export interface PolicyEvaluateOptions {
    readonly parameters?: Readonly<Record<string, unknown>>;
    readonly limits?: EvaluationLimits;
    readonly phase?: 'analyze' | 'rules';
}
```

<a id="api-policy-evaluate-policyqueryresult"></a>

#### `PolicyQueryResult`

[Canonical source](../../../src/diffdevil/policy/evaluate.ts)

```typescript
export interface PolicyQueryResult {
    readonly report: Report;
    readonly result: EvaluationResult;
}
```

<a id="api-policy-evaluate-policyqueryselector"></a>

#### `PolicyQuerySelector`

[Canonical source](../../../src/diffdevil/policy/evaluate.ts)

```typescript
export type PolicyQuerySelector = string | ExpressionSource | Shortcut | {
    readonly query: string;
} | {
    readonly band: string;
};
```

<a id="api-policy-evaluate-policyresult"></a>

#### `PolicyResult`

[Canonical source](../../../src/diffdevil/policy/evaluate.ts)

```typescript
export interface PolicyResult {
    readonly report: Report;
    readonly policyId: string;
    readonly rules: Readonly<Record<string, RuleResult>>;
    readonly evidence: readonly Reason[];
    readonly work: number;
}
```

<a id="api-policy-format-formatplan"></a>

#### `formatPlan`

[Canonical source](../../../src/diffdevil/policy/format.ts)

```typescript
export declare function formatPlan(plan: EffectPlan, format?: string, options?: TextPresentationOptions): Result<Rendered>;
```

<a id="api-policy-plan-createplan"></a>

#### `createPlan`

[Canonical source](../../../src/diffdevil/policy/plan.ts)

```typescript
export declare function createPlan(result: PolicyResult, target: PlanTarget, options?: PlanOptions): Result<EffectPlan>;
```

<a id="api-policy-plan-planoptions"></a>

#### `PlanOptions`

[Canonical source](../../../src/diffdevil/policy/plan.ts)

```typescript
export interface PlanOptions {
    readonly definitions?: 'none' | 'ensure' | 'sync';
    readonly rules?: readonly string[];
}
```

<a id="api-policy-plan-readplan"></a>

#### `readPlan`

[Canonical source](../../../src/diffdevil/policy/plan.ts)

```typescript
export declare function readPlan(input: unknown): Result<EffectPlan>;
```

<a id="api-policy-source-policysource"></a>

#### `PolicySource`

[Canonical source](../../../src/diffdevil/policy/source.ts)

```typescript
export interface PolicySource {
    readonly kind: 'diffdevil.policy-source';
    readonly format: 'json' | 'yaml';
    readonly name: string;
    readonly document: unknown;
}
```

<a id="api-policy-source-readpolicyjson"></a>

#### `readPolicyJson`

[Canonical source](../../../src/diffdevil/policy/source.ts)

```typescript
export declare function readPolicyJson(text: string, options?: {
    readonly name?: string;
    readonly limits?: EvaluationLimits;
}): Result<PolicySource>;
```

<a id="api-policy-templates-commentlifecycle"></a>

#### `commentLifecycle`

[Canonical source](../../../src/diffdevil/policy/templates.ts)

```typescript
export declare function commentLifecycle(mode: string | undefined, trigger: string | undefined, rule: 'boolean' | 'band'): {
    mode: 'create' | 'once' | 'upsert' | 'once-per-transition';
    trigger: 'always' | 'matched' | 'band-changed';
};
```

<a id="api-policy-templates-compiledtemplate"></a>

#### `CompiledTemplate`

[Canonical source](../../../src/diffdevil/policy/templates.ts)

```typescript
export interface CompiledTemplate {
    readonly kind: 'diffdevil.template';
    readonly schemaId: string;
}
```

<a id="api-policy-templates-compiletemplate"></a>

#### `compileTemplate`

[Canonical source](../../../src/diffdevil/policy/templates.ts)

```typescript
export declare function compileTemplate(text: string, schema: Schema, limits?: EvaluationLimits): Result<CompiledTemplate>;
```

<a id="api-policy-templates-rendertemplate"></a>

#### `renderTemplate`

[Canonical source](../../../src/diffdevil/policy/templates.ts)

```typescript
export declare function renderTemplate(program: CompiledTemplate, environment: EvaluationEnvironment, limits?: EvaluationLimits): Result<string>;
```

<a id="api-policy-types-bandlabels"></a>

#### `BandLabels`

[Canonical source](../../../src/diffdevil/policy/types.ts)

```typescript
export interface BandLabels {
    readonly group: string;
    readonly byBand: Readonly<Record<string, string>>;
    readonly unknown?: string;
}
```

<a id="api-policy-types-booleanlabels"></a>

#### `BooleanLabels`

[Canonical source](../../../src/diffdevil/policy/types.ts)

```typescript
export interface BooleanLabels {
    readonly add: readonly string[];
    readonly removeWhenFalse?: boolean;
}
```

<a id="api-policy-types-commentdefinition"></a>

#### `CommentDefinition`

[Canonical source](../../../src/diffdevil/policy/types.ts)

```typescript
export type CommentDefinition = {
    readonly mode: 'create' | 'once' | 'upsert' | 'once-per-transition';
    readonly trigger?: 'always' | 'matched' | 'band-changed';
} & ({
    readonly template: string;
    readonly templateFile?: never;
} | {
    readonly templateFile: string;
    readonly template?: never;
});
```

<a id="api-policy-types-metricdefinition"></a>

#### `MetricDefinition`

[Canonical source](../../../src/diffdevil/policy/types.ts)

```typescript
export type MetricDefinition = {
    readonly measure: string;
    readonly scope?: string;
    readonly formula?: never;
} | {
    readonly formula: string;
    readonly measure?: never;
    readonly scope?: never;
};
```

<a id="api-policy-types-normalizedpolicy"></a>

#### `NormalizedPolicy`

[Canonical source](../../../src/diffdevil/policy/types.ts)

```typescript
export interface NormalizedPolicy {
    readonly document: PolicyDocument;
    readonly semantics: Semantics;
    readonly origins: readonly PolicyOrigin[];
}
```

<a id="api-policy-types-parameterdefinition"></a>

#### `ParameterDefinition`

[Canonical source](../../../src/diffdevil/policy/types.ts)

```typescript
export type ParameterDefinition = {
    readonly type: ParameterType;
} & ({
    readonly default: number | boolean | string;
    readonly required?: never;
} | {
    readonly required: true;
    readonly default?: never;
});
```

<a id="api-policy-types-parametertype"></a>

#### `ParameterType`

[Canonical source](../../../src/diffdevil/policy/types.ts)

```typescript
export type ParameterType = 'integer' | 'float' | 'boolean' | 'string';
```

<a id="api-policy-types-pathoverrides"></a>

#### `PathOverrides`

[Canonical source](../../../src/diffdevil/policy/types.ts)

```typescript
export interface PathOverrides extends PathPolicy {
    readonly excludeMode?: 'append' | 'replace';
    readonly includeOnlyMode?: 'append' | 'replace';
    readonly forceIncludeMode?: 'append' | 'replace';
}
```

<a id="api-policy-types-policydocument"></a>

#### `PolicyDocument`

[Canonical source](../../../src/diffdevil/policy/types.ts)

```typescript
export interface PolicyDocument {
    readonly version: 1;
    readonly language?: 'diffdevil-expr/1';
    readonly presets?: readonly 'size@1'[];
    readonly size?: SizeOverrides;
    readonly measurement?: {
        readonly replacementLines: 'replacement-lines-v1';
    };
    readonly defaults?: {
        readonly paths?: PathPolicy;
    };
    readonly scopes?: Readonly<Record<string, PathPolicy>>;
    readonly parameters?: Readonly<Record<string, ParameterDefinition>>;
    readonly metrics?: Readonly<Record<string, MetricDefinition>>;
    readonly bands?: Readonly<Record<string, BandDefinition & {
        readonly value: string;
    }>>;
    readonly queries?: Readonly<Record<string, {
        readonly expression: string;
    }>>;
    readonly labelGroups?: Readonly<Record<string, readonly string[]>>;
    readonly labelDefinitions?: Readonly<Record<string, LabelDefinition>>;
    readonly rules?: Readonly<Record<string, RuleDefinition>>;
}
```

<a id="api-policy-types-policyorigin"></a>

#### `PolicyOrigin`

[Canonical source](../../../src/diffdevil/policy/types.ts)

```typescript
export interface PolicyOrigin {
    readonly path: string;
    readonly layer: string;
    readonly replaces?: string;
}
```

<a id="api-policy-types-ruledefinition"></a>

#### `RuleDefinition`

[Canonical source](../../../src/diffdevil/policy/types.ts)

```typescript
export type RuleDefinition = {
    readonly onUnknown?: 'hold' | 'fail';
} & ({
    readonly when: string;
    readonly band?: never;
    readonly effects?: {
        readonly labels?: BooleanLabels;
        readonly comment?: CommentDefinition;
    };
} | {
    readonly band: string;
    readonly when?: never;
    readonly effects?: {
        readonly labels?: BandLabels;
        readonly comment?: CommentDefinition;
    };
});
```

<a id="api-policy-types-sizeoverrides"></a>

#### `SizeOverrides`

[Canonical source](../../../src/diffdevil/policy/types.ts)

```typescript
export interface SizeOverrides {
    readonly metric?: string;
    readonly thresholds?: {
        readonly xs: number;
        readonly s: number;
        readonly m: number;
        readonly l: number;
    };
    readonly labels?: {
        readonly xs: string;
        readonly s: string;
        readonly m: string;
        readonly l: string;
        readonly xl: string;
        readonly unknown: string;
    };
}
```

<a id="api-policy-yaml-readpolicyyaml"></a>

#### `readPolicyYaml`

[Canonical source](../../../src/diffdevil/policy/yaml.ts)

```typescript
export declare function readPolicyYaml(text: string, options?: {
    readonly name?: string;
    readonly limits?: EvaluationLimits;
}): Result<PolicySource>;
```

<a id="api-presentation-presentationdetail"></a>

#### `PresentationDetail`

[Canonical source](../../../src/diffdevil/presentation.ts)

```typescript
export type PresentationDetail = 'summary' | 'full';
```

<a id="api-presentation-textpresentationoptions"></a>

#### `TextPresentationOptions`

[Canonical source](../../../src/diffdevil/presentation.ts)

```typescript
export interface TextPresentationOptions {
    readonly detail?: PresentationDetail;
    readonly color?: boolean;
}
```

<a id="api-report-analyzechanges"></a>

#### `analyzeChanges`

[Canonical source](../../../src/diffdevil/report.ts)

```typescript
export declare function analyzeChanges(changes: readonly ChangeInput[], options?: AnalyzeOptions): Result<Report>;
```

<a id="api-report-analyzediff"></a>

#### `analyzeDiff`

[Canonical source](../../../src/diffdevil/report.ts)

```typescript
export declare function analyzeDiff(text: string, options?: AnalyzeOptions): Result<Report>;
```

<a id="api-report-analyzeoptions"></a>

#### `AnalyzeOptions`

[Canonical source](../../../src/diffdevil/report.ts)

```typescript
export interface AnalyzeOptions {
    readonly source?: DiffSourceIdentity;
    readonly fileSet?: FileSet;
    readonly paths?: PathPolicy;
    readonly scopes?: Readonly<Record<string, PathPolicy>>;
}
```

<a id="api-report-attachscopes"></a>

#### `attachScopes`

[Canonical source](../../../src/diffdevil/report.ts)

```typescript
export declare function attachScopes(report: Report, definitions: Readonly<Record<string, PathPolicy>>): Report;
```

<a id="api-report-readreport"></a>

#### `readReport`

[Canonical source](../../../src/diffdevil/report.ts)

```typescript
export declare function readReport(input: unknown): Result<Report>;
```

<a id="api-report-withpathpolicy"></a>

#### `withPathPolicy`

[Canonical source](../../../src/diffdevil/report.ts)

```typescript
export declare function withPathPolicy(report: Report, policy?: PathPolicy, scopes?: Readonly<Record<string, PathPolicy>>): Report;
```

<a id="api-schema-schemakind"></a>

#### `SchemaKind`

[Canonical source](../../../src/diffdevil/schema.ts)

```typescript
export type SchemaKind = 'policy' | 'report' | 'plan' | 'query' | 'ast' | 'values';
```

<a id="api-schema-validateschema"></a>

#### `validateSchema`

[Canonical source](../../../src/diffdevil/schema.ts)

```typescript
export declare function validateSchema(kind: SchemaKind, input: unknown): Result<unknown>;
```

<a id="api-sources-git-analyzegit"></a>

#### `analyzeGit`

[Canonical source](../../../src/diffdevil/sources/git.ts)

```typescript
export declare function analyzeGit(options?: GitOptions): Promise<Result<Report>>;
```

<a id="api-sources-git-gitoptions"></a>

#### `GitOptions`

[Canonical source](../../../src/diffdevil/sources/git.ts)

```typescript
export interface GitOptions extends Omit<AnalyzeOptions, 'source' | 'fileSet'> {
    readonly cwd?: string;
    readonly base?: string;
    readonly head?: string;
    readonly staged?: boolean;
    readonly comparison?: 'three-dot' | 'direct';
    readonly maximumBytes?: number;
}
```

<a id="api-sources-patch-changeinput"></a>

#### `ChangeInput`

[Canonical source](../../../src/diffdevil/sources/patch.ts)

```typescript
export interface ChangeInput {
    readonly path: string;
    readonly oldPath?: string;
    readonly changeType: FileRecord['changeType'];
    readonly kind: FileRecord['kind'];
    readonly additions?: number;
    readonly deletions?: number;
    readonly patch?: ParsedPatch;
    readonly incompleteReason?: string;
}
```

<a id="api-sources-patch-parsepatch"></a>

#### `parsePatch`

[Canonical source](../../../src/diffdevil/sources/patch.ts)

```typescript
export declare function parsePatch(text: string): ParsedPatch;
```

<a id="api-sources-patch-parseunifieddiff"></a>

#### `parseUnifiedDiff`

[Canonical source](../../../src/diffdevil/sources/patch.ts)

```typescript
export declare function parseUnifiedDiff(text: string): readonly ChangeInput[];
```
<!-- /manual:generated typescript-exports -->

## Readers, structural validation and host adapters

`validateSchema` validates and freezes inert structure using product-owned schemas.
It is not equivalent to `readReport`, `readPlan` or compiling policy. Those owners
also check relational constraints and supported semantic identities. There is no
permission to execute a plan merely because a shape validator returned `ok`.

The GitHub entry is implemented, not an unavailable future interface. It owns
explicit API/Git acquisition, trusted policy loading, label/comment application and
definition reconciliation. Source identity, expected comment author, stable occasion,
current target and readback remain part of that host contract. Library doubles and
an installed consumer do not prove a live repository write.

Persist authored expression/policy source and canonical artifacts, not parser tokens,
CSTs, VM instructions or opaque handles. The separate versioned declaration asset
is useful contract history but does not override the current package exports.
See [Language and contracts](language-and-contracts/README.md) and
[Schemas and compatibility](language-and-contracts/schemas-and-compatibility.md)
for version selection and migration limits.
