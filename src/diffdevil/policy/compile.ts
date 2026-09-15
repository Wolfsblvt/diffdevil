import { capture, diagnosticOf, DiffdevilError, fail, unwrap } from '../errors.js';
import { contentId, deepFreeze, inertCopy } from '../inert.js';
import { DEFAULT_LIMITS, enforceBytes } from '../limits.js';
import type { EvaluationLimits } from '../limits.js';
import type { NumericType, Result, Semantics } from '../model.js';
import { ast, type Ast } from '../language/ast.js';
import { compileAst, type CompiledExpression, type ExpressionContext } from '../language/compile.js';
import { parseExpression } from '../language/text.js';
import { policyEnvironmentSchema } from '../language/environment.js';
import { isNumeric, type Schema } from '../language/types.js';
import { compileBands, type CompiledBands } from './bands.js';
import { normalizePolicy, type NormalizeOptions, type Normalization } from './normalize.js';
import { compileTemplate, type CompiledTemplate } from './templates.js';
import { isPolicySource, locatePolicyAst, locatePolicyDiagnostic, type PolicySource } from './source.js';
import { configError, pointer } from './validation.js';
import type { BandLabels, PolicyDocument } from './types.js';

export interface PolicyCompileOptions extends NormalizeOptions {
  readonly sourceName?: string;
  readonly limits?: EvaluationLimits;
  /** Exact trusted text acquired by the host; the compiler never reads files. */
  readonly templateFiles?: Readonly<Record<string, string>>;
}
/** Process-local, immutable handle. Persist normalized policy data, not this handle. */
export interface CompiledPolicy {
  readonly kind: 'diffdevil.policy'; readonly id: string; readonly semantics: Semantics;
  readonly requiredParameters: readonly string[];
}
export interface PolicyState {
  readonly source?: PolicySource; readonly normalized: Normalization; readonly schema: Schema; readonly limits: EvaluationLimits;
  readonly metricTypes: Readonly<Record<string, NumericType>>;
  readonly metricOrder: readonly string[];
  readonly metrics: ReadonlyMap<string, CompiledExpression>;
  readonly bands: ReadonlyMap<string, { readonly value: CompiledExpression; readonly ranges: CompiledBands }>;
  readonly conditions: ReadonlyMap<string, CompiledExpression>;
  readonly queries: ReadonlyMap<string, CompiledExpression>;
  readonly templates: ReadonlyMap<string, CompiledTemplate>;
}
const policies = new WeakMap<CompiledPolicy, PolicyState>();
export function policyState(policy: CompiledPolicy): PolicyState {
  const state = policies.get(policy);
  if (!state) fail('E_PROGRAM', 'Use a successfully compiled policy.', 'config');
  return state;
}
export function located<T>(path: string, work: () => T): T {
  try { return work(); }
  catch (error) {
    const diagnostic = diagnosticOf(error, 'config');
    throw new DiffdevilError({ ...diagnostic, configPath: diagnostic.configPath ?? path });
  }
}
/** Stable lexical topological order, with an actual cycle path on failure. */
function metricOrder(programs: ReadonlyMap<string, CompiledExpression>): string[] {
  const remaining = new Map([...programs].map(([id, p]) => [id, new Set(p.dependencies)]));
  const order: string[] = [];
  while (remaining.size) {
    const next = [...remaining.keys()].sort().find(id => remaining.get(id)!.size === 0);
    if (next !== undefined) {
      remaining.delete(next); order.push(next);
      for (const dependencies of remaining.values()) dependencies.delete(next);
      continue;
    }
    const chain: string[] = [], positions = new Map<string, number>();
    let current = [...remaining.keys()].sort()[0]!;
    while (!positions.has(current)) {
      positions.set(current, chain.length); chain.push(current);
      current = [...remaining.get(current)!].sort()[0]!;
    }
    const cycle = [...chain.slice(positions.get(current)!), current];
    throw new DiffdevilError({ code: 'E_METRIC_CYCLE', phase: 'bind', severity: 'error', message: `Metric cycle: ${cycle.join(' -> ')}.`, configPath: pointer('/metrics', current), details: { cycle } });
  }
  return order;
}
function validateReferences(document: PolicyDocument): void {
  for (const [id, metric] of Object.entries(document.metrics ?? {})) {
    if (metric.scope !== undefined && !Object.hasOwn(document.scopes ?? {}, metric.scope)) configError(`Unknown scope ${metric.scope}.`, pointer('/metrics', id), 'E_UNKNOWN_NAME');
    if (metric.scope !== undefined && ['files.total', 'files.excluded'].includes(metric.measure!)) configError('This file count is global-only.', pointer('/metrics', id));
  }
  for (const [id, rule] of Object.entries(document.rules ?? {})) {
    if (rule.band === undefined) continue;
    const path = pointer('/rules', id), band = document.bands?.[rule.band];
    if (!band) configError(`Unknown band ${rule.band}.`, path, 'E_UNKNOWN_NAME');
    const labels = rule.effects?.labels as BandLabels | undefined;
    if (!labels) continue;
    const group = document.labelGroups?.[labels.group];
    if (!group) configError(`Unknown label group ${labels.group}.`, path, 'E_UNKNOWN_NAME');
    const ids = band.ranges.map(range => range.id);
    if (Object.keys(labels.byBand).length !== ids.length || ids.some(id => !Object.hasOwn(labels.byBand, id))) configError('byBand must cover exactly the declared band IDs.', path);
    if ([...Object.values(labels.byBand), ...(labels.unknown === undefined ? [] : [labels.unknown])].some(name => !group.includes(name))) configError('A mapped label is not a member of its managed group.', path);
  }
}
export function compilePolicy(input: unknown = { version: 1 }, options: PolicyCompileOptions = {}): Result<CompiledPolicy> {
  return compilePolicyWithSyntax(input, options);
}
/** The Action shorthand may supply directly constructed syntax for its generated fields. */
export function compilePolicyWithSyntax(input: unknown, options: PolicyCompileOptions, syntax: ReadonlyMap<string, Ast> = new Map()): Result<CompiledPolicy> {
  const source = isPolicySource(input) ? input : undefined;
  options = { ...options, ...(source && !options.sourceName ? { sourceName: source.name } : {}) };
  const result = capture(() => {
    const normalized = unwrap(normalizePolicy(source?.document ?? input, options));
    const document = normalized.document, limits = options.limits ?? DEFAULT_LIMITS;
    validateReferences(document);
    const metricTypes: Record<string, NumericType> = Object.fromEntries(Object.keys(document.metrics ?? {}).map(id => [id, 'integer']));
    const parameters = Object.fromEntries(Object.entries(document.parameters ?? {}).map(([id, p]) => [id, p.type]));
    const schema = (): Schema => policyEnvironmentSchema({ scopes: Object.keys(document.scopes ?? {}), metrics: metricTypes, bands: Object.keys(document.bands ?? {}), rules: Object.keys(document.rules ?? {}), parameters });
    const parse = (text: string, path: string): Ast => located(path, () => {
      const generated = syntax.get(path) ?? normalized.generated.get(path);
      if (generated) return generated;
      const parsed = unwrap(parseExpression({ text, language: 'diffdevil-expr/1', name: `${options.sourceName ?? 'policy'}#${path}` }, { limits }));
      return source ? locatePolicyAst(source, path, parsed) : parsed;
    });
    const metricSyntax = new Map<string, { node: Ast; path: string }>();
    for (const [id, metric] of Object.entries(document.metrics ?? {})) {
      const path = pointer(pointer('/metrics', id), metric.formula === undefined ? 'measure' : 'formula');
      const node = metric.formula === undefined
        ? ast.path([...(metric.scope === undefined ? ['totals'] : ['scopes', metric.scope, 'totals']), ...metric.measure!.split('.')], { source: `${options.sourceName ?? 'policy'}#${path}`, start: 0, end: metric.measure!.length })
        : parse(metric.formula, path);
      metricSyntax.set(id, { node, path });
    }
    const bind = (node: Ast, path: string, context: ExpressionContext, environment = schema()): CompiledExpression => located(path, () => unwrap(compileAst(node, { environment, context, limits })));
    const provisional = new Map([...metricSyntax].map(([id, { node, path }]) => [id, bind(node, path, 'metric')]));
    const order = metricOrder(provisional);
    // All metrics are numeric. Dependencies resolve their exact numeric types before final binding.
    for (const id of order) {
      const { node, path } = metricSyntax.get(id)!;
      const program = bind(node, path, 'metric');
      if (!isNumeric(program.resultType)) configError('A metric must produce a numeric measurement.', path, 'E_TYPE');
      metricTypes[id] = program.resultType;
    }
    const finalSchema = schema();
    const metrics = new Map(order.map(id => { const { node, path } = metricSyntax.get(id)!; return [id, bind(node, path, 'metric', finalSchema)] as const; }));
    const bands = new Map<string, { value: CompiledExpression; ranges: CompiledBands }>();
    for (const id of Object.keys(document.bands ?? {}).sort()) {
      const { value, ...definition } = document.bands![id]!;
      const path = pointer(pointer('/bands', id), 'value');
      bands.set(id, { value: bind(parse(value, path), path, 'band', finalSchema), ranges: located(pointer('/bands', id), () => unwrap(compileBands(definition))) });
    }
    const conditions = new Map<string, CompiledExpression>(), queries = new Map<string, CompiledExpression>();
    for (const id of Object.keys(document.rules ?? {}).sort()) {
      const rule = document.rules![id]!;
      if (rule.when === undefined) continue;
      const path = pointer(pointer('/rules', id), 'when');
      conditions.set(id, bind(parse(rule.when, path), path, 'condition', finalSchema));
    }
    for (const id of Object.keys(document.queries ?? {}).sort()) {
      const path = pointer(pointer('/queries', id), 'expression');
      queries.set(id, bind(parse(document.queries![id]!.expression, path), path, 'query', finalSchema));
    }
    const files = inertCopy(options.templateFiles ?? {}, { code: 'E_CONFIG' }) as Record<string, string>;
    const templates = new Map<string, CompiledTemplate>(), resolvedTemplates: Record<string, string> = {};
    for (const id of Object.keys(document.rules ?? {}).sort()) {
      const comment = document.rules![id]!.effects?.comment;
      if (!comment) continue;
      const path = pointer(pointer(pointer('/rules', id), 'effects'), 'comment');
      const text = comment.template ?? files[comment.templateFile!];
      if (typeof text !== 'string') configError(`The host must supply trusted text for template file ${comment.templateFile}.`, path, 'E_TEMPLATE_SOURCE');
      enforceBytes(text, limits.configBytes, 'Comment template', 'config');
      resolvedTemplates[id] = text;
      templates.set(id, located(comment.template === undefined ? path : pointer(path, 'template'), () => unwrap(compileTemplate(text, finalSchema, limits))));
    }
    const program: CompiledPolicy = deepFreeze({ kind: 'diffdevil.policy', id: contentId('policy', { document, templates: resolvedTemplates, semantics: normalized.semantics }), semantics: normalized.semantics, requiredParameters: Object.keys(document.parameters ?? {}).filter(id => document.parameters![id]!.required).sort() });
    policies.set(program, { ...(source ? {source} : {}), normalized, schema: deepFreeze(finalSchema), limits, metricTypes: deepFreeze(metricTypes), metricOrder: deepFreeze(order), metrics, bands, conditions, queries, templates });
    return program;
  });
  return !result.ok && source ? { ok: false, diagnostics: result.diagnostics.map(d => locatePolicyDiagnostic(source, d)) } : result;
}
export function explainPolicy(policy: CompiledPolicy): Omit<Normalization, 'generated'> {
  const { document, semantics, origins } = policyState(policy).normalized;
  return { document, semantics, origins };
}
