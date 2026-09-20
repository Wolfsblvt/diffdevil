// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Build-time specimens for the narrative surfaces. Every number is computed by the
 * engine from a repository-owned asset; the assets are the same files the tests execute.
 */
import { agent, createPlan, evaluate, exact, human, policyDocumentFromYaml, policyFromDocument, policyFromYaml, readRepositoryFile, reportFromDiff, reportFromSaved, unwrap } from './engine-node';
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

/**
 * `#policy`: the full policy as the reader wrote it, and the desired plan the engine
 * creates for exact.json under it — the same 178-line comparison `#measure` shows, so the
 * page tells one story from number to band to proposed label.
 */
export function policySpecimen() {
  const text = readSpecimen('fullPolicy');
  // The parsed document, typed loosely: the surface projects two of its keys as an excerpt.
  const document = policyDocumentFromYaml(text, 'full.yml') as Record<string, any>;
  const report = reportFromSaved(readSpecimen('exactReport'));
  const result = evaluate(policyFromYaml(text, 'full.yml'), report);
  const plan = unwrap(createPlan(result, { repository: 'owner/repo', pullRequest: 123 }));
  return { document, report, result, plan };
}

/**
 * The browser-extension scenes: the same exact.json under full.yml that `#measure` shows,
 * projected the way diffdevil for GitHub projects it — aggregate, then one row per file.
 * A file's virtual band is the engine's answer for that file alone under the same policy
 * (the policy evaluated with `includeOnly` set to that path); an excluded file stays a
 * measurable fact and receives no band.
 */
export function extensionSpecimen() {
  const { report, result, policy: _policy } = measureSpecimen();
  const document = policyDocumentFromYaml(readSpecimen('fullPolicy'), 'full.yml') as Record<string, any>;
  const saved = reportFromSaved(readSpecimen('exactReport'));
  const bands: { id: string; label: string | undefined }[] = document.bands.size.ranges.map((range: { id: string }) => ({ id: range.id, label: document.rules.size.effects.labels.byBand[range.id] as string | undefined }));
  const band = result.rules.size?.band;
  const files = report.files.map(file => {
    let fileBand: string | undefined;
    if (file.included) {
      const only = structuredClone(document);
      only.defaults = { ...(only.defaults ?? {}), paths: { ...(only.defaults?.paths ?? {}), includeOnly: [file.path] } };
      const own = evaluate(policyFromDocument(only, 'full.yml'), saved).rules.size?.band;
      fileBand = own?.status === 'resolved' ? own.id : undefined;
    }
    return { file, band: fileBand, reason: file.inclusionReasons?.[0]?.subject };
  });
  return { report, bands, band: band?.status === 'resolved' ? band.id : undefined, files };
}
