// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Site facts that are configuration, not design copy. The public origin, the App
 * installation URL and the playground API origin are configured values; none of them
 * is a decided domain. Everything else points at maintained repository or company
 * surfaces.
 */
import packageJson from '../../../../package.json' with { type: 'json' };

/** Configured public origin. Design copy uses paths; absolute URLs are only built here. */
export const ORIGIN: string = (import.meta.env.DIFFDEVIL_SITE_ORIGIN ?? 'https://diffdevil.invalid').replace(/\/$/u, '');
export const ORIGIN_IS_PLACEHOLDER = ORIGIN.endsWith('.invalid');

/** The public playground API Worker the playground island calls for live public PRs. */
export const PLAYGROUND_API: string = (import.meta.env.PUBLIC_PLAYGROUND_API ?? 'http://127.0.0.1:4173').replace(/\/$/u, '');

/** GitHub App installation URL. Absent until the hosted App is registered and opened. */
export const APP_INSTALL_URL: string | undefined = import.meta.env.PUBLIC_APP_INSTALL_URL || undefined;

export const PACKAGE_VERSION: string = packageJson.version;
export const REPO = 'Wolfsblvt/diffdevil';
export const GITHUB = `https://github.com/${REPO}`;
export const GITHUB_BLOB = `${GITHUB}/blob/main/`;
/** Repository file on GitHub at main; `path` is repository-relative without a leading slash. */
export function blobUrl(path: string): string { return `${GITHUB_BLOB}${path.replace(/^\/+/u, '')}`; }
export const NPM = 'https://www.npmjs.com/package/@wolfsblvt/diffdevil';
export const MARKETPLACE = 'https://github.com/marketplace/actions/diffdevil';
export const RELEASES = `${GITHUB}/releases`;
export const SECURITY_ADVISORIES = `${GITHUB}/security/advisories`;
export const LIVE_PLAYGROUND_WORKER = 'https://diffdevil-playground.wolfsblvt.workers.dev';

/** Company-owned legal surfaces. The site links to them; it does not restate legal text. */
export const IMPRESSUM = 'https://wolfsblvt.com/legal-notice.html';
export const COMPANY_PRIVACY = 'https://wolfsblvt.com/privacy.html';
export const COMPANY = 'Wolfsblvt Works';

export const paths = {
  home: '/',
  playground: '/playground/',
  examples: '/examples/',
  docs: '/docs/',
  app: '/app/',
  security: '/docs/security/',
  privacy: '/privacy/',
  licences: '/docs/licences/',
  skill: '/skill/SKILL.md',
  skillVersion: '/skill/version',
  setup: (intent: 'cli' | 'actions' | 'app' | 'everything') => `/setup/${intent}.md`,
} as const;

export const docPaths = {
  getStarted: '/docs/get-started/auto-label-pull-requests/',
  localAutomation: '/docs/get-started/local-automation/',
  recipes: '/docs/recipes/policy-recipes/',
  cli: '/docs/cli/',
  actions: '/docs/actions/github-actions/',
  actionDistribution: '/docs/actions/action-distribution/',
  api: '/docs/library-api/',
  policies: '/docs/policies-and-detail/policies-and-bands/',
  typesAndMeasurements: '/docs/policies-and-detail/types-and-measurements/',
  presets: '/docs/policies-and-detail/presets-and-shortcuts/',
  templates: '/docs/policies-and-detail/templates/',
  language: '/docs/policies-and-detail/language/',
  syntax: '/docs/policies-and-detail/syntax/',
  agents: '/docs/cli/#human-and-agent',
  playground: '/docs/playground/',
  app: '/docs/github-app/architecture/',
  privacyAndData: '/docs/github-app/privacy-and-data/',
  troubleshooting: '/docs/get-started/auto-label-pull-requests/#troubleshooting',
  releases: '/docs/releases/',
  versioning: '/docs/policies-and-detail/versioning-and-interchange/',
  githubApi: '/docs/actions/github-api/',
} as const;

export function absolute(path: string): string { return `${ORIGIN}${path}`; }
