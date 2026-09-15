/** Normalized facts and measurement; no Git subprocess or GitHub effect. */
export { analyzeDiff, analyzeChanges, readReport, withPathPolicy, attachScopes } from './report.js';
export { parsePatch, parseUnifiedDiff } from './sources/patch.js';
export { SEMANTICS } from './model.js';
export type * from './model.js';
export type { AnalyzeOptions } from './report.js';
export type { ChangeInput } from './sources/patch.js';
