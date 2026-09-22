// SPDX-License-Identifier: AGPL-3.0-only
import { pages, origins } from './manifest.mjs';
import { migrations, migratedSource, isRetired } from './migration.mjs';
export const repositorySources = Object.freeze([
 'README.md','docs/README.md','docs/VISION.md','docs/DIRECTION.md','docs/DECISIONS.md',
 'docs/ARCHITECTURE.md','docs/DEVELOPMENT.md','docs/PROJECT-MAP.md','docs/QUALIFICATION.md',
 'docs/PUBLICATION-BOUNDARY.md','docs/DOCUMENTATION.md','docs/PRESENTATION.md',
 'docs/integration/github-api.md','docs/integration/github-app.md','docs/integration/action-distribution.md',
 'docs/integration/example-catalogue.md','docs/PRIVACY-AND-DATA.md','SECURITY.md','LICENSES/README.md',
 'apps/playground/README.md','apps/github-app/README.md',
]);
export function sourceResolverUrl(id) { return `${origins.site}/source/?f=${encodeURIComponent(id)}`; }
export function sourceUrl(source,ref) {
 if (!/^[a-f0-9]{40}$/u.test(ref)) throw new Error('Source provenance needs an exact commit SHA.');
 return `https://github.com/Wolfsblvt/diffdevil/blob/${ref}/${source.split('/').map(encodeURIComponent).join('/')}`;
}
/** The resolver receives this finite generated map, never a repository path template. */
export function sourceTargets({ ref, state, exists, legacySources = [] }) {
 const targets = Object.create(null);
 for (const id of new Set([...pages.map(page=>page.sourceId),...repositorySources,...migrations.map(row=>row.source),...legacySources])) {
  const replacement = migratedSource(id,state), source = replacement ?? id;
  if (!exists(source)) continue;
  targets[id] = { url: sourceUrl(source,ref), fragments: Object.create(null) };
  if (isRetired(id,state)) for (const [old,destination] of Object.entries(state.transfers[id].anchors ?? {})) {
   const page = pages.find(item=>item.key===destination.page);
   targets[id].fragments[old] = `${sourceUrl(page.source,ref)}#${encodeURIComponent(destination.anchor)}`;
  }
 }
 return targets;
}
export { resolveSource } from '../website/src/lib/source-resolution.mjs';
