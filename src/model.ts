/** Public, versioned data shared by the library, CLI, and provider adapters. */
export type NumericType = 'integer' | 'float';
export interface Reason { readonly code: string; readonly subject?: string; readonly message?: string }
export type NumericMeasurement =
  | { readonly status: 'exact'; readonly value: number }
  | { readonly status: 'bounded'; readonly lower: number; readonly upper: number }
  | { readonly status: 'unknown'; readonly reasons: readonly Reason[]; readonly lower?: number; readonly upper?: number }
  | { readonly status: 'unmeasurable'; readonly reasons: readonly Reason[] };
export type Decision =
  | { readonly status: 'resolved'; readonly value: boolean }
  | { readonly status: 'unknown'; readonly reasons: readonly Reason[] };
export type TypeDescriptor = 'integer' | 'float' | 'boolean' | 'string' | 'null' | 'never'
  | { readonly kind: 'optional' | 'collection'; readonly item: TypeDescriptor }
  | { readonly kind: 'record'; readonly fields: Readonly<Record<string, TypeDescriptor>> };
export interface NumberValue { readonly kind: 'number'; readonly numericType: NumericType; readonly measurement: NumericMeasurement }
export interface BooleanValue { readonly kind: 'boolean'; readonly decision: Decision }
export interface CollectionValue {
  readonly kind: 'collection';
  readonly items: readonly { readonly membership: 'definite' | 'possible'; readonly value: Value }[];
  readonly unseen: { readonly possible: boolean; readonly minimum: number; readonly maximum?: number };
  readonly order: 'known' | 'unknown';
  readonly cardinality?: NumericMeasurement;
  readonly notes?: readonly Reason[];
}
export type Value = NumberValue | BooleanValue
  | { readonly kind: 'string'; readonly value: string }
  | { readonly kind: 'null' | 'missing' }
  | { readonly kind: 'unknown'; readonly type: TypeDescriptor; readonly reasons: readonly Reason[] }
  | { readonly kind: 'record'; readonly fields: Readonly<Record<string, Value>> }
  | CollectionValue;
export interface SourceRange { readonly source?: string; readonly start: number; readonly end: number }
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
export type Result<T> = { readonly ok: true; readonly value: T; readonly diagnostics: readonly Diagnostic[] }
  | { readonly ok: false; readonly diagnostics: readonly Diagnostic[] };
export interface Semantics {
  readonly language: 'diffdevil-expr/1'; readonly numbers: 'diffdevil-number/1';
  readonly replacementLines: 'replacement-lines-v1'; readonly paths: 'diffdevil-glob/1';
  readonly presets?: readonly string[]; readonly limits?: string;
}
export interface DiffSourceIdentity {
  readonly kind: 'git' | 'unified-diff' | 'github-api'; readonly comparisonId: string;
  readonly base?: string; readonly head?: string;
  /** Current PR base tip when a local Git comparison starts at an older merge base. */
  readonly baseTip?: string;
  readonly comparison?: 'three-dot' | 'direct' | 'worktree' | 'staged' | 'supplied';
  readonly repository?: string; readonly pullRequest?: number;
}
export interface RawMeasurements { readonly added: NumericMeasurement; readonly deleted: NumericMeasurement; readonly churn: NumericMeasurement }
export interface LineMeasurements { readonly added: NumericMeasurement; readonly deleted: NumericMeasurement; readonly modified: NumericMeasurement; readonly changed: NumericMeasurement }
export interface MeasurementSummary { readonly status: NumericMeasurement['status']; readonly reasons: readonly Reason[] }
export interface FileRecord {
  readonly id: string; readonly path: string; readonly oldPath?: string;
  readonly changeType: 'added' | 'deleted' | 'modified' | 'renamed' | 'copied' | 'type-changed' | 'unmerged';
  readonly kind: 'text' | 'binary' | 'submodule' | 'unknown'; readonly included: boolean;
  readonly raw: RawMeasurements; readonly lines: LineMeasurements; readonly measurement: MeasurementSummary;
  readonly inclusionReasons?: readonly Reason[];
  readonly family?: { readonly id: string; readonly rawCountsExact: boolean; readonly blocksComplete: boolean };
}
export interface FileSet { readonly complete: boolean; readonly total: NumericMeasurement }
export interface Totals { readonly raw: RawMeasurements; readonly lines: LineMeasurements; readonly files: Readonly<Record<string, NumericMeasurement>> }
export interface ScopeRecord { readonly fileIds: readonly string[]; readonly fileSet: FileSet; readonly totals: Totals }
export type BandResult = { readonly status: 'resolved'; readonly id: string; readonly lower?: number; readonly upper?: number }
  | { readonly status: 'unknown'; readonly candidates: readonly string[]; readonly reasons: readonly Reason[] };
export interface RuleResult { readonly decision?: Decision; readonly band?: BandResult; readonly disposition: 'matched' | 'unmatched' | 'held' | 'fallback' }
export interface Report {
  readonly kind: 'diffdevil.report'; readonly schemaVersion: '1.0'; readonly semantics: Semantics;
  readonly source: DiffSourceIdentity; readonly measurement: MeasurementSummary; readonly fileSet: FileSet;
  readonly totals: Totals; readonly files: readonly FileRecord[];
  readonly scopes?: Readonly<Record<string, ScopeRecord>>;
  readonly rules?: Readonly<Record<string, RuleResult>>;
  readonly metrics?: Readonly<Record<string, NumericMeasurement>>;
  readonly metricTypes?: Readonly<Record<string, NumericType>>;
  readonly bands?: Readonly<Record<string, BandResult>>;
  readonly reportId?: string; readonly policyId?: string;
}
export interface PathPolicy { readonly includeOnly?: readonly string[]; readonly exclude?: readonly string[]; readonly forceInclude?: readonly string[] }
export interface PlanTarget { readonly repository: string; readonly pullRequest: number }
export interface LabelDefinition { readonly color: string; readonly description: string }
export type EffectOperation =
  | { readonly kind: 'label.ensure' | 'label.sync'; readonly rule?: string; readonly name: string; readonly definition: LabelDefinition }
  | { readonly kind: 'label.add' | 'label.remove'; readonly rule: string; readonly name: string }
  | { readonly kind: 'label.select'; readonly rule: string; readonly group: string; readonly members: readonly string[]; readonly selected: string }
  | { readonly kind: 'comment.reconcile'; readonly rule: string; readonly mode: 'create' | 'once' | 'upsert' | 'once-per-transition'; readonly trigger: 'always' | 'matched' | 'band-changed'; readonly body: string; readonly occasionId?: string };
export interface EffectPlan {
  readonly kind: 'diffdevil.plan'; readonly schemaVersion: '1.0'; readonly semantics: Semantics;
  readonly stage: 'desired' | 'materialized'; readonly source: DiffSourceIdentity;
  readonly reportId: string; readonly policyId: string; readonly target: PlanTarget;
  readonly operations: readonly EffectOperation[]; readonly held: readonly { readonly rule: string; readonly reasons: readonly Reason[] }[];
  readonly rules: Readonly<Record<string, RuleResult>>;
  readonly preconditions?: { readonly head?: string; readonly base?: string; readonly providerStateId?: string };
}
export const SEMANTICS: Semantics = Object.freeze({ language: 'diffdevil-expr/1', numbers: 'diffdevil-number/1', replacementLines: 'replacement-lines-v1', paths: 'diffdevil-glob/1' });
