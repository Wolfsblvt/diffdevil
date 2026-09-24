// SPDX-License-Identifier: AGPL-3.0-only
import { readFileSync } from 'node:fs';

/** Existing build-release manifest keys, not a second version or asset registry. */
export const downloadKinds = ['skill', 'standalone', 'bundled'];

/** Consume a publication-read-back copy of the existing release manifest.
 * No network discovery, guessed archive name, source-version fallback or release
 * occurs at build time. Without an explicit published input every archive is unavailable.
 */
export function publishedRelease(path = process.env.DIFFDEVIL_PUBLISHED_RELEASE_MANIFEST) {
  if (!path) return undefined;
  return validatePublishedRelease(JSON.parse(readFileSync(path, 'utf8')));
}

export function validatePublishedRelease(release) {
  const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;
  if (release?.kind !== 'diffdevil.release-manifest' || release.schemaVersion !== '1.0' ||
      release.source?.repository !== 'Wolfsblvt/diffdevil' || !/^[a-f0-9]{40}$/u.test(release.source?.commit ?? '') ||
      !semver.test(release.productVersion ?? '') || !semver.test(release.skills?.diffdevil?.version ?? '') ||
      release.skills.diffdevil.sourceCommit !== release.source.commit ||
      release.skills.diffdevil.sourcePath !== 'skills/diffdevil' ||
      !/^[a-f0-9]{64}$/u.test(release.skills.diffdevil.treeSha256 ?? '')) {
    throw new Error('Invalid published diffdevil release manifest identity.');
  }
  for (const kind of downloadKinds) {
    const asset = release.assets?.[kind];
    if (!asset || !/^[a-zA-Z0-9._-]+\.zip$/u.test(asset.name ?? '') ||
        !/^[a-f0-9]{64}$/u.test(asset.sha256 ?? '') || !Number.isSafeInteger(asset.size) || asset.size <= 0) {
      throw new Error(`Invalid published release asset: ${kind}`);
    }
    const expected = `https://github.com/Wolfsblvt/diffdevil/releases/download/v${release.productVersion}/${asset.name}`;
    if (asset.url !== expected) throw new Error(`Published asset URL is not its exact release destination: ${kind}`);
  }
  return release;
}
