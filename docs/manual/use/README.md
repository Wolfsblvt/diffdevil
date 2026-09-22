# Surfaces

Choose where you want diffdevil to work. The [measurements, evidence and policy](../understand/README.md) stay the same. What changes is who obtains the comparison, selects configuration, keeps credentials, and applies effects.

Start with the place that should own your job, not the longest feature list.

| Your job | Surface | What you operate |
| --- | --- | --- |
| Understand local changes or feed a script | [CLI](cli.md) | An executable, a comparison and its output |
| Keep repository automation in reviewed workflows | [GitHub Actions](github-actions.md) | Events, job permissions, policy and artifact transport |
| See Changed while browsing GitHub | [Browser extension](browser-extension.md) | Your browser, personal settings and local presentation |
| Embed analysis in an application | [TypeScript library](typescript-library.md) | The calling program and its explicit host capabilities |
| Explore a public change before installing | [Playground](playground.md) | A read-only browser session and its selected source edition |
| Give a coding agent persistent tool knowledge | [With a coding agent](coding-agent.md) | Skill discovery and a separate executable route |
| Have a service operate repository automation | [Managed App](managed-app/README.md) | Installation scope, enabled effects and service choices |

## Installation and account responsibility

The CLI and library use the same npm package. A repository does not need to use JavaScript to run the CLI. Actions carry their own runtime, so an API-only workflow needs neither npm installation nor a checkout of the PR. The Playground's frozen examples need only a browser; its live route needs a public GitHub PR.

The extension is a personal installation, not a repository integration. Its source build is available for local use; its public Store release remains in development. The complete managed-service experience is also in development. Its installation and administration are separate from the open-source tool. A Skill supplies instructions to an agent, not a new account, runtime or permission grant.

Each guide names its actual installation route and availability. A source checkout or open PR is not evidence that a matching package, Store listing or hosted service has been released.

## Follow the data, not the product name

Local CLI and pure library operations can analyze files without sending them anywhere. GitHub acquisition makes provider requests; application additionally needs credentials and authority for the selected effects. Actions run in your chosen runner environment, where logs and uploaded artifacts have that environment's access and retention rules.

The extension processes acquired PR data in the browser. Its local caches and browser-synced preferences have different storage boundaries. The public Playground can send a public PR identity to its acquisition service; edited policy is evaluated locally but can be encoded in a shareable URL. Read the chosen surface's data section before sharing a report, settings export or URL. “Read-only” describes writes to GitHub, not an absence of sensitive data.

## Combine readers; choose the writer

A CLI can prepare a change while an Action maintains labels. An extension can show a personal interpretation alongside either. A read-only Action can coexist with an App that owns effects. The agent can use the same CLI rather than calculate another approximation.

Two views need not agree when they selected different revisions, included paths, policy, parameters or evidence. Compare those identities before blaming the engine. Personal extension settings do not automatically become repository policy, and a Playground export does not configure another host until you deliberately adopt it.

Choose one owner for each overlapping managed label group and comment lifecycle. Two independent writers do not become coordinated because both use diffdevil. Separate their effects explicitly, or disable the outgoing writer before enabling its replacement. Repeatedly removing and restoring each other's labels is not useful automation.

[Shared workflows](shared-workflows/README.md) explains what can travel between hosts. A complete report carries facts; a policy carries rules; a plan carries desired operations. None of them, by itself, carries permission or proof that GitHub changed.
