/** Selected detail / diffdevil API design. Declarations only; no runtime is supplied. */
export type LanguageId = 'diffdevil-expr/1';
export type NumericType = 'integer' | 'float';
export interface Reason {
  readonly code: string;
  readonly subject?: string;
  readonly message?: string;
}
export type NumericMeasurement =
  | { readonly status: 'exact'; readonly value: number }
  | { readonly status: 'bounded'; readonly lower: number; readonly upper: number }
  | { readonly status: 'unknown'; readonly reasons: readonly Reason[]; readonly lower?: number; readonly upper?: number }
  | { readonly status: 'unmeasurable'; readonly reasons: readonly Reason[] };
export type Decision =
  | { readonly status: 'resolved'; readonly value: boolean }
  | { readonly status: 'unknown'; readonly reasons: readonly Reason[] };
export type TypeDescriptor =
  | 'integer' | 'float' | 'boolean' | 'string' | 'null' | 'never'
  | { readonly kind: 'optional' | 'collection'; readonly item: TypeDescriptor }
  | { readonly kind: 'record'; readonly fields: Readonly<Record<string, TypeDescriptor>> };
export type Value =
  | { readonly kind: 'number'; readonly numericType: NumericType; readonly measurement: NumericMeasurement }
  | { readonly kind: 'boolean'; readonly decision: Decision }
  | { readonly kind: 'string'; readonly value: string }
  | { readonly kind: 'null' | 'missing' }
  | { readonly kind: 'unknown'; readonly type: TypeDescriptor; readonly reasons: readonly Reason[] }
  | { readonly kind: 'record'; readonly fields: Readonly<Record<string, Value>> }
  | CollectionValue;
export interface CollectionValue {
  readonly kind: 'collection';
  readonly items: readonly { readonly membership: 'definite' | 'possible'; readonly value: Value }[];
  readonly unseen: { readonly possible: boolean; readonly minimum: number; readonly maximum?: number };
  readonly order: 'known' | 'unknown';
  readonly cardinality?: NumericMeasurement;
  readonly notes?: readonly Reason[];
}
export interface SourceRange {
  readonly source?: string;
  readonly start: number;
  readonly end: number;
}
export interface Diagnostic {
  readonly code: string;
  readonly phase: 'source' | 'config' | 'lex' | 'parse' | 'bind' | 'type' | 'evaluate' | 'format' | 'plan' | 'apply';
  readonly severity: 'error' | 'warning' | 'information';
  readonly message: string;
  readonly range?: SourceRange;
  readonly precision?: 'character' | 'scalar';
  readonly configPath?: string;
  readonly related?: readonly { readonly message: string; readonly range: SourceRange }[];
  readonly details?: Readonly<Record<string, unknown>>;
}
export type Result<T> =
  | { readonly ok: true; readonly value: T; readonly diagnostics: readonly Diagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly Diagnostic[] };
export interface ExpressionSource {
  readonly text: string;
  readonly language: LanguageId;
  readonly name?: string;
}
export interface SourceMap {
  readonly sourceName: string;
  readonly decodedSource: string;
  readonly segments: readonly {
    readonly decodedStart: number;
    readonly decodedEnd: number;
    readonly originalStart: number;
    readonly originalEnd: number;
    readonly precision: 'character' | 'scalar';
  }[];
}
export interface EnvironmentSchema {
  readonly id: string;
  readonly roots: Readonly<Record<string, TypeDescriptor>>;
}
export type ExpressionContext = 'metric' | 'band' | 'condition' | 'query';
export interface CompileOptions {
  readonly context: ExpressionContext;
  readonly environment: EnvironmentSchema;
  readonly sourceMap?: SourceMap;
}
declare const compiledProgramBrand: unique symbol;
export interface CompiledExpression<T extends Value = Value> {
  readonly [compiledProgramBrand]: T;
  readonly source: ExpressionSource;
  readonly context: ExpressionContext;
  readonly resultType: TypeDescriptor;
  readonly schemaId: string;
  readonly dependencies: readonly string[];
}
export type CompileResult<T extends Value = Value> =
  | { readonly ok: true; readonly program: CompiledExpression<T>; readonly diagnostics: readonly Diagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly Diagnostic[] };
export interface EvaluationLimits {
  readonly profile: string;
  readonly expressionBytes: number;
  readonly tokens: number;
  readonly astNodes: number;
  readonly nestingDepth: number;
  readonly expressionWork: number;
  readonly policyWork: number;
  readonly resultBytes: number;
  readonly stringBytes: number;
  readonly configBytes: number;
  readonly expandedYamlAliases: number;
  readonly diagnostics: number;
}
declare const inertEnvironmentBrand: unique symbol;
export interface EvaluationEnvironment {
  readonly [inertEnvironmentBrand]: true;
  readonly schemaId: string;
}
export interface EvaluationEvidence {
  readonly notes: readonly Reason[];
  readonly logicalWork: number;
  readonly limitProfile: string;
}
export type EvaluationResult<T extends Value = Value> =
  | { readonly ok: true; readonly value: T; readonly evidence: EvaluationEvidence }
  | { readonly ok: false; readonly diagnostics: readonly Diagnostic[] };
export declare function compileExpression(source: ExpressionSource, options: CompileOptions): CompileResult;
export declare function evaluateExpression<T extends Value>(
  program: CompiledExpression<T>, environment: EvaluationEnvironment,
  options: { readonly limits: EvaluationLimits },
): EvaluationResult<T>;
export type Comparison = { readonly operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'ne'; readonly value: number };
export type Shortcut =
  | { readonly kind: 'query-metric'; readonly metric: string; readonly scope?: string; readonly paths?: readonly string[] }
  | { readonly kind: 'query-band'; readonly band: string }
  | { readonly kind: 'check'; readonly metric: string; readonly comparison: Comparison; readonly files?: 'any' | 'all'; readonly scope?: string; readonly paths?: readonly string[] }
  | { readonly kind: 'check-status'; readonly metric: string; readonly status: NumericMeasurement['status'] }
  | { readonly kind: 'query-files'; readonly metric?: string; readonly comparison?: Comparison; readonly select: readonly string[]; readonly scope?: string; readonly paths?: readonly string[]; readonly allFiles?: boolean; readonly certain?: boolean };
export declare function compileShortcut(shortcut: Shortcut, options: { readonly environment: EnvironmentSchema }): CompileResult;
export declare function explainShortcut(shortcut: Shortcut): Result<{ readonly expression: string; readonly notes: readonly Reason[] }>;
export interface Semantics {
  readonly language: LanguageId;
  readonly numbers: 'diffdevil-number/1';
  readonly replacementLines: 'replacement-lines-v1';
  readonly paths: 'diffdevil-glob/1';
  readonly presets?: readonly string[];
  readonly limits?: string;
}
export interface DiffSourceIdentity {
  readonly kind: 'git' | 'unified-diff' | 'github-api';
  readonly comparisonId: string;
  readonly base?: string;
  readonly head?: string;
  readonly comparison?: 'three-dot' | 'direct' | 'worktree' | 'staged' | 'supplied';
  readonly repository?: string;
  readonly pullRequest?: number;
}
export interface RawMeasurements {
  readonly added: NumericMeasurement;
  readonly deleted: NumericMeasurement;
  readonly churn: NumericMeasurement;
}
export interface LineMeasurements {
  readonly added: NumericMeasurement;
  readonly deleted: NumericMeasurement;
  readonly modified: NumericMeasurement;
  readonly changed: NumericMeasurement;
}
export interface MeasurementSummary { readonly status: NumericMeasurement['status']; readonly reasons: readonly Reason[] }
export interface FileRecord {
  readonly id: string;
  readonly path: string;
  readonly oldPath?: string;
  readonly changeType: 'added' | 'deleted' | 'modified' | 'renamed' | 'copied' | 'type-changed' | 'unmerged';
  readonly kind: 'text' | 'binary' | 'submodule' | 'unknown';
  readonly included: boolean;
  readonly raw: RawMeasurements;
  readonly lines: LineMeasurements;
  readonly measurement: MeasurementSummary;
  readonly family?: { readonly id: string; readonly rawCountsExact: boolean; readonly blocksComplete: boolean };
}
export type BandResult =
  | { readonly status: 'resolved'; readonly id: string; readonly lower?: number; readonly upper?: number }
  | { readonly status: 'unknown'; readonly candidates: readonly string[]; readonly reasons: readonly Reason[] };
export interface ScopeRecord {
  readonly fileIds: readonly string[];
  readonly fileSet: { readonly complete: boolean; readonly total: NumericMeasurement };
  readonly totals: { readonly raw: RawMeasurements; readonly lines: LineMeasurements; readonly files: Readonly<Record<string, NumericMeasurement>> };
}
export interface RuleResult {
  readonly decision?: Decision;
  readonly band?: BandResult;
  readonly disposition: 'matched' | 'unmatched' | 'held' | 'fallback';
}
export interface Report {
  readonly kind: 'diffdevil.report';
  readonly schemaVersion: '1.0';
  readonly semantics: Semantics;
  readonly source: DiffSourceIdentity;
  readonly measurement: MeasurementSummary;
  readonly fileSet: { readonly complete: boolean; readonly total: NumericMeasurement };
  readonly totals: { readonly raw: RawMeasurements; readonly lines: LineMeasurements; readonly files: Readonly<Record<string, NumericMeasurement>> };
  readonly files: readonly FileRecord[];
  readonly scopes?: Readonly<Record<string, ScopeRecord>>;
  readonly rules?: Readonly<Record<string, RuleResult>>;
  readonly metrics?: Readonly<Record<string, NumericMeasurement>>;
  /** Required when metrics are present; exact numeric values do not establish their type. */
  readonly metricTypes?: Readonly<Record<string, NumericType>>;
  readonly bands?: Readonly<Record<string, BandResult>>;
  readonly reportId?: string;
  readonly policyId?: string;
}
export declare function readReport(input: unknown): Result<Report>;
export declare function createEnvironment(report: Report, options?: { readonly parameters?: Readonly<Record<string, unknown>>; readonly schema?: EnvironmentSchema }): Result<EvaluationEnvironment>;
declare const policyBrand: unique symbol;
export interface CompiledPolicy {
  readonly [policyBrand]: true;
  readonly id: string;
  readonly semantics: Semantics;
  readonly requiredParameters: readonly string[];
}
export type PolicyCompileResult =
  | { readonly ok: true; readonly program: CompiledPolicy; readonly diagnostics: readonly Diagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly Diagnostic[] };
export declare function compilePolicy(input: unknown, options?: { readonly sourceMap?: SourceMap; readonly parameters?: Readonly<Record<string, unknown>> }): PolicyCompileResult;
export interface PolicyResult {
  readonly report: Report;
  readonly policyId: string;
  readonly rules: Readonly<Record<string, RuleResult>>;
  readonly evidence: EvaluationEvidence;
}
export declare function evaluatePolicy(policy: CompiledPolicy, report: Report, options: { readonly limits: EvaluationLimits; readonly parameters?: Readonly<Record<string, unknown>> }): Result<PolicyResult>;
export interface PlanTarget { readonly repository: string; readonly pullRequest: number }
export type EffectOperation =
  | { readonly kind: 'label.ensure' | 'label.sync'; readonly rule?: string; readonly name: string; readonly definition: { readonly color: string; readonly description: string } }
  | { readonly kind: 'label.add' | 'label.remove'; readonly rule: string; readonly name: string }
  | { readonly kind: 'label.select'; readonly rule: string; readonly group: string; readonly members: readonly string[]; readonly selected: string }
  | { readonly kind: 'comment.reconcile'; readonly rule: string; readonly mode: 'create' | 'once' | 'upsert' | 'once-per-transition'; readonly trigger: 'always' | 'matched' | 'band-changed'; readonly body: string; readonly occasionId?: string };
export interface EffectPlan {
  readonly kind: 'diffdevil.plan';
  readonly schemaVersion: '1.0';
  readonly semantics: Semantics;
  readonly stage: 'desired' | 'materialized';
  readonly source: DiffSourceIdentity;
  readonly reportId: string;
  readonly policyId: string;
  readonly target: PlanTarget;
  readonly operations: readonly EffectOperation[];
  readonly held: readonly { readonly rule: string; readonly reasons: readonly Reason[] }[];
  readonly rules: PolicyResult['rules'];
}
export declare function createPlan(result: PolicyResult, target: PlanTarget): Result<EffectPlan>;
export declare function readPlan(input: unknown): Result<EffectPlan>;
/** Pure convenience functions; source acquisition and provider application are separate APIs. */
export declare function query(report: Report, selector: ExpressionSource | Shortcut, options: { readonly limits: EvaluationLimits; readonly policy?: CompiledPolicy }): EvaluationResult;
export declare function check(report: Report, selector: ExpressionSource | Shortcut, options: { readonly limits: EvaluationLimits; readonly policy?: CompiledPolicy }): Result<Decision>;
