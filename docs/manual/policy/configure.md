# Configure policy

Start with the setting you want to change, then inspect the whole effective policy.
A valid YAML file is not yet proof that the selected host read it, and a config
read error must not become silent default behavior.

## Write one complete file

These examples need a working [CLI](../use/cli.md). Install it with
`npm i -D @wolfsblvt/diffdevil`. The commands use the repository's example paths;
outside a checkout, save the linked complete files at those paths or change the
arguments to their saved locations. No example in this chapter contacts GitHub.

The conventional local file is `.diffdevil.yml` at repository root. For this
chapter select the complete [configuration specimen](../../examples/policies/story/configure.yml)
explicitly so a surrounding repository cannot change the lesson:

```yaml
version: 1
presets: [size@1]
size:
  thresholds: {xs: 10, s: 80, m: 300, l: 800}
```

```sh
npx diffdevil validate --config docs/examples/policies/story/configure.yml
npx diffdevil analyze --diff-file docs/examples/diffs/review.diff --config docs/examples/policies/story/configure.yml --format human
npx diffdevil explain --policy --config docs/examples/policies/story/configure.yml --format json
```

On the [complete patch](../../examples/diffs/review.diff), Changed remains 10 and
raw churn remains 16. The first upper bound is now 10, so the band is **S**, not XS.
Changing the policy changed the classification, not the patch or measurement.

## Inspect effective configuration

`validate` checks configuration and expression contracts; it does not acquire a PR
or prove an effect. `explain --policy` shows selected presets, normalized declarations,
semantic identities and replacement origins. Use `--format yaml` for an expanded
ordinary policy, or JSON when you also need that explanation metadata. Expansion
is not installation, release or permission to apply effects.

The shared compiler resolves bundled presets in declared order, supported `size`
overrides, user declarations, then supported host invocation overrides. A dictionary
entry replaces the **whole declaration with the same ID**. It does not splice half
of a new rule into the previous expression and effects. Unrelated declarations stay.
Arrays replace unless the particular invocation option explicitly appends.

The `size` shortcut requires `size@1`. `size.metric` accepts a known metric alias,
a canonical measure, or `metrics.<id>`, not a formula. Supplied thresholds currently
need all four increasing cut points; supplied labels need all six names, including
`unknown`. Partial convenience maps are not supported by the current compiler.
Use a named formula and complete map rather than publishing YAML that happens to
look convenient. Conflicting short overrides and full declarations for the same
generated IDs produce `E_CONFIG_CONFLICT`.

## Know which host supplies each layer

| Host | Configuration source and boundary |
| --- | --- |
| Local read-only CLI | Explicit `--config`, or conventional `.diffdevil.yml` discovery at the repository root (current directory outside Git). `--no-config` bypasses discovery. |
| Actions | An explicitly selected trusted config; omitted `config` keeps bundled defaults and does not fetch a repository file. Step overrides apply only in supported combinations. |
| GitHub CLI writes | Trusted current base policy by default, or an explicit pinned/workspace source. No ambient local config discovery. |
| Managed App | Its selected defaults and trusted repository settings, not Action step inputs. Installation, admission and dashboard controls belong to the [App guide](../use/managed-app/README.md). |
| Library | The inert policy and template text the application explicitly supplies. Compilation itself does not read files or the network. |

There is no implicit search of `.github/diffdevil.yml` or an account-wide
`<owner>/.github` repository. An explicit nonconventional path is still supported.
Actions do not inherit dashboard defaults; an App event has no Action step.
Missing configuration and unreadable or invalid explicitly selected configuration
are different cases. An invalid higher layer is an error, not permission to keep
using the lower layer as though nothing happened.

## Replace or append paths deliberately

Invocation `--exclude`, `--include-only` and `--force-include` append to their
corresponding lists by default. Each has a matching `--…-mode replace` to select
replacement. Structured configuration can explicitly clear a list with `[]`.
Omission inherits; an explicit supported empty list, false or zero is a value.
The [path chapter](paths-and-scopes.md) explains how the resulting lists select
files, including rename endpoints and force-inclusion boundaries.

## Bind typed parameters

Parameters keep changing data out of expression source. The complete
[rules specimen](../../examples/policies/story/rules.yml) declares the integer
`attentionAt` with default 5. This invocation binds 6 instead:

```sh
npx diffdevil check --diff-file docs/examples/diffs/review.diff --config docs/examples/policies/story/rules.yml --expr 'metrics.attention >= params.attentionAt' --param attentionAt=6 --format json
```

The valid decision is false, with exit **1**, because the source-plus-test value
is 5. It is not a parser failure. A required parameter uses `required: true`
instead of a default. Types are integer, float, boolean or string; values are
bound before evaluation and never pasted into expression text. `--params-file`
accepts a parameter object; conflicting duplicate bindings are errors. A string
binding keeps its literal text, including leading zeros and text after the first
`=`. Missing required data produces `E_PARAMETER_REQUIRED`.

## Selected host layering and current limitations

The selected multi-host order is bundled presets, explicit repository policy, then
supported CLI/Action invocation overrides; managed operation also has its selected
account/organization defaults before explicit trusted repository settings. There is
no extra hidden per-repository dashboard-default layer, and Actions do not consult
the dashboard. Explicit immutable external policy sources remain available without
a hosted account.

The intended shared convenience resolver can fill omitted members of a supplied
threshold/label map from lower layers before validating the complete result. That
is a selected destination, not runnable current partial-map syntax: the current
compiler requires complete supplied maps. Exported configuration must be complete
and portable, with coherent generated groups and definitions. In every host,
explicit false, zero and supported empty collections must remain distinguishable
from omission. Named executable declarations still replace as wholes, even when
convenience settings eventually support partial groups.

A read-only preview of PR-head configuration does not make that configuration trusted
write policy. History enrollment and native check presentation are host settings,
not hidden fields injected into `size@1`. The App pages retain ownership of their
remaining service and interface details.

## Export and repair

Use expanded YAML to move an explicit policy between compatible hosts, then inspect
that host's trust and effect settings separately. A copied policy does not copy
credentials, history enrollment, provider state or authority. Preserve the selected
source name when reporting diagnostics so a configuration pointer and UTF-16 span
still identify the original JSON or YAML.

Repair missing files at the selected path, unsupported fields at their exact
configuration pointer, incomplete maps as complete maps, and unavailable parameters
as typed bindings. Do not replace a failed config read with a no-config retry in an
automatic writer. Continue with [Paths and scopes](paths-and-scopes.md), or use the
[complete schema inventory](../reference/language-and-contracts/schemas-and-compatibility.md)
for field-level lookup.
