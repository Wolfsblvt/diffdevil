// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The ratified r4.1 specimens as executable expectations. The implementation corrections are recorded in
 * `packages/design/pr-brief/ERRATA.md`; this module applies exactly those corrections to the preserved specimen bytes,
 * so the preserved design stays untouched and every other byte must still match the composer. Test and QA support only.
 */
import { readFileSync } from 'node:fs';

const directory = new URL('../../../packages/design/pr-brief/r4.1/specimens/', import.meta.url);
const REPORT_ROW = '| `src/report.ts` | unavailable |\n';

/** E1: a basic brief shows no neighbour share, so its Measurement detail carries no share-rounding sentence. */
function withoutOrphanShare(text) { return text.replace(' The 60–69% share rounds outward from 168/280 through 168/244.', ''); }
/** E2: an unmeasured file follows the measured files (descending Changed), not the fixture's authoring order. */
function unmeasuredLast(text) {
  return text.replaceAll(`${REPORT_ROW}| \`tests/config.test.ts\` | 26 |\n| \`docs/policy.md\` | 8 |\n`, `| \`tests/config.test.ts\` | 26 |\n| \`docs/policy.md\` | 8 |\n${REPORT_ROW}`)
    .replace('Other included files: `src/report.ts` (unavailable), `tests/config.test.ts` (26), `docs/policy.md` (8).', 'Other included files: `tests/config.test.ts` (26), `docs/policy.md` (8), `src/report.ts` (unavailable).');
}
/** E3: with no measured lower bound, the policy line names no band rather than an arbitrary one. */
function noArbitraryBand(text) { return text.replace('**Repository policy:** `size@1` defines M as 100–499 included Changed. ', '**Repository policy:** '); }

/**
 * E4 (pending product disposition of P1): with no share-of-repository floor, `src/report.ts` (5 of 40 merged PRs)
 * meets the absolute three-PR minimum and joins the file-activity table as its third row, leaving the core's
 * other-files line and extending the Turnover detail.
 */
const REPORT_ACTIVITY = Object.freeze({ exact: '46', bounded: '42–78', partial: 'unavailable', unknown: 'unavailable' });
function reportActivityRow(state) {
  return text => text
    .replace(/(\| `src\/config\.ts` \| [^|\n]+ \| \*\*12 merged PRs\*\*<br>0\.8× Turnover \|\n)/u, `$1| \`src/report.ts\` | ${REPORT_ACTIVITY[state]} | **5 merged PRs**<br>0.1× Turnover |\n`)
    .replace(/Other included files: `src\/report\.ts` \([^)]+\), /u, 'Other included files: ')
    .replace(', `src/report.ts` (unavailable).', '.')
    .replace('Also included: `src/report.ts`, ', 'Also included: ')
    .replace('`src/config.ts`: 480 / 600 = 0.8×. File identities', '`src/config.ts`: 480 / 600 = 0.8×. `src/report.ts`: 50 / 500 = 0.1×. File identities')
    .replace('Neither file was created or deleted in the window.', 'None of these files was created or deleted in the window.');
}

const CORRECTIONS = Object.freeze({
  'bounded--basic': [withoutOrphanShare], 'bounded--basic-history': [withoutOrphanShare],
  'partial--basic': [unmeasuredLast], 'partial--basic-history': [unmeasuredLast],
  'unknown--basic': [noArbitraryBand], 'unknown--basic-history': [noArbitraryBand],
  'exact--context': [reportActivityRow('exact')], 'bounded--context': [reportActivityRow('bounded')],
  'partial--context': [unmeasuredLast, reportActivityRow('partial')], 'unknown--context': [noArbitraryBand, reportActivityRow('unknown')],
  // The stale-head specimen wraps the unchanged old exact-context comment.
  'lifecycle-stale': [reportActivityRow('exact')]
});

/** The specimen's exact preserved bytes with only its recorded errata applied; trailing file newlines are not copy. */
export function expectedSpecimen(name) {
  const preserved = readFileSync(new URL(`${name}.md`, directory), 'utf8').replace(/\n+$/u, '');
  return (CORRECTIONS[name] ?? []).reduce((text, correct) => correct(text), preserved);
}

export const CORRECTED_SPECIMENS = Object.freeze(Object.keys(CORRECTIONS));
