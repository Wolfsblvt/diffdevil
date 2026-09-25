// SPDX-License-Identifier: AGPL-3.0-only
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

/** Read a byte-exact pre-cutover source without depending on a retired PR branch. */
export function readHistoricalSource(root, source, capture) {
 if (!/^(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+\.md$/u.test(source)) throw new Error(`${source}: invalid historical source path`);
 if (!/^[a-f0-9]{40}$/u.test(capture.fromRef ?? '')) throw new Error(`${source}: capture from an exact historical Git commit`);
 const bytes = readFileSync(join(root, 'apps/manual/captures/v1', `${source}.txt`));
 const digest = createHash('sha256').update(bytes).digest('hex');
 if (digest !== capture.fromSourceSha256) throw new Error(`${source}: historical source capture does not match its recorded SHA-256`);
 return bytes.toString('utf8');
}
