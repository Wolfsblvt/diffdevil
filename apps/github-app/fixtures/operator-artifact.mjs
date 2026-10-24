// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Explicit synthetic artifact for installer state/transport fixtures, not native build evidence. */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { parse } from 'jsonc-parser';
import { ARTIFACT_FORMAT, RETAINED_INPUT_NAMES, sha256 } from '../operator-artifact.mjs';

export async function syntheticArtifact(configPath, { retainedInputs } = {}) {
  let source, config;
  try { source = await readFile(configPath); config = parse(source.toString('utf8')); } catch { return {}; }
  if (!config) return {};
  const metadata = { main_module: 'worker.mjs', compatibility_date: '2026-10-01', bindings: [
    ...(config.d1_databases ?? []).map(database => ({ name: database.binding, type: 'd1', id: database.database_id })),
    ...Object.entries(config.vars ?? {}).map(([name, text]) => ({ name, type: 'plain_text', text }))
  ] };
  if (retainedInputs) metadata.bindings = [...metadata.bindings.filter(binding => !RETAINED_INPUT_NAMES.includes(binding.name)), ...RETAINED_INPUT_NAMES.map(name => ({ name, type: 'inherit' }))];
  const artifact = { format: ARTIFACT_FORMAT, worker: config.name, accountId: config.account_id ?? 'account-1', configHash: sha256(source), nativeBundleHash: sha256('synthetic-native-bundle'), metadata, modules: [{ name: 'worker.mjs', type: 'application/javascript+module', content: Buffer.from('export default { fetch() { return new Response("qualified synthetic artifact"); } };').toString('base64') }], ...(retainedInputs ? { retainedInputs } : {}) };
  const artifactPath = join(dirname(configPath), 'artifact.json');
  const bytes = Buffer.from(`${JSON.stringify(artifact)}\n`);
  await writeFile(artifactPath, bytes);
  return { artifactPath, artifactSha256: sha256(bytes) };
}
