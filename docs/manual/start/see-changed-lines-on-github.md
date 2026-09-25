# See changed lines on GitHub

> [!NOTE]
> **In development**
> The extension can be used from its source build; public Store availability is a separate release step.

**diffdevil for GitHub** adds a personal Changed view to pull requests you can already read. It requires no repository workflow, App installation or label-write permission. Start by opening one PR, reading its aggregate result, and then inspecting a file's evidence.

## Install or update the extension

Use a Chromium browser that supports the extension's Manifest V3 build. The qualified development route is Chrome; do not infer support for Firefox, Enterprise GitHub hosts or incognito from it. Use the [extension product page](https://diffdevil.dev/extension/) for release availability. A Store listing must actually exist before it is an installation route.

For the available source route, use a diffdevil checkout and Node.js 22.12 or newer. At its root run:

```sh
npm ci --ignore-scripts
npm run extension:dev
```

The complete unpacked build is `artifacts/browser-extension/unpacked/`. Open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select that directory. If your organization forbids unpacked extensions, use its approved installation process rather than bypassing the restriction.

After rebuilding to update, use **Reload** on the extension's card and reload the GitHub tab too. A newly written directory does not replace the code already running in an open page. The [canonical build instructions](../../../apps/browser-extension/README.md#build-and-load) own the source-build requirements and qualification details.

## Open a whole pull request

Open a PR at `https://github.com/OWNER/REPO/pull/NUMBER` that your browser can read. The aggregate Changed projection follows the whole PR across its Conversation, Commits, Checks and Files changed tabs.

Look for **Changed** beside GitHub's native statistics. GitHub's additions and deletions remain the raw view; Changed counts replacements once within their edit blocks. For example, the [complete local teaching patch](../../examples/diffs/review.diff) and the default `size@1` policy produce **10 Changed, 16 raw churn, band `xs`**. The extension uses that same report semantics, not a second browser counting formula.

Click Changed to open the nonmodal detail panel. Inspect the acquired head/base, evidence standing, file records and policy provenance. Close it with its close control or Escape. A displayed count belongs to those revisions, not indefinitely to the PR number.

When evidence is bounded, unknown or unmeasurable, retain that standing. A range is not an approximate point estimate, and missing acquisition is not zero Changed. [Changed lines and raw churn](../understand/changed-lines-and-churn.md) explains the components; [Evidence and uncertainty](../understand/evidence-and-uncertainty.md) explains the limits.

## Inspect a file, then the policy

On the whole PR's **Files changed** tab, inspect one file's Changed result and raw additions/deletions. Per-file projection is deliberately absent from commit-only or narrowed comparison routes, where whole-PR data would describe the wrong comparison.

A local size pill is the extension's classification under its effective policy. It is **not** a label applied to GitHub, a managed-App check, or evidence that repository automation ran. Even an exact count can have different bands under different policies.

Policy provenance explains which personal settings, trusted repository-base policy and explicit personal repository override contributed. An inaccessible policy is not the same as an absent policy. Invalid or unavailable configuration remains visible rather than silently producing a different classification; usable facts need not disappear with it.

## Find one setting

Open the extension from its browser-toolbar icon to reach settings. Search for the setting you need instead of browsing a long inventory. Search can reveal an Advanced setting without permanently switching every setting to Advanced mode.

The source-defined deep links include `#display.brandIcon` and `#policy.advancedYaml` on the extension's own options page. They reveal and focus the selected control. These are extension-local fragments, not routes on the product website.

Personal settings do not change repository automation. Import or export policy deliberately, and inspect errors before saving. Invalid policy must not replace the last valid settings. The deeper [extension guide](../use/browser-extension.md) covers settings, origins, caches and reset behavior.

## Keep the local boundary clear

Analysis runs in the browser extension. It does not submit a PR to a diffdevil analysis service, accept a personal access token, or apply labels/comments. A native label-picker handoff still leaves selecting the label to you; opening that picker is not an automated write.

Reports and trusted-policy caches can contain private paths and revisions. Small preferences may use browser sync, while advanced policy and repository overrides have their own local storage. Treat a complete settings export differently from a redacted support snapshot. Read the [extension privacy source](../../../apps/browser-extension/privacy.md) and [Security and data](../help/security-and-data.md) before sharing diagnostic material.

## Recover a missing or stale result

**Nothing appeared:** verify that the extension is enabled, that this is a supported whole-PR route, and that the page has been reloaded after installation. A GitHub access failure is not fixed by changing size thresholds.

**The numbers describe an older head:** reload or reacquire the PR and inspect the new source identity. Do not carry a cached number forward without its revision. Rebuilding the extension also requires reloading both extension and tab.

**Facts appear but classification does not:** inspect the selected policy's origin and diagnostics. Repair the configuration or the access problem it names; do not reinterpret failure as “no repository policy.”

**Only a file-level result is absent:** first check whether you are viewing a single commit or narrowed comparison. On a supported full-PR view, inspect acquisition and evidence rather than treating a missing row as unchanged.

After repair, open the detail panel again and confirm the intended comparison and policy. Continue with [diffdevil for GitHub](../use/browser-extension.md) for the complete operating guide.
