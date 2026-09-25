# GitHub API adapter

## Meaning

This manual describes the implemented TypeScript GitHub acquisition, pinned-policy
loading and explicit metadata reconciliation interfaces. It distinguishes desired
plans, observed provider effects and caller-owned trust. The adapter has mocked
HTTP and installed-package qualification, plus selected live provider paths
through the published Actions. The live canary is narrower than the complete
adapter contract and does not replace the mocked coverage.

## Read pull-request evidence

```typescript
import { GitHubClient, analyzeGitHub } from '@wolfsblvt/diffdevil/github';
import { unwrap } from '@wolfsblvt/diffdevil';

const client = new GitHubClient({ token: process.env.GH_TOKEN });
const target = { repository: 'OWNER/REPO', pullRequest: 42 };
const report = unwrap(await analyzeGitHub(client, target));
console.log(report.totals.lines.changed);
```

`analyzeGitHub` reads current PR revisions and paginates changed files. It uses the
shared patch parser, path policy and replacement-aware engine. Missing text
patches produce bounded counts when raw statistics permit them. Ambiguous file
kinds may be refined from a raw diff; unavailable refinement remains unknown.
GitHub's 3,000-file API ceiling does not turn undiscovered files into an empty set.
Head, base and declared file count are checked again after acquisition.

A client accepts an HTTPS API base, including an Enterprise `/api/v3/` prefix,
optional abort signal, response budget, read-retry policy and injected fetch for
host integration. Defaults bind requests and pagination to the selected origin
and endpoint, reject redirects, bound response bytes and honor rate-limit
backoff. The token is not serialized into results or provider error bodies.
No inline CLI token option is exposed.

For private data, the caller supplies a token that can read the selected PR and
contents. `GH_TOKEN` and `GITHUB_TOKEN` are CLI environment inputs; they do not
implicitly select mutation. The product does not create tokens or grant itself
permissions. Exact provider permissions and selected actor are host concerns.

## Select trusted policy separately

```typescript
import { loadGitHubPolicy } from '@wolfsblvt/diffdevil/github';

const policy = unwrap(await loadGitHubPolicy(client, {
  repository: target.repository,
  ref: trustedBaseCommit,
  path: '.diffdevil.yml',
}));
```

`trustedBaseCommit` is an explicit full commit SHA selected by the host, not an
implicitly trusted value from a PR body or report. Policy and relative template
files are loaded from that same immutable reference. The loader rejects symlinks,
submodule entries, non-file objects, invalid base64/UTF-8 and paths escaping the
repository. It does not run code from the repository.

`compilePolicy()` remains the local pure route for the bundled `size@1` default,
inert objects or already acquired YAML/JSON sources. Policy hash equality proves
identity of normalized policy and parameters, not who authorized that policy.
The host must preserve its trust boundary when choosing or moving an artifact.

## Apply explicitly and inspect the complete result

The following call performs writes when the selected policy requires them. The
host must deliberately select trusted policy, target and a suitable token first.

```typescript
import { applyGitHubPolicy } from '@wolfsblvt/diffdevil/github';

const outcome = unwrap(await applyGitHubPolicy(client, target, policy, {
  definitions: 'ensure',
  commentAuthor: { login: 'my-app[bot]' },
  occasionId: workflowRunIdentity,
}));

if (outcome.status !== 'verified') {
  // Preserve the observations: some effects may already have occurred.
  throw new Error(JSON.stringify(outcome.diagnostics));
}
```

`Result.ok` and application `status` answer different questions. Invalid input or
preflight can return `ok: false` before writes. Once reconciliation starts, a
failure is an `ok: true` result with `status: incomplete`, the report, desired
plan, diagnostics and operation observations. Do not discard that partial result.

Each observation distinguishes `request` (`not-needed`, `acknowledged`,
`ambiguous`, `rejected`), `readback` and `outcome`. The top-level changed count is
verified changed operations, not individual labels or proof of an atomic
transaction. An acknowledged request is not sufficient: effects are read back.
An ambiguous write is observed before any further action, never blindly retried.

The adapter acquires current evidence by default and compares a supplied untrusted
report with the freshly evaluated result; disagreement is an error, not a silently
ignored artifact. Reuse without reacquisition requires explicit `trustReport: true`;
that is a host assertion about the source and carrier, not a validator proving
trust. Actions never expose this bypass. A supplied input plan must equal a newly
derived plan from current trusted inputs. Before writes and after reconciliation,
the adapter checks the target, API host, open PR and exact compared head/base.
Those checks cannot create a transaction across GitHub requests. An intervening
change may leave partial effects, which the result exposes honestly.

## Labels and definitions

Definition modes are distinct:

| Mode | Behavior |
| --- | --- |
| `none` | Do not change definitions; requested assignments require usable labels. |
| `verify` | Compare configured definitions without changing them. |
| `ensure` | Create missing definitions; preserve existing colors and descriptions. |
| `sync` | Create or update explicitly configured definitions, including known archived state. |

Assignments reconcile only declared names and managed groups. GitHub label
identity is case-insensitive. Conflicts and collisions with held rule ownership
are rejected. Required additions are read back before old managed members are
removed; a failed addition cannot erase the old size label. The complete PR label
set is never replaced. Unknown/unrelated labels remain untouched.

A known archived selected label needs explicit sync; ensure does not silently
unarchive it. The real provider's archive-state response representation remains
part of live canary qualification. A response that omits this field is not proof
that a label was restored from archived state.

Definition-only operation does not acquire or change a PR:

```typescript
import { syncGitHubLabels } from '@wolfsblvt/diffdevil/github';

const result = unwrap(await syncGitHubLabels(client, 'OWNER/REPO', {
  'review/broad': { color: '536b92', description: 'Matches the configured broad-change rule.' },
}, 'verify'));
```

Its default is read-only `verify`. Definition sync never deletes a definition.
Hosts loading definitions from a moving repository-base policy can pass the optional
fifth argument `{ assertCurrent }` to check that source before each write and at
completion. The CLI and Action repository-base routes supply this guard; an API
caller remains responsible for selecting and checking its trusted source.

## Owned comments

Ownership requires a selected actor and a valid target/policy/rule marker. A PR
contributor copying a marker does not acquire that actor's ownership. The default
actor is `github-actions[bot]`; an App or other host supplies its actual expected
login and may additionally bind a numeric ID.

Upsert changes one owned comment only when its visible value or resolved state
changes. Once preserves the first owned comment. Create requires a stable host
occasion identity to avoid duplicate retries. Transition mode stores resolved
false state in existing owned metadata without posting a false-state comment;
unknown evidence never resets it. Band-change triggers compare resolved bands,
not head revisions. Changed evaluated policy identity starts a separate lifecycle.

Malformed owned state and duplicate lifecycle sequence claims are conflicts, not
permission to choose or delete a comment arbitrarily. Unrelated comments are
preserved. Templates cannot inject adapter-owned markers. See
[Templates](../manual/policy/from-measurements-to-rules/effects-and-templates.md) for escaping and authoring semantics.

## Qualification boundary

See [Qualification](../qualification.md) for executed cases and artifacts.
The mock suite and installed npm consumer prove the shared adapter and its
observable HTTP behavior. The private release canary separately proves selected
real provider reads and bounded effects through the distributed Actions; it does
not prove every provider branch, a genuine external-fork event, a live
partial-write failure, or real App identity. Marketplace availability and the
release coordinates are separately read back in Qualification.
