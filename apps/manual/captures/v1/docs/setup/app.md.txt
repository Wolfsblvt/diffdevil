# Set up the diffdevil GitHub App

## Meaning

Connect this repository to the diffdevil GitHub App, preserve its policy and existing automation, and verify the intended managed result. This is App adoption, not an implicit CLI or Agent Skill installation. Self-hosting uses the same product with a separately selected operator.

## Identify the service and target

Use the [official installation entry]({{APP_INSTALL_URL}}) and [dashboard]({{APP_DASHBOARD_URL}}) supplied by the public product. Resolve the actual account/organization and repository from the user's request and working context. Reuse a suitable existing installation.

For an explicitly selected self-hosted service, use that operator's actual App identity and URLs instead of enrolling the repository in the official hosted service. Do not confuse a source checkout, an App registration, an installation request, an enabled repository, and a functioning service.

Read the repository's applicable instructions, `.diffdevil.yml` or other explicitly selected policy, existing workflows, and known App responsibilities. Inaccessible installation metadata is not proof that no installation exists. Use actual available provider interfaces under the user's grant. Ask for a material missing choice, not facts already present in the conversation or repository.

## Explain the selected behavior

The App operates the same engine and ordinary policy used by the CLI and Actions. The standard new managed setup uses `size@1`, managed size labels, and one native check summary. Comments and persistent analysis history are off unless selected. A large size classification does not itself mean a failed quality check or a branch-protection requirement.

Existing repository policy remains significant. The App resolves the selected preset, account/organization defaults, and settings explicitly supplied by the trusted repository file. Inspect the effective values and their origins. An explicit `presets: []` is not permission to reintroduce size labeling, and an invalid/unreadable policy is not an absent policy.

Present material changes to current labels, comments, checks, or service enrollment in ordinary language. Respect a sufficient existing grant rather than demanding fresh approval for every covered setting. Setup does not imply consent to paid service, optional history, or unrelated repositories.

## Complete the actual installation

Follow the supported GitHub/provider flow using available authorized tools. Where a human account or administrator step remains, give only that concrete step and preserve what is already prepared.

The ordinary GitHub installation encounter is:

1. Open the supplied installation link and verify the App's identity and publisher.
2. Select the intended personal or organization account.
3. Select the intended repository access. Preserve an existing deliberate installation scope; a request for one repository does not select every repository.
4. Review the requested permission names and repository list, then use the live **Install**, **Install and request**, or **Request** action appropriate to that account. An existing installation may instead offer **Save**.
5. Read back whether an installation exists with access to the target repository, or whether only an approval request was submitted.

Use the provider's current screen labels when they differ; do not guess through an unknown screen. Organization approval pending is not an installed App.

The selected App permission contract is Contents read, Pull requests write, and Checks write, with GitHub's ordinary metadata access. Contents permits trusted policy/template reads; Pull requests permits acquisition and configured labels/comments; Checks permits native summaries. A permission screen materially different from the actual product contract deserves explanation before proceeding, not blind approval.

Official hosted adoption does not require the user to supply an App private key, a personal write token, or Cloudflare credentials. Those belong to service operation, not customer repository enrollment.

## Configure, preview, and enable

Open the actual dashboard for the installation and inspect the target repository's access and enablement state. Authentication alone does not prove installation administration rights. Complete supported settings through the real interface rather than inventing API endpoints or controls.

For an unconfigured new repository, select the ordinary preset and default effects described above. When policy already exists, preserve it and inspect the effective result and setting origins. The root repository file is `.diffdevil.yml`; automatic write policy and relative templates come from the trusted base or explicit immutable source, not PR-head configuration.

Inspect the available preview for the intended repository/comparison. Keep the report, desired label/comment operations, native check behavior, and enabled settings distinguishable. Save and enable the intended automation through the actual supported route. An installation or a saved preset is not proof that execution is enabled.

History remains a separate explicit setting. The selected service contract keeps a seven-day operational recovery ledger; optional history retains aggregate and pathless per-file numeric measurements rather than source, filenames, authors or PR prose. Its free history window is thirty days. Explain the applicable live service terms before an explicit opt-in; do not present an unreleased price or paid entitlement as an offer. Keeping history off does not disable ordinary labels or native checks.

## Reconcile existing writers

Identify the actual overlap, not merely the presence of both an App and a workflow. Managed label groups, owned-comment lifecycles, and check identities can have different responsibilities.

Preserve a useful read-only Action beside App-owned effects. It can provide CI measurements without competing for labels/comments. An Action does not inherit dashboard defaults, so inspect policy parity rather than assuming the same filename makes results equal.

For a requested migration, prepare the destination and preview its policy before cutover. Disable only the old overlapping writer, reconcile any in-flight run or ambiguous effect, then enable the destination and verify it. Do not enable a replacement while the previous writer may still issue conflicting effects. A short explicit pause is different from deleting unrelated CI.

The App does not adopt, edit, or delete another principal's historical comments. Preserve those comments and start the App's own supported lifecycle. Where clean migration cannot be carried by the available controls, return the precise cutover step. Do not invent ownership-transfer APIs or silently change the requested operating route.

## Verify one useful managed result

Inspect an appropriate actual PR or supported reanalysis occasion under the user's request. Establish repository/PR identity, current head/comparison, effective policy, measurement evidence, intended effects, and provider readback. Check that the native summary describes that revision and that selected labels/comments have the intended owner.

A check acknowledgment, accepted webhook, queued operation, or installed App alone is not proof of the useful PR result. A valid no-op is useful evidence when state is already correct. An unresolved measurement or held rule remains explained evidence, not a guessed count or fabricated successful write.

Keep unrelated labels/comments and existing branch protection intact. Readback of private repository data stays with the authorized user; the public playground is not a private-PR testing route.

For failure, distinguish installation/access, invalid policy, disabled execution, stale comparison, runtime/provider failure, and unobserved/partial effects. Reconcile an ambiguous write before a retry. A setup that still needs enablement or a real run is reported with that exact remainder, not called complete.

## Self-hosting

Self-hosting is an intentional route, not another engine or a restricted edition. Use the [App operator source](https://github.com/Wolfsblvt/diffdevil/blob/main/apps/github-app/README.md) and [architecture](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/integration/github-app.md) for the actually supported adapter and operating procedure.

The selected adapter uses Cloudflare Workers, Queues, and D1. Operating it entails the operator's App registration, bindings, credentials, deployment, updates, and data obligations. Choosing self-hosting is not an instruction to enroll in the official service or assume an unimplemented Docker adapter exists.

The source-owned registration/credential helper prepares parts of that operator journey. Its created undeployed Worker version is not a deployment, App installation, or complete onboarding result. Use the current operator procedure and verify the full selected outcome; do not turn a helper command into a fictional one-command production service.

## Return the result

Report the actual service/App identity, account and repository scope, effective preset/policy and effects, history choice, migration disposition, enablement state, and observed PR result. Separate requests awaiting administrator approval from completed installation, and installation from functioning automation. Give a concrete remaining handoff only where the agent cannot perform the required step.

For separately requested local tools or persistent knowledge, use [CLI setup]({{PUBLIC_ORIGIN}}/setup/cli.md), [Skill installation]({{PUBLIC_ORIGIN}}/setup/skill.md), or [Everything]({{PUBLIC_ORIGIN}}/setup/everything.md).

## Deeper reference

- [App configuration and provider behavior](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/integration/github-app.md)
- [Hosted data and history](https://github.com/Wolfsblvt/diffdevil/blob/main/docs/PRIVACY-AND-DATA.md)
- [GitHub third-party App installation](https://docs.github.com/en/apps/using-github-apps/installing-a-github-app-from-a-third-party)
