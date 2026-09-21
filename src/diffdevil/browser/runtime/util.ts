// SPDX-License-Identifier: MIT
/** Fresh JSON crosses the browser facade, never caller-owned proxies/getters. */
export const types = { isProxy: (_value: unknown): boolean => false };
export default { types };
