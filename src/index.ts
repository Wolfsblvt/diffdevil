/** Portable diff analysis. These exports perform no provider effects. */
export { analyzeDiff, analyzeChanges, readReport, attachScopes, withPathPolicy } from './report.js';
export { analyzeGit } from './sources/git.js';
export { parsePatch, parseUnifiedDiff } from './sources/patch.js';
export { compileShortcut, expandShortcut } from './language/shortcuts.js';
export { environmentFromReport, createEnvironment, withParameters } from './language/environment.js';
export { evaluateExpression } from './language/evaluate.js';
export { formatQuery, formatReport } from './format.js';
export { SEMANTICS } from './model.js';
export { unwrap, DiffdevilError } from './errors.js';
export type * from './model.js';
export type { AnalyzeOptions } from './report.js';
export type { GitOptions } from './sources/git.js';
export type { Shortcut } from './language/shortcuts.js';
export type { CompiledExpression } from './language/compile.js';
export type { EvaluationEnvironment } from './language/environment.js';
export type { EvaluationResult } from './language/evaluate.js';

export { compileExpression, parseExpression } from './language/text.js';
export { sourcePosition } from './language/source.js';
export type { ExpressionSource } from './language/source.js';

export { compilePolicy, explainPolicy, evaluatePolicy, evaluatePolicyQuery, createPlan, readPlan, readPolicyJson, readPolicyYaml, formatPlan } from './policy/index.js';
export type { CompiledPolicy, PolicyCompileOptions, PolicyEvaluateOptions, PolicyResult, PolicyQueryResult, PolicyQuerySelector, PlanOptions, PolicySource, PolicyDocument } from './policy/index.js';

export { validateSchema } from './schema.js';
export type { SchemaKind } from './schema.js';

export { GitHubClient, GitHubRequestError, analyzeGitHub, analyzeGitHubGit, loadGitHubPolicy } from './github/index.js';
export type { GitHubClientOptions, GitHubPolicySource } from './github/index.js';
export { applyGitHubPolicy, syncGitHubLabels } from './github/index.js';
export type { GitHubApplyOptions, GitHubApplyResult, DefinitionResult, EffectObservation, CommentAuthor } from './github/index.js';
