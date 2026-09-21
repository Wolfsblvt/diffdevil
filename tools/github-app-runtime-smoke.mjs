import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { Miniflare } from 'miniflare';

const repositoryRoot = resolve('.');
const sourceConfigPath = resolve('apps/github-app/wrangler.jsonc');
const sourceConfigDirectory = dirname(sourceConfigPath);
const artifactsDirectory = resolve('artifacts');

await mkdir(artifactsDirectory, { recursive: true });
const temporaryDirectory = await mkdtemp(join(artifactsDirectory, 'github-app-runtime-smoke-'));
let runtime;

try {
  const sourceConfig = JSON.parse(await readFile(sourceConfigPath, 'utf8'));
  const aliases = Object.fromEntries(Object.entries(sourceConfig.alias ?? {}).map(([name, target]) => [
    name,
    resolve(sourceConfigDirectory, target)
  ]));
  const workerPath = join(temporaryDirectory, 'worker.mjs');
  const smokeConfigPath = join(temporaryDirectory, 'wrangler.jsonc');
  const outputDirectory = join(temporaryDirectory, 'bundle');
  const configurationImport = relative(temporaryDirectory, resolve('apps/github-app/configuration.mjs')).replaceAll('\\', '/');

  await writeFile(workerPath, `
import { resolveEffectivePolicy } from ${JSON.stringify(configurationImport)};

export default {
  fetch() {
    try {
      const resolved = resolveEffectivePolicy({ preset: { version: 1, presets: ['size@1'] } });
      return Response.json({ ok: true, policyId: resolved.policy.id, hasSizeRule: resolved.document.rules?.size !== undefined });
    } catch (error) {
      return Response.json({ ok: false, name: error?.name, message: error?.message }, { status: 500 });
    }
  }
};
`, 'utf8');
  await writeFile(smokeConfigPath, JSON.stringify({
    name: 'diffdevil-github-app-runtime-smoke',
    main: './worker.mjs',
    compatibility_date: sourceConfig.compatibility_date,
    compatibility_flags: sourceConfig.compatibility_flags,
    alias: aliases
  }, null, 2), 'utf8');

  const wrangler = spawnSync(process.execPath, [
    resolve('tools/run-wrangler.mjs'),
    'deploy',
    '--dry-run',
    '--config', smokeConfigPath,
    '--outdir', outputDirectory
  ], { cwd: repositoryRoot, stdio: 'inherit', windowsHide: true });
  if (wrangler.error) throw wrangler.error;
  assert.equal(wrangler.status, 0, 'Wrangler must build the managed-App policy smoke worker.');

  const outputFiles = await readdir(outputDirectory);
  const bundleName = outputFiles.find(name => name.endsWith('.js'));
  assert.ok(bundleName, 'Wrangler must emit a JavaScript worker bundle.');
  const bundle = await readFile(join(outputDirectory, bundleName), 'utf8');
  runtime = new Miniflare({ workers: [{
    config: {
      name: 'diffdevil-github-app-runtime-smoke',
      type: 'worker',
      compatibilityDate: sourceConfig.compatibility_date,
      compatibilityFlags: sourceConfig.compatibility_flags,
      manifest: {
        mainModule: bundleName,
        modulesRoot: outputDirectory,
        modules: { [bundleName]: { type: 'esm', contents: bundle } }
      }
    }
  }] });

  const response = await runtime.dispatchFetch('http://localhost/');
  const result = await response.json();
  assert.equal(response.status, 200, `Managed-App policy compilation failed in workerd: ${result.message ?? response.statusText}`);
  assert.equal(result.ok, true);
  assert.equal(typeof result.policyId, 'string');
  assert.equal(result.hasSizeRule, true, 'The absent-policy default must retain the size preset.');
  console.log(`Managed-App policy compiled in workerd (${result.policyId}).`);
} finally {
  await runtime?.dispose();
  await rm(temporaryDirectory, { recursive: true, force: true });
}
