# TypeScript library

Embed diffdevil when your program should own acquisition, presentation or automation without launching a shell. Public package exports expose the same engine, policy compiler and artifact readers used by the CLI and Actions. The library does not impose a framework or require a hosted account.

## Install a public entry

Use Node.js 22 or newer for the Node package. For an application that needs diffdevil at runtime, add `@wolfsblvt/diffdevil` to its runtime dependencies. For the development-tool example below:

```sh
npm i -D @wolfsblvt/diffdevil typescript @types/node
```

Use ESM imports from the root, `/core`, `/language`, `/policy`, `/git` or `/github`. Do not import a convenient `dist/lib/...` implementation path: internal paths are closed by the package export map. The [TypeScript reference](../reference/typescript-api.md) owns the generated public symbol inventory and exact signatures.

The current source additionally supplies `/browser` as a self-contained portable bundle and `/browser/text` as lightweight evidence text. Those entries require a package release that actually includes them. Do not use a Node-only entry plus an improvised collection of shims as the browser contract. The [browser integration source](../../integration/browser-extension.md) explains host-supplied comparison evidence and trusted templates.

## Run one complete consumer

Save this complete [consumer](../../examples/library/inspect-change.mts) as `inspect-change.mts`. It reads an explicit diff or report, evaluates `size@1`, asks one boolean question and round-trips a desired plan. It never contacts GitHub or writes provider metadata.

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

Compile and run it with the package's complete teaching patch:

```sh
npx tsc --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --outDir out inspect-change.mts
node out/inspect-change.mjs diff node_modules/@wolfsblvt/diffdevil/docs/examples/diffs/review.diff
```

Expect an exact Changed value of **10**, exact raw churn **16**, a resolved true below-100 decision and `desired.stage: "desired"`. The selected size operation targets `size/XS`; no provider operation has happened. The example's printed object is a demonstration summary, **not** a canonical report artifact.

The repository's installed-package qualification compiles and executes this same consumer outside the source checkout. It also uses bounded, incomplete and invalid inputs; importing from a checkout alias alone is not package-consumer proof.

## Separate Result success from evidence

`Result<T>.ok` answers whether the operation succeeded. It does not say that an evaluated boolean is true or a measurement is exact. A successful query has a typed result inside its value, so `query.result.value` above is intentional. A bounded numeric result retains its interval; an unknown decision remains unknown.

This example chooses a throwing boundary with `requireResult`, then converts an actual failure into exit 2. A service can instead return diagnostics to its caller. Do not catch every error and substitute an empty report or zero. The diagnostics identify the code and stage; retain source coordinates when presenting compiler errors.

For a failure exercise, pass a file containing `{not JSON` with the `report` input kind. The reader rejects it and the program exits 2. With the supplied [bounded report](../../examples/reports/bounded.json), evaluation succeeds: Changed stays `[60,70]`, while the below-100 condition can still be established. See [Evidence and uncertainty](../understand/evidence-and-uncertainty.md), not a JavaScript truthiness shortcut.

## Compile policy once; evaluate the intended lifecycle

`readPolicyYaml` and `readPolicyJson` preserve original source information. `compilePolicy` accepts the resulting source handle or an inert policy object. It does not read a configuration file, fetch templates or contact a provider. Your host supplies those bytes and any explicitly referenced template contents.

`evaluatePolicy` defaults to the rules phase. Its `phase: 'analyze'` variant computes metrics and bands without evaluating rules. `evaluatePolicyQuery` selects a typed expression, shortcut, saved query or band and evaluates the dependencies that question needs. `createPlan` needs a genuine rules-phase result; it cannot turn an arbitrary cast object into trusted policy execution.

Parameters, selected declarations and resolved templates contribute to policy identity. Reuse a compiled handle only in its supported runtime/schema context. Handles are opaque in-process objects, not a public serialized executable format. Preserve source text and supported artifacts across process boundaries instead.

## Add acquisition and effects only when the host needs them

`/git` supplies controlled local Git acquisition; the chosen repository and refs must exist. `/github` supplies `GitHubClient`, acquisition, trusted-policy loading, policy application and definition synchronization. Importing them does not itself acquire credentials or mutate a repository. Calling a provider operation does.

Your host selects the credential, target, trusted policy and effect grant. A plan target such as the example's `example/repository` is illustrative data, not authenticated PR evidence. Freshness and carrier trust remain explicit even when all objects typecheck. Keep application calls separate from analysis, inspect their full request/readback result, and handle partial reconciliation. [Reports, plans, and apply](shared-workflows/reports-plans-and-apply.md) carries that shared workflow.

## Serialize data, not trust

Persist a complete report or plan with its supported JSON contract and read it back through `readReport` or `readPlan`. Generic `JSON.parse(...) as Report` proves neither structure nor arithmetic consistency. `validateSchema` checks shape; the semantic readers and compiler perform the corresponding relational checks. A successfully read plan still does not establish freshness, authority or source authenticity.

Reports can contain file paths, revisions and policy material. The library does not choose your retention, logging or upload rules. Keep private artifacts inside the application's intended data boundary, and do not add provider requests merely to read a saved report.

## Update and diagnose at the package boundary

Use the project's ordinary package-update process, inspect the installed export map/declarations and rerun its consumer tests. Package versions, language/schema identities and Skill versions have different jobs. Updating a Skill does not change an imported package.

A missing export is a package/release mismatch; an unreadable file is host I/O; a rejected report is an artifact problem; a failed policy is a diagnostic-bearing compiler/evaluator result; uncertainty is valid evidence. Keep those failures distinct. [Schemas and compatibility](../reference/language-and-contracts/schemas-and-compatibility.md) and [Language and contracts](../reference/language-and-contracts/README.md) provide the deeper contract routes.
