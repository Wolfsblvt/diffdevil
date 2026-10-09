// SPDX-License-Identifier: MIT
/** Keep the extension's update identity separate from its included engine. */
export function extensionIdentity(manifest, enginePackage) {
  const version = manifest?.version;
  if (typeof version !== 'string' || !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/u.test(version)) {
    throw new TypeError('Extension version must be three numeric components without a prerelease suffix or leading zeroes.');
  }
  const parts = version.split('.').map(Number);
  if (parts.some(part => part > 65535) || parts.every(part => part === 0)) {
    throw new RangeError('Extension version components must be at most 65535 and the version must not be all zero.');
  }
  if (typeof enginePackage?.version !== 'string' || enginePackage.version.length === 0) {
    throw new TypeError('The included engine must declare its own package version.');
  }
  return { version, engineVersion: enginePackage.version };
}
