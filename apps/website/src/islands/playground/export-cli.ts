// SPDX-License-Identifier: AGPL-3.0-only
/** Replay the displayed artifact, not an unrelated worktree or a newly moving PR. */
export function exportCli(version: string, preset: boolean, target: { readonly repository: string; readonly pullRequest: number }): string {
  const executable = `npx @wolfsblvt/diffdevil@${version}`;
  const policy = preset ? '--no-config --preset size@1' : '--config .diffdevil.yml';
  return [
    '# Save report.json from the report.json / plan.json tab.',
    ...(preset ? [] : ['# Also save .diffdevil.yml from its tab before planning.']),
    '# These commands read the saved comparison; they do not acquire a new head or apply effects.',
    `${executable} analyze --report report.json --format human`,
    `${executable} query --report report.json --metric changed --format value`,
    `${executable} plan --report report.json ${policy} --target-repo ${target.repository} --target-pr ${target.pullRequest} --format human`,
    '# An unresolved scalar query exits 3; use --format json to preserve its evidence.',
  ].join('\n');
}
