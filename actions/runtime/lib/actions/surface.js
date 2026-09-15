/** One declared host surface drives metadata, input validation and output qualification. */
export const ENTRY_POINTS = ['root', 'analyze', 'apply', 'sync-labels'];
const all = ENTRY_POINTS, pr = ['root', 'analyze', 'apply'], effects = ['root', 'apply'];
const input = (description, entries = all) => ({ description, entries });
export const ACTION_INPUTS = Object.freeze({
    'github-token': { ...input('GitHub credential for the selected repository. A token does not enable writes.'), default: '${{ github.token }}' },
    repository: input('Target owner/repository. Defaults to the workflow repository.'),
    'pull-request': input('Positive PR number. Defaults to a PR event or PR issue-comment event.', pr),
    source: input('github-api (default), or git for controlled local comparison of the live PR revisions.', pr),
    'git-cwd': input('Checkout directory for source: git. Defaults to GITHUB_WORKSPACE.', pr),
    mode: input('Root operation: analyze, plan, or apply (default).', ['root']),
    preset: input('size@1 (implicit default), or none. Single-rule shorthand does not implicitly add size rules.'),
    config: input('Explicit policy file. Loaded from the PR base by default; no workspace discovery.'),
    policy: input('Inline YAML/JSON policy from a trusted workflow, mutually exclusive with config.'),
    'policy-source': input('base (default), pinned, or workspace. Workspace policy is read-only in Actions.'),
    'policy-ref': input('Full commit SHA required by policy-source: pinned.'),
    'policy-repository': input('Optional owner/repository for policy-source: pinned.'),
    rule: input('Select one declared rule. Absent selects all; sync-labels selects its definitions only.'),
    metric: input('Standard measure alias or metrics.<id>, default changed. With full policy, selects numeric output only. Alternative to formula.', pr),
    threshold: input('Typed numeric threshold for a generated rule; default comparison gte.', pr),
    comparison: input('Threshold comparison: gt, gte, lt, lte, eq, or ne.', pr),
    files: input('Threshold quantifier: any or all included files.', pr),
    scope: input('Named scope for a standard measure, not rebinding a named formula.', pr),
    path: input('Newline-separated rename-aware path alternatives for a shortcut.', pr),
    exclude: input('Newline-separated exclusion patterns; no implicit blacklist.'),
    'include-only': input('Newline-separated inclusion alternatives.'),
    'force-include': input('Newline-separated overrides of exclusions.'),
    'exclude-mode': input('append (default) or replace for the exclusion list.'),
    'include-only-mode': input('append (default) or replace for the inclusion list.'),
    'force-include-mode': input('append (default) or replace for the force-inclusion list.'),
    label: input('Label assigned by a generated threshold/condition rule.', effects),
    'remove-label-when-false': input('true (default) or false for generated label removal on a resolved false decision.', effects),
    definitions: input('Assignment apply: ensure (default), none, verify, sync. Definition apply: sync (default) or ensure.', ['root', 'apply', 'sync-labels']),
    formula: input('Numeric detail expression for a generated metric; with full policy, selects numeric output only. Alternative to metric.', pr),
    condition: input('Boolean detail expression for a generated rule. Alternative to threshold/comparison/files.', pr),
    parameters: input('JSON object of typed parameter bindings. Values are data, never detail source.', pr),
    'report-path': input('Full report destination, never input. Defaults to a unique runner-temporary file.', pr),
    'plan-path': input('Full desired plan destination in plan/apply mode, never input.', effects),
    'effects-path': input('Full provider observation journal destination, including partial writes.', ['root', 'apply', 'sync-labels']),
    summary: input('true (default) or false. Write a workflow summary without posting a PR comment.'),
    'input-report': input('Saved report to validate against fresh acquisition; never accepted as write authority.', ['apply']),
    'input-plan': input('Saved plan to compare with a freshly evaluated trusted policy before writes.', ['apply']),
    operation: input('verify (default, read-only) or apply declared repository label definitions.', ['sync-labels']),
    'comment-template': input('Explicit generated comment template; requires comment-mode and a condition/threshold.', effects),
    'comment-mode': input('Explicit create, once, upsert, or once-per-transition comment lifecycle.', effects),
    'comment-author': input('Expected bot login for owned-comment readback. Default github-actions[bot].', effects),
    'comment-author-id': input('Optional positive numeric identity for owned-comment readback.', effects),
    'occasion-id': input('Stable workflow occasion for create comments; defaults to run ID plus Action step identity.', effects),
});
export const NUMERIC_OUTPUTS = ['lines-added', 'lines-deleted', 'lines-modified', 'lines-changed', 'raw-added', 'raw-deleted', 'raw-churn', 'files-total', 'files-included', 'files-excluded', 'files-unmeasurable'];
export const REPORT_OUTPUTS = [
    ...NUMERIC_OUTPUTS.flatMap(name => [name, `${name}-status`, `${name}-min`, `${name}-max`]),
    'measurement-status', 'metric-value', 'metric-status', 'metric-min', 'metric-max', 'decision', 'band', 'band-status', 'report-json', 'report-path',
];
export const PLAN_OUTPUTS = ['plan-json', 'plan-path'];
export const EFFECT_OUTPUTS = ['effects-changed', 'effects-status', 'effects-path'];
export function inputNames(entry) {
    return Object.keys(ACTION_INPUTS).filter(name => ACTION_INPUTS[name].entries.includes(entry));
}
export function outputNames(entry) {
    return entry === 'sync-labels' ? EFFECT_OUTPUTS : [...REPORT_OUTPUTS, ...(entry === 'analyze' ? [] : [...PLAN_OUTPUTS, ...EFFECT_OUTPUTS])];
}
export const SHORTCUT_INPUTS = ['metric', 'threshold', 'comparison', 'files', 'scope', 'path', 'exclude', 'include-only', 'force-include', 'exclude-mode', 'include-only-mode', 'force-include-mode', 'label', 'remove-label-when-false', 'comment-template', 'comment-mode', 'formula', 'condition'];
//# sourceMappingURL=surface.js.map