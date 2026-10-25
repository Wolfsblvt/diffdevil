// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The static publication family controller for the two existing Direct Upload Pages projects.
 * It records the current production pair, re-checks the frozen receipt immediately before each
 * upload, publishes manual first and site second, and reads the public hosts back. Rollback
 * restores one recorded earlier pair through Pages' production rollback, in the same order.
 *
 * Usage (from the repository root, inside the production job):
 *   node tools/publication/static-family.mjs prior
 *   node tools/publication/static-family.mjs deploy --host docs|site
 *   node tools/publication/static-family.mjs rollback --docs <deployment-id> --site <deployment-id>
 *   node tools/publication/static-family.mjs readback
 *   node tools/publication/static-family.mjs receipt --run <url>
 * State and the receipt are written under artifacts/publication/website/.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { api, entry, wrangler } from './cloudflare.mjs';
import { qualificationChecks, replaySchema } from './playground.mjs';
import { readback, summarize } from './readback.mjs';
import { compareTree, listTree } from './tree.mjs';

/** Upload order is part of the contract: the manual first, so the site never links ahead of it. */
export const HOSTS = Object.freeze({
  docs: { project: 'diffdevil-docs', directory: 'artifacts/manual/dist', origin: 'https://docs.diffdevil.dev' },
  site: { project: 'diffdevil-site', directory: 'artifacts/website/dist', origin: 'https://diffdevil.dev' },
});
export const ORDER = Object.freeze(['docs', 'site']);
export const COMPATIBILITY = 'https://www.diffdevil.dev';
export const PLAYGROUND_API = 'https://diffdevil-playground.wolfsblvt.workers.dev';
export const RECEIPT = 'artifacts/website/publication.json';
const DEPLOYMENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/u;
const STATE = 'artifacts/publication/website';

const state = name => join(STATE, `${name}.json`);
const save = (name, value) => { mkdirSync(STATE, { recursive: true }); writeFileSync(state(name), JSON.stringify(value, null, 2) + '\n'); return value; };
const load = name => JSON.parse(readFileSync(state(name), 'utf8'));
const loadOptional = name => { try { return load(name); } catch { return null; } };
const summary = text => { if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + '\n'); console.log(text); };
const head = () => execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).trim();

/** The provider's view of one deployment, reduced to the coordinates a receipt or rollback needs. */
export function coordinate(deployment) {
  if (!deployment) return null;
  return {
    id: deployment.id, url: deployment.url ?? null, environment: deployment.environment ?? null,
    commit: deployment.deployment_trigger?.metadata?.commit_hash || null,
    stage: deployment.latest_stage ? `${deployment.latest_stage.name}:${deployment.latest_stage.status}` : null,
    createdOn: deployment.created_on ?? null,
  };
}

async function canonical(host, options) {
  return coordinate((await api('GET', `/pages/projects/${HOSTS[host].project}`, options))?.canonical_deployment);
}

/** Record the current production pair before anything is uploaded: the rollback coordinates. */
export async function prior(options = {}) {
  const pair = {};
  for (const host of ORDER) pair[host] = await canonical(host, options);
  summary(`Production pair before this run — docs \`${pair.docs?.id ?? 'none'}\` (${pair.docs?.commit ?? 'no commit'}), site \`${pair.site?.id ?? 'none'}\` (${pair.site?.commit ?? 'no commit'}).`);
  return save('prior', pair);
}

/** The frozen receipt must describe this exact source and these exact bytes, checked right before upload. */
export function verifyReceipt(host, { source = head(), receipt = JSON.parse(readFileSync(RECEIPT, 'utf8')) } = {}) {
  if (receipt.source !== source) throw new Error(`The publication receipt is for ${receipt.source}, not the admitted source ${source}.`);
  const differences = compareTree(receipt[host] ?? [], listTree(HOSTS[host].directory));
  if (differences.length) throw new Error(`The ${host} upload no longer matches the frozen receipt: ${differences.slice(0, 10).join(', ')}${differences.length > 10 ? ', …' : ''}`);
  return receipt[host].length;
}

async function settled(host, id, { attempts = 12, delayMs = 5_000, sleep, ...options }) {
  const wait = sleep ?? (milliseconds => new Promise(done => setTimeout(done, milliseconds)));
  let deployment;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    deployment = coordinate(await api('GET', `/pages/projects/${HOSTS[host].project}/deployments/${id}`, options));
    if (deployment.stage?.endsWith(':success') || deployment.stage?.endsWith(':failure') || deployment.stage?.endsWith(':canceled')) break;
    await wait(delayMs);
  }
  if (!deployment.stage?.endsWith(':success')) throw new Error(`${HOSTS[host].project} deployment ${id} ended at ${deployment.stage ?? 'an unknown stage'}.`);
  const current = await canonical(host, options);
  if (current?.id !== id) throw new Error(`${HOSTS[host].project} production serves ${current?.id ?? 'nothing'}, not ${id}.`);
  return deployment;
}

export async function deploy({ host, run = wrangler, source = head(), ...options } = {}) {
  if (!HOSTS[host]) throw new Error('deploy needs --host docs or --host site.');
  if (host === 'site' && loadOptional('deploy-docs')?.id === undefined) throw new Error('The site is published only after the manual in the same run.');
  const files = verifyReceipt(host, { source });
  const { project, directory } = HOSTS[host];
  const result = entry(run(['pages', 'deploy', directory, '--project-name', project, '--branch', 'main',
    '--commit-hash', source, '--commit-message', `diffdevil ${host} ${source}`, '--commit-dirty=false']), 'pages-deploy-detailed');
  if (!DEPLOYMENT_ID.test(result.deployment_id ?? '')) throw new Error(`Wrangler returned no deployment ID for ${project}.`);
  if (result.environment !== 'production') throw new Error(`${project} deployment ${result.deployment_id} is ${result.environment}, not production.`);
  const deployment = await settled(host, result.deployment_id, options);
  if (deployment.commit !== source) throw new Error(`${project} deployment ${deployment.id} records ${deployment.commit}, not ${source}.`);
  summary(`Published ${host}: \`${project}\` deployment \`${deployment.id}\` (${files} receipt files, ${deployment.url}).`);
  return save(`deploy-${host}`, { ...deployment, files, rollback: false });
}

/** Restore one recorded production pair, manual first. Each target must be a successful production deployment. */
export async function rollback({ targets, ...options } = {}) {
  for (const host of ORDER) if (!DEPLOYMENT_ID.test(targets?.[host] ?? '')) throw new Error('rollback needs both --docs and --site recorded deployment IDs.');
  const recorded = {};
  for (const host of ORDER) {
    recorded[host] = coordinate(await api('GET', `/pages/projects/${HOSTS[host].project}/deployments/${targets[host]}`, options));
    if (recorded[host].environment !== 'production' || !recorded[host].stage?.endsWith(':success')) throw new Error(`${targets[host]} is not a successful ${HOSTS[host].project} production deployment.`);
  }
  await prior(options);
  for (const host of ORDER) {
    // Production may be restored as the recorded deployment or as a provider copy of it; follow the answer.
    const restored = await api('POST', `/pages/projects/${HOSTS[host].project}/deployments/${targets[host]}/rollback`, options);
    const deployment = await settled(host, restored?.id ?? targets[host], options);
    if (recorded[host].commit && deployment.commit !== recorded[host].commit) throw new Error(`${HOSTS[host].project} restored ${deployment.commit}, not the recorded ${recorded[host].commit}.`);
    summary(`Restored ${host}: \`${HOSTS[host].project}\` deployment \`${deployment.id}\` from \`${targets[host]}\` (${deployment.commit ?? 'no commit recorded'}).`);
    save(`deploy-${host}`, { ...deployment, restoredFrom: targets[host], files: null, rollback: true });
  }
}

/** The first `_redirects` rule of the site upload: one real moved legacy URL to read back. */
export function legacyRedirect(redirects) {
  const rule = redirects.split('\n').map(line => line.trim().split(/\s+/u)).find(parts => parts.length === 3 && parts[2] === '308');
  return rule ? { from: rule[0], to: rule[1] } : null;
}

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/** The joined SITE/DOCS/FAQ search entry each host serves; it changes with the published content. */
export const SEARCH_ENTRY = 'pagefind/pagefind-entry.json';

/**
 * The bounded public readback for the published pair. `sources` names the commit each host now
 * serves; marker pages embed that exact SHA in their source links, so they distinguish this cut
 * from the previous one through the real custom domains. After a publication, `search` holds the
 * receipt digest of each host's search entry, so the served bytes are compared with the frozen pair.
 */
export function publicChecks({ sources, redirect, search, lensStudio = [] }) {
  const site = HOSTS.site.origin;
  const docs = HOSTS.docs.origin;
  const html = { 'content-type': /text\/html/u };
  const legal = { ...html, 'x-robots-tag': /noindex/u };
  // A restored deployment without recorded commit metadata can be read back, but not identified.
  const cut = commit => commit ? [commit] : [];
  const checks = [
    { name: 'site serves this cut', url: `${site}/source/`, settle: Boolean(sources.site), expect: { status: 200, headers: html, contains: cut(sources.site) } },
    { name: 'docs serves this cut', url: `${docs}/`, settle: Boolean(sources.docs), expect: { status: 200, headers: html, contains: cut(sources.docs) } },
    { name: 'site home', url: `${site}/`, expect: { status: 200, headers: html } },
    { name: 'www compatibility redirect', url: `${COMPATIBILITY}/faq/?readback=1`, expect: { status: 308, location: `${site}/faq/?readback=1` } },
    { name: 'FAQ', url: `${site}/faq/`, expect: { status: 200, headers: html } },
    { name: 'Lens Studio page', url: `${site}/playground/`, expect: { status: 200, headers: html } },
    // The page is only coherent when its live-analysis dependency answers the real journey.
    ...lensStudio.map(check => ({ ...check, name: `Lens Studio API ${check.name}` })),
    ...['impressum', 'privacy', 'terms'].map(page => ({ name: `legal ${page}`, url: `${site}/${page}/`, expect: { status: 200, headers: legal } })),
    ...ORDER.map(host => ({ name: `${host} search index`, url: `${HOSTS[host].origin}/${SEARCH_ENTRY}`,
      expect: { status: 200, ...(search?.[host] ? { sha256: search[host] } : {}) } })),
    ...ORDER.map(host => ({ name: `${host} robots.txt`, url: `${HOSTS[host].origin}/robots.txt`, expect: { status: 200 } })),
  ];
  if (redirect) checks.push({ name: 'moved legacy apex URL', url: `${site}${redirect.from}`, expect: { status: 308, location: redirect.to } });
  return checks;
}

export async function readPublic({ fetch, sleep, schema = replaySchema(), pullRequest } = {}) {
  const sources = Object.fromEntries(ORDER.map(host => [host, load(`deploy-${host}`).commit]));
  // A publication also compares served bytes with its own frozen receipt; a rollback has none.
  const published = ORDER.every(host => load(`deploy-${host}`).rollback === false);
  const receipt = published ? JSON.parse(readFileSync(RECEIPT, 'utf8')) : null;
  const search = receipt ? Object.fromEntries(ORDER.map(host => [host, receipt[host].find(file => file.path === SEARCH_ENTRY)?.sha256])) : null;
  const redirect = receipt ? legacyRedirect(readFileSync(join(HOSTS.site.directory, '_redirects'), 'utf8')) : null;
  const lensStudio = qualificationChecks(PLAYGROUND_API, schema, pullRequest);
  const results = await readback(publicChecks({ sources, redirect, search, lensStudio }), { fetch, sleep });
  save('readback', { sources, results });
  summary(`Public readback:\n\n\`\`\`\n${summarize(results)}\n\`\`\``);
  if (results.some(result => !result.ok)) throw new Error('Public readback failed; the run summary names the recorded pair to restore.');
  return results;
}

/** The deterministic, credential-free record of what this run selected, changed and observed. */
export function receipt({ run: runUrl = null } = {}) {
  let publication = null;
  try {
    const bytes = readFileSync(RECEIPT);
    const parsed = JSON.parse(bytes);
    publication = { sha256: sha256(bytes), source: parsed.source, availability: parsed.availability, files: { site: parsed.site.length, docs: parsed.docs.length } };
  } catch { /* A rollback or a failed build has no fresh publication receipt. */ }
  const previous = loadOptional('prior');
  const value = {
    kind: 'diffdevil.static-publication', schemaVersion: 1, run: runUrl,
    source: publication?.source ?? null, publication,
    previous, deployed: { docs: loadOptional('deploy-docs'), site: loadOptional('deploy-site') },
    readback: loadOptional('readback'),
    rendered: loadOptional('rendered-live'),
  };
  save('receipt', value);
  if (previous?.docs?.id && previous?.site?.id) {
    summary(`Rollback coordinates: dispatch **Publish website** with operation \`rollback\`, docs \`${previous.docs.id}\`, site \`${previous.site.id}\`.`);
  }
  return value;
}

const option = name => { const index = process.argv.indexOf(`--${name}`); return index > 0 ? process.argv[index + 1] : undefined; };
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  const commands = {
    prior: () => prior(),
    deploy: () => deploy({ host: option('host') }),
    rollback: () => rollback({ targets: { docs: option('docs'), site: option('site') } }),
    readback: () => readPublic(),
    receipt: () => receipt({ run: option('run') }),
  };
  if (!commands[command]) { console.error(`Unknown command ${command ?? ''}; expected ${Object.keys(commands).join(', ')}.`); process.exit(2); }
  try { await commands[command](); }
  catch (error) { console.error(`::error::${error.message}`); process.exitCode = 1; }
}
