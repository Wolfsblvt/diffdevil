// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Shared fixtures for the analytical read service tests: revisions, merged-PR records, transitions, the Community service,
 * and the current-window and provider doubles. The Community tests (analytical-data.test.mjs) and the premium extension
 * tests (premium/tests) build on them; this module registers no test.
 */
import { analyzeDiff, compilePolicy, unwrap } from '@wolfsblvt/diffdevil';
import { createAnalyticalDataService, normalizeAnalyticalRecord } from './analytical-data.mjs';

export const base = 'a'.repeat(40), head = 'b'.repeat(40), other = 'c'.repeat(40);
export const from = '2026-09-01T00:00:00.000Z', to = '2026-10-01T00:00:00.000Z';
export const at = '2026-09-15T00:00:00.000Z';
export const patch = 'diff --git a/a.txt b/a.txt\n--- a/a.txt\n+++ b/a.txt\n@@ -1 +1 @@\n-old\n+new\n';
export const query = (surface, extra = {}) => ({ version: 1, surface, repositoryIds: [17], from, to, ...extra });
export const actor = { userId: 123, authorizedRepositoryIds: [17] };
export function record(number = 1, report = unwrap(analyzeDiff(patch, { source: { kind: 'github-api', comparison: 'direct', comparisonId: 'final', base, head } }))) {
  return normalizeAnalyticalRecord({ version: 1, repositoryId: 17, pullRequest: number, state: 'merged', openedAt: from, readyAt: from,
    mergedAt: at, closedAt: at, updatedAt: at, currentHead: other, revisions: [],
    final: report ? { base, head, observedAt: at, report,
      sizes: report.files.map(file => ({ path: file.path, before: 100, after: 100 })), basis: 'final-merged-comparison' } : null });
}
export function fixture(records = [record()], plan = 'pro', premium) {
  let accesses = true;
  const store = { analyticalRecords: async id => records.filter(row => row.repositoryId === id), analyticalSizes: async () => [] };
  const service = createAnalyticalDataService({ store, authorize: async () => accesses, namespace: async () => 9,
    currentPolicy: async () => ({ id: 'current', compiled: unwrap(compilePolicy({ version: 1, defaults: { paths: { exclude: ['a.txt'] } } })) }),
    entitlement: async () => plan, now: () => to, ...(premium ? { premium } : {}) });
  return { service, records, revoke: () => { accesses = false; } };
}

export const revisions = Array.from({ length: 6 }, (_, index) => String(index + 1).repeat(40));
export function transition(number, name, [before, after], mergedAt, { complete = true, oldPath } = {}) {
  const lines = oldPath ? `diff --git a/${oldPath} b/${name}\nsimilarity index 90%\nrename from ${oldPath}\nrename to ${name}\n--- a/${oldPath}\n+++ b/${name}\n@@ -1 +1 @@\n-old\n+new\n`
    : `diff --git a/${name} b/${name}\n--- a/${name}\n+++ b/${name}\n@@ -1 +1 @@\n-old\n+new\n`;
  const report = unwrap(analyzeDiff(lines, { fileSet: complete ? undefined : { complete: false, total: { status: 'unknown', lower: 1, reasons: [{ code: 'FILE_SET_INCOMPLETE' }] } },
    source: { kind: 'github-api', comparison: 'direct', comparisonId: `final:${before}:${after}`, base: before, head: after } }));
  return normalizeAnalyticalRecord({ version: 1, repositoryId: 17, pullRequest: number, state: 'merged', openedAt: '2026-08-01T00:00:00.000Z',
    mergedAt, closedAt: mergedAt, updatedAt: mergedAt, currentHead: after, revisions: [],
    final: { base: before, head: after, observedAt: mergedAt, report, sizes: [{ path: name, before: 100, after: 100 }], basis: 'final-merged-comparison' } });
}

// A default App window ends now, after the latest retained observation: r1 -a-> r2 -b-> r3 -a-> r4, captured at r4 on 09-25.
export function currentWindow() {
  const [r1, r2, r3, r4, r5] = revisions;
  const records = [transition(1, 'a.txt', [r1, r2], '2026-09-05T00:00:00.000Z'), transition(2, 'b.txt', [r2, r3], '2026-09-10T00:00:00.000Z'),
    transition(3, 'a.txt', [r3, r4], '2026-09-20T00:00:00.000Z')];
  const sizes = [{ repositoryId: 17, path: 'a.txt', revision: r1, observedAt: '2026-08-31T00:00:00.000Z', size: 100 },
    { repositoryId: 17, path: 'a.txt', revision: r4, observedAt: '2026-09-25T00:00:00.000Z', size: 100 }];
  return { r4, r5, records, sizes };
}
export function providerDouble({ heads, lines = 100, fail } = {}) {
  const calls = { repository: 0, branch: 0, contents: 0 };
  const client = {
    json: async route => {
      if (fail) throw fail;
      if (route.startsWith('/repositories/')) { calls.repository++; return { id: 17, full_name: 'owner/repo', default_branch: 'main' }; }
      calls.branch++;
      return { commit: { sha: heads[Math.min(calls.branch, heads.length) - 1] } };
    },
    request: async () => { calls.contents++; return { text: 'line\n'.repeat(lines) }; }
  };
  return { client, calls };
}
