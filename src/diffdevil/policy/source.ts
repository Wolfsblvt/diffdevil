import { capture, DiffdevilError, fail } from '../errors.js';
import { deepFreeze, inertCopy } from '../inert.js';
import { DEFAULT_LIMITS, enforceBytes, type EvaluationLimits } from '../limits.js';
import type { Diagnostic, Result, SourceRange } from '../model.js';
import { sourcePosition } from '../language/source.js';
import type { Ast } from '../language/ast.js';
import { pointer } from './validation.js';

/** A parsed inert authoring document with process-local source locations. */
export interface PolicySource {
  readonly kind: 'diffdevil.policy-source'; readonly format: 'json' | 'yaml';
  readonly name: string; readonly document: unknown;
}
export interface PolicyLocation {
  readonly range: SourceRange;
  readonly boundaries?: readonly number[];
  readonly characters?: readonly { readonly start: number; readonly end: number }[];
  readonly emptyOffset?: number;
  readonly related?: Diagnostic['related'];
}
interface SourceState { readonly text: string; readonly locations: ReadonlyMap<string, PolicyLocation> }
const sources = new WeakMap<PolicySource, SourceState>();
/** Internal construction shared by authoring loaders; never exported as a package entry. */
export function createPolicySource(format: PolicySource['format'], name: string, document: unknown, text: string, locations: ReadonlyMap<string, PolicyLocation>, limits: EvaluationLimits): PolicySource {
  const source = deepFreeze({ kind: 'diffdevil.policy-source' as const, format, name, document: inertCopy(document, { maximumDepth: limits.nestingDepth, code: 'E_CONFIG' }) });
  sources.set(source, { text, locations });
  return source;
}
export function isPolicySource(value: unknown): value is PolicySource {
  return value !== null && typeof value === 'object' && sources.has(value as PolicySource);
}
/** JSON.parse owns syntax. This bounded token walk adds duplicate/numeric checks and locations. */
export function readPolicyJson(text: string, options: { readonly name?: string; readonly limits?: EvaluationLimits } = {}): Result<PolicySource> {
  return capture(() => {
    if (typeof text !== 'string') fail('E_CONFIG', 'Policy JSON must be text.', 'config');
    const limits = options.limits ?? DEFAULT_LIMITS, name = options.name ?? 'policy.json';
    enforceBytes(text, limits.configBytes, 'Policy JSON', 'config');
    let i = text.charCodeAt(0) === 0xfeff ? 1 : 0;
    let document: unknown;
    try { document = JSON.parse(text.slice(i)); }
    catch { fail('E_CONFIG_JSON', 'Policy input is not valid JSON.', 'config', { source: name, start: i, end: text.length }); }
    const locations = new Map<string, PolicyLocation>();
    const skip = (): void => { while (/[ \t\r\n]/.test(text[i] ?? '!')) i++; };
    const issue = (code: string, message: string, path: string, start: number, end: number): never => {
      throw new DiffdevilError({ code, message, phase: 'config', severity: 'error', configPath: path || '/', range: { source: name, start, end }, precision: 'character', details: sourcePosition(text, start) });
    };
    const stringToken = (): { value: string; location: PolicyLocation } => {
      const start = i++; const boundaries = [i];
      while (text[i] !== '"') {
        if (text[i] === '\\') i += text[i + 1] === 'u' ? 6 : 2;
        else i++;
        boundaries.push(i);
      }
      i++;
      return { value: JSON.parse(text.slice(start, i)) as string, location: { range: { source: name, start, end: i }, boundaries } };
    };
    const value = (path: string, depth: number): void => {
      skip(); const start = i;
      if (depth > limits.nestingDepth) issue('E_LIMIT', 'Policy JSON nesting limit exceeded.', path, start, start);
      if (text[i] === '{') {
        i++; skip(); const keys = new Set<string>();
        while (text[i] !== '}') {
          const key = stringToken(); const member = pointer(path, key.value);
          if (keys.has(key.value)) issue('E_CONFIG_DUPLICATE', `Duplicate JSON property ${key.value}.`, member, key.location.range.start, key.location.range.end);
          keys.add(key.value); skip(); i++; value(member, depth + 1); skip();
          if (text[i] === ',') { i++; skip(); }
        }
        i++;
      } else if (text[i] === '[') {
        i++; skip(); let index = 0;
        while (text[i] !== ']') { value(pointer(path, String(index++)), depth + 1); skip(); if (text[i] === ',') { i++; skip(); } }
        i++;
      } else if (text[i] === '"') {
        const token = stringToken(); locations.set(path, token.location); return;
      } else {
        const token = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(i))![0];
        i += token.length;
        if (/^-?\d/.test(token)) {
          const number = Number(token);
          if (!Number.isFinite(number)) issue('E_FLOAT_OVERFLOW', 'JSON number is not finite.', path, start, i);
          if (!/[.eE]/.test(token) && !Number.isSafeInteger(number)) issue('E_INTEGER_OVERFLOW', 'JSON integer cannot be represented exactly.', path, start, i);
        }
      }
      locations.set(path, { range: { source: name, start, end: i } });
    };
    value('', 0);
    return createPolicySource('json', name, document, text, locations, limits);
  });
}
export function policyRange(source: PolicySource, path: string, range?: SourceRange): SourceRange | undefined {
  const location = sources.get(source)?.locations.get(path);
  if (!location) return undefined;
  const characters = location.characters;
  if (range && characters && range.start >= 0 && range.end >= range.start && range.end <= characters.length) {
    const start = characters[range.start]?.start ?? characters.at(-1)?.end ?? location.emptyOffset ?? location.range.start;
    const end = range.end === range.start ? start : characters[range.end - 1]!.end;
    return { source: source.name, start, end };
  }
  const positions = location.boundaries;
  if (range && positions && range.start >= 0 && range.end >= range.start && range.end < positions.length) {
    return { source: source.name, start: positions[range.start]!, end: positions[range.end]! };
  }
  return location.range;
}
export function locatePolicyDiagnostic(source: PolicySource, diagnostic: Diagnostic): Diagnostic {
  const state = sources.get(source)!;
  const authored = state.locations.get(diagnostic.configPath ?? '');
  const related = authored?.related;
  if (diagnostic.range?.source === source.name) return { ...diagnostic, ...(related ? { related: [...(diagnostic.related ?? []), ...related] } : {}), details: { ...diagnostic.details, ...sourcePosition(state.text, diagnostic.range.start) } };
  let path = diagnostic.configPath ?? '';
  let range = policyRange(source, path, diagnostic.range);
  // Missing properties and semantic declaration errors anchor to the nearest authored node.
  while (!range && path) { path = path.slice(0, path.lastIndexOf('/')); range = policyRange(source, path); }
  const exact = Boolean(state.locations.get(path)?.boundaries || state.locations.get(path)?.characters);
  return range ? { ...diagnostic, range, precision: diagnostic.range && exact ? 'character' : 'scalar',
    ...(related ? { related: [...(diagnostic.related ?? []), ...related] } : {}),
    details: { ...diagnostic.details, ...(diagnostic.range ? { decodedRange: diagnostic.range } : {}), ...sourcePosition(state.text, range.start) } } : diagnostic;
}
/** Rebase syntax once, so binder, type checker and interpreter retain original file offsets. */
export function locatePolicyAst(source: PolicySource, path: string, node: Ast): Ast {
  const location = sources.get(source)?.locations.get(path);
  if (!location?.boundaries && !location?.characters) return node;
  const span = (range: SourceRange): SourceRange => policyRange(source, path, range) ?? range;
  const child = (value: Ast): Ast => locatePolicyAst(source, path, value);
  const base = { ...node, span: span(node.span) };
  switch (node.kind) {
    case 'literal': case 'identifier': return base as Ast;
    case 'member': return { ...node, span: base.span, keySpan: span(node.keySpan), object: child(node.object) };
    case 'unary': return { ...node, span: base.span, operatorSpan: span(node.operatorSpan), operand: child(node.operand) };
    case 'binary': return { ...node, span: base.span, operatorSpan: span(node.operatorSpan), left: child(node.left), right: child(node.right) };
    case 'conditional': return { ...node, span: base.span, condition: child(node.condition), whenTrue: child(node.whenTrue), whenFalse: child(node.whenFalse) };
    case 'call': return { ...node, span: base.span, nameSpan: span(node.nameSpan), arguments: node.arguments.map(child) };
    case 'lambda': return { ...node, span: base.span, parameterSpan: span(node.parameterSpan), body: child(node.body) };
    case 'list': return { ...node, span: base.span, items: node.items.map(child) };
    case 'record': return { ...node, span: base.span, fields: node.fields.map(field => ({ key: field.key, keySpan: span(field.keySpan), value: child(field.value) })) };
  }
}
