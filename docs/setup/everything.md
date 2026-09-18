# Set up diffdevil across this project

## Meaning

Make diffdevil useful locally, in the current agent, and on this project's GitHub pull requests: a usable CLI, deliberate repository policy, the persistent Agent Skill, and an appropriate GitHub execution route. Complete coverage does not require duplicate installations or competing writers. This is one setup journey, not a requirement to finish in one conversational turn.

## Understand the user and project

Read the applicable project and user instructions, existing tooling/policy, actual GitHub target, Skill installation, and current automation. Use what is actually known about this user's needs and preferences. A project language alone does not imply a preference for self-operated or managed automation.

Briefly explain the useful setup you are carrying. Reuse valid existing work. Ask about a consequential ambiguity when the available context cannot settle it; do not repeat questions already answered or ask for routine edits covered by the setup request.

## Choose the GitHub route from the actual context

There is no fixed Actions-first or App-first default in these instructions or in the Skill. Make a sensible recommendation from the user's stated preferences, team conventions, existing installations, policy responsibilities, and operating needs.

Useful considerations are:

- **GitHub Actions:** execution lives in repository workflows, using the repository's runner and token arrangements. This suits users who want to own and review workflow configuration alongside code.
- **GitHub App:** execution is operated as a service, with installation administration, dashboard defaults, and native check summaries. This suits users who prefer managed operation or need those administration surfaces.
- **Purposeful coexistence:** a read-only Action can supply CI measurements while the App owns labels/comments. Different policy defaults and effect responsibilities remain explicit.
- **Self-hosted App:** appropriate when the user actually selects operating the service, with its infrastructure and maintenance responsibilities.

Both main routes use the same core and policy language. Do not describe the App as necessary to unlock the engine, or assume free workflow execution, a released paid offer, or a particular privacy preference without evidence.

When the context supports a choice, state it and proceed within the existing request. When genuinely unsure, ask one concise question explaining the practical differences and any grounded recommendation. For example:

> Actions keeps execution in your repository's workflows and runner allowance. The App operates it as a service with dashboard defaults and native check summaries. Both use the same policy engine; comments and history are optional. Would you rather maintain the workflow or use the App?

Tailor that explanation to what is uncertain instead of pasting it into every setup. Continue independent local preparation while the route choice remains open where useful, but do not silently convert silence into a route selection.

## Make the CLI available

Follow [CLI setup]({{PUBLIC_ORIGIN}}/setup/cli.md) for the actual installation commands, platform behavior and verification. Reuse a suitable existing executable. An established Node project may use its locked developer dependency; a non-JavaScript project should not acquire a root `package.json` just to run the tool. A cache-backed invocation is useful but is not a persistent CLI installation.

Resolve the actual executable version and establish a future-use route. The concrete released examples use `@wolfsblvt/diffdevil@1.0.0`; installing the Skill neither upgrades nor silently repins that package.

## Keep one deliberate repository policy

Preserve valid existing configuration, including deliberate `presets: []`, custom declarations, thresholds, and exclusions. Do not replace an unreadable or invalid policy with defaults.

For a new project selecting the ordinary size policy, create root `.diffdevil.yml`:

```yaml
version: 1
presets: [size@1]
```

That explicit file selects the preset without copying the entire expansion. No hidden generated-file exclusions, threshold tuning, default comments, or size-based merge gate are added.

Using the chosen CLI invocation, validate, explain and analyze:

```sh
diffdevil validate --config .diffdevil.yml
diffdevil explain --policy --config .diffdevil.yml --format json
diffdevil analyze --format agent
```

The final command examines tracked worktree changes against HEAD, not a committed branch automatically. Choose explicit base/head refs for the actual branch comparison when needed. Local reads discover the conventional file; Actions select it explicitly; the App adds its declared host-default layer below explicit repository settings. Check effective meaning before claiming parity.

A new policy on the working branch is not yet available at an automatic writer's trusted base. Preview the candidate and use the repository's actual authorized change path before relying on that configuration for writes.

## Install the persistent Skill at user scope

Follow the [canonical Skill installation instructions]({{PUBLIC_ORIGIN}}/setup/skill.md). User scope is the normal default even when this setup was requested inside a project. Use another scope only when the user's applicable instructions or deliberate existing setup select it. Do not infer repository scope merely from “Everything” or a team-shaped repository.

Install the same canonical core and detailed Markdown references as a coherent set. A local npm package may already contain that set under `skills/diffdevil/`; use it through the canonical installer rather than improvising a separate recipe. Preserve canonical bytes, local customizations, and the host's actual discovery/precedence behavior.

The Skill has its own version and tiny GitHub discovery source. Follow its installation/update/offline procedure rather than inventing a setup-specific updater or requiring the Skill version to equal the CLI version. Verify installed content and effective host discovery separately. Reading a file once in chat or saving it in a transient sandbox is not persistent harness installation.

The Skill teaches the useful tool, including apply. The user's and harness's existing authority govern use; this guide does not add a second agent-governance system or demand fresh questions for covered writes.

## Complete the chosen GitHub setup

For Actions, follow [Actions setup]({{PUBLIC_ORIGIN}}/setup/actions.md), select the repository policy explicitly where intended, and keep privileged application separate from PR-code execution.

For the App, follow [App setup]({{PUBLIC_ORIGIN}}/setup/app.md), reuse the correct installation, inspect effective policy, and complete enablement and verification through the real supported interface.

Retain useful App/Action coexistence without competing writers for the same effects. For migration, prepare the new owner, disable the old overlap, reconcile in-flight effects, then enable and verify the destination. Preserve independent CI and historical comments owned by another principal.

Complete provider steps under a sufficient existing request or standing grant. Where a genuine account/admin step remains unavailable, hand back that precise step with the prepared context. Do not replace the selected route merely because another route avoids asking.

## Verify and return the joined result

Establish four outcomes: the available CLI/version; deliberate effective policy and a meaningful local comparison; installed Skill version/core/references and host discovery; the selected GitHub route's enablement and observed result.

Keep analyze, plan, apply and provider readback distinct. A local report does not establish live GitHub behavior. Compare source revisions and policy meaning before comparing reports. Unknown or bounded evidence is not an installation failure by itself and must not become an invented exact number.

Return a compact account of what was installed, reused or changed, why the GitHub route fits this user, what was actually verified, and any concrete remaining handoff. Existing correct setup may need no change. Do not call Everything complete while a required installation, enablement, or execution result remains unobserved.
