// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Read the Agent Skill's version from its YAML front matter. The canonical Skill uses
 * the Agent Skills metadata schema (`metadata.version`); a top-level `version` is read
 * only as a fallback for a skill authored without the metadata block. Plain JS so the
 * website build and the Node tests share one reader.
 */
import { parse } from 'yaml';

const FRONT_MATTER = /^﻿?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u;
const SEMVER = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;

/** @returns {string | undefined} the semver string, or undefined when absent or malformed */
export function skillVersionOf(text) {
  const match = FRONT_MATTER.exec(text ?? '');
  if (!match) return undefined;
  let data;
  try { data = parse(match[1]); } catch { return undefined; }
  if (!data || typeof data !== 'object') return undefined;
  const candidate = data.metadata && typeof data.metadata === 'object' && data.metadata.version !== undefined ? data.metadata.version : data.version;
  const version = candidate === undefined || candidate === null ? undefined : String(candidate).trim();
  return version && SEMVER.test(version) ? version : undefined;
}
