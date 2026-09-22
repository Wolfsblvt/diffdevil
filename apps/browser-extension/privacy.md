# Privacy in diffdevil for GitHub

## What this notice covers

This notice describes the browser extension’s implemented data handling. It does not cover GitHub’s own service or the independent diffdevil GitHub App.

## Information read on GitHub

The extension reads the repository and pull-request identity, immutable base and head revisions, change counters, file identities, available diff material and relevant native label controls. When the selected policy mode uses repository configuration, it reads `.diffdevil.yml` and explicitly referenced templates from the exact trusted base revision. Proposed pull-request configuration is not used as trusted policy.

Requests use the signed-in GitHub page when available. A public GitHub API fallback deliberately omits credentials and uses no token. The extension does not collect cookies, ask for personal access tokens, install a local daemon, or enumerate browser history. Outside a supported GitHub pull-request route it does not analyze page content. GitHub receives ordinary requests to its own resources and operates under its own terms and privacy practices.

## Local processing and storage

Analysis runs locally in the extension worker. Raw diffs and referenced template contents are held in memory for analysis and are not persisted as an analysis cache. There is no telemetry, advertising identifier, analytics service, source-upload endpoint, or request to a Wolfsblvt Works backend. No hosted analysis is triggered.

The bounded rebuildable cache contains normalized reports, file paths, revision identities, trusted repository-policy text and exact-base missing-file results. These can reveal private repository information to someone with access to the browser profile. Cache data is not independently encrypted. Least-recently-used eviction and a configurable size limit bound the retained data.

Small display and guided-policy preferences use Chrome synchronized storage. When browser synchronization is enabled, the browser provider may synchronize those preferences across the user’s signed-in browsers. Large advanced YAML and repository overrides remain in local extension storage. “Local analysis” does not mean synchronized preferences never leave the device.

Runtime context and last-analysis identity are session-scoped. Diagnostic history retains codes and timestamps, not raw patches, response bodies or policy expressions. A deliberate support snapshot excludes repository identities, paths, policy text and source. A deliberate settings export contains the user’s configuration and may include private repository names or policy text; share it carefully.

## Use and sharing

The extension uses the information above only to provide and improve its visible pull-request analysis, configuration, cache and diagnostic features. It does not sell user data, use it for advertising or creditworthiness, transfer it for unrelated purposes, or provide routine human access to it.

The extension makes ordinary HTTPS requests to GitHub for GitHub resources and may use Chrome synchronization for the small preferences assigned to synchronized storage. It does not transmit source, reports, paths or policy to Wolfsblvt Works. A user-initiated export, copied support snapshot or public Issue attachment is a deliberate user action rather than background collection.

## Controls and deletion

Settings can disable augmentation, select Personal only mode, change the cache limit, clear reports, clear repository-policy caches, clear overrides and reset all extension data. Destructive resets require confirmation. Rebuildable data does not change repository truth. Already rendered facts on an open page can remain until that page refreshes or closes. Uninstalling removes extension storage according to the browser’s own behavior.

Incognito operation is disabled rather than silently mixing private-session analysis with persistent ordinary-profile caches. GitHub Enterprise hosts and Firefox are not supported by this release.

## Repository interactions

The extension never applies a label automatically. Its native handoff opens and searches GitHub’s visible label picker; the user owns the native selection. No hidden POST, automatic label mutation, label creation, App analysis request or quota-consuming hosted action is performed. Copying and opening product links happen only after user interaction.

## Permissions and support

The extension requests storage, a content script on github.com to follow pull-request navigation, and host access to api.github.com for public read-only fallback. It does not request cookies, browsing history, tabs enumeration, all-site access, unlimited storage or clipboard permissions. The ordinary user-initiated clipboard capability can be declined by the browser.

Support is available through Issues in the [`Wolfsblvt/diffdevil`](https://github.com/Wolfsblvt/diffdevil/issues) repository. Do not attach private source, credentials or unredacted configuration to a public issue. Before every Store submission or update, the maintainer must verify this notice and the Store declarations against the exact packaged release. This notice is not a privacy certification or a guarantee of Store approval.

## Related questions

The [security and data FAQ](https://diffdevil.dev/faq/#code-data) explains how the extension differs from the CLI, Actions, public Playground and managed App.
