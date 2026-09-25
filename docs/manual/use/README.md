# Surfaces

Choose where you want diffdevil to work. The engine, measurements and policy language stay the same; who acquires the comparison, supplies trusted configuration and operates effects changes. You do not need to adopt every surface to get the complete open tool.

[How diffdevil reasons](../understand/README.md) explains the shared model. These guides explain the operating differences, not six new definitions of Changed.

## Choose the job you want to own

| Your job | Surface | What you operate |
| --- | --- | --- |
| Inspect local changes, ask questions or compose scripts | [CLI](cli.md) | An executable, a selected comparison and local configuration |
| Keep repository automation in reviewed workflows | [GitHub Actions](github-actions.md) | Events, runner permissions, trusted policy and effect ownership |
| See Changed while reviewing on GitHub | [Browser extension](browser-extension.md) | Your browser settings and personal view; no repository installation |
| Embed analysis in another application | [TypeScript library](typescript-library.md) | Input acquisition, the public API and your application's data lifecycle |
| Experiment before installing | [Playground](playground.md) | A read-only browser session and portable exports |
| Give a coding agent reusable tool knowledge | [With a coding agent](coding-agent.md) | A complete Skill installation and a separate executable route |
| Have a service run repository automation | [Managed App](managed-app/README.md) | Installation scope, configuration, enabled effects and service choices |

Start with the CLI for a local question, the extension for personal review, or Actions for repository-owned automation. The library is the same product inside your program. The Playground is a trial and learning surface, not a mandatory hosted account. The Skill helps an agent use these routes; it is not another measurement service.

## Installation follows responsibility

CLI and library use an ordinary package installation without a diffdevil account. Git is needed only for Git-backed inputs. Actions ship their runtime and need no npm installation in the consumer job. The extension installs in a browser, not a repository. The Playground needs a browser; its live route accepts public GitHub PRs only.

The extension's source build is available while its public Store release remains separate. The complete managed service is in development; its three guides retain that standing. A source implementation, published package, Store listing and live hosted service are different availability claims. Follow the selected surface's access instructions rather than guessing an installation URL.

## Decide where data may go

A local CLI reading a diff or saved report does not need a provider request. A library host controls its own file access and retention. A GitHub-backed command or Action sends requests to GitHub; runner artifacts can contain paths, revisions and policy material.

The extension processes diffs locally, but its normalized caches can reveal private repository details and small preferences may use browser sync. The Playground's live acquisition passes a public PR identity to its configured service; exported policy can also travel in a share URL. Those are different boundaries from local file analysis. Each operating guide explains the actual inputs, storage and deletion controls. [Security and data](../help/security-and-data.md) is the joined deeper route.

## Combine readers freely; choose writers deliberately

A useful combination is a local CLI before pushing, an Action maintaining repository labels, and the extension helping reviewers inspect the result. None needs to pretend that another surface ran. A personal extension policy may intentionally classify the same facts differently from repository automation.

Read-only Actions can coexist with an App that owns labels. Two independent writers should not compete over the same managed label group or owned-comment lifecycle. Choose one writer for each overlapping effect, or make their ownership disjoint. A workflow concurrency group does not coordinate an unrelated App.

When results disagree, compare the source revisions, included paths, policy origins and executable semantics before changing a threshold. When an installation or acquisition fails, return to that surface's failure section rather than replacing missing evidence with a different surface's cached number.

[Shared workflows](shared-workflows/README.md) explains what to carry between hosts. [Reports, plans, and apply](shared-workflows/reports-plans-and-apply.md) handles artifact reuse; [Labels, comments, and definitions](shared-workflows/labels-comments-and-definitions.md) handles writer ownership and migration.
