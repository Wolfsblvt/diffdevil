// SPDX-License-Identifier: AGPL-3.0-only
/** Public routes are selected here, never inferred from maintained source paths.
 * FAQ is a separately admitted website page. This manifest does not create its shell.
 */
import { origins } from '../website/public-origins.mjs';
export { origins };
export const packageSource = Object.freeze({ repository: 'Wolfsblvt/starlight-works', commit: '22d4567006ec7a33d890fab2f3d3515332498a90', name: '@wolfsblvt/starlight-works', version: '0.1.0', starlight: '0.42.2', astro: '7.3.3' });
// key, title, source (relative to docs/manual), route, section, parent, wave,
// capability standing, old website routes. Array order is the selected reading order.
const rows = [
 ['what-is-diffdevil','What is diffdevil','README.md','/','Start',null,1,'current',['/docs/']],
 ['see-changed-lines-on-github','See changed lines on GitHub','start/see-changed-lines-on-github.md','/start/see-changed-lines-on-github/','Start',null,1,'in-development',[]],
 ['label-pull-requests','Label pull requests','start/label-pull-requests.md','/start/label-pull-requests/','Start',null,1,'current',['/docs/get-started/auto-label-pull-requests/','/docs/setup/actions/']],
 ['analyze-local-changes','Analyze local changes','start/analyze-local-changes.md','/start/analyze-local-changes/','Start',null,1,'current',['/docs/get-started/local-automation/','/docs/setup/cli/']],
 ['use-results-in-scripts','Use results in scripts','start/use-results-in-scripts.md','/start/use-results-in-scripts/','Start',null,1,'current',[]],
 ['try-public-pull-request','Try a public pull request','start/try-a-public-pull-request.md','/start/try-a-public-pull-request/','Start',null,1,'current',[]],
 ['surfaces','Surfaces','use/README.md','/use/','Use diffdevil',null,2,'current',['/docs/get-started/automation/','/docs/setup/everything/']],
 ['cli','CLI','use/cli.md','/use/cli/','Use diffdevil','surfaces',2,'current',['/docs/cli/']],
 ['github-actions','GitHub Actions','use/github-actions.md','/use/github-actions/','Use diffdevil','surfaces',2,'current',['/docs/actions/github-actions/']],
 ['browser-extension','diffdevil for GitHub','use/browser-extension.md','/use/browser-extension/','Use diffdevil','surfaces',2,'in-development',['/docs/browser-extension/','/docs/browser-extension/integration/']],
 ['managed-app','Managed App','use/managed-app/README.md','/use/managed-app/','Use diffdevil','surfaces',4,'in-development',['/docs/github-app/architecture/']],
 ['managed-service','Use the managed service','use/managed-app/service.md','/use/managed-app/service/','Use diffdevil','managed-app',4,'in-development',['/docs/setup/app/']],
 ['self-host-app','Self-host the App','use/managed-app/self-hosting.md','/use/managed-app/self-hosting/','Use diffdevil','managed-app',4,'in-development',['/docs/github-app/self-hosting/']],
 ['typescript-library','TypeScript library','use/typescript-library.md','/use/typescript-library/','Use diffdevil','surfaces',2,'current',['/docs/library-api/']],
 ['playground','Playground','use/playground.md','/use/playground/','Use diffdevil','surfaces',2,'current',['/docs/playground/']],
 ['coding-agent','With a coding agent','use/coding-agent.md','/use/coding-agent/','Use diffdevil','surfaces',2,'current',['/docs/agents/agent-integration/','/docs/agents/skill/','/docs/agents/setup/','/docs/setup/skill/']],
 ['shared-workflows','Shared workflows','use/shared-workflows/README.md','/use/shared-workflows/','Use diffdevil','surfaces',2,'current',[]],
 ['reports-plans-and-apply','Reports, plans, and apply','use/shared-workflows/reports-plans-and-apply.md','/use/reports-plans-and-apply/','Use diffdevil','shared-workflows',2,'current',[]],
 ['labels-comments-definitions','Labels, comments, and definitions','use/shared-workflows/labels-comments-and-definitions.md','/use/labels-comments-and-definitions/','Use diffdevil','shared-workflows',2,'current',[]],
 ['start-with-a-preset','Start with a preset','policy/README.md','/policy/','Write policy',null,3,'current',['/docs/policies-and-detail/presets-and-shortcuts/']],
 ['configure-policy','Configure policy','policy/configure.md','/policy/configure/','Write policy','start-with-a-preset',3,'current',[]],
 ['paths-and-scopes','Paths and scopes','policy/paths-and-scopes.md','/policy/paths-and-scopes/','Write policy','start-with-a-preset',3,'current',[]],
 ['measurements-to-rules','From measurements to rules','policy/from-measurements-to-rules/README.md','/policy/from-measurements-to-rules/','Write policy',null,3,'current',['/docs/policies-and-detail/policies-and-bands/']],
 ['effects-and-templates','Effects and templates','policy/from-measurements-to-rules/effects-and-templates.md','/policy/effects-and-templates/','Write policy','measurements-to-rules',3,'current',['/docs/policies-and-detail/templates/']],
 ['recipes','Recipes','policy/recipes.md','/policy/recipes/','Write policy',null,3,'current',['/docs/recipes/policy-recipes/']],
 ['how-diffdevil-reasons','How diffdevil reasons','understand/README.md','/understand/','Understand',null,1,'current',[]],
 ['changed-lines-and-raw-churn','Changed lines and raw churn','understand/changed-lines-and-churn.md','/understand/changed-lines-and-churn/','Understand','how-diffdevil-reasons',1,'current',[]],
 ['evidence-and-uncertainty','Evidence and uncertainty','understand/evidence-and-uncertainty.md','/understand/evidence-and-uncertainty/','Understand','how-diffdevil-reasons',1,'current',[]],
 ['from-facts-to-provider-state','From facts to provider state','understand/facts-to-provider-state.md','/understand/facts-to-provider-state/','Understand','how-diffdevil-reasons',1,'current',[]],
 ['source-identity-trust-and-mutation','Source identity, trust, and mutation','understand/trust-and-mutation.md','/understand/trust-and-mutation/','Understand','how-diffdevil-reasons',1,'current',['/docs/actions/github-api/']],
 ['interfaces','Interfaces','reference/README.md','/reference/','Reference',null,3,'current',[]],
 ['cli-reference','CLI commands and output formats','reference/cli.md','/reference/cli/','Reference','interfaces',3,'current',['/docs/cli/presentation/']],
 ['github-actions-reference','GitHub Actions reference','reference/github-actions.md','/reference/github-actions/','Reference','interfaces',3,'current',[]],
 ['typescript-api-reference','TypeScript API reference','reference/typescript-api.md','/reference/typescript-api/','Reference','interfaces',3,'current',[]],
 ['language-and-contracts','Language and contracts','reference/language-and-contracts/README.md','/reference/language-and-contracts/','Reference',null,3,'current',['/docs/policies-and-detail/language/']],
 ['schemas-and-compatibility','Schemas and compatibility','reference/language-and-contracts/schemas-and-compatibility.md','/reference/schemas-and-compatibility/','Reference','language-and-contracts',3,'current',['/docs/policies-and-detail/versioning-and-interchange/']],
 ['detail-language','detail language','reference/language-and-contracts/detail-language.md','/reference/detail-language/','Reference','language-and-contracts',3,'current',['/docs/policies-and-detail/syntax/','/docs/policies-and-detail/types-and-measurements/','/docs/policies-and-detail/collections-and-scopes/','/docs/policies-and-detail/standard-library/','/docs/policies-and-detail/diagnostics-and-limits/']],
 ['faq','FAQ','faq.md','/faq/','Help',null,0,'current',[]],
 ['troubleshooting','Troubleshooting','help/troubleshooting.md','/help/troubleshooting/','Help',null,4,'current',[]],
 ['security-and-data','Security and data','help/security-and-data.md','/help/security-and-data/','Help',null,4,'current',['/docs/github-app/privacy-and-data/','/docs/security/']],
 ['technical-project-docs','Technical and project documentation','help/technical-and-project-documentation.md','/help/technical-and-project-documentation/','Help',null,4,'current',[]],
 ['releases','Releases','help/releases.md','/help/releases/','Help',null,4,'current',['/docs/releases/']],
];
const closed = new Set(['managed-app','interfaces','language-and-contracts']);
export const sections = Object.freeze(['Start','Use diffdevil','Write policy','Understand','Reference','Help']);
export const pages = Object.freeze(rows.map(([key,title,file,route,section,parent,wave,availability,legacyRoutes], order) => Object.freeze({
 key, title, source: `docs/manual/${file}`, sourceId: `docs/manual/${file}`, route, host: key === 'faq' ? 'site' : 'docs', kind: key === 'faq' ? 'FAQ' : 'DOCS', section, parent, order, wave, availability,
 aliases: key === 'what-is-diffdevil' ? ['/start/what-is-diffdevil/'] : [], legacyRoutes, defaultOpen: !closed.has(key),
})));
export const manualPages = Object.freeze(pages.filter(page => page.host === 'docs'));
export const byKey = new Map(pages.map(page => [page.key,page]));
export function pageUrl(key) { const page = byKey.get(key); if (!page) throw new Error(`Unknown manual page: ${key}`); return origins[page.host] + page.route; }
/** Native leaves and linked groups; source names never enter public URLs. */
export function sidebar({ includeFAQ = false } = {}) {
 function item(page) {
  const children = pages.filter(child => child.parent === page.key);
  const destination = page.host === 'docs' ? { slug: page.route === '/' ? 'index' : page.route.slice(1,-1) } : { link: pageUrl(page.key) };
  return children.length ? { label: page.title, ...destination, defaultOpen: page.defaultOpen, items: children.map(item) } : { label: page.title, ...destination };
 }
 return sections.map(section => ({ label: section.toUpperCase(), defaultOpen: section !== 'Reference', items: pages.filter(page => page.section === section && page.parent === null && (includeFAQ || page.key !== 'faq')).map(item) }));
}
export function validateManifest(selected = pages) {
 const ids = new Set(), sources = new Set(), routes = new Set();
 for (const page of selected) {
  if (!/^[a-z][a-z0-9-]*$/u.test(page.key) || ids.has(page.key)) throw new Error(`Duplicate or invalid page key: ${page.key}`);
  if (!/^docs\/manual\/(?:[a-z0-9-]+\/)*(?:[a-z0-9-]+|README)\.md$/u.test(page.source) || sources.has(page.source) || page.sourceId !== page.source) throw new Error(`Duplicate or invalid source id: ${page.source}`);
  if (!['site','docs'].includes(page.host) || !/^\/(?:[a-z0-9-]+\/)*$/u.test(page.route)) throw new Error(`Invalid public route: ${page.route}`);
  if (!['current','in-development'].includes(page.availability)) throw new Error(`Invalid capability standing: ${page.key}`);
  for (const route of [page.route,...page.aliases]) { const coordinate = `${page.host}:${route}`; if (routes.has(coordinate)) throw new Error(`Duplicate route: ${coordinate}`); routes.add(coordinate); }
  ids.add(page.key); sources.add(page.source);
 }
 for (const page of selected) {
  const seen = new Set([page.key]); let parent = page.parent;
  while (parent) { if (seen.has(parent)) throw new Error(`Circular sidebar: ${page.key}`); seen.add(parent); const target = selected.find(item => item.key === parent); if (!target || target.section !== page.section) throw new Error(`Invalid sidebar parent: ${page.key}`); parent = target.parent; }
 }
 return true;
}
validateManifest();
