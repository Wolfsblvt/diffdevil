// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Frozen fixtures: repository-owned, deterministic teaching examples that run without
 * GitHub. Each one names its actual input asset and policy; the numbers on the cards
 * and in the playground are computed by the engine from those assets, never stored here.
 *
 * `source.kind` is `diff` (a unified diff analyzed by the engine) or `report` (a saved
 * `diffdevil.report` specimen re-read by the engine, the same as `--report`).
 */
export const fixtures = [
  {
    id: 'replacement-once', glyph: '~', title: 'Replacement counted once',
    hook: 'Raw churn and actual changed lines are different.',
    teaches: 'A replaced line is one modified line, not one deletion plus one addition. The raw counters stay visible beside the replacement-aware count.',
    source: { kind: 'diff', path: 'docs/examples/diffs/review.diff' },
    policy: { kind: 'preset' },
    focus: 'review',
  },
  {
    id: 'lockfile-excluded', glyph: '▣', title: 'Lockfile excluded',
    hook: 'Observed and policy-included totals are different.',
    teaches: 'Path policy excludes a generated lockfile. The observed churn is still reported per file; the policy-focus metric only counts what is included.',
    source: { kind: 'report', path: 'docs/examples/reports/exact.json' },
    policy: { kind: 'file', path: 'docs/examples/policies/full.yml' },
    focus: 'review',
  },
  {
    id: 'few-vs-many', glyph: '#', title: 'Few large files vs many small',
    hook: 'File count and line count are separate facts.',
    teaches: 'Two files carry most of the changed lines; fourteen files carry a handful each. The band follows the line metric, the file facts stay their own numbers, and a per-file query finds the large ones.',
    source: { kind: 'diff', path: 'docs/examples/diffs/few-vs-many.diff' },
    policy: { kind: 'file', path: 'docs/examples/policies/full.yml' },
    focus: 'review',
  },
  {
    id: 'custom-metric-comment', glyph: '§', title: 'Custom metric and owned comment',
    hook: 'A repository rule plus one upsert comment preview.',
    teaches: 'A source/test signal declares its own scopes, metrics and label. The GitHub preview can also show the owned comment a second policy would post.',
    source: { kind: 'diff', path: 'docs/examples/diffs/review.diff' },
    policy: { kind: 'file', path: 'docs/examples/policies/review-signals.yml' },
    commentPolicy: { path: 'docs/examples/policies/review-comment.yml' },
    focus: 'sourceReview',
  },
  {
    id: 'bounded-band-proven', glyph: '≈', title: 'Bounded, band still proven',
    hook: 'Useful decisions can survive incomplete precision.',
    teaches: 'GitHub omitted part of one patch, so changed lines are an interval. Every value in that interval falls inside one band, so the label is still proven.',
    source: { kind: 'report', path: 'docs/examples/reports/bounded.json' },
    policy: { kind: 'preset' },
    focus: 'review',
  },
  {
    id: 'incomplete-unknown', glyph: '?', title: 'Incomplete file set, band unknown',
    hook: 'Only a lower bound is known; nothing is invented.',
    teaches: 'The provider returned part of the file set. Changed lines have a lower bound and no upper bound, the band is unknown across every candidate, and the size rule falls back to its declared unknown label instead of guessing a band.',
    source: { kind: 'report', path: 'docs/examples/reports/incomplete.json' },
    policy: { kind: 'preset' },
    focus: 'review',
  },
  {
    id: 'binary-unmeasurable', glyph: '∅', title: 'Binary content, lines undefined',
    hook: 'Undefined is not zero.',
    teaches: 'Line counts are undefined for binary material. The metric is unmeasurable, the band is unknown, and the only label the rule may select is its declared unknown label.',
    source: { kind: 'report', path: 'docs/examples/reports/unmeasurable.json' },
    policy: { kind: 'preset' },
    focus: 'review',
  },
];

export const fixtureIds = fixtures.map(fixture => fixture.id);
export const DEFAULT_FIXTURE = 'replacement-once';
