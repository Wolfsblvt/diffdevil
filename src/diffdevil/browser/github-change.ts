// SPDX-License-Identifier: MIT
/** Pure provider normalization, shared by Node and the browser without network I/O. */
import { fail } from '../errors.js';
import { parsePatch, type ChangeInput } from '../sources/patch.js';
import { validatePath } from '../paths.js';
import { githubInteger, githubRecord, githubString } from '../github/values.js';

export function changeFromGitHubFile(input: unknown): ChangeInput {
  const file = githubRecord(input, 'changed file');
  const path = validatePath(githubString(file.filename, 'filename'));
  const statuses: Record<string, ChangeInput['changeType']> = { added: 'added', removed: 'deleted', modified: 'modified', renamed: 'renamed', copied: 'copied', changed: 'type-changed', unchanged: 'modified' };
  const status = githubString(file.status, 'file status'), changeType = statuses[status];
  if (!changeType) fail('E_GITHUB_RESPONSE', `Unsupported GitHub file status: ${status}.`, 'source');
  const additions = githubInteger(file.additions, 'raw additions'), deletions = githubInteger(file.deletions, 'raw deletions');
  if (!Number.isSafeInteger(additions + deletions) || file.changes !== undefined && file.changes !== additions + deletions) fail('E_GITHUB_RESPONSE', 'GitHub raw file counters disagree.', 'source');
  const oldPath = changeType === 'renamed' || changeType === 'copied' ? validatePath(githubString(file.previous_filename, 'previous filename')) : undefined;
  const common = { path, changeType, additions, deletions, ...(oldPath === undefined ? {} : { oldPath }) };
  if (file.patch !== undefined && typeof file.patch !== 'string') fail('E_GITHUB_RESPONSE', 'GitHub patch must be text when present.', 'source');
  // Submodule fragments have no mode header; obtain the raw diff before treating them as text.
  const ambiguousGitlink = typeof file.patch === 'string' && /^[+-]Subproject commit [0-9a-f]+(?:-dirty)?$/mu.test(file.patch);
  if (typeof file.patch === 'string' && file.patch !== '' && !ambiguousGitlink) {
    try {
      const patch = parsePatch(file.patch);
      if (patch.additions === additions && patch.deletions === deletions) return { ...common, kind: 'text', patch };
    } catch { /* Raw source counters still bound a text patch whose edit blocks are incomplete. */ }
  }
  if (ambiguousGitlink || additions + deletions === 0) return { ...common, kind: 'unknown', incompleteReason: 'MATERIAL_KIND_UNKNOWN' };
  return { ...common, kind: 'text', incompleteReason: file.patch === undefined ? 'PATCH_OMITTED' : 'PATCH_INCOMPLETE' };
}
