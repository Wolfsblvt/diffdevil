import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GitHubClient, GitHubRequestError } from '../../../dist/lib/github/client.js';
import { json } from './helpers/github.mjs';

function rejectedCleanup(status) {
  return { status, headers: new Headers(), body: { cancel: async () => { throw Error('fixture cleanup failure'); } } };
}

test('GitHub client uses the configured Enterprise root and does not follow redirects', async () => {
  let observed;
  const client = new GitHubClient({ apiUrl: 'https://git.example/api/v3', token: 'fixture-token', readRetries: 0,
    fetch: async (url, init) => { observed = { url: String(url), init }; return json({}, 302, { location: 'https://untrusted.example/' }); } });
  await assert.rejects(client.json('/repos/test/repo/pulls/1'), GitHubRequestError);
  assert.equal(observed.url, 'https://git.example/api/v3/repos/test/repo/pulls/1');
  assert.equal(observed.init.redirect, 'manual');
  assert.equal(observed.init.headers['x-github-api-version'], '2026-03-10');
  assert.throws(() => client.url('/../escape'), /escaped/);
});
test('GitHub client binds only the default platform fetch receiver', async () => {
  const originalFetch = globalThis.fetch;
  let defaultReceiver;
  Object.defineProperty(globalThis, 'fetch', {
    configurable: true,
    writable: true,
    value: async function () {
      defaultReceiver = this;
      return json({ defaultFetch: true });
    }
  });
  try {
    const client = new GitHubClient({ readRetries: 0 });
    assert.deepEqual(await client.json('/repos/test/repo'), { defaultFetch: true });
    assert.equal(defaultReceiver, globalThis);
  } finally {
    Object.defineProperty(globalThis, 'fetch', { configurable: true, writable: true, value: originalFetch });
  }

  let injectedReceiver;
  const client = new GitHubClient({
    readRetries: 0,
    fetch: async function () {
      injectedReceiver = this;
      return json({ injectedFetch: true });
    }
  });
  assert.deepEqual(await client.json('/repos/test/repo'), { injectedFetch: true });
  assert.equal(injectedReceiver, client);
});
test('GitHub client refuses cross-origin and changed-endpoint pagination before another credentialed request', async () => {
  for (const url of ['https://untrusted.example/repos/test/repo/labels?page=2', 'https://api.github.com/repos/other/repo/labels?page=2']) {
    let calls = 0;
    const client = new GitHubClient({ fetch: async () => { calls++; return json([], 200, { link: `<${url}>; rel="next"` }); } });
    await assert.rejects(client.list('/repos/test/repo/labels'), /escaped/);
    assert.equal(calls, 1);
  }
});
test('GitHub client detects repeated pagination links', async () => {
  const client = new GitHubClient({ fetch: async () => json([], 200, { link: '<https://api.github.com/repos/test/repo/labels>; rel="next"' }) });
  await assert.rejects(client.list('/repos/test/repo/labels'), /repeated/);
});
test('GitHub client honors server delays and does not retry permission denials', async () => {
  const delays = []; let calls = 0;
  const client = new GitHubClient({ sleep: async ms => { delays.push(ms); }, fetch: async () => ++calls === 1 ? json({}, 429, { 'retry-after': '2' }) : json({ recovered: true }) });
  assert.deepEqual(await client.json('/repos/test/repo'), { recovered: true }); assert.deepEqual(delays, [2000]);
  const denied = new GitHubClient({ fetch: async () => { calls++; return json({ message: 'fixture-token' }, 403); } });
  const before = calls;
  await assert.rejects(denied.json('/repos/test/repo'), e => e.diagnostic.code === 'E_GITHUB_PERMISSION' && !e.message.includes('fixture-token'));
  assert.equal(calls, before + 1);
});
test('GitHub client retries a read when response cleanup fails', async () => {
  const delays = []; let calls = 0;
  const client = new GitHubClient({ readRetries: 1, sleep: async ms => { delays.push(ms); }, fetch: async () => ++calls === 1 ? rejectedCleanup(502) : json({ recovered: true }) });
  assert.deepEqual(await client.json('/repos/test/repo'), { recovered: true });
  assert.deepEqual(delays, [1000]);
  assert.equal(calls, 2);
});
test('GitHub client preserves a typed HTTP error when response cleanup fails', async () => {
  const client = new GitHubClient({ readRetries: 0, fetch: async () => rejectedCleanup(404) });
  await assert.rejects(client.json('/repos/test/repo'), error => error instanceof GitHubRequestError && error.status === 404 && error.diagnostic.code === 'E_GITHUB_REQUEST');
});
test('GitHub client distinguishes write rate limits from permission denials', async () => {
  const client = new GitHubClient({ readRetries: 0, fetch: async () => json({}, 403, { 'retry-after': '2' }) });
  await assert.rejects(
    client.json('/repos/test/repo/issues/1/labels', { method: 'POST', body: { labels: ['test'] }, phase: 'apply' }),
    error => error.diagnostic.code === 'E_GITHUB_RATE_LIMIT' && /rate limited/u.test(error.message) && !/permission/u.test(error.message)
  );
});
test('GitHub client refuses provider retry delays beyond its operating budget', async () => {
  let slept = false;
  const client = new GitHubClient({ sleep: async () => { slept = true; }, fetch: async () => json({}, 429, { 'retry-after': '301' }) });
  await assert.rejects(client.json('/repos/test/repo'), error => error.diagnostic.code === 'E_GITHUB_RATE_LIMIT' && /five-minute/u.test(error.message));
  assert.equal(slept, false);
});
test('GitHub client never blindly repeats a possibly completed POST', async () => {
  let calls = 0;
  const client = new GitHubClient({ fetch: async () => { calls++; throw Error('fixture-token'); } });
  await assert.rejects(client.json('/repos/test/repo/issues/1/comments', { method: 'POST', body: { body: 'text' }, phase: 'apply' }), e => e.ambiguous && !e.message.includes('fixture-token'));
  assert.equal(calls, 1);
});
test('GitHub client enforces streaming and aggregate response byte budgets', async () => {
  const client = new GitHubClient({ responseBytes: 20, fetch: async () => new Response('x'.repeat(30)) });
  await assert.rejects(client.request('/repos/test/repo'), /budget/);
  let calls = 0;
  const pages = new GitHubClient({ responseBytes: 20, fetch: async () => json(['1234567890'], 200, ++calls === 1 ? { link: '<https://api.github.com/repos/test/repo/labels?page=2>; rel="next"' } : {}) });
  await assert.rejects(pages.list('/repos/test/repo/labels'), /collection/);
});
test('GitHub client rejects invalid configuration and malformed JSON without provider-body leaks', async () => {
  assert.throws(() => new GitHubClient({ apiUrl: 'http://plain.example/' }), /HTTPS/);
  assert.throws(() => new GitHubClient({ token: 'bad\nheader' }), /header/);
  const client = new GitHubClient({ fetch: async () => new Response('not-json fixture-token') });
  await assert.rejects(client.json('/repos/test/repo'), e => e.message.includes('malformed JSON') && !e.message.includes('fixture-token'));
});
