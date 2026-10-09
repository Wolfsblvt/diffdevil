// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Seed the local Wrangler D1 state the App preview reads. The fixture is written through the
 * managed App's own write paths into an in-memory D1, dumped as SQL, and applied with
 * Wrangler's local D1 commands, so the preview and the seed agree on the same local layout.
 * Local state only; no Cloudflare account, database or GitHub is touched.
 *
 *   node apps/app/qa/seed.mjs [persist-directory]
 */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';
import { D1AppStore } from '../../github-app/storage.mjs';
import { seedStore, NOW } from './fixture.mjs';

const migrationNames = ['0001_initial.sql', '0002_consent-provenance.sql', '0003_preserve-active-consent.sql', '0004_admission-settings.sql', '0005_offboarding-consent-tombstones.sql', '0006_user-authorization.sql', '0007_consent-actors.sql'];
const TABLES = ['installations', 'repositories', 'history_records', 'history_file_rows', 'history_effect_rows'];
const CLEARED = ['history_effect_rows', 'history_file_rows', 'history_records', 'browser_sessions', 'authorization_artifacts', 'authorization_attempts', 'user_authorizations', 'operational_results', 'execution_leases', 'deliveries', 'repairs', 'repositories', 'installations'];
const CONFIG = resolve('apps/app/wrangler.jsonc');

const literal = value => value === null || value === undefined ? 'NULL' : typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;

function wrangler(args, persist) {
  const result = spawnSync(process.execPath, [resolve('node_modules/wrangler/bin/wrangler.js'), ...args, '--config', CONFIG, '--local', '--persist-to', persist], { stdio: 'pipe', windowsHide: true, env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' }, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`wrangler ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

/** Write the fixture through the real store, then dump it as grouped INSERT statements. */
export async function fixtureSql() {
  const runtime = new Miniflare({ workers: [{
    config: { name: 'app-seed', type: 'worker', compatibilityDate: '2026-09-17', env: { APP_DB: { type: 'd1', id: `seed-${crypto.randomUUID()}` } }, manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'), modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } }
  }] });
  try {
    const database = await runtime.getD1Database('APP_DB');
    const clock = { value: NOW };
    const appStore = new D1AppStore(database, { now: () => clock.value });
    for (const name of migrationNames) await appStore.migrate(await readFile(resolve('apps/github-app/migrations', name), 'utf8'));
    const written = await seedStore(appStore, clock);
    const statements = CLEARED.map(table => `DELETE FROM ${table};`);
    for (const table of TABLES) {
      const rows = (await database.prepare(`SELECT * FROM ${table}`).all()).results ?? [];
      if (rows.length === 0) continue;
      const columns = Object.keys(rows[0]);
      for (let index = 0; index < rows.length; index += 40) {
        const chunk = rows.slice(index, index + 40);
        statements.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${chunk.map(row => `(${columns.map(column => literal(row[column])).join(', ')})`).join(',\n  ')};`);
      }
    }
    return { sql: statements.join('\n'), written };
  } finally { await runtime.dispose(); }
}

export async function seedLocalState(persist = resolve('artifacts/app/state')) {
  await mkdir(persist, { recursive: true });
  const { sql, written } = await fixtureSql();
  const file = resolve('artifacts/app/seed.sql');
  await writeFile(file, sql);
  wrangler(['d1', 'migrations', 'apply', 'APP_DB'], persist);
  wrangler(['d1', 'execute', 'APP_DB', '--file', file], persist);
  return { written, persist, file };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await seedLocalState(process.argv[2] ? resolve(process.argv[2]) : undefined);
  console.log(`Seeded ${result.written} analyses into ${result.persist} from ${result.file}`);
}
