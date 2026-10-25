// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The Playground Worker deployment controller: record the active version, upload an immutable
 * version without traffic, qualify its preview, promote exactly that version, then read back the
 * canonical Workers.dev Home. Rollback promotes one recorded earlier version.
 *
 * Usage (from the repository root, inside the production job):
 *   node tools/publication/playground.mjs prior
 *   node tools/publication/playground.mjs upload --source <sha>
 *   node tools/publication/playground.mjs qualify --phase preview|production
 *   node tools/publication/playground.mjs promote
 *   node tools/publication/playground.mjs rollback --version <version-id>
 * State and the receipt are written under artifacts/publication/playground/.
 */
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import { api, entry, wrangler } from './cloudflare.mjs';
import { readback, summarize } from './readback.mjs';

export const WORKER = 'diffdevil-playground';
export const CONFIG = 'apps/playground/wrangler.jsonc';
export const CANONICAL = 'https://diffdevil-playground.wolfsblvt.workers.dev';
/** The site origin whose browser calls the API; its CORS answer is part of the product. */
export const SITE_ORIGIN = 'https://diffdevil.dev';
/** One small, merged public pull request: the bounded live journey each phase exercises once. */
export const QUALIFICATION_PR = 'https://github.com/Wolfsblvt/diffdevil/pull/128';
const VERSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const STATE = 'artifacts/publication/playground';

/** The single version receiving 100% of traffic in the newest deployment, or a refusal. */
export function activeVersion(deployments) {
  const latest = [...(deployments ?? [])].sort((a, b) => String(b.created_on).localeCompare(String(a.created_on)))[0];
  if (!latest) throw new Error(`${WORKER} has no deployment; its first resource is created only through the documented bootstrap.`);
  const versions = latest.versions ?? [];
  if (versions.length !== 1 || versions[0].percentage !== 100) {
    throw new Error(`${WORKER} is in a split deployment (${versions.map(v => `${v.version_id}@${v.percentage}%`).join(', ')}); reconcile it before an automatic deployment.`);
  }
  return { deploymentId: latest.id, versionId: versions[0].version_id, createdOn: latest.created_on ?? null };
}

/** The bounded qualification journey for one origin; `schema` validates the replay contract. */
export function qualificationChecks(origin, schema, pullRequest = QUALIFICATION_PR) {
  const pr = encodeURIComponent(pullRequest);
  const contract = value => schema(value) ? [] : [`response violates the replay contract: ${schema.errors?.map(e => `${e.instancePath} ${e.message}`).join(', ')}`];
  const success = value => value?.ok === true ? contract(value) : [`analysis did not succeed (${value?.error?.code ?? 'no error code'})`];
  const publicJson = { 'access-control-allow-origin': /^\*$/u, 'cache-control': /no-store/u };
  return [
    { name: 'health', url: `${origin}/health/ping`, settle: true, origin: SITE_ORIGIN,
      expect: { status: 200, json: value => value?.status === 'ok' && value?.service === WORKER ? [] : [`health did not identify ${WORKER} as ok`] } },
    { name: 'static front door', url: `${origin}/`, expect: { status: 200, headers: { 'content-type': /text\/html/u } } },
    { name: 'public-URL refusal', url: `${origin}/api/head?url=${encodeURIComponent('https://example.com/not-a-pull-request')}`, origin: SITE_ORIGIN,
      expect: { status: 400, headers: publicJson, json: value => value?.error?.code === 'E_PLAYGROUND_URL' ? contract(value) : ['refusal did not use E_PLAYGROUND_URL'] } },
    { name: 'pull-request head', url: `${origin}/api/head?url=${pr}`, origin: SITE_ORIGIN, expect: { status: 200, headers: publicJson, json: success } },
    { name: 'pull-request report', url: `${origin}/api/report?url=${pr}`, origin: SITE_ORIGIN, expect: { status: 200, headers: publicJson, json: success } },
  ];
}

export function replaySchema(root = '.') {
  const read = path => JSON.parse(readFileSync(join(root, path), 'utf8'));
  const ajv = new Ajv2020({ strict: true, strictTypes: false, strictRequired: false, allErrors: true });
  ajv.addSchema(read('src/diffdevil/contracts/detail/v1/values.schema.json'));
  ajv.addSchema(read('src/diffdevil/contracts/schemas/report-v1.schema.json'));
  return ajv.compile(read('apps/playground/contracts/replay-response-v1.schema.json'));
}

const state = name => join(STATE, `${name}.json`);
const save = (name, value) => { mkdirSync(STATE, { recursive: true }); writeFileSync(state(name), JSON.stringify(value, null, 2) + '\n'); return value; };
const load = name => JSON.parse(readFileSync(state(name), 'utf8'));
const summary = text => { if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n'); console.log(text); };

async function readActive(options) {
  return activeVersion((await api('GET', `/workers/scripts/${WORKER}/deployments`, options))?.deployments);
}

export async function prior(options = {}) {
  const active = await readActive(options);
  summary(`Playground before this run: version \`${active.versionId}\` (deployment \`${active.deploymentId}\`) — the rollback coordinate.`);
  return save('prior', active);
}

export function upload({ source, run = wrangler } = {}) {
  if (!/^[0-9a-f]{40}$/u.test(source ?? '')) throw new Error('upload needs the admitted 40-character source SHA.');
  const uploaded = entry(run(['versions', 'upload', '--config', CONFIG, '--tag', `source-${source.slice(0, 8)}`,
    '--message', `diffdevil playground ${source}`]), 'version-upload');
  if (!VERSION_ID.test(uploaded.version_id ?? '')) throw new Error('Wrangler returned no version ID for the upload.');
  if (!uploaded.preview_url) throw new Error('The uploaded version has no preview URL; preview URLs must stay enabled to qualify before promotion.');
  summary(`Uploaded version \`${uploaded.version_id}\` without traffic; preview ${uploaded.preview_url}.`);
  return save('candidate', { source, versionId: uploaded.version_id, previewUrl: uploaded.preview_url.replace(/\/$/u, '') });
}

export async function qualify({ phase, fetch, sleep } = {}) {
  if (phase !== 'preview' && phase !== 'production') throw new Error('qualify needs --phase preview or production.');
  const candidate = load('candidate');
  const origin = phase === 'preview' ? candidate.previewUrl : CANONICAL;
  const results = await readback(qualificationChecks(origin, replaySchema()), { fetch, sleep });
  save(`qualify-${phase}`, { origin, versionId: candidate.versionId, results });
  summary(`Playground ${phase} qualification (${origin}):\n\n\`\`\`\n${summarize(results)}\n\`\`\``);
  if (results.some(result => !result.ok)) throw new Error(`Playground ${phase} qualification failed; ${phase === 'preview' ? 'nothing was promoted' : 'the prior version remains the recorded rollback'}.`);
  return results;
}

export async function promote({ run = wrangler, ...options } = {}) {
  const { versionId, source } = load('candidate');
  const deployed = entry(run(['versions', 'deploy', `${versionId}@100%`, '--config', CONFIG, '--yes',
    '--message', `Promote diffdevil playground ${source}`]), 'version-deploy');
  const active = await readActive(options);
  if (active.versionId !== versionId) throw new Error(`Promotion reported deployment ${deployed.deployment_id}, but ${active.versionId} is active instead of ${versionId}.`);
  summary(`Promoted \`${versionId}\` at 100% (deployment \`${active.deploymentId}\`).`);
  return save('promoted', active);
}

export async function rollback({ version, run = wrangler, ...options } = {}) {
  if (!VERSION_ID.test(version ?? '')) throw new Error('rollback needs --version with one recorded Worker version ID.');
  const before = save('prior', await readActive(options));
  entry(run(['versions', 'deploy', `${version}@100%`, '--config', CONFIG, '--yes', '--message', `Restore diffdevil playground version ${version}`]), 'version-deploy');
  const active = await readActive(options);
  if (active.versionId !== version) throw new Error(`Rollback left ${active.versionId} active instead of ${version}.`);
  save('candidate', { source: null, versionId: version, previewUrl: null });
  summary(`Restored \`${version}\` at 100% (was \`${before.versionId}\`).`);
  return save('promoted', active);
}

/** The deterministic, credential-free record of what this run selected, changed and observed. */
export function receipt({ run: runUrl = null } = {}) {
  const read = name => { try { return load(name); } catch { return null; } };
  const candidate = read('candidate');
  const value = {
    kind: 'diffdevil.playground-deployment', schemaVersion: 1, worker: WORKER, canonical: CANONICAL,
    source: candidate?.source ?? null, run: runUrl,
    previous: read('prior'), candidate, promoted: read('promoted'),
    qualification: { preview: read('qualify-preview'), production: read('qualify-production') },
  };
  return save('receipt', value);
}

const option = name => { const index = process.argv.indexOf(`--${name}`); return index > 0 ? process.argv[index + 1] : undefined; };
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  const commands = {
    prior: () => prior(),
    upload: () => upload({ source: option('source') }),
    qualify: () => qualify({ phase: option('phase') }),
    promote: () => promote(),
    rollback: () => rollback({ version: option('version') }),
    receipt: () => receipt({ run: option('run') }),
  };
  if (!commands[command]) { console.error(`Unknown command ${command ?? ''}; expected ${Object.keys(commands).join(', ')}.`); process.exit(2); }
  try { await commands[command](); }
  catch (error) { console.error(`::error::${error.message}`); process.exitCode = 1; }
}
