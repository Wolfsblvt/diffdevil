// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { Miniflare } from 'miniflare';

test('a new Worker request can read context after an earlier request ends with a pending read', { timeout: 30_000 }, async () => {
  let held, ready;
  const server = createServer((request, response) => {
    if (request.url === '/held') { held = response; ready?.end('ready'); return; }
    if (request.url === '/ready' && !held) { ready = response; return; }
    response.end('current');
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  const modules = {};
  for (const name of ['viewer', 'entitlement']) modules[`${name}.mjs`] = { type: 'esm', contents: await readFile(new URL(`../src/lib/${name}.mjs`, import.meta.url), 'utf8') };
  modules['worker.mjs'] = { type: 'esm', contents: `
    import { createContextCache } from './viewer.mjs';
    const cache = createContextCache();
    export default { async fetch(request) {
      if (new URL(request.url).pathname === '/leave') {
        cache.get('profile:123', async () => (await fetch('${origin}/held')).text()).catch(() => {});
        // Establish real I/O in this request before ending it, as navigation can do.
        await fetch('${origin}/ready');
        return new Response('left');
      }
      return new Response(await cache.get('profile:123', async () => (await fetch('${origin}/fresh')).text()));
    } };
  ` };
  const worker = new Miniflare({ workers: [{ config: { name: 'context-cache', compatibilityDate: '2026-09-17',
    manifest: { mainModule: 'worker.mjs', modulesRoot: resolve('.'), modules } } }] });
  try {
    assert.equal(await (await worker.dispatchFetch('http://app.test/leave')).text(), 'left');
    assert.ok(held, 'the abandoned request reached its provider');
    let deadline;
    const response = await Promise.race([worker.dispatchFetch('http://app.test/manage'), new Promise((_, reject) => {
      deadline = setTimeout(() => reject(new Error('the next request inherited an unresolved provider read')), 10_000);
    })]).finally(() => clearTimeout(deadline));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'current');
  } finally {
    held?.end('old');
    await worker.dispose();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
