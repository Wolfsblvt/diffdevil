// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Maximum atomic capture size; group boundaries depend on paths, not their positions in a growing inventory. */
export const CAPTURE_CHUNK = 100;
const BOUNDARY_MODULUS = 50;

function boundary(path) {
  // A deterministic partition selector, not an identity/security hash. No platform-specific crypto dependency.
  let hash = 2166136261;
  for (let index = 0; index < path.length; index++) hash = Math.imul(hash ^ path.charCodeAt(index), 16777619) >>> 0;
  // Mix the low bits too: ordinary numbered filenames should not inherit FNV's parity patterns.
  hash = Math.imul(hash ^ (hash >>> 16), 0x85ebca6b);
  hash = Math.imul(hash ^ (hash >>> 13), 0xc2b2ae35);
  hash = (hash ^ (hash >>> 16)) >>> 0;
  return hash % BOUNDARY_MODULUS === 0;
}

/** Sorted path groups. An insertion changes its neighbourhood; later path-selected boundaries stay in place. */
export function sizeCaptureGroups(paths) {
  const groups = [];
  let current = [];
  for (const path of [...paths].sort()) {
    current.push(path);
    if (boundary(path) || current.length === CAPTURE_CHUNK) { groups.push(current); current = []; }
  }
  if (current.length) groups.push(current);
  return groups;
}
