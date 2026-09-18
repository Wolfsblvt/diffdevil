// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Repository-owned agent sources the site serves unchanged: the persistent Agent Skill
 * and the one-off setup instructions. The website consumes them; it never authors them.
 * When a source is absent at build time the site reports it in the build's sources
 * report and the affected raw route is simply not emitted — no placeholder file.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repositoryRoot } from './engine-node';

export const SKILL_SOURCE = 'docs/agent-skill/SKILL.md';
export const SETUP_SOURCES = {
  cli: 'docs/setup/cli.md', actions: 'docs/setup/actions.md', app: 'docs/setup/app.md', everything: 'docs/setup/everything.md',
} as const;
export type SetupIntent = keyof typeof SETUP_SOURCES;

export interface SourceFile { readonly path: string; readonly text: string }

function readIfPresent(relative: string): SourceFile | undefined {
  const path = join(repositoryRoot, relative);
  return existsSync(path) ? { path: relative, text: readFileSync(path, 'utf8') } : undefined;
}

export function skillSource(): SourceFile | undefined { return readIfPresent(SKILL_SOURCE); }
export function setupSource(intent: SetupIntent): SourceFile | undefined { return readIfPresent(SETUP_SOURCES[intent]); }

/** The skill's version is its front-matter `version:`; the site never hard-codes one. */
export function skillVersion(source: SourceFile | undefined): string | undefined {
  if (!source) return undefined;
  const match = /^---\r?\n(?:.*\r?\n)*?version:\s*["']?([0-9]+\.[0-9]+\.[0-9]+[^"'\s]*)["']?\s*\r?\n(?:.*\r?\n)*?---/u.exec(source.text);
  return match?.[1];
}

export interface SourcesReport { readonly skill: { present: boolean; version?: string | undefined; path: string }; readonly setup: Record<SetupIntent, { present: boolean; path: string }> }

export function sourcesReport(): SourcesReport {
  const skill = skillSource();
  return {
    skill: { present: skill !== undefined, version: skillVersion(skill), path: SKILL_SOURCE },
    setup: Object.fromEntries((Object.keys(SETUP_SOURCES) as SetupIntent[]).map(intent => [intent, { present: setupSource(intent) !== undefined, path: SETUP_SOURCES[intent] }])) as SourcesReport['setup'],
  };
}
