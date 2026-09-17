import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const [command, ...args] = process.argv.slice(2);
if (command !== 'dev' && command !== 'deploy') {
  console.error('Expected a supported Wrangler command: dev or deploy.');
  process.exit(2);
}

const cli = resolve('node_modules/wrangler/bin/wrangler.js');
if (!existsSync(cli)) {
  console.error('Wrangler is not installed. Restore the declared development dependencies first.');
  process.exit(2);
}

const result = spawnSync(process.execPath, [cli, command, ...args], {
  stdio: 'inherit',
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  windowsHide: true
});
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 2);
