import { fail } from '../errors.js';
import { canonicalJson } from '../inert.js';
import type { SourceRange, TypeDescriptor as Type } from '../model.js';
export type { TypeDescriptor as Type } from '../model.js';
export type Schema = Readonly<Record<string, Type>>;
export const optional = (item: Type): Type => typeof item === 'object' && item.kind === 'optional' ? item : { kind: 'optional', item };
export const collection = (item: Type): Type => ({ kind: 'collection', item });
export const recordType = (fields: Schema): Type => ({ kind: 'record', fields });
export const isNumeric = (type: Type): type is 'integer' | 'float' => type === 'integer' || type === 'float';
export const isOptional = (type: Type): type is { kind: 'optional'; item: Type } => typeof type === 'object' && type.kind === 'optional';
export const present = (type: Type): Type => isOptional(type) ? type.item : type;
export const sameType = (a: Type, b: Type): boolean => canonicalJson(a) === canonicalJson(b);
export function typeName(type: Type): string {
  if (typeof type === 'string') return type;
  if (type.kind === 'record') return `{${Object.entries(type.fields).map(([key, value]) => `${key}: ${typeName(value)}`).join(', ')}}`;
  return `${type.kind}<${typeName(type.item)}>`;
}
export function joinTypes(a: Type, b: Type, range?: SourceRange): Type {
  if (a === 'never') return b;
  if (b === 'never' || sameType(a, b)) return a;
  if (isNumeric(a) && isNumeric(b)) return 'float';
  if (a === 'null') return optional(b);
  if (b === 'null') return optional(a);
  if (isOptional(a) || isOptional(b)) return optional(joinTypes(present(a), present(b), range));
  if (typeof a === 'object' && typeof b === 'object' && a.kind === b.kind) {
    if (a.kind === 'collection' && b.kind === 'collection') return collection(joinTypes(a.item, b.item, range));
    if (a.kind === 'record' && b.kind === 'record') {
      const keys = Object.keys(a.fields);
      if (keys.length === Object.keys(b.fields).length && keys.every(key => Object.hasOwn(b.fields, key)))
        return recordType(Object.fromEntries(keys.map(key => [key, joinTypes(a.fields[key]!, b.fields[key]!, range)])));
    }
  }
  fail('E_TYPE', `Incompatible types ${typeName(a)} and ${typeName(b)}.`, 'type', range);
}
export function requireType(actual: Type, expected: Type | 'number' | 'scalar', range?: SourceRange): void {
  if (isOptional(actual) && !(typeof expected === 'object' && expected.kind === 'optional'))
    fail('E_OPTIONAL_VALUE', 'Handle structural absence with orElse or requirePresent before using this value.', 'type', range);
  const valid = expected === 'number' ? isNumeric(actual) || actual === 'never'
    : expected === 'scalar' ? isNumeric(actual) || actual === 'boolean' || actual === 'string' || actual === 'never'
    : sameType(actual, expected) || actual === 'never' || actual === 'integer' && expected === 'float';
  if (!valid) fail('E_TYPE', `Expected ${typeof expected === 'string' ? expected : typeName(expected)}, received ${typeName(actual)}.`, 'type', range);
}
export function itemType(type: Type, range?: SourceRange): Type {
  if (isOptional(type)) fail('E_OPTIONAL_VALUE', 'A collection must be present.', 'type', range);
  if (typeof type !== 'object' || type.kind !== 'collection') fail('E_TYPE', 'Expected a collection.', 'type', range);
  return type.item;
}
export const FUNCTION_NAMES = Object.freeze([
  'status', 'isExact', 'lowerBound', 'upperBound', 'requireExact', 'isMissing', 'isNull', 'requirePresent',
  'abs', 'floor', 'ceil', 'orElse', 'filter', 'map', 'any', 'all', 'count', 'sum', 'min', 'max', 'avg',
  'sortBy', 'take', 'certain', 'startsWith', 'endsWith', 'contains', 'length', 'glob', 'pathMatches',
] as const);
export type FunctionName = typeof FUNCTION_NAMES[number];
export const ROOT_NAMES = Object.freeze(['totals', 'files', 'scopes', 'metrics', 'bands', 'rules', 'params', 'measurement', 'source']);
