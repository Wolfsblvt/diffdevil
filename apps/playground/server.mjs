// SPDX-License-Identifier: AGPL-3.0-only

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { GitHubClient, analyzeGitHub } from '../../dist/lib/index.js';

const DEFAULT_PORT = 4173;
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_FILE_LIMIT = 250;
const MAX_INPUT_LENGTH = 2048;
const PUBLIC_ASSETS = new Map([
  ['/', { file: new URL('./public/index.html', import.meta.url), type: 'text/html; charset=utf-8' }],
  ['/assets/app.js', { file: new URL('./public/app.js', import.meta.url), type: 'text/javascript; charset=utf-8' }],
  ['/assets/styles.css', { file: new URL('./public/styles.css', import.meta.url), type: 'text/css; charset=utf-8' }]
]);
const assetCache = new Map();

function parsePositiveInteger(value, label) {
  if (!/^\d+$/u.test(value)) throw new Error(`${label} must be a positive integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${label} must be a positive safe integer.`);
  return parsed;
}

export function parsePublicPullRequestUrl(input) {
  if (typeof input !== 'string') return { ok: false, message: 'Enter a GitHub pull-request URL.' };
  const value = input.trim();
  if (value.length === 0 || value.length > MAX_INPUT_LENGTH) return { ok: false, message: 'Enter one ordinary GitHub pull-request URL.' };

  let url;
  try { url = new URL(value); }
  catch { return { ok: false, message: 'The pull-request URL is not valid.' }; }

  if (url.protocol !== 'https:' || url.hostname.toLowerCase() !== 'github.com' || url.port || url.username || url.password) {
    return { ok: false, message: 'Only public https://github.com pull-request URLs are supported.' };
  }

  const match = /^\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9._-]+)\/pull\/([1-9]\d*)\/?$/u.exec(url.pathname);
  if (!match || match[2] === '.' || match[2] === '..') return { ok: false, message: 'Expected a URL shaped like https://github.com/owner/repository/pull/123.' };

  let pullRequest;
  try { pullRequest = parsePositiveInteger(match[3], 'Pull-request number'); }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : 'The pull-request number is invalid.' }; }

  const repository = `${match[1]}/${match[2]}`;
  return {
    ok: true,
    target: { repository, pullRequest },
    canonicalUrl: `https://github.com/${repository}/pull/${pullRequest}`
  };
}

function projectFile(file) {
  return {
    path: file.path,
    ...(file.oldPath === undefined ? {} : { oldPath: file.oldPath }),
    changeType: file.changeType,
    kind: file.kind,
    included: file.included,
    measurement: file.measurement,
    raw: file.raw,
    lines: file.lines
  };
}

export function projectPlaygroundReport(report, options = {}) {
  const maximumFiles = options.maximumFiles ?? DEFAULT_FILE_LIMIT;
  if (!Number.isSafeInteger(maximumFiles) || maximumFiles < 1) throw new Error('maximumFiles must be a positive safe integer.');
  const files = report.files.slice(0, maximumFiles).map(projectFile);
  return {
    kind: 'diffdevil.playground-analysis',
    schemaVersion: '1.0',
    semantics: report.semantics,
    source: report.source,
    reportId: report.reportId,
    measurement: report.measurement,
    fileSet: report.fileSet,
    totals: report.totals,
    files,
    filesOmitted: report.files.length - files.length
  };
}

function errorStatus(code) {
  if (code === 'E_INTERNAL' || code === 'E_CONFIG') return 500;
  if (code === 'E_SOURCE_STALE') return 409;
  if (code === 'E_LIMIT') return 413;
  if (code === 'E_GITHUB_PERMISSION') return 403;
  if (code === 'E_GITHUB_REQUEST' || code === 'E_GITHUB_AMBIGUOUS' || code === 'E_GITHUB_RESPONSE'
    || code === 'E_GITHUB_ROUTE' || code === 'E_GITHUB_PAGINATION' || code === 'E_PLAN_TARGET') return 502;
  return 422;
}

function publicAnalysisError(diagnostic) {
  if (diagnostic.code === 'E_INTERNAL') {
    return { code: 'E_INTERNAL', message: 'Analysis failed unexpectedly.' };
  }
  return { code: diagnostic.code, message: diagnostic.message };
}

export async function analyzePublicPullRequest(input, options = {}) {
  const parsed = parsePublicPullRequestUrl(input);
  if (!parsed.ok) return { ok: false, status: 400, error: { code: 'E_PLAYGROUND_URL', message: parsed.message } };

  const client = options.client ?? new GitHubClient({ readRetries: 1, timeoutMs: 15000 });
  const result = await analyzeGitHub(client, parsed.target);
  if (!result.ok) {
    const diagnostic = result.diagnostics[0] ?? { code: 'E_INTERNAL', message: 'Analysis failed without a diagnostic.' };
    return {
      ok: false,
      status: errorStatus(diagnostic.code),
      error: publicAnalysisError(diagnostic)
    };
  }

  return {
    ok: true,
    status: 200,
    canonicalUrl: parsed.canonicalUrl,
    analysis: projectPlaygroundReport(result.value, { maximumFiles: options.maximumFiles })
  };
}

function commonHeaders(contentType) {
  return {
    'content-type': contentType,
    'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY'
  };
}

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

function sendJson(response, status, value, method = 'GET') {
  send(response, status, 'application/json; charset=utf-8', JSON.stringify(value), method, { 'cache-control': 'no-store' });
}

async function loadAsset(route) {
  let promise = assetCache.get(route);
  if (!promise) {
    const asset = PUBLIC_ASSETS.get(route);
    if (!asset) return undefined;
    promise = readFile(asset.file);
    assetCache.set(route, promise);
  }
  const asset = PUBLIC_ASSETS.get(route);
  return asset ? { body: await promise, type: asset.type } : undefined;
}

async function handleRequest(request, response, options) {
  const method = request.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    sendJson(response, 405, { ok: false, error: { code: 'E_METHOD', message: 'Only GET and HEAD are supported.' } }, method);
    return;
  }

  const url = new URL(request.url ?? '/', 'http://diffdevil.local');
  if (url.pathname === '/health/ping') {
    sendJson(response, 200, { status: 'ok', service: 'diffdevil-playground' }, method);
    return;
  }

  if (url.pathname === '/api/analyze') {
    if (method === 'HEAD') {
      sendJson(response, 405, { ok: false, error: { code: 'E_METHOD', message: 'Analyze with GET.' } }, method);
      return;
    }
    const analyze = options.analyze ?? (value => analyzePublicPullRequest(value, {
      client: options.clientFactory?.() ?? new GitHubClient({ readRetries: 1, timeoutMs: 15000 }),
      maximumFiles: options.maximumFiles
    }));
    const result = await analyze(url.searchParams.get('url') ?? '');
    sendJson(response, result.status, result);
    return;
  }

  const asset = await loadAsset(url.pathname);
  if (asset) {
    send(response, 200, asset.type, asset.body, method, { 'cache-control': 'public, max-age=300' });
    return;
  }

  sendJson(response, 404, { ok: false, error: { code: 'E_NOT_FOUND', message: 'Not found.' } }, method);
}

export function createPlaygroundServer(options = {}) {
  return createServer((request, response) => {
    void handleRequest(request, response, options).catch(error => {
      try { options.onError?.(error); } catch { /* Error reporting must not replace the original response boundary. */ }
      if (response.headersSent) {
        response.destroy(error instanceof Error ? error : undefined);
        return;
      }
      sendJson(response, 500, {
        ok: false,
        error: { code: 'E_INTERNAL', message: 'Unexpected server failure.' }
      }, request.method ?? 'GET');
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
