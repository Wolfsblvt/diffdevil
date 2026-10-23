// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Droppable, isolate-local reuse of frozen numerical interpretations, independent of provider context. */
const MIB = 1024 * 1024;
const TTL_MS = 60_000;
const ENTRY_OVERHEAD_BYTES = 512;

/**
 * Bound retained serialized weight (two bytes per key/value JSON code unit, plus an entry allowance), not V8 heap.
 * FIFO order also orders fixed-lifetime expiry: each entry is visited only when it leaves, plus one live head check.
 * Hits do not extend lifetime or reorder entries. A miss, eviction or oversized value always returns complete work.
 */
export function createAnalyticalCache({ now = () => performance.now(), maxBytes = 12 * MIB, maxEntryBytes = MIB / 2, maxEntries = 2000 } = {}) {
  const entries = new Map();
  let weightBytes = 0;
  const remove = ([key, entry]) => { entries.delete(key); weightBytes -= entry.bytes; };
  const expire = time => {
    while (entries.size) {
      const oldest = entries.entries().next().value;
      if (oldest[1].until > time) break;
      remove(oldest);
    }
  };
  return {
    /** Keys include exact repository, compiled policy and normalized report; compute must return inert facts. */
    memo(key, compute) {
      expire(now());
      const hit = entries.get(key);
      if (hit) return hit.value;
      const value = compute();
      const keyBytes = key.length * 2 + ENTRY_OVERHEAD_BYTES;
      const entryLimit = Math.min(maxBytes, maxEntryBytes);
      if (keyBytes > entryLimit) return value;
      const bytes = keyBytes + JSON.stringify(value).length * 2;
      if (bytes > entryLimit) return value;
      // Computation may itself outlast the old entries. Expire again before spending their budget.
      const time = now();
      expire(time);
      while (entries.size && (entries.size >= maxEntries || weightBytes + bytes > maxBytes)) remove(entries.entries().next().value);
      entries.set(key, { value, bytes, until: time + TTL_MS });
      weightBytes += bytes;
      return value;
    },
    /** Aggregate accounting for local resource qualification; contains no retained identities or report data. */
    usage() { return { entries: entries.size, weightBytes, maxBytes, maxEntryBytes, maxEntries }; },
    clear() { entries.clear(); weightBytes = 0; }
  };
}
