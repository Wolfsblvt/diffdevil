// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The common typed seam between the standard PR-brief composer and an optional context provider. Community builds have
 * no provider and still compose the complete useful basic brief; a premium build passes one provider object.
 *
 * Provider (`kind: 'diffdevil.pr-brief-provider'`, `version: 1`):
 *   modules:        ordered module IDs it can contribute ('neighbours' | 'activity' | 'companion').
 *   facts(kit, input) → facts       Derive context facts from audience-filtered host inputs.
 *   contributions(kit, { current, facts, state, links }, enabledIds) → Contribution[]
 *
 * Contribution:
 *   { id, tier: 'basic' | 'premium', slot: 'lead' | 'activity' | 'companion',
 *     standing: 'shown' | 'no-observation' | 'unavailable' | 'suppressed' | 'disabled',
 *     reason?: string,                                     // why it is not shown
 *     visible?: string,                                    // Markdown block in the slot's reading position
 *     coveredPaths?: string[],                             // current files whose contribution the block already shows
 *     measurementNote?: string,                            // a sentence the Measurement detail must carry
 *     details?: { activity?, turnover?, companion?, neighbours?, trailer? } }
 *
 * The kit is the host's Markdown and interval grammar plus the analytical definitions a provider needs; a provider must
 * render untrusted values only through it.
 */
import * as markdown from './markdown.mjs';

export const PROVIDER_KIND = 'diffdevil.pr-brief-provider';
export const CONTEXT_MODULES = Object.freeze(['neighbours', 'activity', 'companion']);

/** Accept only a provider that declares this seam; anything else leaves the brief at its complete basic form. */
export function readProvider(value) {
  if (value === undefined || value === null) return null;
  if (value.kind !== PROVIDER_KIND || value.version !== 1 || typeof value.facts !== 'function' || typeof value.contributions !== 'function'
    || !Array.isArray(value.modules) || value.modules.some(id => !CONTEXT_MODULES.includes(id))) throw new TypeError('PR-brief provider does not implement the version 1 seam.');
  return value;
}

/** The Markdown/interval kit, extended by the host with analytical definitions (`policyReport`, `turnover`, `fileContinuity`). */
export function briefKit(extensions = {}) {
  return Object.freeze({ ...markdown, ...extensions });
}
