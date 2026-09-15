import { types as nodeTypes } from 'node:util';
import { createHash } from 'node:crypto';
import { fail } from './errors.js';
import { scalarCharacters } from './paths.js';

export const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);
/** Copy data without invoking user getters, iterators, coercions, or proxy traps. */
export function inertCopy(input: unknown, options: { maximumDepth?: number; maximumNodes?: number; forbidKeys?: boolean; code?: string } = {}): unknown {
  const { maximumDepth = 128, maximumNodes = 1000000, forbidKeys = true, code = 'E_REPORT_INVALID' } = options;
  const active = new WeakSet<object>();
  let nodes = 0;
  const walk = (value: unknown, depth: number): unknown => {
    if (++nodes > maximumNodes || depth > maximumDepth) fail('E_LIMIT', 'Input structure exceeds the selected size or depth limit.', 'source');
    if (value === null || typeof value === 'boolean') return value;
    if (typeof value === 'string') { scalarCharacters(value, code); return value; }
    if (typeof value === 'number') { if (!Number.isFinite(value)) fail(code, 'Input numbers must be finite.', 'source'); return value === 0 ? 0 : value; }
    if (typeof value !== 'object' || nodeTypes.isProxy(value)) fail(code, 'Only inert data is accepted; functions, proxies, and undefined values are not data.', 'source');
    if (active.has(value)) fail(code, 'Cyclic input is not supported.', 'source');
    const prototype = Object.getPrototypeOf(value);
    const array = Array.isArray(value);
    if (prototype !== null && prototype !== (array ? Array.prototype : Object.prototype)) fail(code, 'Input must contain plain records and arrays.', 'source');
    if (Object.getOwnPropertySymbols(value).length) fail(code, 'Symbol-keyed input is not supported.', 'source');
    const descriptors = Object.getOwnPropertyDescriptors(value);
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (!('value' in descriptor)) fail(code, 'Accessor properties are not accepted as input data.', 'source');
      if (forbidKeys && FORBIDDEN_KEYS.has(key)) fail(code, `Forbidden input key: ${key}.`, 'source');
    }
    active.add(value);
    let result: unknown;
    if (array) {
      const length = descriptors.length!.value as number;
      const output: unknown[] = [];
      if (Object.keys(descriptors).length !== length + 1) fail(code, 'Sparse arrays and custom array properties are not supported.', 'source');
      for (let i = 0; i < length; i++) { const entry = descriptors[String(i)]; if (!entry) fail(code, 'Sparse arrays are not supported.', 'source'); output.push(walk(entry.value, depth + 1)); }
      result = output;
    } else {
      const output: Record<string, unknown> = Object.create(null);
      for (const [key, descriptor] of Object.entries(descriptors)) { if (!descriptor.enumerable) fail(code, 'Non-enumerable record properties are not supported.', 'source'); output[key] = walk(descriptor.value, depth + 1); }
      result = output;
    }
    active.delete(value); return result;
  };
  return walk(input, 0);
}
export function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) { for (const child of Object.values(value)) deepFreeze(child); Object.freeze(value); }
  return value;
}
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
}
export function contentId(kind: string, value: unknown): string { return `${kind}-${createHash('sha256').update(canonicalJson(value)).digest('hex')}`; }
export function record(value: unknown, subject: string, code = 'E_REPORT_INVALID'): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(code, `${subject} must be a record.`, 'source');
  return value as Record<string, unknown>;
}
export function string(value: unknown, subject: string, code = 'E_REPORT_INVALID'): string {
  if (typeof value !== 'string') fail(code, `${subject} must be a string.`, 'source'); return value;
}
export function array(value: unknown, subject: string, code = 'E_REPORT_INVALID'): unknown[] {
  if (!Array.isArray(value)) fail(code, `${subject} must be an array.`, 'source'); return value;
}
