import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseDocument, stringify } from 'yaml';
import { compilePolicy, readPolicyYaml, evaluatePolicy, evaluatePolicyQuery } from '../../../dist/lib/policy/index.js';
import { policyRange, locatePolicyDiagnostic } from '../../../dist/lib/policy/source.js';
import { yamlScalarLocation } from '../../../dist/lib/policy/yaml-source-map.js';
import { unwrap } from '../../../dist/lib/errors.js';
import { DEFAULT_LIMITS } from '../../../dist/lib/limits.js';

const fixture = JSON.parse(readFileSync('docs/examples/reports/exact.json', 'utf8'));
const failure = (result, code) => {
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, code, JSON.stringify(result.diagnostics));
  return result.diagnostics[0];
};
const compile = text => compilePolicy(unwrap(readPolicyYaml(text, { name: 'policy.yml' })));
const prefix = 'version: 1\npresets: []\nmetrics:\n  weighted:\n    formula: ';

for (const row of JSON.parse(readFileSync('src/diffdevil/contracts/detail/v1/conformance/source-positions.json', 'utf8')).cases.filter(row => row.container)) {
  test(`conformance source-positions/${row.id}`, () => {
    const source = unwrap(readPolicyYaml(row.container));
    const path = '/' + Object.keys(source.document)[0];
    assert.equal(source.document[path.slice(1)], row.decoded);
    const range = policyRange(source, path, row.expectDecodedRange);
    assert.deepEqual({ start: range.start, end: range.end }, row.expectOriginalRange);
    assert.equal(row.container.slice(range.start, range.end), row.id === 'yaml-quoted-escape' ? '\\u0061' : row.selectedText);
  });
}

test('YAML, JSON-compatible input and objects converge on the same compiled policy', () => {
  const text = '\uFEFF' + prefix + 'totals.lines.deleted + 2 * totals.lines.modified\n';
  const source = unwrap(readPolicyYaml(text));
  const policy = unwrap(compilePolicy(source));
  assert.equal(policy.id, unwrap(compilePolicy(source.document)).id);
  assert.equal(unwrap(evaluatePolicy(policy, fixture)).report.metrics.weighted.value, 1048);
  assert.throws(() => { source.document.version = 2; }, TypeError);
  for (const filename of ['minimal', 'thresholds', 'full', 'comments-opt-in']) {
    const data = unwrap(readPolicyYaml(readFileSync(`docs/examples/policies/${filename}.yml`, 'utf8')));
    assert.equal(compilePolicy(data).ok, true, filename);
  }
});

test('YAML errors keep duplicate keys, invalid tags, cyclic aliases, and versions distinct from numeric evidence', () => {
  failure(readPolicyYaml('version: 1\nversion: 1\n'), 'E_CONFIG_DUPLICATE');
  for (const text of [
    'x: !host hi', 'x: !!timestamp 2020-01-01', 'x: !!binary SGk=',
    'x: &cycle [*cycle]', 'x: *absent', '%YAML 1.1\n---\nversion: 1',
    'version: 1\n---\nversion: 1', '? [a, b]\n: value', '\uFEFF\uFEFFversion: 1',
  ]) failure(readPolicyYaml(text), 'E_CONFIG_YAML');
  failure(readPolicyYaml('__proto__: {}'), 'E_CONFIG');
  failure(readPolicyYaml('x: 9007199254740993'), 'E_INTEGER_OVERFLOW');
  failure(readPolicyYaml('x: 0x20000000000001'), 'E_INTEGER_OVERFLOW');
  for (const n of ['.inf', '-.Inf', '.NaN', '1e400']) failure(readPolicyYaml('x: ' + n), 'E_FLOAT_OVERFLOW');
  assert.equal(unwrap(readPolicyYaml('x: "A\uFEFFB"')).document.x, 'A\uFEFFB');
  assert.equal(unwrap(readPolicyYaml('x: !!str 001')).document.x, '001');
});

test('YAML is bounded before recursive composition and during alias expansion', () => {
  failure(readPolicyYaml('x: ' + '['.repeat(5000) + '0' + ']'.repeat(5000)), 'E_LIMIT');
  failure(readPolicyYaml('a: &value [1, 2]\nb: [*value, *value]', { limits: { ...DEFAULT_LIMITS, expandedYamlAliases: 1 } }), 'E_LIMIT');
  failure(readPolicyYaml('version: 1', { limits: { ...DEFAULT_LIMITS, configBytes: 3 } }), 'E_LIMIT');
  const long = 'a: &a "' + 'x'.repeat(100) + '"\nb: [' + Array(10).fill('*a').join(',') + ']';
  failure(readPolicyYaml(long, { limits: { ...DEFAULT_LIMITS, configBytes: 500 } }), 'E_LIMIT');
});

test('ordinary aliases retain declaration positions and related use sites through compile and evaluation', () => {
  const text = 'version: 1\npresets: []\nparameters:\n  formula:\n    type: string\n    default: &bad totals.lines.modifed\nmetrics:\n  a:\n    formula: *bad\n';
  const d = failure(compile(text), 'E_UNKNOWN_FIELD');
  assert.equal(d.configPath, '/metrics/a/formula');
  assert.equal(text.slice(d.range.start, d.range.end), 'modifed');
  assert.equal(d.related.length, 1);
  assert.equal(text.slice(d.related[0].range.start, d.related[0].range.end), '*bad');
  const valid = text.replace('totals.lines.modifed', '1 / 0');
  const runtime = failure(evaluatePolicy(unwrap(compile(valid)), fixture), 'E_DIVIDE_ZERO');
  assert.equal(valid.slice(runtime.range.start, runtime.range.end), '1 / 0');
  assert.equal(valid.slice(runtime.related[0].range.start, runtime.related[0].range.end), '*bad');
});

for (const [name, scalar, selected] of [
  ['plain', 'totals.lines.modifed', 'modifed'],
  ['escaped', '"totals.lines.\\u006Dodifed"', '\\u006Dodifed'],
  ['single quoted', "'totals.lines.modifed'", 'modifed'],
  ['flow folded', '"totals.lines.\n      modifed"', 'modifed'],
  ['escaped line break', '"totals.lines.\\\n      modifed"', 'modifed'],
  ['literal', '|-\n      totals.lines.modifed\n', 'modifed'],
  ['folded', '>-\n      totals.lines.\n      modifed\n', 'modifed'],
  ['explicit indentation', '>2-\n      totals.lines.\n      modifed\n', 'modifed'],
]) test(`YAML ${name} diagnostics identify the original member characters`, () => {
  const text = (prefix + scalar + '\n').replaceAll('\n', '\r\n');
  const d = failure(compile(text), 'E_UNKNOWN_FIELD');
  assert.equal(d.precision, 'character');
  assert.equal(d.range.source, 'policy.yml');
  assert.equal(text.slice(d.range.start, d.range.end), selected);
});

test('source mapping preserves every scalar style, Unicode unit, blank line, indentation and chomping', () => {
  const values = ['hello', 'a\nb', 'a\n\nb', '\na\n', '\n\n', 'a\n b\nc\n\n', '😀 e\u0301\n end', 'a\t\n b', 'a\\b " c\0\n'];
  for (const type of ['PLAIN', 'QUOTE_SINGLE', 'QUOTE_DOUBLE', 'BLOCK_LITERAL', 'BLOCK_FOLDED']) {
    for (const value of values) {
      const text = stringify({ expression: value }, { defaultStringType: type, lineWidth: 12 });
      const node = parseDocument(text, { keepSourceTokens: true }).get('expression', true);
      const location = yamlScalarLocation(node, text, 'test.yml');
      assert.ok(location.characters, `Mapping absent: ${type} ${JSON.stringify(text)}`);
      assert.equal(location.characters.length, value.length);
      for (const c of location.characters) assert.ok(c.start >= 0 && c.end <= text.length && c.end >= c.start);
    }
  }
});

test('YAML parse and template diagnostics preserve decoded details and scalar fallback is explicit', () => {
  const text = prefix + '"1 +"';
  const d = failure(compile(text), 'E_PARSE');
  assert.equal(d.range.start, text.length - 1);
  assert.equal(d.range.end, text.length - 1);
  const source = unwrap(readPolicyYaml('x: 123'));
  const fallback = locatePolicyDiagnostic(source, { code: 'E_TYPE', phase: 'type', severity: 'error', message: 'type', configPath: '/x', range: {start: 0,end:1} });
  assert.equal(fallback.precision, 'scalar');
  assert.deepEqual(fallback.details.decodedRange, {start:0,end:1});
});
