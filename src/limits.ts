import { fail } from './errors.js';
import type { Reason, SourceRange } from './model.js';
export interface EvaluationLimits {
  readonly profile: string; readonly expressionBytes: number; readonly tokens: number; readonly astNodes: number;
  readonly nestingDepth: number; readonly expressionWork: number; readonly policyWork: number; readonly resultBytes: number;
  readonly stringBytes: number; readonly configBytes: number; readonly expandedYamlAliases: number; readonly diagnostics: number;
}
export const DEFAULT_LIMITS: EvaluationLimits = Object.freeze({
  profile: 'diffdevil-limits/1', expressionBytes: 65536, tokens: 32768, astNodes: 16384,
  nestingDepth: 64, expressionWork: 10000000, policyWork: 100000000, resultBytes: 67108864,
  stringBytes: 65536, configBytes: 1048576, expandedYamlAliases: 100, diagnostics: 100,
});
/** Per-request accounting. Logical work does not depend on physical cache warmth. */
export class Budget {
  work = 0;
  readonly notes: Reason[] = [];
  constructor(readonly limits: EvaluationLimits = DEFAULT_LIMITS) {}
  charge(amount = 1, range?: SourceRange): void {
    this.work += amount;
    if (!Number.isSafeInteger(this.work) || this.work > this.limits.expressionWork) fail('E_LIMIT', 'Expression work budget exhausted.', 'evaluate', range);
  }
  note(reason: Reason): void {
    if (!this.notes.some(x => x.code === reason.code && x.subject === reason.subject)) this.notes.push(reason);
  }
}
export function byteLength(text: string): number { return new TextEncoder().encode(text).length; }
export function enforceBytes(text: string, maximum: number, subject: string, phase: 'source' | 'config' | 'lex' | 'format'): void {
  if (byteLength(text) > maximum) fail('E_LIMIT', `${subject} exceeds the selected ${maximum}-byte limit.`, phase);
}
