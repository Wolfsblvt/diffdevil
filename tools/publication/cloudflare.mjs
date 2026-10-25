// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The two provider routes the controllers use: the locked repository Wrangler, read through
 * its machine output file, and the Cloudflare v4 API for Pages state Wrangler does not expose.
 * Credentials come only from the calling step's environment and are never echoed.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const API = 'https://api.cloudflare.com/client/v4';

export function credentials(env = process.env) {
  const token = env.CLOUDFLARE_API_TOKEN ?? '';
  const account = env.CLOUDFLARE_ACCOUNT_ID ?? '';
  if (!token.trim() || !/^[0-9a-f]{32}$/u.test(account.trim())) {
    throw new Error('This step needs CLOUDFLARE_API_TOKEN and a 32-character CLOUDFLARE_ACCOUNT_ID from the production environment.');
  }
  return { token: token.trim(), account: account.trim() };
}

/**
 * Run the locked Wrangler and return its machine-readable entries. A non-zero exit throws after
 * the CLI has printed its own diagnostics; the entries it wrote first stay attached to the error.
 */
export function wrangler(args, { env = process.env, cwd = process.cwd(), spawn = spawnSync } = {}) {
  const cli = resolve(cwd, 'node_modules/wrangler/bin/wrangler.js');
  if (spawn === spawnSync && !existsSync(cli)) throw new Error('The locked Wrangler is not installed; run npm ci first.');
  const directory = mkdtempSync(join(tmpdir(), 'diffdevil-wrangler-'));
  const output = join(directory, 'output.json');
  try {
    const result = spawn(process.execPath, [cli, ...args], {
      cwd, stdio: ['ignore', 'inherit', 'inherit'], windowsHide: true,
      env: { ...env, WRANGLER_SEND_METRICS: 'false', WRANGLER_OUTPUT_FILE_PATH: output, CI: 'true' },
    });
    const entries = existsSync(output)
      ? readFileSync(output, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line))
      : [];
    if (result.error || result.status !== 0) {
      const error = new Error(`wrangler ${args[0]} ${args[1] ?? ''} failed (${result.error?.message ?? `exit ${result.status}`}).`);
      error.entries = entries;
      throw error;
    }
    return entries;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

/** The single entry of one type that a Wrangler command must have written. */
export function entry(entries, type) {
  const found = entries.filter(item => item.type === type);
  if (found.length !== 1) throw new Error(`Wrangler reported ${found.length} "${type}" results instead of one.`);
  return found[0];
}

/** One Cloudflare API call. The response body is returned; failures carry only Cloudflare's error codes. */
export async function api(method, path, { env = process.env, fetch = globalThis.fetch, body } = {}) {
  const { token, account } = credentials(env);
  const response = await fetch(`${API}/accounts/${account}${path}`, {
    method,
    headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let payload;
  try { payload = await response.json(); } catch { payload = undefined; }
  if (!response.ok || payload?.success !== true) {
    const codes = (payload?.errors ?? []).map(error => `${error.code}: ${error.message}`).join('; ') || 'no error detail';
    throw new Error(`Cloudflare ${method} ${path} returned HTTP ${response.status} (${codes}).`);
  }
  return payload.result;
}
