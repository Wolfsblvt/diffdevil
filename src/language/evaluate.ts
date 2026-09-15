import { capture, DiffdevilError, fail } from '../errors.js';
import { deepFreeze } from '../inert.js';
import { Budget, enforceBytes, type EvaluationLimits } from '../limits.js';
import type { Decision, NumericType, Reason, Result, Value } from '../model.js';
import { arithmetic, bounds, integer, mergeReasons, negate, numberValue, numericComparison, numericHelper, unknownDecision } from '../numeric.js';
import { glob, pathMatches, scalarCharacters } from '../paths.js';
import { aggregateCollection, certainCollection, countCollection, filterCollection, mapCollection, quantifyCollection, scalarOrder, sortCollection, takeCollection } from './collections.js';
import { programState, type BoundNode, type CompiledExpression } from './compile.js';
import { assertEnvironment, isReportEnvironment, type EvaluationEnvironment } from './environment.js';
import { isOptional, present, type Type } from './types.js';
import { asCollection, asDecision, asNumber, boolValue, completeCollection, promote, recordValue, textValue, unknownValue, valueReasons } from './values.js';

export interface EvaluationResult { readonly value: Value; readonly evidence: readonly Reason[]; readonly work: number }
export interface EvaluateOptions { readonly limits?: EvaluationLimits }
function logical(operator: '&&' | '||', left: Decision, right: Decision): Decision {
  const absorbing = operator === '||';
  if (left.status === 'resolved' && left.value === absorbing || right.status === 'resolved' && right.value === absorbing) return { status:'resolved',value:absorbing };
  if (left.status === 'resolved' && right.status === 'resolved') return right;
  return unknownDecision(mergeReasons(left.status === 'unknown' ? left.reasons : [], right.status === 'unknown' ? right.reasons : []));
}
function compare(operator: '<' | '<=' | '>' | '>=' | '==' | '!=', left: Value, right: Value, budget: Budget): Value {
  if (left.kind === 'number' && right.kind === 'number') return boolValue(numericComparison(operator,left,right));
  if (left.kind === 'null' && right.kind === 'null') return boolValue(operator === '==');
  const order = scalarOrder(left,right,budget);
  if (order === undefined) return boolValue(unknownDecision(mergeReasons(valueReasons(left),valueReasons(right))));
  return boolValue(operator === '<' ? order < 0 : operator === '<=' ? order <= 0 : operator === '>' ? order > 0 : operator === '>=' ? order >= 0 : operator === '==' ? order === 0 : order !== 0);
}
function literalBoolean(node: BoundNode | undefined): boolean | undefined {
  const body = node?.kind === 'lambda' ? node.body : node;
  return body?.kind === 'literal' && typeof body.value === 'boolean' ? body.value : undefined;
}
/** Prove nonnegativity only from normalized primitive fields, never observed samples. */
function nonnegativeSelector(node: BoundNode | undefined, source: BoundNode, env: EvaluationEnvironment): boolean {
  if (node?.kind === 'lambda') node = node.body;
  if (!node) return false;
  if (node.kind === 'literal' && typeof node.value === 'number') return node.value >= 0;
  if (!isReportEnvironment(env)) return false;
  const normalizedFiles = (value: BoundNode): boolean => {
    if (value.kind === 'identifier') return value.binding === 'root' && value.name === 'files';
    if (value.kind === 'member' && value.key === 'files' && value.object.kind === 'member') {
      const root = value.object.object;
      return root.kind === 'identifier' && root.binding === 'root' && root.name === 'scopes';
    }
    return value.kind === 'call' && ['filter','certain','take','sortBy'].includes(value.name) && normalizedFiles(value.arguments[0]!);
  };
  if (!normalizedFiles(source)) return false;
  if (node.kind === 'member' && node.object.kind === 'member' && ['raw','lines'].includes(node.object.key)) {
    const root = node.object.object;
    return root.kind === 'identifier' && root.binding === 'local' && typeof root.type === 'object' && root.type.kind === 'record' && root.type.fields.id === 'string' && root.type.fields.path === 'string';
  }
  return false;
}
function stringOperand(value: Value): string {
  if (value.kind !== 'string') fail('E_TYPE','Expected a present string during evaluation.');
  return value.value;
}
/** Interpret a bound program. Source text, dynamic properties and host callbacks are never executed. */
export function evaluateExpression(program: CompiledExpression, environment: EvaluationEnvironment, options: EvaluateOptions = {}): Result<EvaluationResult> {
  return capture(() => {
    const state = programState(program); assertEnvironment(environment);
    if (program.schemaId !== environment.schemaId) fail('E_ENVIRONMENT_SCHEMA','The compiled program requires a different environment schema.');
    const budget = new Budget(options.limits ?? state.limits);
    const visit = (node: BoundNode, locals: ReadonlyMap<string,Value>): Value => {
      budget.charge(1,node.span);
      try { return promote(run(node,locals),node.type); }
      catch (error) {
        if (error instanceof DiffdevilError && !error.diagnostic.range) throw new DiffdevilError({ ...error.diagnostic,range:node.span,precision:'character' });
        throw error;
      }
    };
    const run = (node: BoundNode, locals: ReadonlyMap<string,Value>): Value => {
      const child = (input: BoundNode) => visit(input,locals);
      switch (node.kind) {
        case 'literal':
          if (node.value === null) return {kind:'null'};
          if (typeof node.value === 'number') return numberValue({status:'exact',value:node.value},node.type as NumericType);
          return typeof node.value === 'string' ? textValue(node.value) : boolValue(node.value);
        case 'identifier': return node.binding === 'local' ? locals.get(node.name)! : environment.values[node.name]!;
        case 'member': {
          const object = child(node.object);
          if (object.kind === 'unknown') return unknownValue(node.type,object.reasons);
          if (object.kind !== 'record') fail('E_TYPE','Only present records support member access.');
          return object.fields[node.key] ?? {kind:'missing'};
        }
        case 'unary': {
          const operand = child(node.operand);
          if (node.operator === '+') return operand;
          if (node.operator === '-') return negate(asNumber(operand));
          const d = asDecision(operand); return boolValue(d.status === 'resolved' ? !d.value : d);
        }
        case 'binary': {
          const left = child(node.left), op = node.operator;
          if (op === '&&' || op === '||') {
            const l = asDecision(left);
            if (l.status === 'resolved' && l.value === (op === '||')) return left;
            return boolValue(logical(op,l,asDecision(child(node.right))));
          }
          const right = child(node.right);
          if (op === '+' || op === '-' || op === '*' || op === '/' || op === '%') return arithmetic(op,asNumber(left),asNumber(right));
          if (op === 'in') return boolValue(quantifyCollection(asCollection(right), value => compare('==',left,value,budget),'any',budget));
          return compare(op,left,right,budget);
        }
        case 'conditional': {
          const condition = asDecision(child(node.condition));
          return condition.status === 'unknown' ? unknownValue(node.type,condition.reasons) : child(condition.value ? node.whenTrue : node.whenFalse);
        }
        case 'list': return completeCollection(node.items.map(child));
        case 'record': return recordValue(Object.fromEntries(node.fields.map(field => [field.key,child(field.value)])));
        case 'lambda': fail('E_INTERNAL','A bound lambda cannot be evaluated as a value.');
        case 'call': {
          const a = child(node.arguments[0]!), name = node.name;
          const b = () => child(node.arguments[1]!);
          const selectorNode = node.arguments[1];
          const selector = (value: Value): Value => {
            if (selectorNode?.kind !== 'lambda') fail('E_INTERNAL','Expected a bound collection selector.');
            const nested = new Map(locals); nested.set(selectorNode.parameter,value);
            return visit(selectorNode.body,nested);
          };
          switch (name) {
            case 'status': return textValue(asNumber(a).measurement.status);
            case 'isExact': return boolValue(asNumber(a).measurement.status === 'exact');
            case 'requireExact':
              if (asNumber(a).measurement.status !== 'exact') fail('E_EXACT_REQUIRED','This operation requires an exact numeric value.');
              return a;
            case 'lowerBound': case 'upperBound': {
              const number = asNumber(a), measurement = number.measurement;
              if (measurement.status === 'exact' || measurement.status === 'unmeasurable') return a;
              const bound = bounds(measurement)[name === 'lowerBound' ? 0 : 1];
              if (!Number.isFinite(bound)) return numberValue({status:'unknown',reasons:[{code:'BOUND_UNAVAILABLE'}]},number.numericType);
              budget.note({code:'BOUND_PROJECTION'}); return numberValue({status:'exact',value:bound},number.numericType);
            }
            case 'isMissing': case 'isNull':
              if (a.kind === 'unknown' && isOptional(a.type)) return boolValue(unknownDecision(a.reasons));
              return boolValue(a.kind === (name === 'isMissing' ? 'missing' : 'null'));
            case 'requirePresent':
              if (a.kind === 'missing' || a.kind === 'null' || a.kind === 'unknown' && isOptional(a.type)) fail('E_PRESENT_REQUIRED','This operation requires proven non-null presence.');
              return a;
            case 'orElse':
              if (a.kind === 'missing' || a.kind === 'null') return b();
              if (a.kind === 'unknown' && isOptional(a.type)) return unknownValue(node.type,a.reasons);
              return a;
            case 'abs': case 'floor': case 'ceil': return numericHelper(name,asNumber(a));
            case 'count': return countCollection(asCollection(a));
            case 'certain': return certainCollection(asCollection(a),budget);
            case 'filter': return filterCollection(asCollection(a),selector,budget,literalBoolean(selectorNode));
            case 'map': return mapCollection(asCollection(a),selector,budget);
            case 'any': case 'all': return boolValue(quantifyCollection(asCollection(a),selector,name,budget,literalBoolean(selectorNode)));
            case 'take': return takeCollection(asCollection(a),asNumber(b()),budget);
            case 'sortBy': return sortCollection(asCollection(a),selector,node.arguments[2] !== undefined && stringOperand(child(node.arguments[2])) === 'desc',budget);
            case 'sum': case 'min': case 'max': case 'avg': {
              const selected = selectorNode ? mapCollection(asCollection(a),selector,budget) : asCollection(a);
              return aggregateCollection(selected,name,budget,present(node.type) === 'float' ? 'float' : 'integer',nonnegativeSelector(selectorNode,node.arguments[0]!,environment));
            }
            case 'length':
              if (a.kind === 'unknown') return unknownValue('integer',a.reasons);
              budget.charge(stringOperand(a).length); return integer(scalarCharacters(stringOperand(a),'E_TYPE').length);
            case 'startsWith': case 'endsWith': case 'contains': case 'glob': {
              const right = b();
              if (a.kind === 'unknown' || right.kind === 'unknown') return boolValue(unknownDecision(mergeReasons(valueReasons(a),valueReasons(right))));
              const text = stringOperand(a), pattern = stringOperand(right); budget.charge(text.length + pattern.length);
              return boolValue(name === 'glob' ? glob(text,pattern,budget) : name === 'startsWith' ? text.startsWith(pattern) : name === 'endsWith' ? text.endsWith(pattern) : text.includes(pattern));
            }
            case 'pathMatches': {
              const patternValue = b();
              if (a.kind === 'unknown' || patternValue.kind === 'unknown') return boolValue(unknownDecision(mergeReasons(valueReasons(a),valueReasons(patternValue))));
              if (a.kind !== 'record') fail('E_TYPE','pathMatches requires a file record.');
              const path = a.fields.path!, oldPath = a.fields.oldPath, pattern = stringOperand(patternValue);
              if (path.kind === 'unknown') return boolValue(unknownDecision(path.reasons));
              const current = stringOperand(path);
              if (glob(current,pattern,budget)) return boolValue(true);
              if (oldPath?.kind === 'unknown') return boolValue(unknownDecision(oldPath.reasons));
              return boolValue(pathMatches({path:current,...(oldPath?.kind === 'string' ? {oldPath:oldPath.value} : {})},pattern,budget));
            }
          }
        }
      }
    };
    const value = visit(state.node,new Map());
    enforceBytes(JSON.stringify(value),budget.limits.resultBytes,'Expression result','format');
    return deepFreeze({value,evidence:budget.notes,work:budget.work});
  });
}
