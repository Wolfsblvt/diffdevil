// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Private child of manifest-helper. Its raw stdout must only reach the contained process runner. */
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
try {
  const { code, fixtureOrigin } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  const origin = fixtureOrigin ?? 'https://api.github.com';
  if (fixtureOrigin && !/^http:\/\/127\.0\.0\.1:\d+$/u.test(fixtureOrigin)) throw new Error();
  if (typeof code !== 'string' || !/^[A-Za-z0-9_-]+$/u.test(code)) throw new Error();
  const response = await fetch(`${origin}/app-manifests/${code}/conversions`, {
    method: 'POST', redirect: 'error',
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', 'User-Agent': 'diffdevil-manifest-operator' }
  });
  // Include even an invalid/error response for encrypted preservation before interpretation.
  const body = await response.text();
  // Synthetic unsafe positive control: the parent must contain both native streams.
  if (fixtureOrigin) process.stderr.write(body);
  process.stdout.write(JSON.stringify({ status: response.status, body }));
} catch { process.exitCode = 2; }
