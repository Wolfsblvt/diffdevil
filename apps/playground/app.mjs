// SPDX-License-Identifier: AGPL-3.0-only

import { GitHubClient, analyzeGitHub } from '../../dist/lib/index.js';
import { readPullSnapshot } from '../../dist/lib/github/index.js';

const DEFAULT_FILE_LIMIT = 250;
/** A complete report is returned for browser-side replay; beyond this many files the route refuses instead of truncating. */
const DEFAULT_REPORT_FILE_LIMIT = 2000;
const MAX_INPUT_LENGTH = 2048;
const RESPONSE_KIND = 'diffdevil.playground-response';
const RESPONSE_VERSION = '1.0';

function parsePositiveInteger(value, label) {
  if (!/^\d+$/u.test(value)) throw new Error(`${label} must be a positive integer.`);
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new Error(`${label} must be a positive safe integer.`);
  return parsed;
}

function playgroundError(status, code, message) {
  return { kind: RESPONSE_KIND, schemaVersion: RESPONSE_VERSION, ok: false, status, error: { code, message } };
}

export function unexpectedServerFailureResponse(method = 'GET') {
  return jsonResponse(500, playgroundError(500, 'E_INTERNAL', 'Unexpected server failure.'), method);
}

export function unsupportedMethodResponse(method = 'GET') {
  return jsonResponse(405, playgroundError(405, 'E_METHOD', 'Only GET and HEAD are supported.'), method);
}

function playgroundSuccess(canonicalUrl, analysis) {
  return { kind: RESPONSE_KIND, schemaVersion: RESPONSE_VERSION, ok: true, status: 200, canonicalUrl, analysis };
}
function replaySuccess(canonicalUrl, report) {
  return { kind: RESPONSE_KIND, schemaVersion: RESPONSE_VERSION, ok: true, status: 200, canonicalUrl, report };
}
function headSuccess(canonicalUrl, snapshot) {
  return { kind: RESPONSE_KIND, schemaVersion: RESPONSE_VERSION, ok: true, status: 200, canonicalUrl, head: { head: snapshot.head, base: snapshot.base, state: snapshot.state, changedFiles: snapshot.changedFiles } };
}

function createPublicGitHubClient() {
  return new GitHubClient({ readRetries: 1, timeoutMs: 15000 });
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
    schemaVersion: RESPONSE_VERSION,
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
  if (code === 'E_GITHUB_RATE_LIMIT') return 429;
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
  if (!parsed.ok) return playgroundError(400, 'E_PLAYGROUND_URL', parsed.message);

  const client = options.client ?? createPublicGitHubClient();
  const result = await analyzeGitHub(client, parsed.target);
  if (!result.ok) {
    const diagnostic = result.diagnostics[0] ?? { code: 'E_INTERNAL', message: 'Analysis failed without a diagnostic.' };
    const error = publicAnalysisError(diagnostic);
    return playgroundError(errorStatus(diagnostic.code), error.code, error.message);
  }

  return playgroundSuccess(parsed.canonicalUrl, projectPlaygroundReport(result.value, { maximumFiles: options.maximumFiles }));
}

/**
 * The complete engine report for one public pull request. The website playground
 * re-evaluates policy edits against it locally through the same engine, so nothing
 * is refetched when a threshold or exclusion changes. Same trust boundary as analyze:
 * public reads, no writes, no visitor credential.
 */
export async function replayPublicPullRequest(input, options = {}) {
  const parsed = parsePublicPullRequestUrl(input);
  if (!parsed.ok) return playgroundError(400, 'E_PLAYGROUND_URL', parsed.message);
  const limit = options.maximumReportFiles ?? DEFAULT_REPORT_FILE_LIMIT;
  const client = options.client ?? createPublicGitHubClient();
  const result = await analyzeGitHub(client, parsed.target);
  if (!result.ok) {
    const diagnostic = result.diagnostics[0] ?? { code: 'E_INTERNAL', message: 'Analysis failed without a diagnostic.' };
    const error = publicAnalysisError(diagnostic);
    return playgroundError(errorStatus(diagnostic.code), error.code, error.message);
  }
  if (result.value.files.length > limit) {
    return playgroundError(413, 'E_LIMIT', `The pull request has ${result.value.files.length} changed files; the playground replays at most ${limit}. Analyze it locally with the CLI.`);
  }
  return replaySuccess(parsed.canonicalUrl, result.value);
}

/** Current head/base of a public pull request; one request, no diff acquisition. */
export async function readPublicPullRequestHead(input, options = {}) {
  const parsed = parsePublicPullRequestUrl(input);
  if (!parsed.ok) return playgroundError(400, 'E_PLAYGROUND_URL', parsed.message);
  const client = options.client ?? createPublicGitHubClient();
  try {
    return headSuccess(parsed.canonicalUrl, await readPullSnapshot(client, parsed.target));
  } catch (error) {
    const code = typeof error?.code === 'string' ? error.code : error?.status === 404 ? 'E_GITHUB_REQUEST' : 'E_INTERNAL';
    const diagnostic = code === 'E_INTERNAL' ? { code, message: 'Analysis failed unexpectedly.' } : { code, message: typeof error?.message === 'string' ? error.message : 'GitHub did not answer.' };
    return playgroundError(errorStatus(code), diagnostic.code, diagnostic.message);
  }
}

export function commonHeaders(contentType) {
  return {
    'content-type': contentType,
    'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'",
    'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
    'referrer-policy': 'no-referrer',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY'
  };
}

export function jsonResponse(status, value, method = 'GET') {
  const body = JSON.stringify(value);
  const headers = new Headers({
    ...commonHeaders('application/json; charset=utf-8'),
    'cache-control': 'no-store',
    // Public read-only JSON; the static website is served from another origin.
    'access-control-allow-origin': '*',
    'content-length': String(new TextEncoder().encode(body).byteLength)
  });
  return new Response(method === 'HEAD' ? null : body, { status, headers });
}

/** Handles the shared public API and health contract; callers own static-asset fallback. */
export async function handlePlaygroundRequest(request, options = {}) {
  const method = request.method;
  if (method !== 'GET' && method !== 'HEAD') return unsupportedMethodResponse(method);

  const url = new URL(request.url);
  if (url.pathname === '/health/ping') {
    return jsonResponse(200, { status: 'ok', service: 'diffdevil-playground' }, method);
  }

  if (url.pathname === '/api/analyze') {
    if (method === 'HEAD') {
      return jsonResponse(405, playgroundError(405, 'E_METHOD', 'Analyze with GET.'), method);
    }
    const analyze = options.analyze ?? (value => analyzePublicPullRequest(value, {
      client: options.clientFactory?.() ?? createPublicGitHubClient(),
      maximumFiles: options.maximumFiles
    }));
    const result = await analyze(url.searchParams.get('url') ?? '');
    return jsonResponse(result.status, result, method);
  }

  if (url.pathname === '/api/report' || url.pathname === '/api/head') {
    if (method === 'HEAD') {
      return jsonResponse(405, playgroundError(405, 'E_METHOD', 'Request with GET.'), method);
    }
    const client = options.clientFactory?.() ?? createPublicGitHubClient();
    const value = url.searchParams.get('url') ?? '';
    const result = url.pathname === '/api/report'
      ? await (options.replay ?? (input => replayPublicPullRequest(input, { client, maximumReportFiles: options.maximumReportFiles })))(value)
      : await (options.head ?? (input => readPublicPullRequestHead(input, { client })))(value);
    return jsonResponse(result.status, result, method);
  }

  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/health/')) {
    return jsonResponse(404, playgroundError(404, 'E_NOT_FOUND', 'Not found.'), method);
  }
  return undefined;
}
