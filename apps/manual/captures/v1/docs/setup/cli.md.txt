# Set up the diffdevil CLI

## Meaning

Make diffdevil available for this project's local work and verify a useful analysis. Reuse suitable tooling and existing policy. This setup installs or connects the CLI; it does not implicitly install a persistent Agent Skill or enable GitHub automation.

## Read the existing setup

Read the project's applicable instructions, package-manager convention, existing diffdevil installation and version, and any selected configuration. Establish the intended working directory and comparison. In a monorepo, use the actual package/tooling boundary rather than assuming the repository root owns every dependency.

Use the user's existing instructions and installation grant. Explain a material footprint change briefly; do not ask again about ordinary edits already covered. Ask when a real user preference or unavailable prerequisite changes the result, not to confirm every command.

## Obtain a usable CLI

The published package is `@wolfsblvt/diffdevil`, and its executable is `diffdevil`. New installations below select the published package without a fixed version. Check its runtime requirements and use matching help/docs; the inspected release requires Node.js 22 or newer. Keep an existing deliberately selected version when it supports the task. Do not infer a release from a website specimen.

First check an existing trusted command:

```sh
diffdevil --version
diffdevil --help
```

For an established npm project that keeps development tools in its manifest:

```sh
npm install --save-dev @wolfsblvt/diffdevil
npm exec -- diffdevil --version
```

Use the project's existing pnpm, Yarn, or other manager instead when appropriate. Preserve its lockfile and script names. A local dependency normally runs through that manager's executor or an existing project script, not an assumed global command.

For a non-JavaScript project, use an existing compatible CLI or the user's established writable tool installation. Do not create a root `package.json` merely to measure a C#, Rust, Python, or other repository. With a suitable user-owned npm global prefix:

```sh
npm prefix --global
npm install --global @wolfsblvt/diffdevil
diffdevil --version
```

Inspect the actual prefix, ownership and executable path before installation. When that prefix is system-owned, choose a supported user-local prefix/tool-manager route under the user's grant rather than silently escalating privileges. Respect existing PATH conventions and verify how the command will be reached in a future shell. A command working only because the current process modified PATH is not proof of persistent availability. A deliberately project-local tooling directory remains an option when explicitly selected.

For a one-time or cache-backed execution, no project dependency is required:

```sh
npm exec --yes --package=@wolfsblvt/diffdevil -- diffdevil --version
npm exec --yes --package=@wolfsblvt/diffdevil -- diffdevil analyze --format agent
```

This route may obtain the package in npm's cache. Name it as an execution route, not a permanent `diffdevil` command. A cached run can satisfy a request to run the tool; it does not by itself satisfy a request for persistent installation.

A missing runtime, denied package download, or inaccessible install location is a precise prerequisite or failure. Reuse an authorized runtime-install route where available and preserve the existing working setup. Do not report a successful install from a partial download.

## Restricted or temporary harnesses

A documentation connector working does not prove that the execution environment can reach the npm registry. When package acquisition is blocked, reuse an existing compatible installation or an authorized uploaded/mounted full package or runtime. Keep its dependency closure intact and verify its source/version and actual CLI entry point before invoking it. A successfully called engine API or an install-free Action runtime is not proof that the full CLI is available.

A standalone bundle, when actually published by the selected source, can supply the same CLI without registry acquisition. Verify the real artifact and its version/digest; do not invent an asset URL or claim such a bundle exists because the Action distribution works.

Limit local analysis to the files and repositories available in that harness. A runtime supplied to a temporary Web sandbox can enable useful execution without installing a command or persistent Skill on the user's machine. Report that distinction. When the complete required runtime is unavailable, name the missing package/entry point rather than misreporting a failed npm install as success.

## Preserve the project's policy

Local read commands discover `.diffdevil.yml` at the Git root. An explicit `--config PATH` may select another deliberate YAML/JSON file. Existing invalid or unreadable configuration needs an explanation or repair; it must not disappear behind silent defaults.

Do not create a config file merely to prove the CLI installed. Without a selected file, the built-in `size@1` preset supplies ordinary defaults. For a requested explicit fresh size policy:

```yaml
version: 1
presets: [size@1]
```

Preserve deliberate `presets: []`, custom metrics, scopes, thresholds, labels, comments, and exclusions. The default has no hidden generated/vendor/lockfile exclusions. Changing those settings is policy authoring, not mandatory installer cleanup.

When a file is selected, validate and explain it:

```sh
diffdevil validate --config .diffdevil.yml
diffdevil explain --policy --config .diffdevil.yml --format json
```

Use the invocation for the chosen installation, such as `npm exec -- diffdevil ...` for an npm-local dependency. Follow the actual schema's declaration-replacement and array rules rather than generic deep merging.

## Verify a useful local result

Choose the comparison that answers the user's task:

```sh
diffdevil analyze --format agent
diffdevil analyze --staged --format json
diffdevil analyze --base origin/main --head HEAD --format agent
```

These are alternatives. Substitute the actual base ref rather than assuming `origin/main` exists or is the intended upstream. No source flag means HEAD against final tracked worktree content, with staged and unstaged changes counted together and untracked files excluded. `--staged` compares HEAD with the index. Both explicit revision arguments are required; their default is the merge-base comparison.

Verify command exit, reported source, selected policy, and measurement evidence. An empty worktree can correctly report zero without proving that the committed branch is empty. A non-Git directory without another source is an error, not an empty diff. A supplied patch can be analyzed without Git:

```sh
diffdevil analyze --diff-file change.diff --format json
```

For a first reusable result, capture one full report and query that same capture:

```sh
diffdevil analyze --format json --output diffdevil-report.json
diffdevil query --report diffdevil-report.json --metric changed --format json
```

Use an appropriate scratch/output path and consume the file only after successful execution. An old file left after failure is not a new report. Reports can contain repository paths and context; keep them in the user's selected storage rather than uploading them as an installation test.

`--format agent` is a compact reading view. Canonical JSON is the programmatic contract. Exact scalar output is available through `--format value`; unresolved scalar evidence returns exit 3 instead of inventing a number. A check returns 0 for true, 1 for false, 3 for unresolved, and 2 for an invalid or failed operation.

## Connect other capabilities only when selected

The CLI also supports query, check, plan, apply, and managed label-definition operations. `analyze` does not write to GitHub; `plan` describes intended effects; `apply` performs the selected operation and reports request/readback outcomes. Existing task-specific or standing authorization can cover apply. Use the documented trusted-policy and credential interfaces for that actual operation.

A persistent Skill is a separate installation. When requested, follow [Skill installation]({{PUBLIC_ORIGIN}}/setup/skill.md); its normal scope is the current user's harness. Installing an npm package does not itself make the harness discover its Skill. [Everything]({{PUBLIC_ORIGIN}}/setup/everything.md) joins local tooling, policy, the Skill, and a suitable GitHub route.

## Return the result

State the executable/version and installation location or executor, the policy preserved or created, the comparison actually analyzed, and the observed result. Distinguish persistent installation from a cache-backed run and successful analysis from exact measurement. Name a concrete remaining prerequisite rather than claiming success from a version read alone.

## Deeper reference

- [CLI commands, sources, formats and exit codes](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/manual/use/cli.md)
- [Presets, configuration and shortcuts](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/manual/policy/README.md)
- [Local automation examples](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/manual/start/analyze-local-changes.md)
- [npm execution](https://docs.npmjs.com/cli/v11/commands/npm-exec/)
- [npm installation locations](https://docs.npmjs.com/cli/v11/configuring-npm/folders/)
