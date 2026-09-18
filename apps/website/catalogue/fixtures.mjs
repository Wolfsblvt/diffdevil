// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The website's controlled cards are projections of the one docs catalogue. Real
 * pull-request snapshots use the same source through src/lib/catalogue.ts.
 */
import { readFileSync } from 'node:fs';

const catalogue = JSON.parse(readFileSync('docs/examples/catalogue/catalogue.json', 'utf8'));
const sources = JSON.parse(readFileSync('docs/examples/catalogue/sources.json', 'utf8')).sources;
const policies = JSON.parse(readFileSync('docs/examples/catalogue/policies.json', 'utf8')).policies;
const GLYPHS = { 'same-total-different-spread': '#', 'bounded-decisions': '≈', 'incomplete-file-set': '?' };

function fixture(entry) {
  const variant = entry.variants[0];
  const source = sources[variant.source];
  return {
    id: entry.id,
    glyph: GLYPHS[entry.id] ?? '•',
    title: entry.title,
    hook: entry.summary,
    teaches: entry.guide.join(' '),
    source: source.kind === 'unified-diff' ? { kind: 'diff', path: source.path } : { kind: 'report', path: source.path },
    policy: { kind: 'inline', name: variant.policy, document: policies[variant.policy] },
    focus: 'review',
    variants: entry.variants,
  };
}

export const fixtures = catalogue.entries.filter(entry => entry.sourceKind === 'controlled').map(fixture);
export const fixtureIds = fixtures.map(fixture => fixture.id);
export const DEFAULT_FIXTURE = catalogue.defaultExample;
