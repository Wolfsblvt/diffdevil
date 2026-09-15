# Optional comment templates

## Meaning

This document defines the small substitution language and lifecycle contract for optional diffdevil-owned PR comments. Templates display already computed facts and decisions; they do not contain detail programs, JavaScript, shell code, loops, or imports. The default size preset has no comment effect.

## Placeholder syntax

A placeholder is a read-only path surrounded by `{{` and `}}`:

```text
{{ metrics.review }}
{{ bands.size }}
{{ totals.files.included }}
{{ source.head }}
```

Whitespace around the path is optional. Paths use the same identifier and literal-string member-key spelling as detail member access, but no calls, arithmetic, comparisons, or binder syntax is permitted. `{{ metrics.review + 1 }}` is a template error, not an expression to evaluate.

An optional fixed formatter follows a vertical bar:

```text
{{ metrics.review | json }}
{{ source.head | text }}
```

Supported formatters are `display` (default), `text`, and `json`. They are fixed renderer operations, not user functions. Additional pipes, formatter arguments, or arbitrary names are rejected.

A backslash before `{{` escapes the opening delimiter and emits literal `{{`. To emit a backslash immediately before an actual placeholder, double the backslash. The scanner processes these two cases deterministically left-to-right. An unmatched unescaped opening delimiter is an error. A closing `}}` outside an active placeholder is ordinary literal text; consequently an escaped opening can preserve an entire `{{ value }}` example without activating its closing delimiter. Templates are ordinary Unicode strings; YAML literal scalars are the recommended multiline carrier.

## Display semantics

The default display renderer represents exact numbers as numbers, bounded values as a clear inclusive range, unknown values as `unknown`, and unmeasurable values as `unmeasurable`, optionally accompanied by a short reason when the configured template requests a reason field. It never selects a bound as though it were the actual value.

A resolved band displays its ID. An unresolved band displays `unknown`. An exact boolean displays true/false; an unresolved decision displays unknown. Missing and null display `not available` and `null`, respectively, rather than quietly pretending to be zero.

`text` emits the same scalar content without Markdown-specific escaping. It is only for trusted contexts whose author deliberately handles formatting. `display` escapes Markdown metacharacters and neutralizes automatic user/team mentions in substituted **data values**. Author-written Markdown in the template remains authored Markdown. A template author can deliberately write a mention, but a hostile filename or parameter cannot inject one through a normal placeholder.

Records and collections require `json`. The JSON renderer emits the canonical typed value representation inside an escaped code block chosen to avoid delimiter collision; it does not call arbitrary object conversion. Large output is bounded by the template/result budget. Rendered text is deterministic and contains no current timestamp unless a trusted explicit source field supplies one.

## Validation and source positions

Placeholder names are checked against the declared report/policy environment during compilation. A misspelled `metrics.reveiw` is `E_TEMPLATE_PLACEHOLDER`. A valid metric with unknown evidence is a valid placeholder and displays its status honestly.

Template diagnostics map back through the YAML scalar source map just like expression diagnostics. The placeholder scanner is separate from Chevrotain's detail parser. Similar-looking braces do not justify treating both languages as one parser mode.

A template file, when supported, is loaded by the host's trusted configuration loader and retained as text. The evaluator has no filesystem access. Inline template and template-file selection are mutually exclusive.

## Comment configuration

```yaml
comment:
  mode: upsert
  trigger: band-changed
  template: |
    **Pull-request size: {{ bands.size }}**

    Replacement-aware changed lines: {{ metrics.review }}
    Raw churn: {{ metrics.churn }}
```

Modes and triggers are separate. Mode governs how a matching occasion changes owned comments. Trigger governs whether the current rule result creates an occasion.

| Mode | Behavior |
| --- | --- |
| `create` | Create a new owned comment for each distinct eligible run/occasion identity. Retries of that same identity do not duplicate it. |
| `once` | Create one owned comment for the rule if none exists; do not update it afterward. |
| `upsert` | Create or update one owned comment for the rule; unchanged rendered content requires no write. |
| `once-per-transition` | Create once for each resolved false-to-true transition; first resolved true counts as an entry transition. |

Triggers are `always`, `matched`, and `band-changed`. For a boolean rule, the default is `matched`. For a band rule, the default is `band-changed`. `band-changed` is valid only for a band rule; `once-per-transition` is valid only for a boolean rule and uses its matched transition semantics. Incompatible combinations are configuration errors.

For `upsert` with `matched`, a later false decision leaves the existing comment unchanged; it does not delete a previous factual record. Automatic deletion is not an implied part of any mode in this version.

An unresolved rule follows its `onUnknown` policy. Hold preserves existing comments and transition standing. It does not simulate a false transition. An explicit unknown-band label mapping does not automatically create a comment occasion; a template/rule can opt into displaying unresolved results through a separate deliberate configuration.

## Ownership and identity

The adapter adds an ownership marker after rendering, for example:

```html
<!-- diffdevil:rule=size -->
```

Actual ownership uses the marker together with the expected bot/App author and target identity. A marker alone in an arbitrary contributor comment is insufficient. Template input cannot forge or replace the adapter's ownership metadata.

The adapter's state records the policy/rule identity, last resolved decision or band, and distinct occasion identity needed for retries/transitions. This can live in validated owned-comment metadata when comments exist; a host may provide a dedicated state carrier when necessary. The pure evaluator does not read previous network state. It emits a desired comment effect with lifecycle intent, which the adapter reconciles against trusted current state.

A process restart must not manufacture a new transition. A retry after ambiguous creation first looks for the same occasion marker and expected author before creating again. A new head with the same band does not trigger `band-changed`; an actual resolved band change does. Unknown intervals between two resolved states do not reset the previous resolved state.

## Provider boundaries

GitHub issue-comment operations support the PR comment surface, but multi-operation label/comment application is not transactional. The adapter records successful operations, re-reads ambiguous outcomes, and reports failures without pretending the whole plan rolled back. The current REST contract is documented at [G4](../../reference/2026-09-09/sources-and-research.md#g4).

Templates and policy must be trusted in a privileged apply path. Diff contents and filenames remain hostile data even when they appear inside a templated comment. Rendering never executes Markdown, HTML, or source text. Mention neutralization and bounded output preserve the default safe data path without preventing a repository from writing its own deliberate policy prose.

## Operational writing

Default product-owned copy is neutral and attributable to configured policy. It reports metrics, bands, and evidence rather than assigning risk or moral judgment to contributors. No mascot voice, devil joke, emoji, or unsolicited instruction to split a PR is added by the renderer. Repository-authored templates remain the repository's chosen communication.

## Implemented provider ownership and lifecycle state

The GitHub adapter scopes owned state to the target repository and PR, evaluated
policy identity, rule ID and a host-selected author (login, optionally numeric
ID). A changed policy identity starts a separate lifecycle; comments belonging to
previous identities remain untouched. A body marker alone does not establish
ownership. Unknown decisions retain the prior state rather than resetting it.

For once-per-transition, a resolved false observation is stored in existing owned
metadata without creating a false-state comment. Create mode needs a stable host
occasion ID so a retry can recognize a previously completed creation. Duplicate
owned sequence numbers or malformed owned metadata stop affected reconciliation
instead of deleting comments. There is no comment-deletion operation in this cut.
