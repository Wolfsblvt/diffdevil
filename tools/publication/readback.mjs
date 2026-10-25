// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Bounded public HTTP readback. Each check is one GET; only a check marked `settle` is repeated,
 * and only while it waits for a documented provider propagation. Results keep status, selected
 * headers and failure reasons — never response bodies, which can carry legal identity.
 */
import { createHash } from 'node:crypto';

const sleepFor = milliseconds => new Promise(done => setTimeout(done, milliseconds));

async function observe(check, fetch) {
  const response = await fetch(check.url, {
    redirect: 'manual',
    headers: { 'user-agent': 'diffdevil-publication-readback', ...(check.origin ? { origin: check.origin } : {}) },
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  const failures = [];
  const expect = check.expect;
  if (response.status !== expect.status) failures.push(`status ${response.status}, expected ${expect.status}`);
  if (expect.location !== undefined && response.headers.get('location') !== expect.location) {
    failures.push(`location ${response.headers.get('location') ?? 'absent'}, expected ${expect.location}`);
  }
  for (const [name, pattern] of Object.entries(expect.headers ?? {})) {
    const value = response.headers.get(name);
    if (value === null || !pattern.test(value)) failures.push(`header ${name} ${value === null ? 'absent' : `"${value}"`} does not match ${pattern}`);
  }
  for (const text of expect.contains ?? []) if (!bytes.includes(text)) failures.push(`body lacks the expected ${JSON.stringify(text)}`);
  if (expect.sha256 && createHash('sha256').update(bytes).digest('hex') !== expect.sha256) failures.push('body bytes differ from the publication receipt');
  if (expect.json) {
    try { failures.push(...expect.json(JSON.parse(bytes.toString('utf8')))); }
    catch (error) { failures.push(`body is not the expected JSON (${error.message})`); }
  }
  const headers = Object.fromEntries(['location', 'cache-control', 'x-robots-tag', 'access-control-allow-origin', 'content-type']
    .map(name => [name, response.headers.get(name)]).filter(([, value]) => value !== null));
  return { status: response.status, headers, failures };
}

/**
 * Run checks in order. `settle` checks retry up to `attempts` times, `delayMs` apart, while their
 * expectations are unmet; every other check runs once. Network errors count as a failed attempt.
 */
export async function readback(checks, { fetch = globalThis.fetch, attempts = 10, delayMs = 15_000, sleep = sleepFor } = {}) {
  const results = [];
  for (const check of checks) {
    const limit = check.settle ? attempts : 1;
    let result;
    for (let attempt = 1; attempt <= limit; attempt += 1) {
      try { result = await observe(check, fetch); }
      catch (error) { result = { status: null, headers: {}, failures: [`request failed: ${error.cause?.code ?? error.message}`] }; }
      result.attempts = attempt;
      if (result.failures.length === 0 || attempt === limit) break;
      await sleep(delayMs);
    }
    results.push({ name: check.name, url: check.url, ok: result.failures.length === 0, ...result });
  }
  return results;
}

export function summarize(results) {
  return results.map(result => `${result.ok ? 'ok  ' : 'FAIL'} ${result.name}: ${result.url} -> ${result.status ?? 'no response'}` +
    (result.attempts > 1 ? ` after ${result.attempts} attempts` : '') +
    (result.ok ? '' : ` (${result.failures.join('; ')})`)).join('\n');
}
