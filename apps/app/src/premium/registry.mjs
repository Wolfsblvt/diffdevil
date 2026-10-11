// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The App's one premium seam. An extension is a plain object with up to four parts, each optional:
 *
 *   service     host => { files, file, pr }   the analytical read service's file extension (see analytical-data.mjs)
 *   projection  { mapFiles }                  how the service's file rows become the shape its page bodies render
 *   pages       { overview, files, file, history, pr }  the page bodies, loaders and chart kinds the public pages render in their
 *                                             premium slots for an entitled reader
 *   brief       provider                      the premium PR-brief provider (apps/shared/pr-brief/contract.mjs) the
 *                                             managed runtime and the admission preview join for an eligible repository
 *
 * There is no discovery, registration call or plugin lifecycle: the build joins at most one extension (see
 * premium-selection.mjs) and the runtime composes it once per request. Without one, `provided` is false and every
 * page renders the Community state for the slot.
 */
export function composePremium(extension) {
  return Object.freeze({
    provided: Boolean(extension),
    service: extension?.service ?? null,
    projection: extension?.projection ?? null,
    pages: extension?.pages ?? Object.freeze({}),
    brief: extension?.brief ?? null
  });
}

export const COMMUNITY = composePremium(undefined);
