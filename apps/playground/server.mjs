// SPDX-License-Identifier: AGPL-3.0-only

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { analyzePublicPullRequest, commonHeaders, handlePlaygroundRequest, parsePublicPullRequestUrl, projectPlaygroundReport, unexpectedServerFailureResponse, unsupportedMethodResponse } from './app.mjs';

const DEFAULT_PORT = 4173;
const DEFAULT_HOST = '127.0.0.1';
const PUBLIC_ASSETS = new Map([
  ['/', { file: new URL('./public/index.html', import.meta.url), type: 'text/html; charset=utf-8' }],
  ['/app.js', { file: new URL('./public/app.js', import.meta.url), type: 'text/javascript; charset=utf-8' }],
  ['/styles.css', { file: new URL('./public/styles.css', import.meta.url), type: 'text/css; charset=utf-8' }]
]);

function parsePositiveInteger(value, label) {
  if (!/^\d+$/u.test(value)) throw new Error(`${label} must be a positive integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${label} must be a positive safe integer.`);
  return parsed;
}

export { analyzePublicPullRequest, parsePublicPullRequestUrl, projectPlaygroundReport } from './app.mjs';

function send(response, status, contentType, body, method = 'GET', extraHeaders = {}) {
  const bytes = Buffer.from(body);
  response.writeHead(status, {
    ...commonHeaders(contentType),
    'content-length': String(bytes.byteLength),
    ...extraHeaders
  });
  if (method === 'HEAD') response.end();
  else response.end(bytes);
}

async function sendWebResponse(response, value) {
  const headers = Object.fromEntries(value.headers.entries());
  const body = value.body === null ? undefined : Buffer.from(await value.arrayBuffer());
  response.writeHead(value.status, headers);
  response.end(body);
}

function createAssetLoader(readAsset = readFile) {
  const cache = new Map();
  return async route => {
    const asset = PUBLIC_ASSETS.get(route);
    if (!asset) return undefined;
    let promise = cache.get(route);
    if (!promise) {
      promise = readAsset(asset.file).catch(error => {
        if (cache.get(route) === promise) cache.delete(route);
        throw error;
      });
      cache.set(route, promise);
    }
    return { body: await promise, type: asset.type };
  };
}

async function handleRequest(request, response, options) {
  const method = request.method ?? 'GET';
  const url = new URL(request.url ?? '/', 'http://diffdevil.local');
  if (method !== 'GET' && method !== 'HEAD') {
    await sendWebResponse(response, unsupportedMethodResponse(method));
    return;
  }
  const application = await handlePlaygroundRequest(new Request(url, { method, headers: request.headers }), options);
  if (application) {
    await sendWebResponse(response, application);
    return;
  }

  const asset = await options.loadAsset(url.pathname);
  if (asset) {
    send(response, 200, asset.type, asset.body, method, { 'cache-control': 'public, max-age=300' });
    return;
  }

  send(response, 404, 'application/json; charset=utf-8', JSON.stringify({ kind: 'diffdevil.playground-response', schemaVersion: '1.0', ok: false, status: 404, error: { code: 'E_NOT_FOUND', message: 'Not found.' } }), method, { 'cache-control': 'no-store' });
}

export function createPlaygroundServer(options = {}) {
  const requestOptions = { ...options, loadAsset: createAssetLoader(options.readAsset) };
  return createServer((request, response) => {
    void handleRequest(request, response, requestOptions).catch(error => {
      try { options.onError?.(error); } catch { /* Error reporting must not replace the original response boundary. */ }
      if (response.headersSent) {
        response.destroy(error instanceof Error ? error : undefined);
        return;
      }
      void sendWebResponse(response, unexpectedServerFailureResponse(request.method ?? 'GET'));
    });
  });
}

function parsePort(value) {
  try { return parsePositiveInteger(value, 'Port'); }
  catch (error) {
    console.error(error instanceof Error ? error.message : 'Invalid port.');
    process.exitCode = 2;
    return undefined;
  }
}

const main = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (main) {
  const host = process.env.DIFFDEVIL_PLAYGROUND_HOST ?? DEFAULT_HOST;
  const port = parsePort(process.env.DIFFDEVIL_PLAYGROUND_PORT ?? process.env.PORT ?? String(DEFAULT_PORT));
  if (port !== undefined) {
    const server = createPlaygroundServer({
      onError: error => console.error('diffdevil playground request failed:', error)
    });
    server.listen(port, host, () => {
      console.log(`diffdevil playground: http://${host}:${port}`);
      console.log('Public GitHub pull requests only. This server performs no provider writes.');
    });
  }
}
