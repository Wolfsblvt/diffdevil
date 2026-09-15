import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compileShortcut, parseExpression, compileExpression, createEnvironment, environmentFromReport, evaluateExpression, recordType, recordValue, collection, sourcePosition } from '../dist/lib/language/index.js';
import { unwrap } from '../dist/lib/errors.js';
import { DEFAULT_LIMITS } from '../dist/lib/limits.js';
import { lexSource } from '../dist/lib/language/lexer.js';
import { parseInvocation } from '../dist/lib/cli/arguments.js';
import { formatQuery } from '../dist/lib/format.js';
import { detailParser } from '../dist/lib/language/parser.js';

const load = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const cases = suite => load(`spec/detail/v1/conformance/${suite}.json`).cases;
const empty = unwrap(createEnvironment({}, {}));
function environment(row) {
  if (!row.environment || row.environment === 'empty') return empty;
  if (row.environment.startsWith('report-')) return unwrap(environmentFromReport(load(`examples/reports/${row.environment.slice(7)}.json`)));
  const types = row.environment === 'boolean-parameters' ? { a: 'boolean', b: 'boolean' } : { items: collection('integer') };
  return unwrap(createEnvironment({ params: recordType(types) }, { params: recordValue(row.bindings) }));
}
const failure = (result, code, phase) => {
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.equal(result.diagnostics[0].code, code);
  if (phase) assert.equal(result.diagnostics[0].phase, phase);
};
for (const row of cases('syntax-valid')) test(`conformance syntax-valid/${row.id}`, () => {
  assert.equal(unwrap(parseExpression(row.source)).kind, row.expectRoot);
});
for (const row of cases('syntax-invalid')) test(`conformance syntax-invalid/${row.id}`, () => {
  failure(parseExpression(row.source), row.code, row.phase);
});
for (const row of cases('ast')) test(`conformance ast/${row.id}`, () => {
  assert.deepEqual(unwrap(parseExpression(row.source)), row.expectAst);
});
for (const row of cases('binding-invalid')) test(`conformance binding-invalid/${row.id}`, () => {
  failure(compileExpression(row.source, { environment: environment(row).schema, context: row.context }), row.code);
});
for (const suite of ['evaluation', 'boolean-truth-tables', 'collections']) {
  for (const row of cases(suite)) test(`conformance ${suite}/${row.id}`, () => {
    const env = environment(row);
    const compiled = unwrap(compileExpression(row.source, { environment: env.schema }));
    const result = evaluateExpression(compiled, env);
    if (row.expect.error) return failure(result, row.expect.error);
    const evaluated = unwrap(result);
    assert.deepEqual(evaluated.value, row.expect.value);
    for (const code of row.expect.requiredEvidenceCodes ?? []) assert.ok(evaluated.evidence.some(note => note.code === code), code);
  });
}
for (const row of cases('source-positions').filter(row => row.source !== undefined)) test(`conformance source-positions/${row.id}`, () => {
  const result = compileExpression(row.source, { environment: {} });
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics[0].range, row.expectRange);
  assert.equal(row.source.slice(row.expectRange.start, row.expectRange.end), row.selectedText);
  if (row.expectLine) assert.deepEqual(sourcePosition(row.source, row.expectRange.start), { line: row.expectLine, column: row.expectColumn });
});

test('Chevrotain self-analysis, strict lexer and CST locations are production evidence', () => {
  const input = { text: 'sum([1, 2, 3])\r\n + 4', language: 'diffdevil-expr/1', name: 'test.ddexpr' };
  const tokens = lexSource(input);
  assert.equal(tokens.at(-1).image, '4');
  assert.equal(tokens.at(-1).startLine, 2);
  assert.equal(tokens.at(-1).startColumn, 4);
  detailParser.prepare(input, tokens, DEFAULT_LIMITS);
  try {
    const cst = detailParser.source();
    assert.equal(detailParser.errors.length, 0);
    assert.equal(cst.name, 'source');
    // Chevrotain 13's virtual EOF has unavailable (-1) offsets. The expression
    // child, not that virtual token, supplies the semantic source interval.
    assert.equal(cst.children.expression[0].location.startOffset, 0);
    assert.equal(cst.children.expression[0].location.endOffset, input.text.length - 1);
    assert.equal(cst.children.expression[0].children.conditional[0].name, 'conditional');
  } finally { detailParser.release(); }
  assert.equal(unwrap(parseExpression(input)).span.source, 'test.ddexpr');
});

test('token prefixes, literal numeric types, escaped keys and complete AST children', () => {
  for (const name of ['inside', 'trueish', 'falsehood', 'nullish']) assert.equal(unwrap(parseExpression(name)).kind, 'identifier');
  assert.equal(unwrap(parseExpression('1e0')).literalType, 'float');
  assert.equal(unwrap(parseExpression('1.0')).literalType, 'float');
  assert.equal(unwrap(parseExpression('map([1,2,3], x => {"a": x, b: x + 1})')).arguments.length, 2);
  const record = unwrap(parseExpression('{"\\u0061": 1, b: 2, c: 3}'));
  assert.deepEqual(record.fields.map(f => f.key), ['a','b','c']);
  assert.equal(unwrap(parseExpression('metrics["hello-world"]')).key, 'hello-world');
  const unary = unwrap(parseExpression('!-+1'));
  assert.equal(unary.operator, '!'); assert.equal(unary.operand.operator, '-'); assert.equal(unary.operand.operand.operator, '+');
});

test('malformed or unsafe literals never turn into executable prefixes', () => {
  for (const text of ['01','1e','1.','0x10','1_000','42foo','1e+','9007199254740992','1e999']) failure(parseExpression(text), 'E_NUMBER_LITERAL');
  for (const text of ['"\\x41"', '"\\uD800"', '"\ud800"', '"\\uDC00"', "'unclosed", '"a\u0000b"']) failure(parseExpression(text), 'E_STRING');
  for (const text of ['1;2','1 & 2','`abc`','x = 1']) failure(parseExpression(text), 'E_LEX_CHARACTER');
  for (const text of ['[1,]', '{a:1,}', 'abs(1,)', 'a[0]', 'a[b]', '(f)(1)', '0<1<2','a==b==c','x => x']) assert.equal(parseExpression(text).ok, false, text);
  assert.equal(unwrap(parseExpression('"\\uD83D\\uDE00"')).value, '😀');
  assert.equal(unwrap(parseExpression('"${{ github.ref }}"')).value, '${{ github.ref }}');
});

test('leading BOM preserves original offsets and only one leading BOM is accepted', () => {
  assert.deepEqual(unwrap(parseExpression('\uFEFF 12')).span, { start: 2, end: 4 });
  assert.deepEqual(compileExpression('\uFEFFmissing', { environment: {} }).diagnostics[0].range, { start: 1, end: 8 });
  failure(parseExpression('\uFEFF\uFEFF1'), 'E_LEX_CHARACTER');
});

test('limits hold before recursive parsing and recover without poisoning the shared parser', () => {
  for (const text of ['('.repeat(1000)+'1'+')'.repeat(1000), '['.repeat(1000)+'1'+']'.repeat(1000), '!'.repeat(1000)+'true', 'true?1:'.repeat(1000)+'2']) {
    failure(parseExpression(text), 'E_LIMIT');
    assert.equal(unwrap(parseExpression('2')).value, 2);
  }
  failure(parseExpression('1+2', { limits: { ...DEFAULT_LIMITS, expressionBytes: 2 } }), 'E_LIMIT');
  failure(parseExpression('1+2', { limits: { ...DEFAULT_LIMITS, tokens: 2 } }), 'E_LIMIT');
  failure(parseExpression('[1,2,3]', { limits: { ...DEFAULT_LIMITS, astNodes: 3 } }), 'E_LIMIT');
  for (let i=0;i<25;i++) { assert.equal(parseExpression('sum([1,').ok, false); assert.equal(unwrap(parseExpression('sum([1,2,3])')).arguments[0].items.length, 3); }
});

for (const row of cases('shortcuts')) test(`conformance shortcuts/${row.id}`, () => {
  if (row.error) {
    assert.throws(() => parseInvocation(row.argv), error => error.diagnostic?.code === row.error);
    return;
  }
  let exercised = 0;
  for (const fixture of ['exact','bounded','incomplete','unmeasurable']) {
    const env = environment({environment:`report-${fixture}`});
    const invocation = parseInvocation(row.argv);
    if (invocation.shortcut.scope && !Object.hasOwn(env.schema.scopes.fields, invocation.shortcut.scope)) continue;
    const generated = unwrap(compileShortcut(invocation.shortcut, {environment:env.schema}));
    const authored = unwrap(compileExpression(row.equivalentExpression, {environment:env.schema,context:invocation.command==='check'?'condition':'query'}));
    assert.deepEqual(generated.resultType, authored.resultType);
    const actual = unwrap(evaluateExpression(generated,env)), expected = unwrap(evaluateExpression(authored,env));
    assert.deepEqual(actual.value,expected.value);
    assert.deepEqual(actual.evidence,expected.evidence);
    assert.deepEqual(formatQuery(actual,{command:invocation.command}),formatQuery(expected,{command:invocation.command}));
    exercised++;
  }
  assert.ok(exercised > 0);
});

test('mixed operators preserve written order, associativity and conditional branches', () => {
  for (const [source, expected] of [
    ['10 - 3 + 2 - 4', 5],
    ['40 / 5 * 2', 16],
    ['40 % 6 * 3 / 2', 6],
    ['2 + 3 * 4 - 10 / 2', 9],
    ['false ? 1 : true ? 2 : 3', 2],
    ['true ? false ? 1 : 2 : 3', 2],
    ['sum(map([1, 2, 3], x => x * 2))', 12],
  ]) {
    const program = unwrap(compileExpression(source, { environment: empty.schema }));
    assert.equal(unwrap(evaluateExpression(program, empty)).value.measurement.value, expected, source);
  }
});

test('parentheses and escaped member keys retain exact original UTF-16 ranges', () => {
  const syntax = unwrap(parseExpression('((1 + 2)) * 3'));
  assert.deepEqual(syntax.span, { start: 0, end: 13 });
  assert.deepEqual(syntax.left.span, { start: 0, end: 9 });
  assert.deepEqual(syntax.operatorSpan, { start: 10, end: 11 });
  const source = 'metrics["\\u0061"]';
  const member = unwrap(parseExpression(source));
  assert.equal(member.key, 'a');
  assert.equal(source.slice(member.keySpan.start, member.keySpan.end), '"\\u0061"');
  const duplicate = '{"a": 1, "\\u0061": 2}';
  failure(compileExpression(duplicate, { environment: {} }), 'E_DUPLICATE_FIELD', 'bind');
});
