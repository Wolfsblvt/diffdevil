# Privacy in diffdevil for GitHub

## What this notice covers

This notice describes the browser extension’s implemented data handling. It does not cover GitHub’s own service or the independent diffdevil GitHub App.

## Information read on GitHub

The extension reads the repository and pull-request identity, immutable base and head revisions, change counters, file identities, available diff material and relevant native label controls. When the selected policy mode uses repository configuration, it reads `.diffdevil.yml` and explicitly referenced templates from the exact trusted base revision. Proposed pull-request configuration is not used as trusted policy.

Requests use the signed-in GitHub page when available. A public GitHub API fallback deliberately omits credentials and uses no token. The extension does not collect cookies, ask for personal access tokens, install a local daemon, or enumerate browser history. Outside a supported GitHub pull-request route it does not analyze page content. GitHub receives ordinary requests to its own resources and operates under its own terms and privacy practices.

## Local processing and storage

Analysis runs locally in the extension worker. Raw diffs and patches are held in memory for analysis and are never persisted. Trusted repository-policy text and the templates it explicitly references, read from the exact base revision, are kept in the rebuildable cache described below so a cached report can be shown again under the same policy. There is no telemetry, advertising identifier, analytics service, source-upload endpoint, or request to a Wolfsblvt Works backend. No hosted analysis is triggered.

The bounded rebuildable cache contains normalized reports, file paths, revision identities, how many files were measured, bounded or declined by GitHub, trusted repository-policy text and templates, exact-base missing-file results, and the last comparison confirmed for each pull request. These can reveal private repository information to someone with access to the browser profile. Cache data is not independently encrypted. Least-recently-used eviction and a configurable size limit bound the retained data, and it survives tab changes, reloads and browser restarts so a comparison can reappear at once.

Small display and guided-policy preferences use Chrome synchronized storage. When browser synchronization is enabled, the browser provider may synchronize those preferences across the user’s signed-in browsers. Large advanced YAML and repository overrides remain in local extension storage. “Local analysis” does not mean synchronized preferences never leave the device.

The comparison most recently analysed is session-scoped. Diagnostic history retains codes, timestamps, phase, frame, document and tab identifiers, and coarse sender/tab route standings; it does not retain raw patches, response bodies, policy expressions or full route URLs. A deliberate support snapshot excludes repository identities, paths, policy text and source; a paused-repository list is redacted from it. A deliberate settings export contains the user’s configuration, including paused repositories, and may include private repository names or policy text; share it carefully.

## Use and sharing

diffdevil for GitHub’s use and transfer of user data complies with the Chrome Web Store User Data Policy’s Limited Use restrictions. This applies to information read from GitHub pages and APIs and the local results derived from it.

The extension uses the information above only to provide and improve its disclosed local pull-request analysis, policy configuration, cache, diagnostic and data-management features. It does not sell user data, use or transfer it for advertising or creditworthiness, transfer it for unrelated purposes, or provide routine human access to it.

The extension makes ordinary HTTPS requests to GitHub for GitHub resources and may use Chrome synchronization for the small preferences assigned to synchronized storage. It does not transmit source, reports, paths or policy to Wolfsblvt Works. A user-initiated export, copied support snapshot or public Issue attachment is a deliberate user action rather than background collection.

This Limited Use affirmation concerns use and transfer, not compliance with every Store requirement or Store approval. The cache is not independently encrypted, as disclosed above. The current Store FAQ says personal or sensitive user data stored at rest should use strong encryption, so this notice does not claim that requirement is satisfied. Store review is the selected provider-interpretation route for this exact package: submission preserves this disclosure and uses deferred publishing, while review approval or rejection supplies package-specific evidence and public release remains a separate owner decision.

## Controls and deletion

Settings can disable augmentation, select Personal only mode, set the automatic file limit and the cache size limit, pause a repository, list what is stored for each repository and pull request, clear one pull request, clear one repository, clear every report, clear every repository-policy cache, clear overrides and reset all extension data. A paused repository is a local choice, stored in local extension storage, never synchronized; pausing deletes nothing and clearing does not resume. Destructive resets name their scope and require confirmation. Rebuildable data does not change repository truth. Already rendered facts on an open page can remain until that page refreshes or closes. Uninstalling removes extension storage according to the browser’s own behavior.

Incognito operation is disabled rather than silently mixing private-session analysis with persistent ordinary-profile caches. GitHub Enterprise hosts and Firefox are not supported by this release.

## Repository interactions

The extension never applies a label automatically. Its native handoff opens and searches GitHub’s visible label picker; the user owns the native selection. No hidden POST, automatic label mutation, label creation, App analysis request or quota-consuming hosted action is performed. Copying and opening product links happen only after user interaction.

## Permissions and support

The extension requests storage, a content script on github.com to follow pull-request navigation, and host access to api.github.com for public read-only fallback. It does not request cookies, browsing history, tabs enumeration, all-site access, unlimited storage or clipboard permissions. The ordinary user-initiated clipboard capability can be declined by the browser.

diffdevil for GitHub is a [Wolfsblvt Works](https://wolfsblvt.works/) product. When the Works contact service is available, use [contact for diffdevil](https://contact.wolfsblvt.works/?product=diffdevil) for private support or privacy questions. [Public GitHub Issues](https://github.com/Wolfsblvt/diffdevil/issues) remain available for a public product report. Opening these destinations is a user action; the extension does not attach a report, configuration or source. Do not send credentials or private source, or attach unredacted configuration to a public issue.

The product website's [operator information and legal contact](https://diffdevil.dev/impressum/), [website privacy information](https://diffdevil.dev/privacy/) and [website terms](https://diffdevil.dev/terms/) are the related legal destinations. Their publication and verification, including the contact service, are required before Store submission. Those website notices do not replace this extension-specific data disclosure or the software licences. Before every Store submission or update, the maintainer must verify this notice, its public links and the Store declarations against the exact packaged release. This notice is not a privacy certification or a guarantee of Store approval.

## Related questions

The [security and data FAQ](https://diffdevil.dev/faq/#code-data) explains how the extension differs from the CLI, Actions, public Playground and managed App.
