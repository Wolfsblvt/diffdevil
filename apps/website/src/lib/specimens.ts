// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Build-time specimens for the narrative surfaces. Every number is computed by the
 * engine from a repository-owned asset; the assets are the same files the tests execute.
 */
import { agent, createPlan, evaluate, exact, human, policyFromYaml, readRepositoryFile, reportFromDiff, reportFromSaved, unwrap } from './engine-node';
import type { Report } from '@wolfsblvt/diffdevil/core';

export const files = {
  reviewDiff: 'docs/examples/diffs/review.diff',
  exactReport: 'docs/examples/reports/exact.json',
  fullPolicy: 'docs/examples/policies/full.yml',
  sizeWorkflow: 'docs/examples/workflows/size.yml',
  reviewSignals: 'docs/examples/policies/review-signals.yml',
  reviewComment: 'docs/examples/policies/review-comment.yml',
} as const;

export function readSpecimen(name: keyof typeof files): string { return readRepositoryFile(files[name]); }

/** `#measure`: exact.json evaluated with full.yml — the 3-file report with one excluded lockfile. */
export function measureSpecimen() {
  const saved = reportFromSaved(readSpecimen('exactReport'));
  const policy = policyFromYaml(readSpecimen('fullPolicy'), 'full.yml');
  const result = evaluate(policy, saved);
  const report = result.report;
  const observed = observedTotals(saved);
  const excluded = report.files.filter(file => !file.included);
  return { saved, report, result, observed, excluded, policy };
}

/** Totals over every observed file, before path policy excluded any of them. */
export function observedTotals(report: Report): { churn: number; changed: number } {
  let churn = 0, changed = 0;
  for (const file of report.files) { churn += exact(file.raw.churn) ?? 0; changed += exact(file.lines.changed) ?? 0; }
  return { churn, changed };
}

/** `#query`: the teaching patch through the real CLI presenters and evaluator. */
export function querySpecimen() {
  const report = reportFromDiff(readSpecimen('reviewDiff'));
  const policy = policyFromYaml(readSpecimen('fullPolicy'), 'full.yml');
  const evaluated = evaluate(policy, report).report;
  return { report, evaluated, human: human(evaluated), agent: agent(evaluated) };
}

/** `#policy`: a desired plan for the teaching patch under the full policy. */
export function policySpecimen() {
  const report = reportFromDiff(readSpecimen('reviewDiff'));
  const policy = policyFromYaml(readSpecimen('fullPolicy'), 'full.yml');
  const result = evaluate(policy, report);
  const plan = unwrap(createPlan(result, { repository: 'owner/repo', pullRequest: 123 }));
  return { report, result, plan };
}
