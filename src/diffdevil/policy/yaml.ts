import { isAlias, isMap, isNode, isScalar, isSeq, Composer, Parser, CST, type Node, type Scalar } from 'yaml';
import { capture, DiffdevilError, fail } from '../errors.js';
import { FORBIDDEN_KEYS } from '../inert.js';
import { DEFAULT_LIMITS, byteLength, enforceBytes, type EvaluationLimits } from '../limits.js';
import type { Diagnostic, Result, SourceRange } from '../model.js';
import { sourcePosition } from '../language/source.js';
import { createPolicySource, type PolicyLocation, type PolicySource } from './source.js';
import { pointer } from './validation.js';
import { yamlScalarLocation } from './yaml-source-map.js';

const CORE_TAGS = new Set(['str', 'int', 'float', 'bool', 'null', 'map', 'seq'].map(name => `tag:yaml.org,2002:${name}`));

/** Parse one inert YAML 1.2 core document and retain original UTF-16 coordinates. */
export function readPolicyYaml(text: string, options: { readonly name?: string; readonly limits?: EvaluationLimits } = {}): Result<PolicySource> {
  return capture(() => {
    if (typeof text !== 'string') fail('E_CONFIG', 'Policy YAML must be text.', 'config');
    const limits = options.limits ?? DEFAULT_LIMITS, name = options.name ?? '.diffdevil.yml';
    enforceBytes(text, limits.configBytes, 'Policy YAML', 'config');
    const issue = (code: string, message: string, range: SourceRange, path?: string): never => {
      throw new DiffdevilError({ code, message, phase: 'config', severity: 'error', range, precision: 'character',
        ...(path === undefined ? {} : { configPath: path || '/' }), details: sourcePosition(text, range.start) });
    };
    const bom = text.charCodeAt(0) === 0xfeff && text.charCodeAt(1) === 0xfeff ? 1 : -1;
    if (bom >= 0) issue('E_CONFIG_YAML', 'Only one leading byte order mark is allowed in YAML input.', { source: name, start: bom, end: bom + 1 });
    const composer = new Composer({
      version: '1.2', schema: 'core', keepSourceTokens: true, intAsBigInt: true,
      uniqueKeys: true, strict: true, prettyErrors: false, merge: false, resolveKnownTags: false,
    });
    // The package's iterative CST parser runs before recursive composition, so
    // deeply nested input reaches the configured limit, not the JS call stack.
    function* checkedTokens(): Generator<CST.Token> {
      for (const token of new Parser().parse(text)) {
        const pending = [{ token, depth: 0 }];
        while (pending.length) {
          const current = pending.pop()!;
          if (current.depth > limits.nestingDepth) issue('E_LIMIT', 'YAML nesting exceeds the selected limit.', { source: name, start: current.token.offset, end: current.token.offset });
          if (current.token.type === 'document' && current.token.value) pending.push({ token: current.token.value, depth: current.depth });
          else if (CST.isCollection(current.token)) for (const item of current.token.items) {
            if (item.key) pending.push({ token: item.key, depth: current.depth + 1 });
            if (item.value) pending.push({ token: item.value, depth: current.depth + 1 });
          }
        }
        yield token;
      }
    }
    const documents = composer.compose(checkedTokens(), true, text.length);
    const first = documents.next();
    if (first.done) fail('E_CONFIG_YAML', 'Policy input must contain one YAML document.', 'config');
    const document = first.value;
    const second = documents.next();
    if (!second.done) issue('E_CONFIG_YAML', 'Policy input must contain only one YAML document.', { source: name, start: second.value.range[0], end: second.value.range[1] });
    const problem = document.errors[0] ?? document.warnings[0];
    if (problem) issue(problem.code === 'DUPLICATE_KEY' ? 'E_CONFIG_DUPLICATE' : 'E_CONFIG_YAML', problem.message, { source: name, start: problem.pos[0], end: problem.pos[1] });
    if (document.directives.yaml.version !== '1.2') issue('E_CONFIG_YAML', 'Policies require YAML 1.2 core semantics.', { source: name, start: 0, end: Math.max(0, text.indexOf('\n')) });
    const locations = new Map<string, PolicyLocation>(), active = new Set<Node>();
    let aliases = 0, expandedBytes = 0;
    const rangeOf = (node: Node): SourceRange => ({ source: name, start: node.range?.[0] ?? 0, end: node.range?.[1] ?? node.range?.[0] ?? 0 });
    const charge = (value: string, node: Node, path: string): void => {
      expandedBytes += byteLength(value);
      if (expandedBytes > limits.configBytes) issue('E_LIMIT', 'Expanded YAML exceeds the selected configuration byte budget.', rangeOf(node), path);
    };
    const scalar = (node: Scalar, path: string): unknown => {
      const value: unknown = node.value;
      if (typeof value === 'bigint') {
        if (value < BigInt(Number.MIN_SAFE_INTEGER) || value > BigInt(Number.MAX_SAFE_INTEGER)) issue('E_INTEGER_OVERFLOW', 'YAML integer cannot be represented exactly.', rangeOf(node), path);
        return Number(value);
      }
      if (typeof value === 'number' && !Number.isFinite(value)) issue('E_FLOAT_OVERFLOW', 'YAML numbers must be finite.', rangeOf(node), path);
      if (value !== null && !['string', 'number', 'boolean'].includes(typeof value)) issue('E_CONFIG_YAML', 'Only core YAML scalar values are supported.', rangeOf(node), path);
      charge(typeof value === 'string' ? value : String(value), node, path);
      return value;
    };
    const walk = (value: unknown, path: string, depth: number, related: NonNullable<Diagnostic['related']> = []): unknown => {
      if (value === null) return null;
      if (!isNode(value)) fail('E_CONFIG_YAML', 'Expected a parsed YAML node.', 'config');
      const node = value;
      if (depth > limits.nestingDepth) issue('E_LIMIT', 'YAML nesting exceeds the selected limit.', rangeOf(node), path);
      if (active.has(node)) issue('E_CONFIG_YAML', 'Cyclic YAML aliases are not allowed.', rangeOf(node), path);
      if (node.tag && !CORE_TAGS.has(node.tag)) issue('E_CONFIG_YAML', 'Only YAML 1.2 core tags are supported.', rangeOf(node), path);
      if (isAlias(node)) {
        if (++aliases > limits.expandedYamlAliases) issue('E_LIMIT', 'YAML alias expansion exceeds the selected limit.', rangeOf(node), path);
        const target = node.resolve(document);
        if (!target) issue('E_CONFIG_YAML', `Unresolved YAML alias ${node.source}.`, rangeOf(node), path);
        active.add(node);
        const result = walk(target, path, depth + 1, [...related, { message: `Alias ${node.source} used here.`, range: rangeOf(node) }]);
        active.delete(node); return result;
      }
      active.add(node);
      charge('[]', node, path);
      const location = isScalar(node) ? yamlScalarLocation(node, text, name) : { range: rangeOf(node) };
      locations.set(path, { ...location, ...(related.length ? { related } : {}) });
      let result: unknown;
      if (isScalar(node)) result = scalar(node, path);
      else if (isSeq(node)) result = node.items.map((item, index) => walk(item, pointer(path, String(index)), depth + 1, related));
      else if (isMap(node)) {
        const output: Record<string, unknown> = Object.create(null);
        for (const pair of node.items) {
          if (!isScalar(pair.key) || typeof pair.key.value !== 'string') return issue('E_CONFIG_YAML', 'Policy mapping keys must be strings.', isNode(pair.key) ? rangeOf(pair.key) : rangeOf(node), path);
          const key = pair.key.value as string, member = pointer(path, key);
          if (FORBIDDEN_KEYS.has(key)) issue('E_CONFIG', `Forbidden input key: ${key}.`, rangeOf(pair.key), member);
          if (Object.hasOwn(output, key)) issue('E_CONFIG_DUPLICATE', `Duplicate YAML property ${key}.`, rangeOf(pair.key), member);
          charge(key, pair.key, member);
          output[key] = walk(pair.value, member, depth + 1, related);
          if (!locations.has(member)) locations.set(member, { range: rangeOf(pair.key), ...(related.length ? { related } : {}) });
        }
        result = output;
      } else issue('E_CONFIG_YAML', 'Unsupported YAML node.', rangeOf(node), path);
      active.delete(node); return result;
    };
    return createPolicySource('yaml', name, walk(document.contents, '', 0), text, locations, limits);
  });
}
