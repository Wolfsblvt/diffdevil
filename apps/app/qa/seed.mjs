// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Seed the local Wrangler D1 state the App preview reads. The fixture is written through the
 * managed App's own write paths into an in-memory D1, dumped as SQL, and applied with
 * Wrangler's local D1 commands, so the preview and the seed agree on the same local layout.
 * Local state only; no Cloudflare account, database or GitHub is touched.
 *
 *   node apps/app/qa/seed.mjs [persist-directory] [--scale N]
 *
 * The last stdout line is the written counts as JSON, so a caller can seed in a fresh process.
 */
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Miniflare } from 'miniflare';
import { D1AppStore } from '../../github-app/storage.mjs';
import { seedStore, setScale, NOW } from './fixture.mjs';
import { appBuildTarget } from '../build-target.mjs';

/** Every migration of the managed App, in order: the App reads the same schema the webhook runtime writes. */
export async function migrationNames() { return (await readdir(resolve('apps/github-app/migrations'))).filter(name => name.endsWith('.sql')).sort(); }
const TABLES = ['installations', 'repositories', 'history_records', 'history_file_rows', 'history_effect_rows', 'analytical_pull_requests',
  'analytical_size_facts', 'analytical_size_observations'];
const CLEARED = ["participation_previews","history_jobs","repository_default_adoptions","administrative_events","delegations","automatic_setup","policy_publication_results","policy_publications","policy_links","linked_policies","repository_selections","free_connections","works_departures","plan_change_choices","namespace_defaults","user_service_connections","analytical_size_observations","analytical_size_facts","analytical_pull_requests","commercial_reports","commercial_refusals","commercial_bindings","commercial_links","commercial_link_attempts","commercial_nonces","history_effect_rows","history_file_rows","history_records","browser_sessions","authorization_artifacts","authorization_attempts","user_authorizations","operational_results","execution_leases","deliveries","repairs","repositories","installations","participation_deliveries","participation_responses","participation_prompts"];
const target = appBuildTarget();
const CONFIG = resolve('apps/app', target.configPath);

const literal = value => value === null || value === undefined ? 'NULL' : typeof value === 'number' ? String(value) : `'${String(value).replaceAll("'", "''")}'`;

function wrangler(args, persist) {
  const result = spawnSync(process.execPath, [resolve('node_modules/wrangler/bin/wrangler.js'), ...args, '--config', CONFIG, '--local', '--persist-to', persist], { stdio: 'pipe', windowsHide: true, env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' }, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`wrangler ${args.join(' ')} failed:\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}

/** One SQL statement against a stopped Worker's local D1 state, for a pass that needs a fact no journey can create. */
export function executeLocal(command, persist) { return wrangler(['d1', 'execute', 'APP_DB', '--command', command], persist); }

/** Write the fixture through the real store, then dump it as grouped INSERT statements. */
export async function fixtureSql() {
  const runtime = new Miniflare({ workers: [{
    config: { name: 'app-seed', type: 'worker', compatibilityDate: '2026-09-17', env: { APP_DB: { type: 'd1', id: `seed-${crypto.randomUUID()}` } }, manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'), modules: { 'worker.mjs': { type: 'esm', contents: 'export default { fetch() { return new Response("ok"); } };' } } } }
  }] });
  try {
    const database = await runtime.getD1Database('APP_DB');
    const clock = { value: NOW };
    const appStore = new D1AppStore(database, { now: () => clock.value });
    for (const name of await migrationNames()) await appStore.migrate(await readFile(resolve('apps/github-app/migrations', name), 'utf8'));
    const written = await seedStore(appStore, clock);
    const statements = CLEARED.map(table => `DELETE FROM ${table};`);
    for (const table of TABLES) {
      const rows = (await database.prepare(`SELECT ${table === 'analytical_size_observations' ? 'rowid,' : ''}* FROM ${table}`).all()).results ?? [];
      if (rows.length === 0) continue;
      const columns = Object.keys(rows[0]);
      // Analytical records carry whole numeric reports; D1 caps one statement at 100 KB, so chunk by bytes, not rows.
      const LIMIT = 90_000;
      let values = [], size = 0;
      const flush = () => { if (values.length) statements.push(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values.join(',\n  ')};`); values = []; size = 0; };
      for (const row of rows) {
        const value = `(${columns.map(column => literal(row[column])).join(', ')})`;
        if (size + value.length > LIMIT) flush();
        values.push(value); size += value.length;
        if (values.length >= 40) flush();
      }
      flush();
    }
    return { sql: statements.join('\n'), written };
  } finally { await runtime.dispose(); }
}

export async function seedLocalState(persist = resolve(target.artifacts, 'state')) {
  await mkdir(persist, { recursive: true });
  const { sql, written } = await fixtureSql();
  const file = resolve(target.artifacts, 'seed.sql');
  await writeFile(file, sql);
  wrangler(['d1', 'migrations', 'apply', 'APP_DB'], persist);
  wrangler(['d1', 'execute', 'APP_DB', '--file', file], persist);
  return { written, persist, file };
}

/**
 * One finished managed delivery in the persisted local state, the way the runtime's finish leaves it: what a held or
 * failed pull-request operation looks like to the App. The participation pass needs one to observe meaningful use.
 */
export async function recordLocalDelivery(persist, { repositoryId, installationId, state, code, at = new Date().toISOString() }) {
  const file = resolve(target.artifacts, 'seed-delivery.sql');
  await writeFile(file, `INSERT INTO deliveries (delivery_id, installation_id, repository_id, pull_request, state, received_at, completed_at, code) VALUES (${literal(`qa-${crypto.randomUUID()}`)}, ${literal(installationId)}, ${literal(repositoryId)}, 1, ${literal(state)}, ${literal(at)}, ${literal(at)}, ${literal(code)});\n`);
  wrangler(['d1', 'execute', 'APP_DB', '--file', file], persist);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const scaleAt = args.indexOf('--scale');
  if (scaleAt >= 0) { setScale(Number(args[scaleAt + 1])); args.splice(scaleAt, 2); }
  const result = await seedLocalState(args[0] ? resolve(args[0]) : undefined);
  console.log(`Seeded ${result.written.written} analyses, ${result.written.retained} analytical records and ${result.written.observations} size observations into ${result.persist} from ${result.file}`);
  console.log(JSON.stringify(result.written));
}
