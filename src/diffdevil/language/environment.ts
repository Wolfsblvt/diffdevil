import { capture, fail, unwrap } from '../errors.js';
import { deepFreeze, inertCopy } from '../inert.js';
import type { BandResult, FileRecord, FileSet, NumberValue, NumericType, Report, Result, RuleResult, Totals, Value } from '../model.js';
import { arithmetic, bounds, integer, numberValue, replacementFamily } from '../numeric.js';
import { readReport } from '../report.js';
import { schemaId } from './compile.js';
import { collection, optional, recordType, type Schema, type Type } from './types.js';
import { boolValue, completeCollection, readSchema, readValue, recordValue, textValue, unknownValue } from './values.js';

/** Validated inert values plus their static schema. Construction is explicit. */
export interface EvaluationEnvironment { readonly schema: Schema; readonly schemaId: string; readonly values: Readonly<Record<string, Value>> }
const environments = new WeakSet<EvaluationEnvironment>();
const reportEnvironments = new WeakSet<EvaluationEnvironment>();
function seal(schema: Schema, values: Readonly<Record<string, Value>>, reportBacked = false): EvaluationEnvironment {
  const env = deepFreeze({ schema, schemaId: schemaId(schema), values });
  environments.add(env); if (reportBacked) reportEnvironments.add(env); return env;
}
export function assertEnvironment(env: EvaluationEnvironment): void {
  if (!environments.has(env)) fail('E_INPUT', 'Create a validated evaluation environment before evaluating.');
}
export const isReportEnvironment = (env: EvaluationEnvironment): boolean => reportEnvironments.has(env);
export function createEnvironment(inputSchema: Schema, inputValues: Readonly<Record<string, Value>>): Result<EvaluationEnvironment> {
  return capture(() => {
    const schema = readSchema(inertCopy(inputSchema, { code: 'E_INPUT' }));
    const value = readValue(recordValue(inputValues), recordType(schema));
    if (value.kind !== 'record') fail('E_INTERNAL', 'Environment validation did not return a record.');
    return seal(schema, value.fields);
  });
}
/** Add host-declared parameter values without erasing validated primitive provenance. */
export function withParameters(env: EvaluationEnvironment, schema: Schema, values: Readonly<Record<string, Value>>): Result<EvaluationEnvironment> {
  return capture(() => {
    assertEnvironment(env);
    const validated = unwrap(createEnvironment({ params: recordType(schema) }, { params: recordValue(values) }));
    return seal({ ...env.schema, params: validated.schema.params! }, { ...env.values, params: validated.values.params! }, isReportEnvironment(env));
  });
}
/** Internal policy joining keeps named-metric affine forms in the same request. */
export function withPolicyValues(env: EvaluationEnvironment, values: { metrics?: Readonly<Record<string, NumberValue>>; bands?: Readonly<Record<string, BandResult>>; rules?: Readonly<Record<string, RuleResult>> }): EvaluationEnvironment {
  assertEnvironment(env);
  const schema = { ...env.schema }, roots = { ...env.values };
  if (values.metrics) {
    schema.metrics = recordType(Object.fromEntries(Object.entries(values.metrics).map(([name, value]) => [name, value.numericType])));
    roots.metrics = recordValue({ ...values.metrics });
  }
  if (values.bands) {
    schema.bands = recordType(Object.fromEntries(Object.keys(values.bands).map(name => [name, bandType])));
    roots.bands = recordValue(Object.fromEntries(Object.entries(values.bands).map(([name, value]) => [name, bandValue(value)])));
  }
  if (values.rules) {
    schema.rules = recordType(Object.fromEntries(Object.keys(values.rules).map(name => [name, ruleType])));
    roots.rules = recordValue(Object.fromEntries(Object.entries(values.rules).map(([name, value]) => [name, ruleValue(value)])));
  }
  return seal(schema, roots, isReportEnvironment(env));
}
const reasonsType = collection(recordType({ code: 'string', subject: optional('string'), message: optional('string') }));
const summaryType = recordType({ status: 'string', reasons: reasonsType });
const rawType = recordType({ added: 'integer', deleted: 'integer', churn: 'integer' });
const linesType = recordType({ added: 'integer', deleted: 'integer', modified: 'integer', changed: 'integer' });
export const FILE_TYPE: Type = recordType({ id: 'string', path: 'string', oldPath: optional('string'), changeType: 'string', kind: 'string', included: 'boolean', raw: rawType, lines: linesType, measurement: summaryType });
const counts = ['total','included','excluded','added','deleted','modified','renamed','copied','binary','unmeasurable'];
const countsType = (scope: boolean) => recordType(Object.fromEntries(counts.filter(key => !scope || key !== 'total' && key !== 'excluded').map(key => [key,'integer' as Type])));
const totalsType = (scope: boolean) => recordType({ raw: rawType, lines: linesType, files: countsType(scope) });
const bandType = recordType({ status: 'string', id: optional('string'), lower: optional('float'), upper: optional('float'), candidates: collection('string') });
const ruleType = recordType({ disposition: 'string', decision: optional('boolean'), band: optional(bandType) });
function ruleValue(rule: RuleResult): Value {
  return recordValue({ disposition: textValue(rule.disposition), decision: rule.decision ? boolValue(rule.decision) : { kind: 'missing' }, band: rule.band ? bandValue(rule.band) : { kind: 'missing' } });
}
/** The policy compiler uses declared types, not sample report values, to bind names. */
export function policyEnvironmentSchema(options: { scopes?: readonly string[]; metrics?: Readonly<Record<string, NumericType>>; bands?: readonly string[]; rules?: readonly string[]; parameters?: Schema } = {}): Schema {
  return {
    totals: totalsType(false), files: collection(FILE_TYPE),
    scopes: recordType(Object.fromEntries((options.scopes ?? []).map(name => [name, recordType({ files: collection(FILE_TYPE), totals: totalsType(true) })]))),
    metrics: recordType(options.metrics ?? {}),
    bands: recordType(Object.fromEntries((options.bands ?? []).map(name => [name, bandType]))),
    rules: recordType(Object.fromEntries((options.rules ?? []).map(name => [name, ruleType]))),
    params: recordType(options.parameters ?? {}), measurement: summaryType,
    source: recordType({ kind: 'string', comparisonId: 'string', base: optional('string'), baseTip: optional('string'), head: optional('string'), comparison: optional('string'), repository: optional('string'), pullRequest: optional('integer') }),
  };
}
function bandValue(band: BandResult): Value {
  if (band.status === 'resolved') return recordValue({ status: textValue('resolved'), id: textValue(band.id), lower: band.lower === undefined ? { kind:'missing' } : numberValue({status:'exact',value:band.lower},'float'), upper: band.upper === undefined ? {kind:'missing'} : numberValue({status:'exact',value:band.upper},'float'), candidates: completeCollection([textValue(band.id)]) });
  return recordValue({ status: textValue('unknown'), id: {kind:'missing'}, lower:{kind:'missing'}, upper:{kind:'missing'}, candidates:completeCollection(band.candidates.map(textValue)) });
}
function summaryValue(summary: Report['measurement']): Value {
  return recordValue({ status: textValue(summary.status), reasons: completeCollection(summary.reasons.map(reason => recordValue({ code:textValue(reason.code), subject:reason.subject === undefined ? {kind:'missing'} : textValue(reason.subject), message:reason.message === undefined ? {kind:'missing'} : textValue(reason.message) }))) });
}
function fileValue(file: FileRecord, comparison: string): Value {
  let raw = Object.fromEntries(Object.entries(file.raw).map(([key,m]) => [key,numberValue(m)]));
  let lines = Object.fromEntries(Object.entries(file.lines).map(([key,m]) => [key,numberValue(m)]));
  if (file.kind === 'text' && file.family?.rawCountsExact && file.raw.added.status === 'exact' && file.raw.deleted.status === 'exact') {
    const family = replacementFamily(`${comparison}\0${file.id}\0${file.family.id}`,file.raw.added.value,file.raw.deleted.value,file.lines.modified.status === 'exact' ? file.lines.modified.value : undefined);
    raw = family.raw; lines = family.lines;
  }
  return recordValue({ id:textValue(file.id), path:textValue(file.path), oldPath:file.oldPath === undefined ? {kind:'missing'} : textValue(file.oldPath), changeType:textValue(file.changeType), kind:textValue(file.kind), included:boolValue(file.included), raw:recordValue(raw), lines:recordValue(lines), measurement:summaryValue(file.measurement) });
}
function fileCollection(files: readonly FileRecord[], values: ReadonlyMap<string,Value>, set: FileSet): Value {
  const [a,b] = bounds(set.total), minimum = Math.max(0,a - files.length), maximum = Math.max(0,b - files.length);
  return { kind:'collection', items:files.map(file => ({membership:'definite',value:values.get(file.id)!})), unseen: { possible: !set.complete, minimum, ...(Number.isFinite(maximum) ? {maximum} : {}) }, order:set.complete ? 'known' : 'unknown' };
}
function totalsValue(totals: Totals, files: readonly FileRecord[], values: ReadonlyMap<string,Value>, complete: boolean): Value {
  const groups: Record<string,Value> = Object.create(null);
  for (const group of ['raw','lines'] as const) {
    const fields: Record<string,Value> = Object.create(null);
    for (const [key, m] of Object.entries(totals[group])) {
      let value = numberValue(m);
      if (complete) {
        value = integer(0);
        for (const file of files) {
          const f = values.get(file.id)!;
          if (f.kind !== 'record' || f.fields[group]?.kind !== 'record') fail('E_INTERNAL','Missing normalized file values.');
          value = arithmetic('+',value,f.fields[group].fields[key] as NumberValue);
        }
      }
      fields[key] = value;
    }
    groups[group] = recordValue(fields);
  }
  groups.files = recordValue(Object.fromEntries(Object.entries(totals.files).map(([key,m]) => [key,numberValue(m)])));
  return recordValue(groups);
}
export function environmentFromReport(input: Report): Result<EvaluationEnvironment> {
  return capture(() => {
    const report = unwrap(readReport(input));
    const files = new Map(report.files.map(file => [file.id,fileValue(file,report.source.comparisonId)]));
    const included = report.files.filter(file => file.included), scopeTypes: Record<string,Type> = Object.create(null), scopes: Record<string,Value> = Object.create(null);
    for (const [name,scope] of Object.entries(report.scopes ?? {})) {
      const ids = new Set(scope.fileIds), selected = report.files.filter(file => ids.has(file.id));
      scopeTypes[name] = recordType({ files:collection(FILE_TYPE),totals:totalsType(true) });
      scopes[name] = recordValue({ files:fileCollection(selected,files,scope.fileSet),totals:totalsValue(scope.totals,selected,files,scope.fileSet.complete) });
    }
    const metricTypes: Record<string,NumericType> = { ...report.metricTypes }, metrics: Record<string,Value> = Object.create(null);
    for (const [key,measurement] of Object.entries(report.metrics ?? {})) metrics[key] = numberValue(measurement,metricTypes[key]!);
    const sourceKeys = ['kind','comparisonId','base','baseTip','head','comparison','repository'];
    const sourceType = recordType({ ...Object.fromEntries(sourceKeys.map(key => [key,key === 'kind' || key === 'comparisonId' ? 'string' : optional('string')])),pullRequest:optional('integer') });
    const source = recordValue({ ...Object.fromEntries(sourceKeys.map(key => [key,Object.hasOwn(report.source,key) ? textValue(String(report.source[key as keyof typeof report.source])) : {kind:'missing'}])),pullRequest:report.source.pullRequest === undefined ? {kind:'missing'} : integer(report.source.pullRequest) });
    const bandTypes = Object.fromEntries(Object.keys(report.bands ?? {}).map(key => [key,bandType]));
    const bands = Object.fromEntries(Object.entries(report.bands ?? {}).map(([key,value]) => [key,bandValue(value)]));
    const ruleTypes: Record<string,Type> = Object.create(null), rules: Record<string,Value> = Object.create(null);
    for (const [key,rule] of Object.entries(report.rules ?? {})) {
      ruleTypes[key] = ruleType;
      rules[key] = ruleValue(rule);
    }
    const schema: Schema = { totals:totalsType(false),files:collection(FILE_TYPE),scopes:recordType(scopeTypes),metrics:recordType(metricTypes),bands:recordType(bandTypes),rules:recordType(ruleTypes),params:recordType({}),measurement:summaryType,source:sourceType };
    return seal(schema,{totals:totalsValue(report.totals,included,files,report.fileSet.complete),files:fileCollection(report.files,files,report.fileSet),scopes:recordValue(scopes),metrics:recordValue(metrics),bands:recordValue(bands),rules:recordValue(rules),params:recordValue({}),measurement:summaryValue(report.measurement),source},true);
  });
}
