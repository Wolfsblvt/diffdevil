import { fail } from '../errors.js';
import type { PlanTarget } from '../model.js';

export function githubRecord(value: unknown, subject: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) fail('E_GITHUB_RESPONSE', `Expected ${subject} to be a record.`, 'source');
  return value as Record<string, unknown>;
}
export function githubString(value: unknown, subject: string): string {
  if (typeof value !== 'string') fail('E_GITHUB_RESPONSE', `Expected ${subject} to be text.`, 'source');
  return value;
}
export function githubInteger(value: unknown, subject: string, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) fail('E_GITHUB_RESPONSE', `Expected ${subject} to be a safe integer at least ${minimum}.`, 'source');
  return value;
}
export function githubSha(value: unknown, subject: string): string {
  const sha = githubString(value, subject);
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u.test(sha)) fail('E_GITHUB_RESPONSE', `Expected ${subject} to be a complete commit identity.`, 'source');
  return sha;
}
export function repositoryPath(repository: string): string {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository) || repository.split('/').some(part => part === '.' || part === '..')) fail('E_PLAN_TARGET', 'Repository must be owner/name.', 'config');
  return '/repos/' + repository.split('/').map(encodeURIComponent).join('/');
}
export function pullPath(target: PlanTarget): string {
  if (!Number.isSafeInteger(target.pullRequest) || target.pullRequest < 1) fail('E_PLAN_TARGET', 'Pull request must be a positive safe integer.', 'config');
  return `${repositoryPath(target.repository)}/pulls/${target.pullRequest}`;
}
