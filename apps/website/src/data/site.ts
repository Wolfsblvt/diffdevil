// SPDX-License-Identifier: AGPL-3.0-only
/** Canonical public origins are selected facts. Live installation, Store and account
 * destinations remain independently configured; selecting a host does not publish it.
 */
import packageJson from '../../../../package.json' with { type: 'json' };
import provenance from '../generated/source-provenance.json' with { type: 'json' };
import { pageUrl } from '../../../manual/manifest.mjs';
import { sourceResolverUrl } from '../lib/source-resolution.mjs';
import { origins } from '../../public-origins.mjs';

export const ORIGIN: string = (import.meta.env.DIFFDEVIL_SITE_ORIGIN ?? origins.site).replace(/\/$/u, '');
export const ORIGIN_IS_PLACEHOLDER = ORIGIN.endsWith('.invalid');
const isManual = import.meta.env.DIFFDEVIL_SURFACE === 'manual';
function sitePath(path: string): string { return isManual ? ORIGIN + path : path; }
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
export const GITHUB_BLOB = `${GITHUB}/blob/${provenance.ref}/`;
export const GITHUB_EDIT = `${GITHUB}/edit/${provenance.editRef}/`;
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
  security: pageUrl('security-and-data'), privacy: sitePath('/privacy/'), impressum: sitePath('/impressum/'),
  licences: sourceResolverUrl('LICENSES/README.md'), skill: sitePath('/skill/SKILL.md'), skillVersion: sitePath('/skill/version'),
  download: (asset: 'skill' | 'standalone' | 'bundled') => sitePath(`/downloads/${asset}/`),
  setup: (intent: 'skill' | 'cli' | 'actions' | 'app' | 'everything') => sitePath(`/setup/${intent}.md`),
} as const;
export const docPaths = {
  getStarted: pageUrl('label-pull-requests'), localAutomation: pageUrl('analyze-local-changes'),
  recipes: pageUrl('recipes'), cli: pageUrl('cli'), actions: pageUrl('github-actions'),
  actionDistribution: sourceResolverUrl('docs/integration/action-distribution.md'),
  api: pageUrl('typescript-library'), policies: pageUrl('measurements-to-rules'),
  typesAndMeasurements: pageUrl('changed-lines-and-raw-churn'), presets: pageUrl('start-with-a-preset'),
  templates: pageUrl('effects-and-templates'), language: pageUrl('language-and-contracts'),
  syntax: pageUrl('detail-language'), agents: pageUrl('coding-agent'), playground: pageUrl('playground'),
  app: pageUrl('managed-app'), privacyAndData: pageUrl('security-and-data'),
  troubleshooting: pageUrl('troubleshooting'), releases: pageUrl('releases'),
  extension: pageUrl('browser-extension'), versioning: pageUrl('schemas-and-compatibility'),
  githubApi: sourceResolverUrl('docs/integration/github-api.md'),
  configure: pageUrl('configure-policy'), scopes: pageUrl('paths-and-scopes'),
  evidence: pageUrl('evidence-and-uncertainty'), cliReference: pageUrl('cli-reference'),
  selfHost: pageUrl('self-host-app'), service: pageUrl('managed-service'),
  sharedEffects: pageUrl('labels-comments-definitions'),
  extensionPrivacy: sourceResolverUrl('apps/browser-extension/privacy.md'),
} as const;
export function absolute(path: string): string { return new URL(path, ORIGIN).href; }
