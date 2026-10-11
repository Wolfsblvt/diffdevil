/** GitHub I/O adapter. Only explicit application functions perform provider writes. */
export { GitHubClient, GitHubRequestError } from './client.js';
export { analyzeGitHub, analyzeGitHubGit, readPullSnapshot } from './source.js';
export { loadGitHubPolicy, readGitHubPolicy } from './policy.js';
export { applyGitHubPolicy } from './apply.js';
export { syncGitHubLabels } from './labels.js';
export { readHostCommentContext, reconcileHostComment } from './comments.js';
//# sourceMappingURL=index.js.map