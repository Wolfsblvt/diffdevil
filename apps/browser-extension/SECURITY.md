# Extension security boundary

## Meaning

The extension is read-only toward GitHub except for handing the user to GitHub's existing visible controls. It analyzes potentially adversarial repository text. This document records implemented defenses and unresolved verification, not a security certification.

## Threats and controls

A PR may contain executable-looking strings, misleading counters, pathological patches, invalid policy, binary files, moving refs and hostile paths. Inputs are size-bounded, parsed by the shared core, validated and carried as data. DOM rendering uses text nodes. A schema-valid record is not enough to establish exact evidence; independent provider completeness and counter checks remain necessary.

Repository policy is the exact trusted base document. Proposed head changes cannot authorize their own policy or template behavior. Template paths reject absolute paths, parent traversal, backslashes, control characters and malformed segments. Public policy lookup rejects directories, symlinks and unsupported encoding. Template content is bounded and interpreted by the core template language, not JavaScript.

Worker messages must come from this extension. Settings writes, imports, diagnostics and destructive actions require the exact options page. GitHub source operations require a top-level supported PR page and are restricted to that repository and PR. File-view contexts have the same scope. Public network requests construct URLs from validated fields and only use GitHub's API origin, omit credentials and reject redirects. The worker is not an arbitrary fetch proxy. No external messaging interface, PAT, localhost control channel or cookie-reading permission is provided.

Executable resources ship locally. The extension-page CSP excludes runtime string compilation and remote scripts. Schema validators are precompiled; the public browser export has no external executable imports. The content script does not include the compiler, reducing its page-lifecycle footprint. Native browser/storage APIs still require installed-profile verification; an authored transport test does not establish Chrome's own enforcement.

## Private data

Raw diffs are transient. Rebuildable numeric reports can still expose file paths, repository identifiers, revisions and policy text. Browser-profile access is therefore a trust boundary. There is no independent at-rest encryption in this implementation, and the source does not claim that a Chrome profile is universally encrypted. Incognito is disabled rather than mixing its data into normal persistent storage. Store privacy/security review must account for these actual choices.

Support snapshots omit repository/path identity, raw source and policy text. User-requested full settings exports and report copies deliberately retain their content and are labeled differently. No diagnostic error body or policy expression is persisted as telemetry. There is no developer-controlled collection endpoint.

## Mutations and state claims

The native label handoff does not mutate provider truth. It cannot create labels or run App analysis. A label is reported only as observed in GitHub's native DOM, not as an extension-applied write. Virtual pills and local provenance are explicitly different. An App checkmark must not be inferred from user-editable page text; the authenticated delivery boundary remains unimplemented rather than guessed.

Cache is disposable. Epochs prevent late writes after a clear. Settings journals preserve recovery from partial local/synchronized writes; corrupt stored values cause an error rather than being silently reset. The memory, concurrency, transport and LRU limits in Architecture are intentional constraints, but they are not a browser-process denial-of-service audit.

## Disclosure and acceptance

Use the repository's private security reporting channel when available; do not include private source or credentials in a public issue. Live authenticated GitHub, enterprise policy enforcement, installed worker restarts, native IndexedDB quotas and Windows operation must be accepted against the exact release before publication. The supplied installed runner respects managed policy and records a blocked result instead of disabling it.
