// SPDX-License-Identifier: AGPL-3.0-only
import { byKey, pages, pageUrl } from './manifest.mjs';

// Exact source-family dispositions. Retained families are not resolver path globs.
// A transfer never changes state merely because its destination file exists.
const rows = [
 ['docs/automation.md','split-retire',['what-is-diffdevil','surfaces','shared-workflows','start-with-a-preset']],
 ['docs/guides/auto-label-pull-requests.md','split-retire',['label-pull-requests','github-actions']],
 ['docs/guides/local-automation.md','split-retire',['analyze-local-changes','use-results-in-scripts','cli']],
 ['docs/guides/policy-recipes.md','move-split-retire',['recipes','start-with-a-preset','configure-policy','paths-and-scopes','measurements-to-rules','effects-and-templates']],
 ['docs/integration/cli.md','split-retire',['cli','cli-reference']],
 ['docs/integration/github-actions.md','split-retire',['github-actions','github-actions-reference']],
 ['docs/integration/typescript-api.md','split-retire',['typescript-library','typescript-api-reference']],
 ['docs/integration/playground.md','split-retire-or-operator-residue',['try-public-pull-request','playground']],
 ['docs/integration/presets-and-shortcuts.md','split-retire',['start-with-a-preset','configure-policy','language-and-contracts']],
 ['docs/integration/templates.md','split-retire',['effects-and-templates','labels-comments-definitions']],
 ['docs/language.md','split-retire',['measurements-to-rules','language-and-contracts']],
 ['docs/language/policies-and-bands.md','split-retire',['measurements-to-rules','language-and-contracts']],
 ['docs/language/types-and-measurements.md','split-retire',['evidence-and-uncertainty','detail-language']],
 ['docs/language/collections-and-scopes.md','split-retire',['paths-and-scopes','detail-language']],
 ['docs/language/syntax.md','merge-retire',['detail-language']],
 ['docs/language/standard-library.md','merge-retire',['detail-language']],
 ['docs/language/diagnostics-and-limits.md','split-retire',['detail-language','troubleshooting']],
 ['docs/language/versioning-and-interchange.md','move-split-retire',['schemas-and-compatibility','language-and-contracts']],
 ['docs/releases/README.md','move-split-or-maintainer-map',['releases']],
];
export const migrations = Object.freeze(rows.map(([source,disposition,targets]) => Object.freeze({ source, disposition, targets, primary: targets[0] })));
export const retainedFamilies = Object.freeze([
 { sources: ['skills/diffdevil/**'], disposition: 'retain-canonical-install-artifact', targets: ['coding-agent'] },
 { sources: ['docs/setup/skill.md','docs/setup/cli.md','docs/setup/actions.md','docs/setup/app.md','docs/setup/everything.md'], disposition: 'retain-rendered-raw-payloads', targets: ['coding-agent','label-pull-requests','analyze-local-changes','managed-service','surfaces'] },
 { sources: ['docs/integration/example-catalogue.md','docs/examples/catalogue/**'], disposition: 'retain-shared-catalogue', targets: ['try-public-pull-request','playground'], externalRoute: '/examples/' },
 { sources: ['README.md'], disposition: 'compress-at-final-reconciliation', targets: ['what-is-diffdevil','label-pull-requests','analyze-local-changes'] },
 { sources: ['docs/README.md'], disposition: 'retain-technical-map-update-links', targets: ['technical-project-docs'] },
 { sources: ['docs/VISION.md','docs/DIRECTION.md','docs/DECISIONS.md','docs/ARCHITECTURE.md','docs/DEVELOPMENT.md','docs/PROJECT-MAP.md','docs/qualification.md','docs/publication-boundary.md'], disposition: 'retain-repository-owned', targets: ['technical-project-docs'] },
 { sources: ['docs/reference/**'], disposition: 'retain-dated-evidence', targets: ['technical-project-docs'] },
 { sources: ['apps/*/README.md','provider/runtime internals'], disposition: 'retain-component-operator-homes', targets: ['technical-project-docs','self-host-app'] },
 { sources: ['SECURITY.md','LICENSES/README.md','docs/PRIVACY-AND-DATA.md'], disposition: 'retain-authoritative-specialist-sources', targets: ['security-and-data','technical-project-docs'] },
]);
export function transferFor(source, state) { return state.transfers?.[source]; }
export function isRetired(source, state) { return ['retired','operator-residue','maintainer-map'].includes(transferFor(source,state)?.phase); }
export function pageIsCurrent(key, state) {
 if (state.pages?.[key]?.status !== 'authored') return false;
 return migrations.filter(row => row.targets.includes(key)).every(row => isRetired(row.source,state));
}
/** Refuse a partial cut. Observations are from actual files, links and rendered anchors. */
export function validateTransfer(row, transfer, state, observed) {
 if (!transfer || transfer.phase === 'current') return;
 if (!['retired','operator-residue','maintainer-map'].includes(transfer.phase)) throw new Error(`Invalid transfer phase: ${row.source}`);
 for (const key of row.targets) if (state.pages?.[key]?.status !== 'authored') throw new Error(`${row.source}: successor not authored: ${key}`);
 if (!row.targets.includes(transfer.primary)) throw new Error(`${row.source}: choose an explicit primary successor`);
 if (transfer.phase === 'retired' && observed.sourceExists) throw new Error(`${row.source}: remove the old source, not a forwarding Markdown stub`);
 if (transfer.phase === 'operator-residue' && (!row.disposition.includes('operator-residue') || !observed.sourceExists || !transfer.residueJob)) throw new Error(`${row.source}: operator residue needs its separate retained job`);
 if (transfer.phase === 'maintainer-map' && (!row.disposition.includes('maintainer-map') || !observed.sourceExists || !transfer.residueJob)) throw new Error(`${row.source}: maintainer map needs its separate retained job`);
 if (!Array.isArray(transfer.oldAnchors) || !transfer.fromSourceSha256 || !/^[a-f0-9]{64}$/u.test(transfer.fromSourceSha256)) throw new Error(`${row.source}: capture the exact pre-cutover source digest and anchor inventory`);
 if (observed.inboundLinks.length) throw new Error(`${row.source}: inbound links remain: ${observed.inboundLinks.join(', ')}`);
 for (const old of transfer.oldAnchors) {
  const target = transfer.anchors?.[old];
  if (!target || !row.targets.includes(target.page) || !observed.targetAnchors[target.page]?.includes(target.anchor)) throw new Error(`${row.source}#${old}: missing or invalid successor anchor`);
 }
 for (const [old,target] of Object.entries(transfer.anchors ?? {})) if (!transfer.oldAnchors.includes(old) || !row.targets.includes(target.page) || !observed.targetAnchors[target.page]?.includes(target.anchor)) throw new Error(`${row.source}: unqualified fragment mapping: ${old}`);
 if (transfer.redirects !== true || transfer.sourceIds !== true || transfer.search !== true) throw new Error(`${row.source}: route, source-id and search transfer must be selected together`);
}
/** The plan is build evidence, not an activation command or a second work queue. */
export function cutoverPlan(state) {
 return migrations.map(row => ({ ...row, phase: transferFor(row.source,state)?.phase ?? 'current', waitingFor: row.targets.filter(key => state.pages?.[key]?.status !== 'authored'), targetUrls: row.targets.map(pageUrl) }));
}
/** Legacy page aliases are emitted only after their full source family transfers.
 * Routes with retained specialist owners receive explicit per-route admission at the final join.
 */
export function legacyRedirects(state) {
 const rules = [];
 const known = new Set(pages.flatMap(page => page.legacyRoutes));
 for (const route of Object.keys(state.routes ?? {})) if (!known.has(route)) throw new Error(`Unknown legacy route: ${route}`);
 for (const page of pages) for (const from of page.legacyRoutes) {
  const selection = state.routes?.[from];
  if (!selection) continue;
  if (selection.target !== page.key || !pageIsCurrent(page.key,state)) throw new Error(`Premature or mismatched legacy route transfer: ${from}`);
  rules.push({ from, to: pageUrl(page.key), status: 308 });
 }
 return rules;
}
export function migratedSource(source,state) {
 const transfer = transferFor(source,state);
 return isRetired(source,state) ? byKey.get(transfer.primary)?.source : undefined;
}

/** Every retired emitted page needs its explicit route transfer in the same cut. */
export function validateRetiredRoutes(state, entries, redirects) {
 const emitted = new Set(redirects.map(rule=>rule.from));
 for (const entry of entries) {
  if (!isRetired(entry.source,state)) continue;
  const route = entry.route ?? (entry.slug ? `/docs/${entry.slug}/` : '/docs/');
  if (!emitted.has(route)) throw new Error(`${entry.source}: missing legacy route transfer: ${route}`);
 }
}
