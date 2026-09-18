// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Build-time access to the shared engine and the repository-owned specimens. Runs in
 * Node during `astro build`; the numbers on static surfaces are computed here from the
 * same engine the CLI ships, never typed into copy.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { analyzeDiff, readReport } from '@wolfsblvt/diffdevil/core';
import type { Report, NumericMeasurement } from '@wolfsblvt/diffdevil/core';
import { compilePolicy, createPlan, evaluatePolicy, explainPolicy, readPolicyYaml } from '@wolfsblvt/diffdevil/policy';
import type { CompiledPolicy, PolicyResult } from '@wolfsblvt/diffdevil/policy';
import { formatReport } from '@wolfsblvt/diffdevil/format';
import { unwrap } from '@wolfsblvt/diffdevil/errors';

/**
 * Astro bundles server code under the output directory, so `import.meta.url` cannot
 * locate the checkout. The build runs from the repository root (`npm run …`), and the
 * anchor is verified rather than assumed.
 */
export const repositoryRoot = resolve(process.env.DIFFDEVIL_REPOSITORY_ROOT ?? process.cwd());
if (!existsSync(join(repositoryRoot, 'package.json')) || !existsSync(join(repositoryRoot, 'docs/examples/diffs/review.diff'))) {
  throw new Error(`The website build must run from the diffdevil repository root; ${repositoryRoot} is not it.`);
}
export function readRepositoryFile(relative: string): string {
  return readFileSync(join(repositoryRoot, relative), 'utf8');
}

export function policyFromYaml(text: string, name = '.diffdevil.yml'): CompiledPolicy {
  return unwrap(compilePolicy(unwrap(readPolicyYaml(text, { name })).document, { sourceName: name }));
}
/** The catalogue keeps portable policy objects so the page and Playground share one source. */
export function policyFromDocument(document: object, name = 'catalogue-policy'): CompiledPolicy {
  return unwrap(compilePolicy(document, { sourceName: name }));
}
export function reportFromDiff(text: string): Report { return unwrap(analyzeDiff(text)); }
export function reportFromSaved(text: string): Report { return unwrap(readReport(JSON.parse(text))); }
export function evaluate(policy: CompiledPolicy, report: Report): PolicyResult { return unwrap(evaluatePolicy(policy, report)); }
export function human(report: Report): string { return unwrap(formatReport(report, 'human')).stdout; }
export function agent(report: Report): string { return unwrap(formatReport(report, 'agent')).stdout; }
export { createPlan, explainPolicy, unwrap };

export function exact(measurement: NumericMeasurement): number | undefined {
  return measurement.status === 'exact' ? measurement.value : undefined;
}
export function display(measurement: NumericMeasurement): string {
  switch (measurement.status) {
    case 'exact': return new Intl.NumberFormat('en').format(measurement.value);
    case 'bounded': return `${measurement.lower}–${measurement.upper}`;
    case 'unknown': return measurement.lower !== undefined ? `≥ ${measurement.lower}` : 'unknown';
    case 'unmeasurable': return 'undefined';
  }
}
export const evidenceGlyph = { exact: '=', bounded: '≈', unknown: '?', unmeasurable: '∅' } as const;

/** The hero specimen: one edit block, two lines replaced and one added. */
export const heroPatch = [
  'diff --git a/src/Foo.cs b/src/Foo.cs',
  '--- a/src/Foo.cs', '+++ b/src/Foo.cs',
  '@@ -41,2 +41,3 @@',
  '-    var limit = ReadLimit(config);',
  '-    return Clamp(value, 0, limit);',
  '+    var limit = ReadLimit(options);',
  '+    Guard.NonNegative(limit);',
  '+    return Clamp(value, minimum, limit);',
  '',
].join('\n');
