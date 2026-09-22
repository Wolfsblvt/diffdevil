// SPDX-License-Identifier: AGPL-3.0-only
/** Canonical public origins are selected facts. Live installation, Store and account
 * destinations remain independently configured; selecting a host does not publish it.
 */
import packageJson from '../../../../package.json' with { type: 'json' };
import authoring from '../../../manual/authoring-state.json' with { type: 'json' };
import { origins } from '../../public-origins.mjs';
import { legacyRedirects } from '../../../manual/migration.mjs';

export const ORIGIN: string = (import.meta.env.DIFFDEVIL_SITE_ORIGIN ?? origins.site).replace(/\/$/u, '');
export const ORIGIN_IS_PLACEHOLDER = ORIGIN.endsWith('.invalid');
const isManual = import.meta.env.DIFFDEVIL_SURFACE === 'manual';
const transferred = new Map(legacyRedirects(authoring).map(rule => [rule.from, rule.to]));
function sitePath(path: string): string {
  const [pathname, fragment] = path.split('#');
  const target = transferred.get(pathname!);
  return target ? target + (fragment ? `#${fragment}` : '') : isManual ? ORIGIN + path : path;
}
export const PLAYGROUND_API: string = (import.meta.env.PUBLIC_PLAYGROUND_API ?? 'http://127.0.0.1:4173').replace(/\/$/u, '');
/** Every install action targets a real configured destination, never an invented host. */
export const APP_INSTALL_URL: string | undefined = import.meta.env.PUBLIC_APP_INSTALL_URL || undefined;
export const DISCORD_URL: string | undefined = import.meta.env.PUBLIC_DISCORD_URL || undefined;
export const BLUESKY_URL: string | undefined = import.meta.env.PUBLIC_BLUESKY_URL || undefined;
export const SPONSOR_URL: string | undefined = import.meta.env.PUBLIC_SPONSOR_URL || undefined;
export const CHROME_WEB_STORE_URL: string | undefined = import.meta.env.PUBLIC_CHROME_WEB_STORE_URL || undefined;
export const DASHBOARD_URL: string | undefined = import.meta.env.PUBLIC_DASHBOARD_URL || undefined;
export const PACKAGE_VERSION: string = packageJson.version;
export const REPO = 'Wolfsblvt/diffdevil';
export const GITHUB = `https://github.com/${REPO}`;
export const GITHUB_BLOB = `${GITHUB}/blob/main/`;
export function blobUrl(path: string): string { return `${GITHUB_BLOB}${path.replace(/^\/+/u, '')}`; }
export const NPM = 'https://www.npmjs.com/package/@wolfsblvt/diffdevil';
export const MARKETPLACE = 'https://github.com/marketplace/actions/diffdevil';
export const RELEASES = `${GITHUB}/releases`;
export const SECURITY_ADVISORIES = `${GITHUB}/security/advisories`;
export const LIVE_PLAYGROUND_WORKER = 'https://diffdevil-playground.wolfsblvt.workers.dev';
export const COMPANY = 'Wolfsblvt Works';
export const COMPANY_SITE = 'https://wolfsblvt.com/';
export const COMPANY_LEGAL_NOTICE = 'https://wolfsblvt.com/legal-notice.html';
export const COMPANY_PRIVACY = 'https://wolfsblvt.com/privacy.html';
export const paths = {
  home: sitePath('/'), playground: sitePath('/playground/'), examples: sitePath('/examples/'),
  docs: origins.docs + '/', faq: sitePath('/faq/'), app: sitePath('/app/'), extension: sitePath('/extension/'),
  security: sitePath('/docs/security/'), privacy: sitePath('/privacy/'), impressum: sitePath('/impressum/'),
  licences: sitePath('/docs/licences/'), skill: sitePath('/skill/SKILL.md'), skillVersion: sitePath('/skill/version'),
  setup: (intent: 'cli' | 'actions' | 'app' | 'everything') => sitePath(`/setup/${intent}.md`),
} as const;
export const docPaths = {
  getStarted: sitePath('/docs/get-started/auto-label-pull-requests/'),
  localAutomation: sitePath('/docs/get-started/local-automation/'),
  recipes: sitePath('/docs/recipes/policy-recipes/'), cli: sitePath('/docs/cli/'),
  actions: sitePath('/docs/actions/github-actions/'), actionDistribution: sitePath('/docs/actions/action-distribution/'),
  api: sitePath('/docs/library-api/'), policies: sitePath('/docs/policies-and-detail/policies-and-bands/'),
  typesAndMeasurements: sitePath('/docs/policies-and-detail/types-and-measurements/'),
  presets: sitePath('/docs/policies-and-detail/presets-and-shortcuts/'), templates: sitePath('/docs/policies-and-detail/templates/'),
  language: sitePath('/docs/policies-and-detail/language/'), syntax: sitePath('/docs/policies-and-detail/syntax/'),
  agents: sitePath('/docs/cli/#human-and-agent'), playground: sitePath('/docs/playground/'),
  app: sitePath('/docs/github-app/architecture/'), privacyAndData: sitePath('/docs/github-app/privacy-and-data/'),
  troubleshooting: sitePath('/docs/get-started/auto-label-pull-requests/#troubleshooting'),
  releases: sitePath('/docs/releases/'), extension: sitePath('/docs/browser-extension/'),
  versioning: sitePath('/docs/policies-and-detail/versioning-and-interchange/'), githubApi: sitePath('/docs/actions/github-api/'),
} as const;
export function absolute(path: string): string { return new URL(path, ORIGIN).href; }
