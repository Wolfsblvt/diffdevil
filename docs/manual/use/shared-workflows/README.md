# Shared workflows

Use several diffdevil surfaces when they have different jobs. A developer can inspect a local branch, a read-only Action can supply measurements, and a separately authorized writer can maintain labels. A browser extension can display a personal policy alongside those repository results. They share the engine, not an implicit account, configuration store or permission grant.

The useful handoff is the smallest artifact that preserves the next consumer's question. Do not hand a terminal screenshot to a report reader or treat a downloaded plan as proof that GitHub changed.

## Carry the right thing

| What the next step needs | Carry | What still needs establishing |
| --- | --- | --- |
| The same observed comparison for more local queries | Complete canonical report JSON | Evidence/completeness and whether the captured comparison is still the intended one |
| The same policy on a different host | Complete ordinary policy, required templates and parameter values | That host's policy source, trust and overrides |
| An inspectable intention to change repository metadata | Canonical desired-plan JSON | Current source and policy, authority, credentials and provider state |
| What an apply attempt actually accomplished | The full apply result and operation/readback journal | Any unresolved or partial outcome before another attempt |
| A compact explanation for a person or coding agent | Human, Markdown or agent projection | The canonical artifact when machine replay is required |

A query JSON envelope answers a selected question. It is not interchangeable with report JSON. A plan adds intended effects; an apply result adds observations. A schema-valid object is not automatically an authenticated artifact. [Reports, plans, and apply](reports-plans-and-apply.md) follows those handoffs through a complete example.

## Keep policy provenance visible

A local configuration file is convenient for experimenting. It is not automatically the trusted policy for a privileged GitHub Action. An extension's personal settings are not repository-wide policy, and a Playground export is a proposed configuration, not an installed one.

Before expecting two results to match, align comparison revisions, file inclusion, policy and bound parameters, engine/semantic versions, and the evidence available to each acquisition route. An API response with omitted patches can establish less than a local Git comparison. That is an evidence difference, not a new definition of Changed. The [shared trust model](../../understand/trust-and-mutation.md) owns the distinction between identity, trust and freshness.

## Give overlapping effects one owner

Choose the writer for each managed label group and comment lifecycle. Two hosts can read the same PR safely; two independently configured writers can repeatedly undo each other's labels even when each run is internally correct. A concurrency group serializes its own workflow, not an unrelated App or someone's CLI invocation.

Useful combinations include a CLI for local review plus an Action for repository labels, an extension for personal presentation plus a read-only Action for checks, or a library that exports a report for later CLI queries. The managed App can take over repository automation when its supported service is available, but it does not have to be the center of the setup.

For a writer change, disable the old overlapping effect, preserve the selected policy and any useful result journal, configure the new writer's authority, then verify a fresh run and its readback. Changing the expected comment author or policy identity does not automatically adopt old comments. [Labels, comments, and definitions](labels-comments-and-definitions.md) explains the exact ownership and migration consequences.

## Recover the missing boundary, not a more convenient result

When a handoff fails, inspect the artifact kind, source revision, policy identity, trust decision and last observed provider operation. A stale report needs the correct comparison. An invalid policy needs correction. An ambiguous write needs readback before a repeat. None is repaired by substituting zero, ignoring a held rule or claiming that a successful upload applied the plan.

Keep reports and policies private when their repository identities, paths or configured content are sensitive. A local file, workflow artifact and pasted conversation have different sharing and retention boundaries. The receiving host owns that handling; the shared engine is not a storage or authentication service.
