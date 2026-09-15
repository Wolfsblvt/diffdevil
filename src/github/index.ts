/** GitHub I/O adapter. Only explicit application functions perform provider writes. */
export { GitHubClient, GitHubRequestError } from './client.js';
export type { GitHubClientOptions } from './client.js';
export { analyzeGitHub, analyzeGitHubGit } from './source.js';
export { loadGitHubPolicy } from './policy.js';
export type { GitHubPolicySource } from './policy.js';
export { applyGitHubPolicy } from './apply.js';
export type { GitHubApplyOptions, GitHubApplyResult } from './apply.js';
export { syncGitHubLabels } from './labels.js';
export type { DefinitionResult } from './labels.js';
export type { CommentAuthor } from './comments.js';
export type { EffectObservation } from './observation.js';
