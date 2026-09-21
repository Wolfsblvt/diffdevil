# Browser integration

## Meaning

The browser host reuses the portable diffdevil engine and real policy dialect. It does not launch the CLI, require a Node daemon, request a PAT, parse terminal output or turn DOM churn counters into replacement-aware facts. The application and provider limitations are documented in [`apps/browser-extension`](../../apps/browser-extension/README.md).

## Public entry point

After a normal source build, `@wolfsblvt/diffdevil/browser` resolves to a self-contained MIT ESM bundle in `dist/browser/index.js`. Consumers do not need a private recipe of Node shims or dynamic schema compilation. The lightweight `@wolfsblvt/diffdevil/browser/text` export supplies numeric/evidence text without the parser and compiler.

```ts
import { analyzeBrowserInput, compileBrowserPolicy, humanReport } from '@wolfsblvt/diffdevil/browser';

const comparison = {
  host: 'github.com' as const,
  repository: 'example/project',
  pullRequest: 42,
  base: 'a'.repeat(40),
  head: 'b'.repeat(40),
  changedFiles: 1,
};
const diff = 'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n+new\n';
const facts = analyzeBrowserInput(JSON.stringify({ comparison, format: 'diff', text: diff, complete: true }));
const policy = compileBrowserPolicy(JSON.stringify({ mode: 'personal-only', personal: 'version: 1\n' }));
if (!facts.ok) throw new Error(facts.diagnostics.map(item => item.message).join('\n'));
if (!policy.ok) throw new Error(policy.diagnostics.map(item => item.message).join('\n'));
const view = humanReport(facts.value, policy.value);
if (!view.ok) throw new Error(view.diagnostics.map(item => item.message).join('\n'));
// view.value.changed is exact 1; raw churn is exact 2.
```

The repeated SHA strings are explicit example identities, not real provider proof. A production host must establish full immutable identities and revalidate them around acquisition. `complete: true` describes transport, not proof that all files were supplied. Without independent cardinality, aggregate uncertainty survives. Optional additions/deletions cross-check provider evidence. A browser view of one narrowed commit cannot claim a whole-PR comparison merely because the PR number matches.

## Policy and projection

`compileBrowserPolicy` supports `repository`, `composed` and `personal-only`. The serialized request contains personal YAML and, when applicable, repository YAML at the trusted base, an explicit repository override and a map of already acquired trusted template text. The compiler never fetches templates or authorizes writes. `requiredTemplates` identifies only explicit selected-policy template paths; the host must validate and acquire them safely.

`humanReport` returns the typed aggregate projection, or a file projection when given its exact path. It retains real evidence, components, raw measurements, source/report identities, configured bands and policy provenance. Excluded files remain measurable facts but do not receive a virtual policy size. `readPolicyText` validates the real document schema; it is not a new browser-specific configuration dialect.

`appStanding` compares fully qualified identities for a future authenticated report-delivery source. Matching identity is not approval, safety or a provider effect. An untrusted DOM comment cannot establish that source. The current extension presents local results and does not guess a hosted delivery route.

## Build, licence and verification

Reusable source and the browser bundle are MIT. The concrete Chrome application is AGPL-3.0-only; identity assets remain reserved. The closed-bundle smoke checks and browser/core tests are separate from installed and live-provider acceptance. The [qualification manual](../../apps/browser-extension/QA.md) identifies the commands, evidence files and unverified environments.
