// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Anonymous dimensional specimen. Counts/byte envelope match the observed cohort; names, timing and sizes are synthetic. */
import { createHash } from 'node:crypto';
import { normalizeAnalyticalRecord } from '../../github-app/analytical-data.mjs';
import { NOW, seedStore, comparisonReport } from './fixture.mjs';

const DAY = 86_400_000;
const sha = number => number.toString(16).padStart(40, '0');
const paths = Array.from({ length: 915 }, (_, index) => index === 0 ? 'src/index.ts' : `src/fixture/file-${String(index).padStart(4, '0')}.ts`);
export const LOADING_SCALE = Object.freeze({ records: 142, recordBytes: 2_720_912, largestRecordBytes: 213_129,
  revisions: 137, revisionFiles: 1113, finals: 101, finalFiles: 1823, merged: 107,
  observations: 256_986, paths: 915, mostObservationsPerPath: 363, factSets: 265, markers: 7563 });

export function loadingScale(repositoryId = 1001, now = NOW) {
  const at = days => new Date(Date.parse(now) - days * DAY).toISOString();
  let revisionCursor = 0, finalCursor = 0;
  const report = (count, offset, base, head) => comparisonReport(Array.from({ length: count }, (_, index) => ({
    path: paths[(offset + index) % paths.length], modified: 2, added: 1, deleted: 0
  })), { base, head, comparisonId: 'anonymous-loading-specimen' });
  const records = Array.from({ length: 142 }, (_, index) => {
    const merged = index < 107, base = sha(index + 1), head = sha(index + 2);
    const mergedAgeDays = index === 0 ? 2 : 20 - index / 10;
    const revisions = index < 137 ? (() => { const count = index < 17 ? 9 : 8, offset = revisionCursor; revisionCursor += count;
      return [{ base, head, observedAt: at(25 - index / 10), report: report(count, offset, base, head), originalPolicyId: null, originalBand: null, sizes: [] }]; })() : [];
    const final = index < 101 ? (() => { const count = index < 5 ? 19 : 18, offset = finalCursor; finalCursor += count;
      return { base, head, observedAt: at(mergedAgeDays), report: report(count, offset, base, head), sizes: [], basis: 'final-merged-comparison' }; })() : null;
    return normalizeAnalyticalRecord({ version: 1, repositoryId, pullRequest: index === 0 ? 452 : 5000 + index,
      state: merged ? 'merged' : index < 137 ? 'open' : 'draft', openedAt: at(29), readyAt: at(28),
      mergedAt: merged ? at(mergedAgeDays) : null, closedAt: null, updatedAt: at(1), observedAt: at(1), currentHead: head, revisions, final });
  });
  const bytes = record => Buffer.byteLength(JSON.stringify(record));
  // Padding is inert comparison identity, not extra files or invented measurements. It models
  // the measured JSON envelope without pretending the unavailable source distribution is known.
  records[0].revisions[0].report.source.comparisonId += 'x'.repeat(LOADING_SCALE.largestRecordBytes - bytes(records[0]));
  let remaining = LOADING_SCALE.recordBytes - records.reduce((total, record) => total + bytes(record), 0);
  for (let index = 1; index < 137 && remaining > 0; index++) {
    const amount = Math.min(remaining, Math.ceil(remaining / (137 - index)));
    records[index].revisions[0].report.source.comparisonId += 'x'.repeat(amount); remaining -= amount;
  }
  if (remaining !== 0 || Math.max(...records.map(bytes)) !== LOADING_SCALE.largestRecordBytes) throw new Error(`Loading specimen byte envelope does not match: remaining=${remaining}, largest=${Math.max(...records.map(bytes))}.`);

  const factSets = [], markers = [];
  let pathOffset = 0;
  for (let group = 0; group < 27; group++) {
    const width = group < 24 ? 34 : 33;
    const count = group === 0 ? 363 : group < 24 ? 306 + (group <= 6 ? 1 : 0) : 52;
    const versions = group < 24 ? 10 : group === 26 ? 9 : 8;
    const keys = [];
    for (let version = 0; version < versions; version++) {
      const facts = paths.slice(pathOffset, pathOffset + width).map((path, index) => ({ path, size: index % 31 === 0 ? null : index % 29 === 0 ? 0 : 100 + index + version }));
      const json = JSON.stringify(facts), key = createHash('sha256').update(json).digest('hex');
      factSets.push({ key, json }); keys.push(key);
    }
    for (let index = 0; index < count; index++) markers.push({ key: keys[index % versions], observedAt: at(29 - 28.9 * index / (count - 1) - group / 100_000), revision: sha(group * 1000 + index + 1) });
    pathOffset += width;
  }
  return { records, factSets, markers };
}

/** Only the disposable local QA D1: ordinary base state plus the anonymous measured-scale repository. */
export async function seedLoadingScale(store, clock, { now = NOW } = {}) {
  const written = await seedStore(store, clock);
  const specimen = loadingScale(1001, now);
  const statements = [store.statement('DELETE FROM analytical_pull_requests WHERE repository_id=1001'),
    store.statement('DELETE FROM analytical_size_observations WHERE repository_id=1001'), store.statement('DELETE FROM analytical_size_facts WHERE repository_id=1001')];
  await store.database.batch(statements);
  for (const record of specimen.records) {
    clock.value = record.observedAt;
    if ((await store.recordAnalytical(record)).status !== 'published') throw new Error('Anonymous loading record was not published.');
  }
  for (let offset = 0; offset < specimen.factSets.length; offset += 50) await store.database.batch(specimen.factSets.slice(offset, offset + 50)
    .map(({ key, json }) => store.statement('INSERT INTO analytical_size_facts(repository_id,fact_key,facts_json) VALUES (1001,?,?)', key, json)));
  for (let offset = 0; offset < specimen.markers.length; offset += 50) {
    try { await store.database.batch(specimen.markers.slice(offset, offset + 50).map(({ key, observedAt, revision }) => store.statement('INSERT INTO analytical_size_observations(repository_id,fact_key,observed_at,revision,expires_at) VALUES (1001,?,?,?,NULL)', key, observedAt, revision))); }
    catch (cause) { throw new Error(`Anonymous loading specimen marker batch ${offset} failed.`, { cause }); }
  }
  clock.value = now;
  const retained = (await store.statement('SELECT COUNT(*) AS n FROM analytical_pull_requests').first()).n;
  const observations = (await store.statement('SELECT SUM(json_array_length(f.facts_json)) AS n FROM analytical_size_observations o JOIN analytical_size_facts f USING(repository_id,fact_key)').first()).n;
  return { ...written, retained, observations, loadingScale: { ...LOADING_SCALE, anchor: now } };
}
