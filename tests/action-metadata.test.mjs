import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDocument } from 'yaml';
import { ACTION_INPUTS, ENTRY_POINTS, inputNames, outputNames } from '../dist/lib/actions/surface.js';
import { readInputs } from '../dist/lib/actions/inputs.js';
const root = fileURLToPath(new URL('..', import.meta.url));
const catalog = JSON.parse(await readFile(resolve(root, 'spec/detail/v1/action-surface.json'), 'utf8'));
for (const entry of ENTRY_POINTS) test(`${entry} metadata declares precisely the supported inputs/outputs and a shipped Node 24 entry`, async () => {
  const path = resolve(root, entry === 'root' ? 'action.yml' : `${entry}/action.yml`);
  const yaml = parseDocument(await readFile(path, 'utf8'), { uniqueKeys: true }); assert.equal(yaml.errors.length, 0);
  const metadata = yaml.toJS();
  assert.equal(metadata.runs.using, 'node24'); assert.equal(metadata.runs.pre, undefined); assert.equal(metadata.runs.post, undefined);
  assert.ok((await readFile(resolve(dirname(path), metadata.runs.main))).length > 0);
  assert.deepEqual(Object.keys(metadata.inputs).sort(), inputNames(entry).sort());
  assert.deepEqual(Object.keys(metadata.outputs).sort(), [...outputNames(entry)].sort());
  assert.deepEqual(catalog.entryPointOutputs[entry], outputNames(entry));
  for (const [name, declaration] of Object.entries(metadata.inputs)) {
    assert.equal(typeof declaration.description, 'string'); assert.ok(declaration.description.length > 0);
    assert.deepEqual(declaration.default, ACTION_INPUTS[name].default);
    assert.ok(catalog.inputEntryPoints[name].includes(entry));
    assert.equal(readInputs(entry, { [`INPUT_${name.toUpperCase()}`]: 'example' })[name], 'example');
  }
  for (const name of Object.keys(ACTION_INPUTS).filter(name => !inputNames(entry).includes(name))) {
    assert.throws(() => readInputs(entry, { [`INPUT_${name.toUpperCase()}`]: 'example' }));
  }
});
test('numeric outputs have exact/status/bounds companions and the catalog has no undeclared input', () => {
  assert.deepEqual(catalog.inputs.sort(), Object.keys(ACTION_INPUTS).sort());
  for (const base of catalog.numericOutputBases) for (const suffix of ['', '-status', '-min', '-max']) assert.ok(outputNames('analyze').includes(base + suffix));
});
