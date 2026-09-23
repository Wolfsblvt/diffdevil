// SPDX-License-Identifier: AGPL-3.0-only
import { pages, origins } from './manifest.mjs';
import { migrations, migratedSource, isRetired } from './migration.mjs';
export const repositorySources = Object.freeze([
 'docs/language/parser-architecture.md','src/diffdevil/contracts/detail/v1/README.md',
 'README.md','docs/README.md','docs/VISION.md','docs/DIRECTION.md','docs/DECISIONS.md',
 'docs/ARCHITECTURE.md','docs/DEVELOPMENT.md','docs/PROJECT-MAP.md','docs/qualification.md',
 'docs/publication-boundary.md','docs/documentation.md','docs/presentation.md',
 'docs/integration/github-api.md','docs/integration/github-app.md','docs/integration/action-distribution.md',
 'docs/integration/example-catalogue.md','docs/PRIVACY-AND-DATA.md','SECURITY.md','LICENSES/README.md',
 'apps/manual/README.md','apps/browser-extension/README.md','apps/browser-extension/privacy.md','docs/releases/v1.0.0.md',
 'apps/playground/README.md','apps/github-app/README.md','apps/website/README.md',
 'skills/diffdevil/SKILL.md','skills/diffdevil/references/install-and-update.md',
 'skills/diffdevil/references/restricted-harnesses.md','skills/diffdevil/references/cli-and-evidence.md',
]);
// These previously selected IDs survive the repository's filename-only migration.
// The destination uses Git's exact casing, independent of the build filesystem.
export const sourceAliases = Object.freeze({
 'docs/QUALIFICATION.md':'docs/qualification.md',
 'docs/PUBLICATION-BOUNDARY.md':'docs/publication-boundary.md',
 'docs/DOCUMENTATION.md':'docs/documentation.md',
 'docs/PRESENTATION.md':'docs/presentation.md',
 'apps/browser-extension/PRIVACY.md':'apps/browser-extension/privacy.md',
});
export function sourceResolverUrl(id) { return `${origins.site}/source/?f=${encodeURIComponent(id)}`; }
export function sourceUrl(source,ref) {
 if (!/^[a-f0-9]{40}$/u.test(ref)) throw new Error('Source provenance needs an exact commit SHA.');
 return `https://github.com/Wolfsblvt/diffdevil/blob/${ref}/${source.split('/').map(encodeURIComponent).join('/')}`;
}
/** The resolver receives this finite generated map, never a repository path template.
 * @param {{ref: string, state: object, exists: (source: string) => boolean, legacySources?: string[]}} options
 * @returns {Record<string, {url: string, fragments: Record<string, string>}>}
 */
export function sourceTargets({ ref, state, exists, legacySources = [] }) {
 const targets = Object.create(null);
 const selected = new Set([...pages.map(page=>page.sourceId),...repositorySources,
  ...migrations.map(row=>row.source),...legacySources,...Object.keys(sourceAliases),...Object.values(sourceAliases)]);
 for (const id of selected) {
  const canonical = Object.hasOwn(sourceAliases,id) ? sourceAliases[id] : id;
  const source = migratedSource(canonical,state) ?? canonical;
  if (!exists(source)) continue;
  targets[id] = { url: sourceUrl(source,ref), fragments: Object.create(null) };
  if (isRetired(canonical,state)) for (const [old,destination] of Object.entries(state.transfers[canonical].anchors ?? {})) {
   const page = pages.find(item=>item.key===destination.page);
   targets[id].fragments[old] = `${sourceUrl(page.source,ref)}#${encodeURIComponent(destination.anchor)}`;
  }
 }
 return targets;
}
export { resolveSource } from '../website/src/lib/source-resolution.mjs';
