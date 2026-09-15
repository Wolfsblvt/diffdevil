import type { LabelDefinition, PathPolicy, Semantics } from '../model.js';
import type { BandDefinition } from './bands.js';

/** Inert scalar inputs declared by policy, never evaluated as expressions. */
export type ParameterType = 'integer' | 'float' | 'boolean' | 'string';
export type ParameterDefinition = { readonly type: ParameterType } & (
  | { readonly default: number | boolean | string; readonly required?: never }
  | { readonly required: true; readonly default?: never }
);
export type MetricDefinition =
  | { readonly measure: string; readonly scope?: string; readonly formula?: never }
  | { readonly formula: string; readonly measure?: never; readonly scope?: never };
export type CommentDefinition = {
  readonly mode: 'create' | 'once' | 'upsert' | 'once-per-transition';
  readonly trigger?: 'always' | 'matched' | 'band-changed';
} & (
  | { readonly template: string; readonly templateFile?: never }
  | { readonly templateFile: string; readonly template?: never }
);
export interface BooleanLabels { readonly add: readonly string[]; readonly removeWhenFalse?: boolean }
export interface BandLabels { readonly group: string; readonly byBand: Readonly<Record<string, string>>; readonly unknown?: string }
export type RuleDefinition = { readonly onUnknown?: 'hold' | 'fail' } & (
  | { readonly when: string; readonly band?: never; readonly effects?: { readonly labels?: BooleanLabels; readonly comment?: CommentDefinition } }
  | { readonly band: string; readonly when?: never; readonly effects?: { readonly labels?: BandLabels; readonly comment?: CommentDefinition } }
);
export interface SizeOverrides {
  readonly metric?: string;
  readonly thresholds?: { readonly xs: number; readonly s: number; readonly m: number; readonly l: number };
  readonly labels?: { readonly xs: string; readonly s: string; readonly m: string; readonly l: string; readonly xl: string; readonly unknown: string };
}
/** Version 1 authoring data. All declarations are checked, including unused ones. */
export interface PolicyDocument {
  readonly version: 1;
  readonly language?: 'diffdevil-expr/1';
  readonly presets?: readonly 'size@1'[];
  readonly size?: SizeOverrides;
  readonly measurement?: { readonly replacementLines: 'replacement-lines-v1' };
  readonly defaults?: { readonly paths?: PathPolicy };
  readonly scopes?: Readonly<Record<string, PathPolicy>>;
  readonly parameters?: Readonly<Record<string, ParameterDefinition>>;
  readonly metrics?: Readonly<Record<string, MetricDefinition>>;
  readonly bands?: Readonly<Record<string, BandDefinition & { readonly value: string }>>;
  readonly queries?: Readonly<Record<string, { readonly expression: string }>>;
  readonly labelGroups?: Readonly<Record<string, readonly string[]>>;
  readonly labelDefinitions?: Readonly<Record<string, LabelDefinition>>;
  readonly rules?: Readonly<Record<string, RuleDefinition>>;
}
export interface PathOverrides extends PathPolicy {
  readonly excludeMode?: 'append' | 'replace';
  readonly includeOnlyMode?: 'append' | 'replace';
  readonly forceIncludeMode?: 'append' | 'replace';
}
export interface PolicyOrigin { readonly path: string; readonly layer: string; readonly replaces?: string }
export interface NormalizedPolicy {
  readonly document: PolicyDocument;
  readonly semantics: Semantics;
  readonly origins: readonly PolicyOrigin[];
}
