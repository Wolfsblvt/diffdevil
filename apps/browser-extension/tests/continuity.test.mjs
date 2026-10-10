// SPDX-License-Identifier: AGPL-3.0-only
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { productionModules, memoryAreas, comparison } from './support.mjs';
const loaded = await productionModules(); after(loaded.cleanup);
const m = loaded.module;
const ENGINE = '9.9.9';
const head = 'c'.repeat(40);
const identity = (overrides = {}) => ({ ...comparison, head, changedFiles: 4, additions: 8, deletions: 4, ...overrides });
const fragment = '@@ -1,2 +1,3 @@\n-old\n+new\n+extra\n same\n'; // +2 −1: exactly one replacement and one addition
const fileObject = (index, patch = true) => ({ filename: `src/f${String(index).padStart(2, '0')}.ts`, status: 'modified', additions: 2, deletions: 1, ...(patch ? { patch: fragment } : {}) });
/** A github-files acquisition in which the first `measured` files carry their patch and the rest are bounded. */
const acquisition = (count, measured, repository = comparison.repository, extra = {}) => ({ comparison: identity({ repository, changedFiles: count, additions: count * 2, deletions: count }), format: 'github-files', complete: true,
  files: Array.from({ length: count }, (_, index) => fileObject(index, index < measured)), ...extra });
const absent = () => ({ status: 'absent', at: 1 });
const input = (count, measured, options = {}) => { const source = acquisition(count, measured, options.repository); return { comparison: source.comparison, acquisition: source, policy: options.policy ?? absent(), ...(options.coverage ? { coverage: options.coverage } : {}) }; };
const settings = (patch = {}) => m.validateSettings({ 'analysis.maximumFiles': 3, ...patch });
const world = (store = new m.MemoryStore(), engine = ENGINE, hooks = {}) => { const cache = new m.AnalysisCache(store); return { store, cache, analysis: new m.Analysis({ cache, engine, now: () => 1_000, ...hooks }) }; };
const patchesFor = indexes => indexes.map(index => ({ path: fileObject(index).filename, patch: fragment }));

test('a comparison analysed before the worker restarted serves aggregate, file and text views from persisted facts', async () => {
  const first = world(); const packet = await first.analysis.run(input(4, 4), settings());
  const second = world(first.store); // the worker was terminated: no context survives, the IndexedDB does
  const views = await second.analysis.files(packet.key, packet.comparison, ['src/f00.ts', 'src/f03.ts'], settings());
  assert.equal(views['src/f00.ts'].changed.value, 2); assert.equal(Object.keys(views).length, 2);
  assert.match(await second.analysis.text(packet.key, packet.comparison, undefined, settings()), /changed/iu);
  assert.match(await second.analysis.text(packet.key, packet.comparison, 'src/f01.ts', settings()), /Files {6}1 total/u, 'a file report is its own one-file scope');
  assert.match(await second.analysis.text(packet.key, packet.comparison, undefined, settings()), /Files {6}4 total/u);
  const again = await second.analysis.run({ comparison: packet.comparison, policy: absent() }, settings());
  assert.equal(again.cached, true); assert.equal(again.key, packet.key); assert.equal(again.view.changed.value, packet.view.changed.value);
});
test('rehydration reads the current settings, so a cache hit cannot resurrect an old presentation, and reuses the report', async () => {
  const one = world(); const packet = await one.analysis.run(input(4, 4), settings()); const reports = () => [...one.store.entries.values()].filter(entry => entry.kind === 'report');
  const renamed = JSON.stringify(m.bands(m.DEFAULT_BANDS).map(band => band.id === 'xs' ? { ...band, name: 'Tiny' } : band));
  const restarted = world(one.store); const before = structuredClone(reports()[0].value);
  const next = await restarted.analysis.run({ comparison: packet.comparison, policy: absent() }, settings({ 'policy.bands': renamed }));
  assert.equal(next.view.rails[0].cells[0].name, 'Tiny'); assert.deepEqual(reports()[0].value, before, 'the canonical report is untouched by a presentation change');
  assert.equal(reports().length, 1);
});
test('a policy change reprojects the cached report and never asks for the diff again', async () => {
  const one = world(); const packet = await one.analysis.run(input(4, 4), settings());
  const next = await one.analysis.run({ comparison: packet.comparison, policy: absent() }, settings({ 'policy.primaryMetric': 'raw.churn' }));
  assert.notEqual(next.key, packet.key, 'a different effective policy is a different projection'); assert.equal(next.cached, true);
  assert.equal(next.view.changed.value, packet.view.changed.value, 'Changed is a fact of the report, not of the policy');
});
test('without its persisted report the context is expired, not guessed', async () => {
  const one = world(); const packet = await one.analysis.run(input(2, 2), settings()); await one.analysis.clearAll();
  const restarted = world(one.store);
  await assert.rejects(restarted.analysis.files(packet.key, packet.comparison, ['src/f00.ts'], settings()), error => error.code === 'CONTEXT_EXPIRED');
  await assert.rejects(restarted.analysis.run({ comparison: packet.comparison, policy: absent() }, settings()), error => error.code === 'CACHE_MISS');
});
test('repository policy evidence travels with the report, trusted templates included', async () => {
  const policy = { status: 'present', text: 'version: 1\nrules:\n  note:\n    when: "true"\n    effects:\n      comment:\n        mode: upsert\n        templateFile: .github/note.md\n', at: 1 };
  const one = world(); const packet = await one.analysis.run({ ...input(2, 2, { policy }), templates: { '.github/note.md': 'A trusted note.' } }, settings());
  assert.equal(packet.view.errors.length, 0, JSON.stringify(packet.view.errors));
  const lookup = await world(one.store).analysis.lookup(packet.comparison, settings()); assert.deepEqual(lookup.templatePaths, ['.github/note.md']); assert.equal(lookup.policy.status, 'present');
  const fast = await world(one.store).analysis.run({ comparison: packet.comparison, policy: lookup.policy }, settings()); assert.equal(fast.view.errors.length, 0, 'the held template completes the policy for a fast reattachment');
});
test('concurrent analyses of one comparison analyse it once, whatever policy each tab selected', async () => {
  let reportWrites = 0; const one = world(new m.MemoryStore()); const original = one.cache.put.bind(one.cache);
  one.cache.put = async (key, kind, ...rest) => { if (kind === 'report') reportWrites++; return original(key, kind, ...rest); };
  const same = [one.analysis.run(input(3, 3), settings()), one.analysis.run(input(3, 3), settings())]; const other = one.analysis.run(input(3, 3), settings({ 'policy.primaryMetric': 'raw.churn' }));
  const [a, b, c] = await Promise.all([...same, other]); assert.equal(reportWrites, 1, 'the report was analysed and stored once'); assert.equal(a.key, b.key); assert.notEqual(a.key, c.key);
  assert.equal([a, b, c].filter(packet => !packet.cached).length, 1, 'exactly one request analysed the diff; every other one found the stored report');
});
test('at most three different analyses run at once', async () => {
  const gate = Promise.withResolvers(); const one = world(); const original = one.cache.put.bind(one.cache); one.cache.put = async (...args) => { await gate.promise; return original(...args); };
  const runs = [1, 2, 3, 4].map(number => one.analysis.run(input(2, 2, { repository: `fixture/r${number}` }), settings())); runs.forEach(run => run.catch(() => undefined)); await new Promise(resolve => setTimeout(resolve, 30)); gate.resolve();
  const results = await Promise.allSettled(runs); assert.equal(results.filter(result => result.status === 'rejected' && result.reason.code === 'ANALYSIS_BUSY').length, 1); assert.equal(results.filter(result => result.status === 'fulfilled').length, 3);
});
test('a clear that finishes while an analysis is in flight wins: the late write is dropped', async () => {
  const gate = Promise.withResolvers(); const one = world(); const original = one.cache.put.bind(one.cache);
  one.cache.put = async (...args) => { await gate.promise; return original(...args); };
  const pending = one.analysis.run(input(2, 2), settings()); await new Promise(resolve => setTimeout(resolve, 20));
  await one.analysis.clearAll(); gate.resolve(); const packet = await pending;
  assert.equal(packet.view.changed.status, 'exact', 'the in-memory analysis is still valid and returned'); assert.equal(one.store.entries.size, 0, 'nothing resurrected cleared data');
  await assert.rejects(one.analysis.files(packet.key, packet.comparison, ['src/f00.ts'], settings()), error => error.code === 'CONTEXT_EXPIRED', 'and it was not kept as a context');
});
test('budget eviction removes least-recently-used entries and never exceeds the limit', async () => {
  const one = world(); await one.cache.configure(4); const big = 'x'.repeat(1.7 * 1024 * 1024); const scope = number => ({ repository: 'github.com/a/b', pullRequest: number });
  await one.cache.put('k1', 'report', scope(1), 'c', { big }); await new Promise(resolve => setTimeout(resolve, 5)); await one.cache.put('k2', 'report', scope(2), 'c', { big }); await new Promise(resolve => setTimeout(resolve, 5));
  await one.cache.put('k3', 'report', scope(3), 'c', { big });
  assert.deepEqual([...one.store.entries.keys()].sort(), ['k2', 'k3']); assert.ok((await one.cache.summary()).bytes <= 4 * 1024 * 1024);
  await one.cache.put('too-big', 'report', scope(4), 'c', { big: 'y'.repeat(5 * 1024 * 1024) }); assert.ok(!one.store.entries.has('too-big'), 'an entry larger than the whole budget is not persisted');
});
test('an entry made under another engine, schema or semantics is a miss, and a start-up pass removes it', async () => {
  const old = world(new m.MemoryStore(), '1.0.0'); const packet = await old.analysis.run(input(2, 2), settings()); assert.equal(old.store.entries.size, 3, 'report, policy and pointer');
  const next = world(old.store, '2.0.0'); const lookup = await next.analysis.lookup(packet.comparison, settings());
  assert.equal(lookup.reportCached, false, 'the report no longer means what this engine means'); assert.equal(lookup.policy?.status, 'absent', 'trusted policy text does not depend on the engine');
  assert.deepEqual([...old.store.entries.values()].map(entry => entry.kind).sort(), ['pointer', 'policy'], 'the incompatible report was removed, not shown stale');
  await assert.rejects(next.analysis.files(packet.key, packet.comparison, ['src/f00.ts'], settings()), error => error.code === 'CONTEXT_EXPIRED');
});
test('scoped clears remove exactly one pull request or one repository without parsing keys', async () => {
  const one = world(); const comparisonOf = (repository, pullRequest) => { const source = acquisition(2, 2, repository); return { comparison: { ...source.comparison, pullRequest }, acquisition: { ...source, comparison: { ...source.comparison, pullRequest } }, policy: absent() }; };
  await one.analysis.run(comparisonOf('fixture/one', 1), settings()); await one.analysis.run(comparisonOf('fixture/one', 2), settings()); await one.analysis.run(comparisonOf('fixture/two', 1), settings());
  const inventory = await one.analysis.inventory(); assert.deepEqual(inventory.repositories.map(item => [item.repository, item.pullRequests.map(pr => pr.pullRequest).sort()]), [['github.com/fixture/one', [1, 2]], ['github.com/fixture/two', [1]]]);
  assert.equal(inventory.repositories[0].pullRequests[0].measured, 2); assert.equal(inventory.repositories[0].pullRequests[0].bounded, 0);
  await one.analysis.clearScope('Fixture/One', 2);
  assert.deepEqual((await one.analysis.inventory()).repositories.map(item => [item.repository, item.pullRequests.map(pr => pr.pullRequest)]), [['github.com/fixture/one', [1]], ['github.com/fixture/two', [1]]]);
  const kept = [...one.store.entries.values()].filter(entry => entry.repository === 'github.com/fixture/one' && entry.kind === 'policy'); assert.equal(kept.length, 1, 'a pull-request purge keeps the repository’s trusted policy');
  assert.ok((await one.analysis.clearScope('fixture/one')) >= 2); assert.deepEqual((await one.analysis.inventory()).repositories.map(item => item.repository), ['github.com/fixture/two']);
  const lookup = await one.analysis.lookup(comparisonOf('fixture/one', 1).comparison, settings()); assert.equal(lookup.reportCached, false);
});
test('the pointer names the last confirmed comparison and is purged with its pull request', async () => {
  const one = world(); await one.analysis.run(input(2, 2), settings());
  assert.equal((await one.analysis.recent('fixture/example', 42, settings())).comparison.head, head); assert.deepEqual(await one.analysis.recent('fixture/example', 43, settings()), {});
  await one.analysis.clearScope('fixture/example', 42); assert.deepEqual(await one.analysis.recent('fixture/example', 42, settings()), {});
});
test('a paused repository rejects new work and hands out no cached comparison, but keeps its data', async () => {
  const one = world(); await one.analysis.run(input(2, 2), settings()); const paused = settings({ 'repositories.paused': m.pausedWith('{}', 'Fixture/Example', true, 5) });
  await assert.rejects(one.analysis.run(input(2, 2), paused), error => error.code === 'REPOSITORY_PAUSED');
  await assert.rejects(one.analysis.extend({ comparison: identity({ changedFiles: 2 }), patches: [], via: 'explicit' }, paused), error => error.code === 'REPOSITORY_PAUSED');
  assert.equal((await one.analysis.lookup(identity({ changedFiles: 2 }), paused)).paused, true); assert.deepEqual(await one.analysis.recent('fixture/example', 42, paused), {});
  assert.ok(one.store.entries.size >= 1, 'pausing is not purging');
  assert.equal((await one.analysis.run({ comparison: identity({ changedFiles: 2 }), acquisition: acquisition(2, 2), policy: absent() }, settings())).cached, true, 'resuming finds the data again');
});
test('pause is a local, validated, per-repository state that survives preferences transactions', async () => {
  const areas = memoryAreas(); const preferences = new m.Preferences(areas);
  await Promise.all([preferences.update(current => ({ 'repositories.paused': m.pausedWith(String(current['repositories.paused']), 'a/one', true, 1) })), preferences.update(current => ({ 'repositories.paused': m.pausedWith(String(current['repositories.paused']), 'B/Two', true, 2) }))]);
  const loaded = await preferences.load(); assert.deepEqual(Object.keys(m.pausedRepositories(String(loaded['repositories.paused']))), ['github.com/a/one', 'github.com/b/two']);
  assert.equal(areas.sync.data[m.SETTINGS_KEY]['repositories.paused'], undefined, 'repository names are not synchronized'); assert.ok(areas.local.data[m.SETTINGS_KEY]['repositories.paused']);
  assert.equal(m.isPaused(loaded, 'A/ONE'), true); assert.equal(m.isPaused(loaded, 'a/three'), false);
  const resumed = await preferences.update(current => ({ 'repositories.paused': m.pausedWith(String(current['repositories.paused']), 'a/one', false, 3) })); assert.equal(m.isPaused(resumed, 'a/one'), false); assert.equal(m.isPaused(resumed, 'b/two'), true);
  for (const bad of ['[]', '{"a/b":{"at":1}}', '{"github.com/a/b":{"at":-1}}', '{"github.com/a/b":{"at":1,"x":1}}', '{"github.com/../b":{"at":1}}']) assert.throws(() => m.validateSettings({ 'repositories.paused': bad }), undefined, bad);
});
test('the automatic file limit is a whole number inside the provider ceiling', () => {
  assert.equal(m.validateSettings({ 'analysis.maximumFiles': 3000 })['analysis.maximumFiles'], 3000);
  for (const value of [0, -1, 3001, 1.5, '150']) assert.throws(() => m.validateSettings({ 'analysis.maximumFiles': value }), undefined, String(value));
  assert.equal(m.DEFAULTS['analysis.maximumFiles'], m.DEFAULT_FILE_LIMIT);
});

// Coverage and on-demand measurement.
const count = packet => ({ measured: packet.coverage.measured, bounded: packet.coverage.bounded, declined: packet.coverage.declined, total: packet.coverage.total });
test('coverage always adds up and says which files the provider declined', async () => {
  const one = world(); const packet = await one.analysis.run(input(6, 2, { coverage: { limit: 2, declined: { 'src/f04.ts': 'binary', 'src/f05.ts': 'too-big', 'src/f00.ts': 'binary', 'unknown.ts': 'binary' } } }), settings({ 'analysis.maximumFiles': 2 }));
  assert.deepEqual(count(packet), { measured: 2, bounded: 2, declined: 2, total: 6 }); assert.equal(packet.coverage.limit, 2); assert.equal(packet.coverage.automatic, 2); assert.equal(packet.coverage.onDemand, 0);
  assert.deepEqual(packet.coverage.declinedReasons, { binary: 1, 'too-big': 1 }, 'a measured file or an unknown path cannot be declined');
  assert.deepEqual(packet.files.map(file => file.standing), ['measured', 'measured', 'bounded', 'bounded', 'declined', 'declined']);
  assert.notEqual(packet.view.changed.status, 'exact', 'the aggregate stays honestly bounded'); assert.equal(packet.view.report.files.length, 0, 'the packet carries the aggregate, not every file record');
});
test('visible measurement spends the configured allowance and then stops', async () => {
  const one = world(); const packet = await one.analysis.run(input(8, 2), settings({ 'analysis.maximumFiles': 2 })); const limited = settings({ 'analysis.maximumFiles': 2 });
  const first = await one.analysis.extend({ comparison: packet.comparison, patches: patchesFor([2, 3, 4]), via: 'visible' }, limited);
  assert.equal(first.coverage.measured, 4, 'two of the three offered files fit the allowance'); assert.equal(first.coverage.topUp, 2); assert.equal(first.coverage.onDemand, 2); assert.notEqual(first.key, packet.key, 'the projection identity follows the report');
  const second = await one.analysis.extend({ comparison: packet.comparison, patches: patchesFor([4, 5]), via: 'visible' }, limited); assert.equal(second.coverage.measured, 4, 'the allowance is spent; scrolling measures nothing more');
  const explicit = await one.analysis.extend({ comparison: packet.comparison, patches: patchesFor([4, 5]), via: 'explicit' }, limited); assert.equal(explicit.coverage.measured, 6); assert.equal(explicit.coverage.explicit, 2); assert.equal(explicit.coverage.onDemand, 4);
  const lower = (a, b) => a.view.changed.lower <= b.view.changed.lower && a.view.changed.upper >= b.view.changed.upper; assert.ok(lower(packet, first) && lower(first, explicit), 'every step only narrows the aggregate');
});
test('continuing a partial comparison after a restart carries on from persisted coverage', async () => {
  const one = world(); const packet = await one.analysis.run(input(6, 2), settings({ 'analysis.maximumFiles': 2 })); await one.analysis.extend({ comparison: packet.comparison, patches: patchesFor([2]), via: 'explicit' }, settings({ 'analysis.maximumFiles': 2 }));
  const restarted = world(one.store); const lookup = await restarted.analysis.lookup(packet.comparison, settings({ 'analysis.maximumFiles': 2 }));
  assert.equal(lookup.reportCached, true); assert.deepEqual([lookup.coverage.measured, lookup.coverage.explicit, lookup.coverage.bounded], [3, 1, 3]);
  const done = await restarted.analysis.extend({ comparison: packet.comparison, patches: patchesFor([3, 4, 5]), via: 'explicit' }, settings({ 'analysis.maximumFiles': 2 }));
  assert.equal(done.coverage.bounded, 0); assert.equal(done.view.changed.status, 'exact'); assert.equal(done.view.changed.value, 12, 'six files of two changed lines each, measured one batch at a time');
});
test('raising the limit allows one more automatic pass for the same comparison, lowering it never discards a fact', async () => {
  const one = world(); const packet = await one.analysis.run(input(6, 2), settings({ 'analysis.maximumFiles': 2 }));
  const raised = settings({ 'analysis.maximumFiles': 4 }); const more = await one.analysis.extend({ comparison: packet.comparison, patches: patchesFor([2, 3, 4, 5]), via: 'automatic' }, raised);
  assert.equal(more.coverage.measured, 4, 'automatic fill stops at the new limit'); assert.equal(more.coverage.limit, 4); assert.equal(more.coverage.automatic, 4);
  const lowered = settings({ 'analysis.maximumFiles': 1 }); const kept = await world(one.store).analysis.run({ comparison: packet.comparison, policy: absent() }, lowered); assert.equal(kept.coverage.measured, 4);
});
test('a patch that disagrees with the held counters, or a declined path, is recorded without touching other files', async () => {
  const one = world(); const packet = await one.analysis.run(input(4, 2), settings());
  const result = await one.analysis.extend({ comparison: packet.comparison, patches: [{ path: 'src/f02.ts', patch: '@@ -1 +1 @@\n-a\n+b\n' }, ...patchesFor([3])], declined: { 'src/f02.ts': 'truncated', 'src/f00.ts': 'binary', 'nope.ts': 'binary' }, via: 'explicit' }, settings());
  assert.deepEqual(result.files.map(file => file.standing), ['measured', 'measured', 'declined', 'measured']); assert.deepEqual(result.coverage.declinedReasons, { truncated: 1 });
});
test('a measured file leaves the declined set and a declined file is never offered again as bounded', async () => {
  const one = world(); const packet = await one.analysis.run(input(3, 1, { coverage: { limit: 3, declined: { 'src/f02.ts': 'too-big' } } }), settings());
  assert.equal(packet.coverage.declined, 1); const later = await one.analysis.extend({ comparison: packet.comparison, patches: patchesFor([2]), via: 'explicit' }, settings());
  assert.equal(later.coverage.declined, 0, 'the provider supplied it after all'); assert.equal(later.coverage.measured, 2);
});
test('an unmeasurable measurement request names an unknown mode and a missing report instead of guessing', async () => {
  const one = world(); await assert.rejects(one.analysis.extend({ comparison: identity({ changedFiles: 2 }), patches: [], via: 'explicit' }, settings()), error => error.code === 'CACHE_MISS');
  const packet = await one.analysis.run(input(2, 1), settings()); await assert.rejects(one.analysis.extend({ comparison: packet.comparison, patches: [], via: 'everything' }, settings()), error => error.code === 'MEASURE_VIA');
});
test('measurement works from memory when the rebuildable cache cannot hold the report', async () => {
  const failures = []; const store = new m.MemoryStore(); const one = world(store, ENGINE, { cacheFailed: error => failures.push(error) });
  const original = store.run.bind(store); store.run = (mode, work) => mode === 'readwrite' ? Promise.reject(new Error('quota')) : original(mode, work);
  const packet = await one.analysis.run(input(3, 1), settings()); assert.ok(failures.length > 0); assert.equal(packet.coverage.measured, 1);
  const more = await one.analysis.extend({ comparison: packet.comparison, patches: patchesFor([1, 2]), via: 'explicit' }, settings()); assert.equal(more.coverage.measured, 3);
});

// Coverage rules without a worker.
test('file selection puts the reader’s files first, then provider order, within the budget, deterministically', () => {
  const order = ['a', 'b', 'c', 'd', 'e', 'f'];
  assert.deepEqual(m.selectFiles(order, ['e', 'c', 'zz'], 4), ['e', 'c', 'a', 'b'], 'visible in page order, unknown paths ignored');
  assert.deepEqual(m.selectFiles(order, ['e', 'e'], 3, new Set(['a'])), ['e', 'b', 'c'], 'measured or declined files are skipped and nothing repeats');
  assert.deepEqual(m.selectFiles(order, [], 0), []); assert.deepEqual(m.selectFiles(order, [], 99), order);
  assert.deepEqual(m.selectFiles(order, ['f'], 2), m.selectFiles(order, ['f'], 2));
});
test('coverage read from storage tolerates anything and never grants more than it records', () => {
  const coverage = m.readCoverage({ limit: -4, automatic: 'x', topUp: 2.5, explicit: 3, declined: { a: 'binary', b: 'because', c: 7 } }, 150);
  assert.deepEqual({ ...coverage, declined: { ...coverage.declined } }, { limit: 150, automatic: 0, topUp: 0, explicit: 3, declined: { a: 'binary' } });
  assert.equal(m.topUpRemaining({ ...coverage, topUp: 5 }, 3), 0); assert.equal(m.automaticRemaining({ ...coverage, automatic: 1 }, 3), 2);
  const empty = m.readCoverage(null, 7); assert.deepEqual({ ...empty, declined: { ...empty.declined } }, { limit: 7, automatic: 0, topUp: 0, explicit: 0, declined: {} });
});

test('only a first install opens Settings at its ready section', () => {
  const url = path => `chrome-extension://id/${path}`;
  assert.equal(m.firstInstallUrl({ reason: 'install' }, url), 'chrome-extension://id/options.html#ready');
  for (const reason of ['update', 'chrome_update', 'shared_module_update', 'browser_update', 'unknown']) assert.equal(m.firstInstallUrl({ reason }, url), undefined, reason);
});
