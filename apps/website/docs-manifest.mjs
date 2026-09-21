// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The manual's reader-facing selection. Every entry names one maintained repository
 * Markdown source and the site slug it renders at. The site publishes this list, not
 * `docs/**`: internal records (Vision, Direction, Decisions, qualification, dated
 * references, publication procedure) stay in the repository and are linked, not
 * rendered. Sources listed with `optional: true` are rendered when present.
 *
 * `tested: true` marks pages whose command/policy/workflow specimens are executed by
 * `src/diffdevil/tests/examples.test.mjs`; the docs footer shows "Example tested ✓" there.
 */
import { FAQ_ROUTE, FAQ_SOURCE } from './faq-content.mjs';

/** Product prose shares source routing, but never creates a duplicate manual page. */
export const productPages = [{ source: FAQ_SOURCE, route: FAQ_ROUTE }];

export const groups = [
  { label: 'Overview', entries: [
    { source: 'docs/README.md', faq: ["why-diffdevil", "choose-a-surface"], slug: '', title: 'Docs' },
  ] },
  { label: 'Get started', entries: [
    { source: 'docs/guides/auto-label-pull-requests.md', faq: ["beyond-size-labels", "action-permissions"], slug: 'get-started/auto-label-pull-requests', tested: true },
    { source: 'docs/guides/local-automation.md', faq: ["offline", "machine-output"], slug: 'get-started/local-automation', tested: true },
    { source: 'docs/automation.md', slug: 'get-started/automation' },
    { source: 'docs/examples/README.md', slug: 'get-started/examples', title: 'Example map' },
  ] },
  { label: 'Recipes', entries: [
    { source: 'docs/guides/policy-recipes.md', slug: 'recipes/policy-recipes', tested: true },
  ] },
  { label: 'CLI', entries: [
    { source: 'docs/integration/cli.md', faq: ["different-results", "machine-output"], slug: 'cli', title: 'CLI' },
    { source: 'docs/PRESENTATION.md', slug: 'cli/presentation', title: 'Human and agent presentation' },
  ] },
  { label: 'Actions', entries: [
    { source: 'docs/integration/github-actions.md', faq: ["action-permissions", "fork-pull-requests", "checks-and-merge-blocking"], slug: 'actions/github-actions', tested: true },
    { source: 'docs/integration/action-distribution.md', slug: 'actions/action-distribution' },
    { source: 'docs/integration/github-api.md', faq: ["what-can-change", "private-repositories"], slug: 'actions/github-api' },
  ] },
  { label: 'Policies and detail', entries: [
    { source: 'docs/language/policies-and-bands.md', slug: 'policies-and-detail/policies-and-bands' },
    { source: 'docs/integration/presets-and-shortcuts.md', faq: ["no-language-required", "custom-policy"], slug: 'policies-and-detail/presets-and-shortcuts' },
    { source: 'docs/integration/templates.md', faq: ["existing-labels-and-comments"], slug: 'policies-and-detail/templates' },
    { source: 'docs/language.md', slug: 'policies-and-detail/language' },
    { source: 'docs/language/syntax.md', slug: 'policies-and-detail/syntax' },
    { source: 'docs/language/types-and-measurements.md', faq: ["changed-vs-churn", "measurement-evidence", "rules-with-uncertainty"], slug: 'policies-and-detail/types-and-measurements' },
    { source: 'docs/language/collections-and-scopes.md', faq: ["files-and-exclusions"], slug: 'policies-and-detail/collections-and-scopes' },
    { source: 'docs/language/standard-library.md', slug: 'policies-and-detail/standard-library' },
    { source: 'docs/language/diagnostics-and-limits.md', slug: 'policies-and-detail/diagnostics-and-limits' },
    { source: 'docs/language/versioning-and-interchange.md', slug: 'policies-and-detail/versioning-and-interchange' },
    { source: 'docs/language/parser-architecture.md', slug: 'policies-and-detail/parser-architecture' },
  ] },
  { label: 'Library API', entries: [
    { source: 'docs/integration/typescript-api.md', slug: 'library-api', title: 'Library API' },
  ] },
  { label: 'Agents', entries: [
    { source: 'docs/agent-skill/README.md', slug: 'agents/agent-integration', optional: true },
    { source: 'skills/diffdevil/SKILL.md', slug: 'agents/skill', optional: true, title: 'Agent Skill source' },
    { source: 'docs/setup/README.md', slug: 'agents/setup', optional: true },
    { source: 'docs/setup/skill.md', faq: ["coding-agents", "non-javascript-projects"], slug: 'setup/skill', title: 'Coding-agent setup' },
    { source: 'docs/setup/cli.md', slug: 'setup/cli', optional: true },
    { source: 'docs/setup/actions.md', slug: 'setup/actions', optional: true },
    { source: 'docs/setup/app.md', slug: 'setup/app', optional: true },
    { source: 'docs/setup/everything.md', slug: 'setup/everything', optional: true },
    { link: '/docs/cli/presentation/#agent-report-projection', label: 'Agent output contract' },
  ] },
  { label: 'Playground', entries: [
    { source: 'docs/integration/playground.md', faq: ["playground", "private-repositories"], slug: 'playground', title: 'Playground' },
    { source: 'apps/playground/README.md', slug: 'playground/application', title: 'Playground application and local route' },
  ] },
  { label: 'GitHub App', entries: [
    { source: 'docs/integration/github-app.md', faq: ["why-managed", "app-data"], slug: 'github-app/architecture', title: 'App architecture' },
    { source: 'docs/PRIVACY-AND-DATA.md', faq: ["app-data", "app-history", "export-and-delete", "uninstalling"], slug: 'github-app/privacy-and-data', title: 'Privacy and data' },
    { source: 'apps/github-app/README.md', faq: ["self-hosting"], slug: 'github-app/self-hosting', title: 'Self-hosting the runtime' },
  ] },
  // The browser extension's manual pages are authored with the extension application.
  // They render as soon as that source is in the repository; until then the group is empty.
  { label: 'Browser extension', entries: [
    { source: 'apps/browser-extension/README.md', faq: ["extension-without-repo-setup", "extension-policy"], slug: 'browser-extension', title: 'diffdevil for GitHub', optional: true },
    { source: 'apps/browser-extension/PRIVACY.md', faq: ["extension-data"], slug: 'browser-extension/privacy', title: 'Extension privacy', optional: true },
    { source: 'docs/integration/browser-extension.md', faq: ["virtual-labels", "supported-browsers"], slug: 'browser-extension/integration', title: 'Browser integration', optional: true },
  ] },
  { label: 'Help', entries: [
    { link: FAQ_ROUTE, label: 'FAQ' },
  ] },
  { label: 'Troubleshooting', entries: [
    { link: '/docs/get-started/auto-label-pull-requests/#troubleshooting', label: 'Labels did not appear' },
    { link: '/docs/policies-and-detail/types-and-measurements/', label: 'A count is unavailable or bounded' },
    { link: '/docs/policies-and-detail/diagnostics-and-limits/', label: 'Diagnostics and limits' },
  ] },
  { label: 'Releases', entries: [
    { source: 'docs/releases/README.md', slug: 'releases', title: 'Releases' },
    { source: 'docs/releases/v1.0.0.md', slug: 'releases/v1-0-0', title: 'v1.0.0' },
  ] },
  { label: 'Project', entries: [
    { source: 'SECURITY.md', slug: 'security', title: 'Security' },
    { source: 'LICENSES/README.md', slug: 'licences', title: 'Licences' },
  ] },
];

/** Assets the playground carries as fixtures: a docs link to one gets a "Try it" companion. */
export const tryIt = {
  'docs/examples/diffs/review.diff': 'replacement-once',
  'docs/examples/diffs/few-vs-many.diff': 'few-vs-many',
  'docs/examples/policies/full.yml': 'lockfile-excluded',
  'docs/examples/policies/review-signals.yml': 'custom-metric-comment',
  'docs/examples/policies/review-comment.yml': 'custom-metric-comment',
  'docs/examples/reports/exact.json': 'lockfile-excluded',
  'docs/examples/reports/bounded.json': 'bounded-band-proven',
  'docs/examples/reports/incomplete.json': 'incomplete-unknown',
  'docs/examples/reports/unmeasurable.json': 'binary-unmeasurable',
};

export const entries = groups.flatMap(group => group.entries.filter(entry => entry.source));
