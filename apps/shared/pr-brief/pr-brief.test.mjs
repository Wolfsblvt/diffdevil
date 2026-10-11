// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { GitHubClient, analyzeDiff, analyzeGitHub, compilePolicy, evaluatePolicy, explainPolicy, unwrap } from '@wolfsblvt/diffdevil';
import { FakeGitHub, TARGET } from '../../../src/diffdevil/tests/helpers/github.mjs';
import { BRIEF_LIMITS, composeBrief, composeFinalSummary, measurementState } from './compose.mjs';
import { currentFacts } from './facts.mjs';
import { FIXTURE_LINKS, FIXTURE_SNAPSHOT, fixtureCurrent, fixtureHistory } from './fixture.mjs';
import { bytes, code, share, text } from './markdown.mjs';
import { previewBrief } from './preview.mjs';
import { readBriefSettings, historyWindow } from './settings.mjs';
import { expectedSpecimen } from './specimens.mjs';
import { standardBrief } from './standard.mjs';

const settings = readBriefSettings({ mode: 'standard' });
const SIZE_DOCUMENT = explainPolicy(unwrap(compilePolicy({ version: 1, presets: ['size@1'] }))).document;
const basic = (state, history) => standardBrief({ current: fixtureCurrent(state), settings,
  history: history ? { standing: 'available', facts: fixtureHistory() } : { standing: 'consent-required', reason: 'history-off' },
  premium: { provider: null }, links: FIXTURE_LINKS, snapshot: FIXTURE_SNAPSHOT });

test('the Community composer reproduces every ratified basic specimen (with recorded errata only)', () => {
  for (const state of ['exact', 'bounded', 'partial', 'unknown']) {
    assert.equal(basic(state, false).markdown, expectedSpecimen(`${state}--basic`), `${state}--basic`);
    assert.equal(basic(state, true).markdown, expectedSpecimen(`${state}--basic-history`), `${state}--basic-history`);
  }
  assert.equal(basic('exact', false).markdown, expectedSpecimen('context-unavailable'));
  const missing = composeBrief({ current: fixtureCurrent('unavailable'), history: null, contributions: [], links: FIXTURE_LINKS, snapshot: FIXTURE_SNAPSHOT });
  assert.equal(missing.markdown, expectedSpecimen('file-population-unavailable'));
  assert.equal(composeFinalSummary({ current: fixtureCurrent('exact'), links: FIXTURE_LINKS }), expectedSpecimen('optional-final-summary'));
});

test('A01–A03: exact, bounded and partial arithmetic stays honest and unknown is never zero', () => {
  assert.deepEqual(share(168, 248), { lower: 68, upper: 68, text: '68%' });
  assert.deepEqual(share(168, { lower: 244, upper: 280 }), { lower: 60, upper: 69, text: '60–69%' });
  const exact = basic('exact', false).markdown;
  assert.match(exact, /Raw churn: 408 = 224 raw additions \+ 184 raw deletions/u);
  assert.doesNotMatch(exact, /408 Changed/u, 'raw churn is never reported as Changed');
  const partial = basic('partial', false);
  assert.equal(partial.state, 'partial');
  assert.match(partial.markdown, /\*\*At least 202 Changed · Size unresolved\*\*/u);
  assert.match(partial.markdown, /at least 202 included Changed and at least 330 raw churn/u);
  assert.doesNotMatch(partial.markdown, /\d+% of/u, 'no whole-PR share from a partial measurement');
  assert.doesNotMatch(partial.markdown, /\| `src\/report\.ts` \| 0 \|/u);
  assert.doesNotMatch(basic('unknown', false).markdown, /\b0 Changed\b/u);
});

test('A05: with no context or history the basic brief stays complete and makes no absence claim', () => {
  const result = basic('exact', false);
  assert.doesNotMatch(result.markdown, /no related|no open PRs|upgrade|Pro\b/iu);
  assert.deepEqual(result.modules.filter(item => item.tier === 'premium').map(item => item.standing), ['not-provided', 'not-provided', 'not-provided']);
  assert.equal(result.modules.find(item => item.id === 'history').standing, 'consent-required');
});

test('A12: an unresolved size never implies a held or applied label effect', () => {
  for (const state of ['partial', 'unknown']) {
    const body = basic(state, false).markdown;
    assert.doesNotMatch(body, /held|size\/Unknown|label/iu);
    assert.match(body, /The check reports the repository policy’s decision and current effect status\./u);
  }
});

test('untrusted titles and paths stay data: mentions, HTML, links, table pipes and backticks are neutralized', () => {
  assert.equal(text('@team <b>[x](javascript:1)</b>'), '@​team &lt;b&gt;\\[x\\]\\(javascript:1\\)&lt;/b&gt;');
  assert.equal(code('a`b'), '``a`b``');
  assert.equal(code('`edge`'), '`` `edge` ``');
  assert.equal(code('a|b', { cell: true }), '`a\\|b`');
  assert.equal(code('line\nbreak'), '`line break`');
  const current = fixtureCurrent('exact');
  current.files[0] = { ...current.files[0], path: 'src/we|ird`<x>.ts' };
  const body = composeBrief({ current, history: null, contributions: [], links: FIXTURE_LINKS }).markdown;
  assert.match(body, /\| ``src\/we\\\|ird`<x>\.ts`` \| 100 \|/u);
});

test('the body budget trims evidence rows first, never the core, and reports what it dropped', () => {
  const current = fixtureCurrent('exact');
  const files = Array.from({ length: 400 }, (_, index) => ({ path: `packages/very/long/generated/path/${'segment/'.repeat(45)}file-${index}.ts`, changeType: 'modified',
    changed: { lower: 400 - index, upper: 400 - index }, composition: null, raw: { added: null, deleted: null } }));
  const total = files.reduce((sum, file) => sum + file.changed.lower, 0);
  const broad = { ...current, files, totals: { ...current.totals, changed: { lower: total, upper: total }, composition: null } };
  const result = composeBrief({ current: broad, history: null, contributions: [], links: FIXTURE_LINKS });
  assert.ok(result.bytes <= BRIEF_LIMITS.bodyBytes, `${result.bytes} bytes`);
  assert.ok(result.trimmed.includes('detail-file-rows'));
  assert.match(result.markdown, /### This change/u);
  assert.match(result.markdown, /395 more included files are listed in the details below\./u);
  assert.match(result.markdown, /390 more included files are not listed here\./u);
  const enormous = { ...current, files: [{ ...current.files[0], path: 'x/'.repeat(9000) + 'y.ts' }] };
  const fallback = composeBrief({ current: enormous, history: null, contributions: [], links: FIXTURE_LINKS });
  assert.ok(fallback.bytes <= BRIEF_LIMITS.bodyBytes);
  assert.deepEqual(fallback.trimmed.at(-1), 'oversized-identities');
  assert.match(fallback.markdown, /too long to show within the comment limit/u);
});

test('current facts come from a real engine report: inclusion, exclusion, bands and composition', () => {
  const diff = readFileSync(new URL('../../../docs/examples/diffs/review.diff', import.meta.url), 'utf8');
  const policy = unwrap(compilePolicy({ version: 1, presets: ['size@1'], defaults: { paths: { exclude: ['**/*.lock', 'package-lock.json'] } } }));
  const document = explainPolicy(policy).document;
  const report = unwrap(evaluatePolicy(policy, unwrap(analyzeDiff(diff)), {})).report;
  const current = currentFacts(report, { policyDocument: document, policyName: 'size@1' });
  assert.equal(current.population, 'complete');
  assert.equal(current.files.length + current.excluded.length, report.files.length);
  assert.equal(current.band.status, report.bands.size.status);
  assert.equal(measurementState(current), report.files.filter(file => file.included).every(file => file.lines.changed.status === 'exact') ? 'exact' : 'bounded');
  const body = composeBrief({ current, history: null, contributions: [], links: { check: 'https://github.com/o/r/pull/1/checks' } }).markdown;
  assert.match(body, /^### This change\n\n\*\*\d+ Changed · Size [A-Z]+ · \d+ included files?\*\*/u);
  assert.doesNotMatch(body, /synthetic/u, 'live bodies print no snapshot time');
});

test('a PR whose every file is excluded states that instead of an empty table', () => {
  const current = { ...fixtureCurrent('exact'), files: [], excluded: ['pnpm-lock.yaml', 'yarn.lock'], totals: { changed: { lower: 0, upper: 0 }, composition: { modified: 0, addedOnly: 0, deletedOnly: 0 }, raw: { added: { lower: 0, upper: 0 }, deleted: { lower: 0, upper: 0 }, churn: { lower: 0, upper: 0 } } }, band: { status: 'resolved', id: 'xs', label: 'XS' } };
  const body = composeBrief({ current, history: null, contributions: [], links: FIXTURE_LINKS }).markdown;
  assert.ok(body.includes('**0 Changed · Size XS · 0 included files**'));
  assert.ok(body.includes('No changed file is included: repository policy excludes every changed file.'));
  assert.ok(!body.includes('| File | Changed |\n| :--- | :--- |\n\n'), 'no header-only table');
});

test('settings are bounded App-only controls, off by default, with a day-stable history window', () => {
  assert.equal(readBriefSettings(undefined).mode, 'off');
  assert.throws(() => readBriefSettings({ mode: 'llm' }), /mode/u);
  assert.throws(() => readBriefSettings({ template: '{{ x }}' }), /do not allow template/u);
  assert.throws(() => readBriefSettings({ modules: ['neighbours', 'neighbours'] }), /distinct/u);
  assert.throws(() => readBriefSettings({ historyWindowDays: 3650 }), /window/u);
  const morning = historyWindow(settings, { now: '2026-10-10T01:00:00.000Z' }), evening = historyWindow(settings, { now: '2026-10-10T23:59:00.000Z' });
  assert.deepEqual(morning, evening, 'two evaluations on one day read the same window, so the body does not churn');
  assert.equal(historyWindow(settings, { now: '2026-10-10T01:00:00.000Z', retentionDays: 30 }).days, 30);
});

test('A15: preview evaluates the synthetic evidence through the observed effective policy, effect-free', () => {
  const route = { mode: 'standard', effective: 'standard', reason: 'standard-selected', templateRules: [] };
  const writer = { login: 'diffdevil[bot]', confidence: 'administrator-declared' };
  const eligibility = { history: { standing: 'available' }, premium: { eligible: true } };
  const observed = compiled => ({ compiled, document: explainPolicy(compiled).document, name: null });
  // The specimen's own repository policy (size@1 that excludes the lockfile): the engine reproduces the ratified bytes.
  const specimenPolicy = unwrap(compilePolicy({ version: 1, presets: ['size@1'], defaults: { paths: { exclude: ['pnpm-lock.yaml'] } } }));
  const preview = previewBrief({ settings: readBriefSettings({ mode: 'standard', finalSummary: true }), route, writer, eligibility,
    source: { standing: 'observed', kind: 'trusted-base', identity: '.diffdevil.yml@abc', policyId: specimenPolicy.id }, policy: { ...observed(specimenPolicy), name: 'size@1' } });
  assert.equal(preview.synthetic, true); assert.equal(preview.effects, 'none');
  assert.deepEqual(preview.evaluation, { kind: 'effective-policy', policyId: specimenPolicy.id });
  assert.match(preview.notice, /evaluated through this repository’s effective trusted policy/u);
  assert.deepEqual(Object.keys(preview.states), ['exact', 'bounded', 'partial', 'unknown', 'context-unavailable', 'file-population-unavailable']);
  for (const state of ['exact', 'bounded', 'partial']) assert.equal(preview.states[state].markdown, expectedSpecimen(`${state}--basic-history`), `${state} through the engine`);
  // The engine orders unmeasured files by path; the specimen kept the fixture's authoring order.
  const pathOrder = text => text.replace(/(\| `src\/policy\.ts` \| unavailable \|\n\| `src\/config\.ts` \| unavailable \|\n\| `src\/report\.ts` \| unavailable \|\n\| `tests\/config\.test\.ts` \| unavailable \|\n)\| `docs\/policy\.md` \| unavailable \|\n/gu,
    '| `docs/policy.md` | unavailable |\n| `src/config.ts` | unavailable |\n| `src/policy.ts` | unavailable |\n| `src/report.ts` | unavailable |\n| `tests/config.test.ts` | unavailable |\n');
  assert.equal(preview.states.unknown.markdown, pathOrder(expectedSpecimen('unknown--basic-history')));
  assert.equal(preview.states['file-population-unavailable'].markdown, expectedSpecimen('file-population-unavailable'));
  assert.equal(preview.finalSummaryMarkdown, expectedSpecimen('optional-final-summary'));
  assert.equal(preview.modules.find(item => item.id === 'neighbours').standing, 'not-provided');

  // A custom observed policy: its own bands and explanation, never the default size@1 specimen under its identity.
  const custom = unwrap(compilePolicy({ version: 1, presets: ['size@1'], bands: { size: { value: 'metrics.review', minimum: 0, ranges: [{ id: 'xs', lt: 1000 }, { id: 's', lt: 2000 }, { id: 'm', lt: 3000 }, { id: 'l', lt: 4000 }, { id: 'xl', otherwise: true }] } } }));
  const effective = previewBrief({ settings, route, writer, eligibility, source: { standing: 'observed', kind: 'stored', identity: 'stored repository configuration', policyId: custom.id }, policy: observed(custom) });
  assert.match(effective.states.exact.markdown, /\*\*266 Changed · Size XS · 6 included files\*\*/u, 'the lockfile this policy does not exclude is measured');
  assert.match(effective.states.exact.markdown, /the effective policy defines XS as 0–999 included Changed\./u);
  assert.doesNotMatch(effective.states.exact.markdown, /size@1|100–499/u);

  // Unobserved, or observed without the policy itself: a labelled design specimen that borrows no policy identity.
  const specimen = previewBrief({ settings, route, writer, eligibility: { history: { standing: 'consent-required', reason: 'history-off' }, premium: { eligible: true } }, source: { standing: 'unobserved', reason: 'E_EFFECTIVE_POLICY_UNAVAILABLE' } });
  assert.deepEqual(specimen.evaluation, { kind: 'design-specimen', reason: 'effective-policy-unobserved' });
  assert.match(specimen.notice, /not this repository’s policy/u);
  assert.equal(specimen.states.exact.markdown, expectedSpecimen('exact--basic'));
  const unsupplied = previewBrief({ settings, route, writer, eligibility, source: { standing: 'observed', kind: 'stored', identity: 'x', policyId: 'p' } });
  assert.deepEqual(unsupplied.evaluation, { kind: 'design-specimen', reason: 'effective-policy-not-supplied' });
  const advanced = previewBrief({ settings, route: { mode: 'standard', effective: 'advanced', reason: 'repository-authored-comments', templateRules: ['note'] },
    source: { standing: 'unobserved' }, writer: { login: 'diffdevil[bot]', confidence: 'unverified' }, eligibility: { history: { standing: 'consent-required' }, premium: { eligible: false } } });
  assert.deepEqual(advanced.states, {}); assert.equal(advanced.route.reason, 'repository-authored-comments');
  assert.ok(bytes(JSON.stringify(preview)) < 512 * 1024);
});

test('A04: an incomplete, wholly unmeasured file list never prints a whole-population count or claims completeness', async () => {
  const fake = new FakeGitHub();
  fake.count = 2;
  fake.files = [{ filename: 'src/main.ts', status: 'modified', additions: 0, deletions: 0, changes: 0 }];
  const report = unwrap(evaluatePolicy(unwrap(compilePolicy({ version: 1, presets: ['size@1'] })), unwrap(await analyzeGitHub(new GitHubClient({ fetch: fake.fetch, readRetries: 0 }), TARGET)), { phase: 'analyze' })).report;
  assert.equal(report.fileSet.complete, false); assert.equal(report.fileSet.total.value, 2);
  const current = currentFacts(report, { policyDocument: SIZE_DOCUMENT, policyName: 'size@1' });
  assert.equal(measurementState(current), 'unknown'); assert.equal(current.population, 'incomplete');
  const body = composeBrief({ current, history: null, contributions: [], links: FIXTURE_LINKS }).markdown;
  assert.match(body, /^### This change\n\n\*\*Size unresolved · 1 of 2 changed files listed\*\*/u);
  assert.match(body, /The provider returned an incomplete file list, and the diff data needed to measure Changed is unavailable\./u);
  assert.match(body, /The provider’s file list is incomplete, so the listed files are not the whole PR\./u);
  assert.match(body, /\*\*Included files the provider listed\*\*/u);
  assert.doesNotMatch(body, /list is complete|1 included file\b/u);
  assert.doesNotMatch(composeFinalSummary({ current, links: FIXTURE_LINKS }), /list is complete|1 included file\b/u);
});

test('A10: band thresholds are explained in the policy’s own size metric, never silently as Changed', () => {
  const diff = ['diff --git a/src/a.ts b/src/a.ts', '--- a/src/a.ts', '+++ b/src/a.ts', `@@ -1,60 +1,60 @@`,
    ...Array.from({ length: 60 }, (_, index) => `-old ${index}`), ...Array.from({ length: 60 }, (_, index) => `+new ${index}`)].join('\n') + '\n';
  const run = input => {
    const compiled = unwrap(compilePolicy(input));
    const document = explainPolicy(compiled).document;
    const current = currentFacts(unwrap(evaluatePolicy(compiled, unwrap(analyzeDiff(diff)), { phase: 'analyze' })).report, { policyDocument: document });
    return composeBrief({ current, history: null, contributions: [], links: FIXTURE_LINKS }).markdown;
  };
  const churn = run({ version: 1, presets: ['size@1'], metrics: { review: { measure: 'raw.churn' } } });
  assert.match(churn, /\*\*60 Changed · Size M · 1 included file\*\*/u, 'the label decision and the Changed fact are both correct');
  assert.match(churn, /the effective policy defines M as 100–499 raw churn\./u);
  assert.doesNotMatch(churn, /M as 100–499 included Changed/u);
  const formula = run({ version: 1, presets: ['size@1'], metrics: { churn: { measure: 'raw.churn' }, review: { formula: 'metrics.churn + metrics.churn' } } });
  assert.match(formula, /defines M as 100–499 by its `review` metric\./u);
  const changed = run({ version: 1, presets: ['size@1'] });
  assert.match(changed, /\*\*60 Changed · Size S/u); assert.match(changed, /the effective policy defines S as 20–99 included Changed\./u);
});
