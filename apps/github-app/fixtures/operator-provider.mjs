// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Disposable synthetic provider for the real operator CLI. Never use with real credentials. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const configPath = args[args.indexOf('--config') + 1];
const directory = dirname(configPath);
const config = JSON.parse(await readFile(configPath, 'utf8'));
const options = JSON.parse(await readFile(join(directory, 'fixture-options.json'), 'utf8'));
const statePath = join(directory, 'fixture-state.json');
const state = await readFile(statePath, 'utf8').then(JSON.parse, () => ({ created: false, writes: 0, calls: [] }));
state.calls.push(args);
assert.equal(process.env.WRANGLER_WRITE_LOGS, 'false');
assert.equal(process.env.WRANGLER_SEND_METRICS, 'false');
assert.equal(process.env.WRANGLER_LOG, args.includes('--json') ? 'log' : 'error');
assert.equal(process.env.CLOUDFLARE_ENV, undefined);
assert.equal(process.env.CLOUDFLARE_ACCOUNT_ID, config.account_id);
for (const name of options.absentEnvironmentNames ?? []) assert.equal(process.env[name], undefined);
let result;
let exitCode = 0;
if (args.includes('whoami')) result = { accounts: [{ id: config.account_id }] };
else {
  assert.equal(args[args.indexOf('--name') + 1], config.name);
  if (args.includes('deployments')) result = [
    { id: 'older-deployment', versions: [{ version_id: 'older-version', percentage: 100 }] },
    { id: options.changedDeployment && state.created ? 'changed-deployment' : 'active-deployment', versions: [{ version_id: 'version-before', percentage: 100 }] }
  ];
  else if (args.includes('list')) {
    result = [{ id: 'older-version' }, { id: 'version-before' }, ...(state.created ? [{ id: 'version-created' }] : [])];
    if (state.created && options.omitReadback) exitCode = 1;
  } else if (args.includes('view')) result = { id: args[args.indexOf('view') + 1], resources: { bindings: [{ name: 'APP_DB', type: 'd1', id: options.foreignDatabase ? 'abcdefab-abcd-abcd-abcd-abcdefabcdef' : config.d1_databases[0].database_id }, ...(config.vars?.GITHUB_APP_BOT_LOGIN ? [{ name: 'GITHUB_APP_BOT_LOGIN', type: 'plain_text', text: config.vars.GITHUB_APP_BOT_LOGIN }] : []), ...(state.inputs ?? options.existingInputs ?? []).map(name => ({ name, type: 'secret_text' }))] } };
  else if (args.includes('bulk')) {
    const chunks = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    const input = Buffer.concat(chunks).toString('utf8');
    const values = JSON.parse(input);
    state.inputs = Object.keys(values);
    state.deliveryHash = createHash('sha256').update(JSON.stringify(values)).digest('hex');
    state.writes += 1;
    state.created = !options.failWrite;
    exitCode = options.failWrite ? 1 : 0;
    // Unsafe positive control: the real parent must contain both these streams.
    process.stdout.write(input);
    process.stderr.write(input);
    result = undefined;
    const receipts = await Promise.all((await readdir(directory)).filter(name => name.endsWith('receipt.json')).map(async name => JSON.parse(await readFile(join(directory, name), 'utf8'))));
    const receipt = receipts.find(candidate => candidate.command === 'attempted-unknown');
    assert.ok(receipt);
    assert.equal(receipt.inputs.length, state.inputs.length);
  }
}
await writeFile(statePath, JSON.stringify(state));
if (result !== undefined) process.stdout.write(JSON.stringify(result));
process.exitCode = exitCode;
