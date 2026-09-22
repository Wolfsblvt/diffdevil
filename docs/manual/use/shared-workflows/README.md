# Shared workflows

Use several surfaces without losing what each result means. You might inspect a change in the CLI, explore policy in the Playground, and let an Action own labels. These are useful collaborators only when the comparison, configuration and effect responsibility stay explicit.

## Carry the artifact that answers the next question

| Carry | It contains | It does not establish |
| --- | --- | --- |
| Full report | Normalized comparison facts, evidence, source and evaluated policy information | A current provider head or permission to write |
| Policy document | Selected metrics, scopes, bands, rules and templates | The facts for a particular comparison |
| Desired plan | Target, policy/result identities, operations and holds | That any operation happened |
| Effects result | Attempted operations, outcomes and readback | A transaction that automatically rolled back on failure |
| Human or agent output | A useful reading projection | A complete replay artifact |

The [shared mental model](../../understand/README.md) explains the stages once. The workflow's job is to preserve them when crossing a process, runner, browser or application boundary.

## Keep one comparison together

For repeated questions, save a full report and query that artifact. For a current answer, acquire the source again and record the new identity. A report exported from a frozen Playground example remains that retained edition, even when you run the CLI beside a repository with a newer checkout.

Select policy deliberately too. Querying a captured report is different from re-evaluating its facts under a new `.diffdevil.yml`. That new evaluation can change included totals, bands and desired effects without changing the acquired source. Preserve both explanations instead of saying the tool changed its count arbitrarily.

File transport is part of the workflow. A runner path is not an uploaded artifact, a chat attachment is not a trusted execution channel, and a hash does not identify who authorized the content. Choose access, retention and validation for the full artifact rather than only for its compact summary. Reports and policy can reveal private repository names and paths.

## Choose where policy is trusted

Local exploration can use a file you just edited. A privileged Action must not take write authority from that same file in an untrusted PR head. Its base or explicitly pinned policy source owns the decision. The CLI offers an explicit operator trust route for saved reports; Actions always reacquire and validate before applying transported plans.

[Reports, plans, and apply](reports-plans-and-apply.md) gives a complete capture-to-readback journey, including the exact distinction between those hosts. Neither accepting JSON nor displaying a valid desired plan grants mutation authority.

## Choose one owner for overlapping effects

Readers can coexist freely. An extension can show personal bands while a read-only Action produces job outputs. A library can inspect a report without competing with an App. But two writers managing the same label group or owned-comment lifecycle need a deliberate arrangement.

Separate the groups or choose one writer. During a migration, compare policy and target identities, stop the outgoing writer, inspect its last operations, then enable and verify the replacement. Keep unrelated labels and comments outside the cutover. Disabling a writer does not necessarily cancel a request already in progress.

[Labels, comments, and definitions](labels-comments-and-definitions.md) explains ownership, definition maintenance, held rules, repeated comments and safe handover. The App's service and installation instructions remain in its [own guide](../managed-app/README.md); they are not prerequisites for these open workflows.

When a result cannot safely cross the boundary, return the missing fact precisely: artifact kind, supported version, source freshness, policy identity, trusted origin or effect authority. Do not repair the gap by treating an old report as current or an unknown result as false.
