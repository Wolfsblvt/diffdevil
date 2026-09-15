import { fail } from '../errors.js';
import { inertCopy, record, array, string, FORBIDDEN_KEYS } from '../inert.js';
import { validateMeasurement } from '../report.js';
import { exact, numberValue, resolved, unknownDecision } from '../numeric.js';
import type { BooleanValue, CollectionValue, Decision, NumberValue, Reason, Value } from '../model.js';
import { isNumeric, isOptional, sameType, type Type } from './types.js';

export const textValue = (value: string): Value => ({ kind: 'string', value });
export const boolValue = (value: boolean | Decision): BooleanValue => ({ kind: 'boolean', decision: typeof value === 'boolean' ? resolved(value) : value });
export const recordValue = (fields: Readonly<Record<string, Value>>): Value => ({ kind: 'record', fields });
export const completeCollection = (values: readonly Value[]): CollectionValue => ({ kind: 'collection', items: values.map(value => ({ membership: 'definite', value })), unseen: { possible: false, minimum: 0, maximum: 0 }, order: 'known' });
export function unknownValue(type: Type, reasons: readonly Reason[]): Value {
  if (isNumeric(type)) return numberValue({ status: 'unknown', reasons }, type);
  if (type === 'boolean') return boolValue(unknownDecision(reasons));
  return { kind: 'unknown', type, reasons };
}
export function valueReasons(value: Value): readonly Reason[] {
  if (value.kind === 'unknown') return value.reasons;
  if (value.kind === 'boolean' && value.decision.status === 'unknown') return value.decision.reasons;
  if (value.kind === 'number' && (value.measurement.status === 'unknown' || value.measurement.status === 'unmeasurable')) return value.measurement.reasons;
  return [];
}
export function asNumber(value: Value): NumberValue {
  if (value.kind !== 'number') fail('E_TYPE', 'Expected a present number during evaluation.');
  return value;
}
export function asDecision(value: Value): Decision {
  if (value.kind !== 'boolean') fail('E_TYPE', 'Expected a boolean decision during evaluation.');
  return value.decision;
}
export function asCollection(value: Value): CollectionValue {
  if (value.kind === 'unknown' && typeof value.type === 'object' && value.type.kind === 'collection')
    return { kind: 'collection', items: [], unseen: { possible: true, minimum: 0 }, order: 'unknown', notes: value.reasons };
  if (value.kind !== 'collection') fail('E_TYPE', 'Expected a present collection during evaluation.');
  return value;
}
/** Apply only statically selected promotions; never coerce strings or booleans. */
export function promote(value: Value, type: Type): Value {
  if (value.kind === 'missing' || value.kind === 'null') return value;
  if (value.kind === 'unknown') return unknownValue(isOptional(type) && !isOptional(value.type) ? type.item : type, value.reasons);
  if (isOptional(type)) return promote(value, type.item);
  if (type === 'float' && value.kind === 'number' && value.numericType === 'integer') return numberValue(value.measurement, 'float');
  if (typeof type === 'object' && type.kind === 'collection' && value.kind === 'collection') return { ...value, items: value.items.map(entry => ({ ...entry, value: promote(entry.value, type.item) })) };
  if (typeof type === 'object' && type.kind === 'record' && value.kind === 'record') return recordValue(Object.fromEntries(Object.entries(value.fields).map(([key, item]) => [key, promote(item, type.fields[key]!)])));
  return value;
}
function reasons(input: unknown): Reason[] {
  const items = array(input, 'Value reasons', 'E_INPUT');
  if (!items.length) fail('E_INPUT', 'An unresolved value requires a reason.', 'source');
  return items.map(item => {
    const r = record(item, 'Reason', 'E_INPUT');
    const code = string(r.code, 'Reason code', 'E_INPUT');
    if (!code) fail('E_INPUT', 'Reason code cannot be empty.', 'source');
    return { code, ...(r.subject !== undefined ? { subject: string(r.subject, 'Reason subject', 'E_INPUT') } : {}), ...(r.message !== undefined ? { message: string(r.message, 'Reason message', 'E_INPUT') } : {}) };
  });
}
/** Validate a declared type without accepting hidden host behavior. */
export function readType(input: unknown): Type {
  if (typeof input === 'string' && ['integer','float','boolean','string','null','never'].includes(input)) return input as Type;
  const t = record(input, 'Type', 'E_INPUT');
  if (t.kind === 'optional' || t.kind === 'collection') return { kind: t.kind, item: readType(t.item) };
  if (t.kind === 'record') return { kind: 'record', fields: readSchema(t.fields) };
  fail('E_INPUT', 'Unsupported declared type.', 'source');
}
export function readSchema(input: unknown): Readonly<Record<string, Type>> {
  const schema = record(input, 'Schema', 'E_INPUT'), result: Record<string, Type> = Object.create(null);
  for (const [key, type] of Object.entries(schema)) {
    if (FORBIDDEN_KEYS.has(key)) fail('E_FORBIDDEN_NAME', `Forbidden schema field ${key}.`, 'bind');
    result[key] = readType(type);
  }
  return result;
}
/** Copy and validate a typed public value; affine provenance is never imported. */
export function readValue(input: unknown, type: Type): Value {
  return validateValue(inertCopy(input, { code: 'E_INPUT' }), type);
}
function validateValue(input: unknown, type: Type): Value {
  const v = record(input, 'Typed value', 'E_INPUT');
  if ((v.kind === 'missing' || v.kind === 'null') && (isOptional(type) || v.kind === 'null' && type === 'null' || type === 'never')) return { kind: v.kind };
  if (v.kind === 'unknown') {
    const supplied = readType(v.type);
    if (!sameType(supplied, type) && !(isOptional(type) && sameType(supplied, type.item))) fail('E_INPUT', 'Unknown value type does not match its declaration.', 'source');
    if (isNumeric(type) || type === 'boolean') fail('E_INPUT', 'Numeric and boolean uncertainty use their dedicated value tags.', 'source');
    return { kind: 'unknown', type: supplied, reasons: reasons(v.reasons) };
  }
  if (isOptional(type)) return validateValue(v, type.item);
  if (isNumeric(type) && v.kind === 'number') {
    if (v.numericType !== type && !(v.numericType === 'integer' && type === 'float')) fail('E_INPUT', 'Numeric value type does not match its declaration.', 'source');
    return numberValue(validateMeasurement(v.measurement, v.numericType as 'integer' | 'float'), type);
  }
  if (type === 'string' && v.kind === 'string') return textValue(string(v.value, 'String value', 'E_INPUT'));
  if (type === 'boolean' && v.kind === 'boolean') {
    const d = record(v.decision, 'Decision', 'E_INPUT');
    if (d.status === 'resolved' && typeof d.value === 'boolean') return boolValue(d.value);
    if (d.status === 'unknown') return boolValue({ status: 'unknown', reasons: reasons(d.reasons) });
    fail('E_INPUT', 'Invalid boolean decision.', 'source');
  }
  if (typeof type === 'object' && type.kind === 'record' && v.kind === 'record') {
    const fields = record(v.fields, 'Record fields', 'E_INPUT'), result: Record<string, Value> = Object.create(null);
    if (Object.keys(fields).some(key => !Object.hasOwn(type.fields, key))) fail('E_INPUT', 'Value contains an undeclared field.', 'source');
    for (const [key, fieldType] of Object.entries(type.fields)) {
      if (!Object.hasOwn(fields, key)) {
        if (!isOptional(fieldType)) fail('E_INPUT', `Required field ${key} is missing.`, 'source');
        result[key] = { kind: 'missing' };
      } else result[key] = validateValue(fields[key], fieldType);
    }
    return recordValue(result);
  }
  if (typeof type === 'object' && type.kind === 'collection' && v.kind === 'collection') {
    const items = array(v.items, 'Collection items', 'E_INPUT').map(item => {
      const entry = record(item, 'Collection entry', 'E_INPUT');
      if (entry.membership !== 'definite' && entry.membership !== 'possible') fail('E_INPUT', 'Invalid collection membership.', 'source');
      return { membership: entry.membership, value: validateValue(entry.value, type.item) } as const;
    });
    const u = record(v.unseen, 'Collection remainder', 'E_INPUT');
    const low = u.minimum, high = u.maximum;
    if (typeof u.possible !== 'boolean' || typeof low !== 'number' || !Number.isSafeInteger(low) || low < 0 || high !== undefined && (typeof high !== 'number' || !Number.isSafeInteger(high) || high < low)) fail('E_INPUT', 'Invalid collection remainder bounds.', 'source');
    if (!u.possible && (low !== 0 || high !== 0) || u.possible && high === 0) fail('E_INPUT', 'Remainder presence contradicts its bounds.', 'source');
    if (v.order !== 'known' && v.order !== 'unknown') fail('E_INPUT', 'Invalid collection order.', 'source');
    const definite = items.filter(x => x.membership === 'definite').length;
    const minimum = definite + low, maximum = high === undefined ? Infinity : items.length + (high as number);
    if (!Number.isSafeInteger(minimum) || Number.isFinite(maximum) && !Number.isSafeInteger(maximum)) fail('E_INPUT', 'Collection cardinality exceeds the safe integer domain.', 'source');
    let cardinality;
    if (v.cardinality !== undefined) {
      cardinality = validateMeasurement(v.cardinality, 'integer', true);
      if (cardinality.status === 'unmeasurable') fail('E_INPUT', 'Collection cardinality must be applicable.', 'source');
      const lower = cardinality.status === 'exact' ? cardinality.value : cardinality.lower ?? 0;
      const upper = cardinality.status === 'exact' ? cardinality.value : cardinality.upper ?? Infinity;
      if (lower > maximum || upper < minimum) fail('E_INPUT', 'Cardinality contradicts collection membership.', 'source');
    }
    return { kind: 'collection', items, unseen: { possible: u.possible, minimum: low, ...(high !== undefined ? { maximum: high as number } : {}) }, order: v.order, ...(cardinality ? { cardinality } : {}), ...(v.notes !== undefined ? { notes: reasons(v.notes) } : {}) };
  }
  fail('E_INPUT', 'Typed value does not match its declared type.', 'source');
}
