// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Local common-read CPU/retention specimen. Native D1, provider wait, HTML and private work are separate boundaries. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { compilePolicy, unwrap } from '../../../dist/lib/index.js';
import { createAnalytics } from '../src/lib/analytics.mjs';
import { createAnalyticalCache } from '../../github-app/analytical-cache.mjs';
import { loadingScale, LOADING_SCALE } from './loading-scale.mjs';

const now = '2026-10-23T00:00:00.000Z';
const rows = loadingScale(1001, now).records.map(record => JSON.stringify(record));
assert.equal(rows.reduce((total, row) => total + Buffer.byteLength(row), 0), LOADING_SCALE.recordBytes);
const policy = { compiled: unwrap(compilePolicy({ version: 1, presets: ['size@1'], defaults: { paths: { exclude: ['**/file-0001.ts'] } } })) };
const actor = { authorizedRepositoryIds: [1001] };
const answers = new Map(), measurements = [], retention = [];
for (const mode of ['uncached', 'shared']) {
  const cache = mode === 'shared' ? createAnalyticalCache() : undefined;
  for (const surface of ['overview', 'prs', 'history', 'pr']) {
    for (let iteration = 0; iteration < 4; iteration++) {
      let readMs = 0;
      // A fresh composition and freshly deserialized records on every request, as in the App.
      const analytics = createAnalytics({ interpretationCache: cache,
        appStore: { analyticalRecords: async () => {
          const start = performance.now(), records = rows.map(row => JSON.parse(row));
          readMs += performance.now() - start;
          return records;
        } },
        entitlement: { planOfRepository: async () => 'free' }, namespaceOf: async () => 9,
        policies: { current: async () => policy }, now: () => now });
      const query = { surface, repositoryIds: [1001], scope: { kind: 'repository', repositoryId: 1001 },
        from: '2026-09-23T00:00:00.000Z', to: now, ...(surface === 'pr' ? { pullRequest: 452 } : {}) };
      const start = performance.now(), cpu = process.cpuUsage();
      const response = await analytics.query(query, actor);
      const used = process.cpuUsage(cpu), wallMs = performance.now() - start;
      const hash = createHash('sha256').update(JSON.stringify(response)).digest('hex');
      if (answers.has(surface)) assert.equal(hash, answers.get(surface), 'reusing work must preserve the complete answer');
      answers.set(surface, hash);
      assert.equal(response.coverage.merged, 107);
      assert.equal(response.coverage.recoveredMerged, 101);
      measurements.push({ mode, surface, iteration, wallMs, cpuMs: (used.user + used.system) / 1000, readMs, answerHash: hash });
    }
  }
  if (cache) {
    const usage = { mode, ...cache.usage() };
    if (global.gc) {
      global.gc(); usage.populatedHeapBytes = process.memoryUsage().heapUsed;
      cache.clear(); global.gc(); usage.clearedHeapBytes = process.memoryUsage().heapUsed;
      usage.retainedIncreaseBytes = usage.populatedHeapBytes - usage.clearedHeapBytes;
    }
    retention.push(usage);
  }
}
const summary = [...new Set(measurements.map(row => `${row.mode}:${row.surface}`))].map(key => {
  const [mode, surface] = key.split(':'), values = measurements.filter(row => row.mode === mode && row.surface === surface);
  const median = name => values.slice(1).map(row => row[name]).sort((a, b) => a - b)[1];
  return { mode, surface, firstWallMs: values[0].wallMs, medianWallMs: median('wallMs'), medianCpuMs: median('cpuMs'), medianReadMs: median('readMs') };
});
const output = resolve('artifacts/app/qa/analytical-read-profile');
await mkdir(output, { recursive: true });
await writeFile(resolve(output, 'results.json'), JSON.stringify({ node: process.version, scale: LOADING_SCALE, summary, measurements, retention }, null, 2));
console.log(JSON.stringify({ output, summary, retention }, null, 2));
