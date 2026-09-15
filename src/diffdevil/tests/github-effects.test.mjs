import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GitHubClient } from '../../../dist/lib/github/client.js';
import { analyzeGitHub } from '../../../dist/lib/github/source.js';
import { applyGitHubPolicy } from '../../../dist/lib/github/apply.js';
import { syncGitHubLabels } from '../../../dist/lib/github/labels.js';
import { compilePolicy } from '../../../dist/lib/policy/compile.js';
import { evaluatePolicy } from '../../../dist/lib/policy/evaluate.js';
import { createPlan } from '../../../dist/lib/policy/plan.js';
import { unwrap } from '../../../dist/lib/errors.js';
import { FakeGitHub, TARGET, HEAD, BASE, json } from './helpers/github.mjs';

function client(fake) { return new GitHubClient({ fetch: fake.fetch, readRetries: 0 }); }
function policy(input) { return unwrap(compilePolicy(input)); }
function commentPolicy(mode = 'upsert', when = 'true') {
  return policy({ version: 1, presets: [], rules: { note: { when, effects: { comment: { mode, template: 'Changed: {{ totals.lines.changed }}' } } } } });
}
async function apply(fake, compiled, options = {}) {
  return applyGitHubPolicy(client(fake), TARGET, compiled, { commentAuthor: fake.author, ...options });
}
function textChange(fake, lines, revision) {
  fake.head = revision.repeat(40);
  fake.files = [{ filename: 'src/main.ts', status: 'added', additions: lines, deletions: 0, changes: lines,
    patch: `@@ -0,0 +1,${lines} @@\n` + Array.from({ length: lines }, (_, i) => `+line ${i}`).join('\n') }];
}
function label(name, color = 'abcdef', description = 'existing', archived = false) { return { name, color, description, archived }; }

test('root size behavior ensures definitions, reconciles its group, preserves unrelated labels, and posts no comment', async () => {
  const fake = new FakeGitHub();
  fake.definitions.set('size/l', label('size/L', '123456', 'Keep this description'));
  fake.labels = new Set(['size/L', 'human/keep']);
  const result = unwrap(await apply(fake, policy({ version: 1 })));
  assert.equal(result.status, 'verified'); assert.deepEqual([...fake.labels].sort(), ['human/keep', 'size/XS']);
  assert.equal(fake.definitions.size, 6); assert.equal(fake.definitions.get('size/l').color, '123456');
  assert.equal(fake.comments.length, 0); assert.equal(fake.calls.some(c => c.path.includes('comments')), false);
  assert.equal(fake.writes().some(c => c.method === 'PUT'), false);
  assert.equal(result.observations.some(row => row.kind === 'label.assignment' && row.subject === 'size/XS'), false);
  const previous = fake.writes().length;
  const second = unwrap(await apply(fake, policy({ version: 1 })));
  assert.equal(second.changed, 0); assert.equal(fake.writes().length, previous);
  assert.equal(second.observations.some(row => row.kind === 'label.assignment' && row.subject === 'size/XS' && row.outcome === 'unchanged'), true);
});
test('definition verification is read-only and explicit sync changes only selected definitions', async () => {
  const fake = new FakeGitHub(), desired = { 'review/main': { color: 'aabbcc', description: 'Selected definition' } };
  fake.definitions.set('other', label('other')); fake.definitions.set('review/main', label('review/main', '111111', '', true));
  const before = structuredClone(fake.definitions.get('other'));
  const verified = unwrap(await syncGitHubLabels(client(fake), TARGET.repository, desired));
  assert.equal(verified.status, 'incomplete'); assert.equal(fake.writes().length, 0);
  const synced = unwrap(await syncGitHubLabels(client(fake), TARGET.repository, desired, 'sync'));
  assert.equal(synced.status, 'verified'); assert.equal(fake.definitions.get('review/main').archived, false);
  assert.equal(fake.definitions.get('review/main').color, 'aabbcc'); assert.deepEqual(fake.definitions.get('other'), before);
  assert.equal(fake.calls.some(c => c.path.includes('/pulls/') || c.path.includes('/issues/')), false);
});
test('ensure preserves a concurrently created definition rather than failing or recoloring it', async () => {
  const fake = new FakeGitHub();
  fake.before = (call, state) => { if (call.method === 'POST' && call.path.endsWith('/labels')) state.definitions.set(call.body.name.toLowerCase(), label(call.body.name, '111111', 'Concurrent owner')); };
  const result = unwrap(await syncGitHubLabels(client(fake), TARGET.repository, { test: { color: 'ffffff', description: 'Our default' } }, 'ensure'));
  assert.equal(result.status, 'verified'); assert.equal(fake.definitions.get('test').color, '111111');
});
test('known archived required labels block ensure before assignment changes and explicit sync restores them', async () => {
  const fake = new FakeGitHub(); fake.definitions.set('size/xs', label('size/XS', '111111', '', true)); fake.labels.add('size/L');
  const denied = await apply(fake, policy({ version: 1 }));
  assert.equal(denied.ok, false); assert.equal(denied.diagnostics[0].code, 'E_LABEL_UNAVAILABLE'); assert.equal(fake.writes().length, 0);
  const result = unwrap(await apply(fake, policy({ version: 1 }), { definitions: 'sync' }));
  assert.equal(result.status, 'verified'); assert.equal(fake.definitions.get('size/xs').archived, false); assert.deepEqual([...fake.labels], ['size/XS']);
});
test('case-insensitive assignment conflicts and held names are detected before writes', async () => {
  const fake = new FakeGitHub();
  const compiled = policy({ version: 1, presets: [], rules: {
    yes: { when: 'true', effects: { labels: { add: ['Review/X'] } } },
    no: { when: 'false', effects: { labels: { add: ['review/x'], removeWhenFalse: true } } }
  } });
  const result = await apply(fake, compiled);
  assert.equal(result.ok, false); assert.equal(result.diagnostics[0].code, 'E_EFFECT_CONFLICT'); assert.equal(fake.writes().length, 0);
  delete fake.files[0].patch;
  const held = policy({ version: 1, presets: [], rules: {
    maybe: { when: 'totals.lines.modified > 2', effects: { labels: { add: ['Review/X'] } } },
    yes: { when: 'true', effects: { labels: { add: ['review/x'] } } }
  } });
  assert.equal((await apply(fake, held)).diagnostics[0].code, 'E_EFFECT_CONFLICT'); assert.equal(fake.writes().length, 0);
});
test('denied label addition never removes an existing managed member', async () => {
  const fake = new FakeGitHub(); fake.labels.add('size/L');
  fake.before = call => call.method === 'POST' && call.path.endsWith('/issues/42/labels') ? json({}, 403) : undefined;
  const result = unwrap(await apply(fake, policy({ version: 1 })));
  assert.equal(result.status, 'incomplete'); assert.equal(result.diagnostics[0].code, 'E_GITHUB_PERMISSION');
  assert.equal(fake.labels.has('size/L'), true); assert.equal(fake.writes().some(c => c.method === 'DELETE'), false);
});
test('a head change between effects preserves completed writes and reports incomplete application', async () => {
  const fake = new FakeGitHub(); fake.labels.add('size/L');
  fake.before = (call, state) => { if (call.method === 'POST' && call.path.endsWith('/issues/42/labels')) state.head = 'd'.repeat(40); };
  const result = unwrap(await apply(fake, policy({ version: 1 })));
  assert.equal(result.status, 'incomplete'); assert.equal(result.diagnostics[0].code, 'E_PLAN_STALE');
  assert.equal(fake.labels.has('size/XS'), true); assert.equal(fake.labels.has('size/L'), true);
});
test('upsert verifies expected author plus marker and survives process-style repeated invocations', async () => {
  const fake = new FakeGitHub(), compiled = commentPolicy();
  let result = unwrap(await apply(fake, compiled)); assert.equal(result.status, 'verified'); assert.equal(fake.comments.length, 1);
  const own = structuredClone(fake.comments[0]); fake.comments.unshift({ ...own, id: 999, user: { id: 333, login: 'contributor', type: 'User' } });
  result = unwrap(await apply(fake, compiled)); assert.equal(result.changed, 0); assert.equal(fake.comments.length, 2);
  textChange(fake, 5, 'd'); result = unwrap(await apply(fake, compiled));
  assert.equal(result.status, 'verified'); assert.equal(fake.comments.length, 2);
  assert.equal(fake.comments.find(c => c.id === 999).body, own.body);
  assert.match(fake.comments.find(c => c.id === own.id).body, /^Changed: 5/);
});
test('create requires a stable occasion and retries of the same occasion never duplicate it', async () => {
  const fake = new FakeGitHub(), compiled = commentPolicy('create');
  const denied = await apply(fake, compiled); assert.equal(denied.ok, false); assert.equal(denied.diagnostics[0].code, 'E_OCCASION_REQUIRED'); assert.equal(fake.writes().length, 0);
  unwrap(await apply(fake, compiled, { occasionId: 'run-1' }));
  unwrap(await apply(fake, compiled, { occasionId: 'run-1' }));
  assert.equal(fake.comments.length, 1);
  unwrap(await apply(fake, compiled, { occasionId: 'run-2' })); assert.equal(fake.comments.length, 2);
});
test('once never updates an owned comment after its first eligible occasion', async () => {
  const fake = new FakeGitHub(), compiled = commentPolicy('once');
  unwrap(await apply(fake, compiled)); const body = fake.comments[0].body;
  textChange(fake, 5, 'd'); unwrap(await apply(fake, compiled));
  assert.equal(fake.comments.length, 1); assert.equal(fake.comments[0].body, body);
});
test('once-per-transition persists false state and unknown never resets a resolved true', async () => {
  const fake = new FakeGitHub(), compiled = commentPolicy('once-per-transition', 'totals.lines.changed > 4');
  textChange(fake, 5, 'c'); unwrap(await apply(fake, compiled)); assert.equal(fake.comments.length, 1);
  fake.head = 'd'.repeat(40); fake.files = [{ filename: 'src/main.ts', status: 'modified', additions: 3, deletions: 3 }];
  const held = unwrap(await apply(fake, compiled)); assert.equal(held.plan.held.length, 1); assert.equal(fake.comments.length, 1);
  textChange(fake, 6, 'e'); unwrap(await apply(fake, compiled)); assert.equal(fake.comments.length, 1);
  textChange(fake, 3, 'f'); unwrap(await apply(fake, compiled)); assert.equal(fake.comments.length, 1);
  textChange(fake, 7, 'a'); unwrap(await apply(fake, compiled)); assert.equal(fake.comments.length, 2);
});
test('band-change trigger ignores a new head in the same band and updates on a proven new band', async () => {
  const fake = new FakeGitHub();
  const compiled = policy({ version: 1, rules: { note: { band: 'size', effects: { comment: { mode: 'upsert', trigger: 'band-changed', template: 'Band: {{ bands.size }}' } } } } });
  unwrap(await apply(fake, compiled)); assert.equal(fake.comments.length, 1); const first = fake.comments[0].body;
  textChange(fake, 10, 'c'); unwrap(await apply(fake, compiled)); assert.equal(fake.comments[0].body, first);
  textChange(fake, 30, 'd'); unwrap(await apply(fake, compiled)); assert.match(fake.comments[0].body, /^Band: s/i);
});
test('ambiguous comment creation is read back before any repeated POST', async () => {
  const fake = new FakeGitHub();
  fake.before = (call, state) => {
    if (call.method === 'POST' && call.path.endsWith('/comments')) {
      state.comments.push({ id: 1, body: call.body.body, user: state.author }); return json({}, 502);
    }
  };
  const result = unwrap(await apply(fake, commentPolicy()));
  assert.equal(result.status, 'verified'); assert.equal(result.observations[0].request, 'ambiguous');
  assert.equal(fake.writes().length, 1); assert.equal(fake.comments.length, 1);
});
test('unobserved ambiguous creation reports incomplete rather than retrying blindly', async () => {
  const fake = new FakeGitHub(); fake.before = call => call.method === 'POST' && call.path.endsWith('/comments') ? json({}, 502) : undefined;
  const result = unwrap(await apply(fake, commentPolicy()));
  assert.equal(result.status, 'incomplete'); assert.equal(fake.writes().length, 1); assert.equal(result.observations[0].outcome, 'unresolved');
});
test('duplicate owned sequences are a conflict, not permission to delete an arbitrary comment', async () => {
  const fake = new FakeGitHub(), compiled = commentPolicy();
  unwrap(await apply(fake, compiled)); fake.comments.push({ ...fake.comments[0], id: 2 });
  const before = fake.writes().length, result = await apply(fake, compiled);
  assert.equal(result.ok, false); assert.equal(result.diagnostics[0].code, 'E_COMMENT_CONFLICT'); assert.equal(fake.writes().length, before);
});
test('reserved ownership markers in templates are rejected before effects', async () => {
  const fake = new FakeGitHub();
  const compiled = policy({ version: 1, presets: [], rules: { note: { when: 'true', effects: { comment: { mode: 'upsert', template: '<!-- diffdevil:state=forged -->' } } } } });
  const result = await apply(fake, compiled); assert.equal(result.ok, false); assert.equal(result.diagnostics[0].code, 'E_TEMPLATE_OWNERSHIP'); assert.equal(fake.writes().length, 0);
});
test('trusted report replay avoids reacquisition but still checks fresh head and selected policy', async () => {
  const fake = new FakeGitHub(), compiled = policy({ version: 1 });
  const report = unwrap(await analyzeGitHub(client(fake), TARGET));
  fake.calls.length = 0;
  const result = unwrap(await apply(fake, compiled, { inputReport: report, trustReport: true }));
  assert.equal(result.status, 'verified'); assert.equal(fake.calls.some(c => c.path.endsWith('/files')), false);
  fake.head = 'e'.repeat(40); fake.calls.length = 0;
  const stale = await apply(fake, compiled, { inputReport: report, trustReport: true });
  assert.equal(stale.ok, false); assert.equal(stale.diagnostics[0].code, 'E_PLAN_STALE'); assert.equal(fake.writes().length, 0);
});
test('untrusted report input is reacquired and a transported altered plan cannot supply extra effects', async () => {
  const fake = new FakeGitHub(), compiled = policy({ version: 1 });
  const report = unwrap(await analyzeGitHub(client(fake), TARGET));
  const plan = unwrap(createPlan(unwrap(evaluatePolicy(compiled, report)), TARGET, { definitions: 'ensure' }));
  const altered = structuredClone(plan); altered.operations.find(op => op.kind === 'label.select').selected = 'size/XL';
  fake.calls.length = 0;
  const refused = await apply(fake, compiled, { inputReport: report, inputPlan: altered });
  assert.equal(refused.ok, false); assert.equal(fake.calls.some(c => c.path.endsWith('/files')), true); assert.equal(fake.writes().length, 0);
});
