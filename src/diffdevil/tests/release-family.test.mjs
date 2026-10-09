// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { inflateRawSync } from 'node:zlib';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const source = '1234567890abcdef1234567890abcdef12345678';

function zipMembers(bytes) {
  const members = new Map();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const size = bytes.readUInt32LE(offset + 18);
    const nameLength = bytes.readUInt16LE(offset + 26);
    const extraLength = bytes.readUInt16LE(offset + 28);
    const name = bytes.subarray(offset + 30, offset + 30 + nameLength).toString();
    const start = offset + 30 + nameLength + extraLength;
    members.set(name, inflateRawSync(bytes.subarray(start, start + size)).toString());
    offset = start + size;
  }
  return members;
}

test('a Skill-only release builds without compiled engine or dependencies and advertises only its actual archive', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'diffdevil-skill-family-'));
  try {
    await mkdir(join(fixture, 'tools'), { recursive: true });
    await mkdir(join(fixture, 'skills/diffdevil/references'), { recursive: true });
    for (const name of ['build-release.mjs', 'distribution.mjs']) await cp(join(root, 'tools', name), join(fixture, 'tools', name));
    await writeFile(join(fixture, 'package.json'), JSON.stringify({ version: '9.7.4' }));
    await writeFile(join(fixture, 'skills/versions.json'), JSON.stringify({ diffdevil: '1.3.0' }));
    const skill = '---\nname: diffdevil\nmetadata:\n  version: "1.3.0"\n---\n\n# Skill fixture\n';
    await writeFile(join(fixture, 'skills/diffdevil/SKILL.md'), skill);
    await writeFile(join(fixture, 'skills/diffdevil/references/example.md'), '# Fixture reference\n');
    const output = join(fixture, 'output');
    const run = spawnSync(process.execPath, [join(fixture, 'tools/build-release.mjs'), '--family', 'skill', '--source-ref', source, '--output', output], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr || String(run.error));
    assert.deepEqual((await readdir(output)).sort(), ['diffdevil-release-manifest.json', 'diffdevil-skill-1.3.0.zip']);
    const manifest = JSON.parse(await readFile(join(output, 'diffdevil-release-manifest.json'), 'utf8'));
    assert.equal(manifest.family, 'skill');
    assert.equal(manifest.productVersion, undefined);
    assert.equal(manifest.skills.diffdevil.version, '1.3.0');
    assert.equal(manifest.source.commit, source);
    assert.deepEqual(Object.keys(manifest.assets), ['skill']);
    assert.equal(manifest.assets.skill.url, 'https://github.com/Wolfsblvt/diffdevil/releases/download/skill-v1.3.0/diffdevil-skill-1.3.0.zip');
    const archive = await readFile(join(output, manifest.assets.skill.name));
    assert.equal(createHash('sha256').update(archive).digest('hex'), manifest.assets.skill.sha256);
    const members = zipMembers(archive);
    assert.equal(members.get('SKILL.md'), skill);
    assert.equal(members.get('references/example.md'), '# Fixture reference\n');
    assert.equal(JSON.parse(members.get('MANIFEST.json')).productVersion, undefined);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test('an unknown family is rejected before reading or building any artifact', () => {
  const run = spawnSync(process.execPath, [join(root, 'tools/build-release.mjs'), '--family', 'extension'], { encoding: 'utf8' });
  assert.notEqual(run.status, 0);
  assert.match(run.stderr, /--family must be all, open-tool, or skill/u);
});


test('open-tool and bundled publication manifests advertise only their selected flavors', async () => {
  const fixture = await mkdtemp(join(tmpdir(), 'diffdevil-runtime-family-'));
  try {
    for (const path of ['tools', 'skills/diffdevil', 'dist/lib/cli', 'src/diffdevil/contracts', 'src/diffdevil/presets', 'LICENSES']) {
      await mkdir(join(fixture, path), { recursive: true });
    }
    for (const name of ['build-release.mjs', 'distribution.mjs']) await cp(join(root, 'tools', name), join(fixture, 'tools', name));
    await writeFile(join(fixture, 'package.json'), JSON.stringify({ version: '9.7.4' }));
    await writeFile(join(fixture, 'package-lock.json'), JSON.stringify({ packages: { '': { version: '9.7.4' } } }));
    await writeFile(join(fixture, 'skills/versions.json'), JSON.stringify({ diffdevil: '1.3.0' }));
    await writeFile(join(fixture, 'skills/diffdevil/SKILL.md'), '---\nmetadata:\n  version: "1.3.0"\n---\n');
    await writeFile(join(fixture, 'dist/lib/cli/main.js'), 'console.log("packaging fixture");\n');
    for (const name of ['MIT.txt', 'AGPL-3.0-only.txt', 'README.md']) await writeFile(join(fixture, 'LICENSES', name), 'Packaging fixture notice\n');
    const build = async (family, extra = []) => {
      const output = join(fixture, family);
      const run = spawnSync(process.execPath, [join(fixture, 'tools/build-release.mjs'), '--family', family, '--source-ref', source, '--output', output, ...extra], { encoding: 'utf8' });
      assert.equal(run.status, 0, run.stderr || String(run.error));
      return { output, manifest: JSON.parse(await readFile(join(output, 'diffdevil-release-manifest.json'), 'utf8')) };
    };
    const open = await build('open-tool');
    assert.deepEqual(Object.keys(open.manifest.assets), ['standalone']);
    assert.equal(open.manifest.productVersion, '9.7.4');
    assert.equal(open.manifest.skills, undefined);
    const standalone = zipMembers(await readFile(join(open.output, open.manifest.assets.standalone.name)));
    assert.equal(JSON.parse(standalone.get('runtime/MANIFEST.json')).skillVersion, undefined);
    const bundled = await build('skill', ['--include-bundle']);
    assert.deepEqual(Object.keys(bundled.manifest.assets), ['skill', 'bundled']);
    assert.equal(bundled.manifest.skills.diffdevil.version, '1.3.0');
    assert.equal(bundled.manifest.productVersion, '9.7.4');
    assert.match(bundled.manifest.assets.bundled.url, /\/skill-v1\.3\.0\//u);
    const mismatch = spawnSync(process.execPath, [join(fixture, 'tools/build-release.mjs'), '--family', 'open-tool', '--source-ref', source, '--product-version', '9.7.5'], { encoding: 'utf8' });
    assert.notEqual(mismatch.status, 0);
    assert.match(mismatch.stderr, /must match the included engine package version/u);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
