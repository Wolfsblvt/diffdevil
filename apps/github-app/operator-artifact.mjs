// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** A qualified, self-contained upload: native modules/settings and the selected static assets. */
import { createHash } from 'node:crypto';
import { mkdtemp, open, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { parse } from 'jsonc-parser';
const require = createRequire(import.meta.url);

export const ARTIFACT_FORMAT = 'diffdevil-credential-artifact-v1';
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
function fail() { throw Object.assign(new Error('Select the retained qualified upload artifact and its SHA-256; the supplied artifact is missing, changed or incomplete. Use prepare-artifact for a new source selection.'), { code: 'E_OPERATOR_ARTIFACT' }); }

/** Parse the standard multipart bytes emitted by pinned Wrangler --dry-run --outfile. */
async function nativeBundle(bytes) {
  const firstLine = bytes.subarray(0, bytes.indexOf('\r\n')).toString('ascii');
  if (!/^--[A-Za-z0-9_-]+$/u.test(firstLine)) fail();
  let form;
  try { form = await new Response(bytes, { headers: { 'content-type': `multipart/form-data; boundary=${firstLine.slice(2)}` } }).formData(); } catch { fail(); }
  const metadata = JSON.parse(form.get('metadata'));
  const modules = [];
  for (const [name, file] of form) {
    if (name === 'metadata') continue;
    if (typeof file === 'string') fail();
    modules.push({ name, type: file.type, content: Buffer.from(await file.arrayBuffer()).toString('base64') });
  }
  return { metadata, modules };
}

/** Same content identity used by pinned Wrangler's static-asset upload protocol. */
export function assetHash(path, bytes) {
  return require('blake3-wasm').hash(bytes.toString('base64') + extname(path).slice(1)).toString('hex').slice(0, 32);
}

async function assetSnapshot(config, configPath) {
  if (!config.assets) return undefined;
  const { default: ignore } = await import('ignore');
  const { lookup } = await import('mrmime');
  if (typeof config.assets.directory !== 'string') fail();
  const root = resolve(dirname(configPath), config.assets.directory);
  const readOptional = name => readFile(join(root, name), 'utf8').catch(error => { if (error.code === 'ENOENT') return undefined; throw error; });
  const exclusions = await readOptional('.assetsignore');
  const matcher = ignore().add(['/.assetsignore', '/_headers', '/_redirects', ...(exclusions?.split('\n') ?? [])]);
  const files = [];
  async function collect(directory, prefix = '') {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = `${prefix}${entry.name}`;
      if (entry.isSymbolicLink()) fail();
      if (entry.isDirectory()) { await collect(join(directory, entry.name), `${path}/`); continue; }
      if (matcher.ignores(path)) continue;
      if ((path === '_worker.js' || path.startsWith('_worker.js/')) && exclusions === undefined) fail();
      const bytes = await readFile(join(directory, entry.name));
      let type = lookup(path) ?? 'application/null';
      if (type.startsWith('text/')) type += '; charset=utf-8';
      files.push({ path: `/${path}`, content: bytes.toString('base64'), type, hash: assetHash(path, bytes), size: bytes.length });
    }
  }
  await collect(root);
  files.sort((a, b) => a.path.localeCompare(b.path));
  const { directory, binding, ...settings } = config.assets;
  return { binding, config: { ...settings, _headers: await readOptional('_headers'), _redirects: await readOptional('_redirects') }, files };
}

/** No protected inputs or provider effect: freeze native dry-run output and assets into one new file. */
export async function prepareCredentialArtifact({ configPath, artifactPath, accountId, worker, runDryRun }) {
  let file;
  const temporary = await mkdtemp(join(tmpdir(), 'diffdevil-artifact-'));
  try {
    // Refuse/qualify the final destination before spending a build.
    file = await open(artifactPath, 'wx', 0o600);
    const source = await readFile(configPath);
    const errors = [];
    const config = parse(source.toString('utf8'), errors, { allowTrailingComma: true });
    if (errors.length || config.name !== worker || (config.account_id && config.account_id !== accountId)) fail();
    const bundlePath = join(temporary, 'worker.bundle');
    const result = await runDryRun({ bundlePath, directory: temporary });
    if (result.code !== 0) fail();
    const bundle = await readFile(bundlePath);
    if (sha256(await readFile(configPath)) !== sha256(source)) fail();
    const { metadata, modules } = await nativeBundle(bundle);
    // Inherited state could be selected by a foreign latest version. Every binding must be concrete.
    if (!Array.isArray(metadata.bindings) || metadata.bindings.some(binding => ['inherit', 'secret_text', 'secret_key'].includes(binding.type))) fail();
    delete metadata.keep_bindings;
    delete metadata.keep_assets;
    delete metadata.annotations;
    const artifact = { format: ARTIFACT_FORMAT, worker, accountId, configHash: sha256(source), nativeBundleHash: sha256(bundle), metadata, modules, assets: await assetSnapshot(config, configPath) };
    validateArtifact(artifact);
    const bytes = Buffer.from(`${JSON.stringify(artifact)}\n`);
    await file.writeFile(bytes);
    await file.sync();
    return artifactReceipt(artifact, sha256(bytes));
  } catch (error) {
    if (file) { await file.close(); file = undefined; await rm(artifactPath, { force: true }); }
    if (error.code === 'EEXIST') throw Object.assign(new Error('Artifact already exists; select its retained qualified identity instead of overwriting it.'), { code: 'E_OPERATOR_ARTIFACT' });
    fail();
  } finally { await file?.close(); await rm(temporary, { recursive: true, force: true }); }
}

function validContent(file) {
  if (!file || typeof file.content !== 'string' || typeof file.type !== 'string') return false;
  return Buffer.from(file.content, 'base64').toString('base64') === file.content;
}

function validateArtifact(artifact) {
  if (artifact?.format !== ARTIFACT_FORMAT || !/^[a-f0-9]{64}$/u.test(artifact.configHash ?? '') || !/^[a-f0-9]{64}$/u.test(artifact.nativeBundleHash ?? '')) fail();
  const { metadata, modules, assets } = artifact;
  if (!metadata || !Array.isArray(metadata.bindings) || metadata.bindings.some(binding => !binding || typeof binding.name !== 'string' || typeof binding.type !== 'string' || ['inherit', 'secret_text', 'secret_key'].includes(binding.type)) || metadata.keep_bindings || metadata.keep_assets || metadata.assets?.jwt) fail();
  if (!Array.isArray(modules) || !modules.length || modules.some(file => typeof file.name !== 'string' || !validContent(file)) || new Set(modules.map(file => file.name)).size !== modules.length) fail();
  if (!modules.some(file => file.name === (metadata.main_module ?? metadata.body_part))) fail();
  const assetBindings = metadata.bindings.filter(binding => binding.type === 'assets');
  if (Boolean(assets) !== (assetBindings.length > 0)) fail();
  if (assets) {
    if (assetBindings.length !== 1 || assetBindings[0].name !== assets.binding || !assets.config || !Array.isArray(assets.files)) fail();
    if (new Set(assets.files.map(file => file.path)).size !== assets.files.length) fail();
    for (const file of assets.files) {
      if (!validContent(file) || typeof file.path !== 'string' || !file.path.startsWith('/')) fail();
      const bytes = Buffer.from(file.content, 'base64');
      if (bytes.length !== file.size || assetHash(file.path, bytes) !== file.hash) fail();
    }
  }
}

export function artifactReceipt(artifact, digest) {
  return { state: 'qualified', sha256: digest, nativeBundleHash: artifact.nativeBundleHash, configHash: artifact.configHash, modules: artifact.modules.length, assets: artifact.assets?.files.length ?? 0 };
}

/** The independently selected digest binds every module, versioned setting and asset byte. */
export async function readCredentialArtifact({ artifactPath, artifactSha256, target }) {
  try {
    if (!/^[a-f0-9]{64}$/u.test(artifactSha256 ?? '')) fail();
    const bytes = await readFile(artifactPath);
    if (sha256(bytes) !== artifactSha256) fail();
    const artifact = JSON.parse(bytes.toString('utf8'));
    validateArtifact(artifact);
    if (target && (artifact.worker !== target.worker || artifact.accountId !== target.accountId || artifact.configHash !== target.configHash)) fail();
    return artifact;
  } catch { fail(); }
}
