# diffdevil

[![npm](https://img.shields.io/npm/v/%40wolfsblvt%2Fdiffdevil)](https://www.npmjs.com/package/@wolfsblvt/diffdevil)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22-339933)](https://nodejs.org/)

**Measure changes. Match rules. Act on the result.**

`@wolfsblvt/diffdevil` provides the CLI and TypeScript library for turning Git diffs into versioned facts, queries, policy results, and optional GitHub labels and comments. Raw churn and replacement-aware changed lines remain distinct, with exact, bounded, unknown, and unmeasurable evidence shown honestly.

## Run or install

Requires Node.js 22 or newer. Local Git comparisons also require Git.

Run the inspected stable CLI without adding a project dependency:

```sh
npm exec --yes --package=@wolfsblvt/diffdevil@1.0.0 -- diffdevil analyze --format agent
```

Or add it to an npm project's developer tools:

```sh
npm install --save-dev --save-exact @wolfsblvt/diffdevil@1.0.0
npm exec -- diffdevil analyze --format agent
```

Reuse your project's selected manager and version. A non-JavaScript repository does not need a new `package.json`; [CLI setup]({{PUBLIC_ORIGIN}}/setup/cli.md) explains persistent user-local and existing-tool routes.

No source flag compares HEAD with final tracked worktree content. Use `--staged` for the index, both `--base REF --head REF` for a branch comparison, or `--diff-file PATH` for a supplied patch.

## Query the result

```sh
diffdevil query --metric changed --format json
diffdevil query --files --path 'src/**' --select path --format nul
diffdevil check --metric changed --lte 200
```

Use your installed command or project executor. Canonical JSON preserves uncertainty. Scalar `--format value` requires an exact value; unresolved evidence exits 3 rather than becoming zero. Check exits distinguish true (0), false (1), unresolved (3), and failed operation (2).

## Included Agent Skill

The package includes the **same canonical diffdevil Skill** distributed through the website, with its detailed Markdown references:

```text
skills/diffdevil/
  SKILL.md
  references/
```

[Read the canonical Skill](https://github.com/Wolfsblvt/diffdevil/blob/{{SOURCE_REF}}/skills/diffdevil/SKILL.md) ·
[Install or update it for your agent]({{PUBLIC_ORIGIN}}/setup/skill.md)

The folder is relative to the installed package root, not your project root. A conventional npm-local installation places it under `node_modules/@wolfsblvt/diffdevil/skills/diffdevil/`. Other package managers and global installations can use different physical locations.

The Skill teaches useful diff analysis, queries, checks, policy planning, and application through the tool. Installing the package makes the files available; installing the Skill in your harness makes it persistently discoverable. User scope is the normal default. The canonical installer can use this local source and verifies the complete core/reference set.

The Skill version is independent of the npm version. An older installed package can carry an earlier Skill snapshot; follow the Skill's normal discovery/update instructions rather than editing its canonical text or repinning the project's CLI automatically.

## Policy and GitHub effects

Local reads discover root `.diffdevil.yml`. No custom policy is required to start; `size@1` is the ordinary default. Query and analysis do not write to GitHub.

`plan` produces intended effects. `apply` performs the selected operation and reports request/readback outcomes. Automatic writes use the documented trusted-policy source. Root GitHub Action `Wolfsblvt/diffdevil@v1` applies its standard size-label policy; `Wolfsblvt/diffdevil/actions/analyze@v1` is read-only.

[Actions setup]({{PUBLIC_ORIGIN}}/setup/actions.md) ·
[App setup]({{PUBLIC_ORIGIN}}/setup/app.md) ·
[Complete project setup]({{PUBLIC_ORIGIN}}/setup/everything.md)

## Library and reference

The package exposes the root API and `/core`, `/language`, `/policy`, `/git`, and `/github` entry points. Use its shipped TypeScript declarations and validated readers rather than casting arbitrary JSON.

[CLI reference](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/integration/cli.md) ·
[TypeScript integration](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/integration/typescript-api.md) ·
[Policy and shortcuts](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/integration/presets-and-shortcuts.md)

Matching manuals are included under `docs/`. Help and schemas describe the actual installed interface when reading newer online documentation.

## License

Reusable software and runnable examples are MIT. Original documentation prose is CC BY 4.0; brand and visual rights remain reserved. Application/service software has its separate AGPL-3.0-only boundary. See the package's `LICENSE.md` and [licence map](https://github.com/Wolfsblvt/diffdevil/blob/main/LICENSES/README.md) for component and third-party terms.
