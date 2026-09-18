import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

export async function files(directory) {
  const found = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Distribution input contains a symlink: ${path}`);
    if (entry.isDirectory()) found.push(...await files(path));
    else if (entry.isFile()) found.push(path);
    else throw new Error(`Distribution input is not a regular file: ${path}`);
  }
  return found.sort();
}

async function copyFile(from, to) {
  await mkdir(resolve(to, '..'), { recursive: true });
  await cp(from, to);
}

/**
 * Stages the locked production dependency closure shared by the Action and
 * standalone distributions. Consumer-specific wrappers stay with their
 * builders; the runtime bytes and dependency validation live here.
 */
export async function stageRuntimeClosure({ root, runtime, name, target, description }) {
  const [lock, project] = await Promise.all([
    readFile(join(root, 'package-lock.json'), 'utf8').then(JSON.parse),
    readFile(join(root, 'package.json'), 'utf8').then(JSON.parse),
  ]);
  await mkdir(join(runtime, 'lib'), { recursive: true });
  for (const path of await files(join(root, 'dist/lib'))) {
    if (!/\.(?:js|cjs|mjs)(?:\.map)?$/u.test(path)) continue;
    await copyFile(path, join(runtime, 'lib', relative(join(root, 'dist/lib'), path)));
  }
  const dependencies = [];
  for (const [path, resolved] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b, 'en'))) {
    if (!path || resolved.dev || resolved.devOptional) continue;
    if (!/^node_modules\/(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+(?:\/node_modules\/(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+)*$/u.test(path) || resolved.link) {
      throw new Error(`Unsupported locked package path: ${path}`);
    }
    const packageRoot = join(root, path);
    const manifest = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
    if (manifest.version !== resolved.version) throw new Error(`Installed ${path} does not match its lock. Restore the locked dependency closure.`);
    const owned = (await files(packageRoot)).filter(file => !relative(packageRoot, file).split(/[\\/]/u).includes('node_modules'));
    const notices = owned.filter(file => /^(?:licen[cs]e|notice|copying)(?:[.-]|$)/iu.test(relative(packageRoot, file).split(/[\\/]/u).at(-1)));
    if (!notices.length) throw new Error(`No redistribution notice found in ${path}; review before shipping.`);
    for (const file of owned) await copyFile(file, join(runtime, path, relative(packageRoot, file)));
    dependencies.push({
      name: manifest.name,
      version: manifest.version,
      license: manifest.license ?? resolved.license,
      integrity: resolved.integrity,
      path,
      notices: notices.map(file => relative(packageRoot, file).replaceAll('\\', '/')),
    });
  }
  await writeFile(join(runtime, 'package.json'), JSON.stringify({
    name, private: true, type: 'module', version: project.version, license: 'MIT',
    engines: { node: target }, description,
  }, null, 2) + '\n');
  await mkdir(join(runtime, 'LICENSES'), { recursive: true });
  for (const file of ['MIT.txt', 'AGPL-3.0-only.txt', 'README.md']) await copyFile(join(root, 'LICENSES', file), join(runtime, 'LICENSES', file));
  return { dependencies, lock, project };
}
