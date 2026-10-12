// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Optional staging estate, keyed by installation account rather than the people collaborating there. */
export function stagingInstallationAccounts(env) {
  const value = env.APP_STAGING_INSTALLATION_ACCOUNT_IDS;
  if (value === undefined) return null; // Production retains ordinary GitHub-authorized reach.
  let ids;
  try { ids = JSON.parse(value); } catch { throw new TypeError('APP_STAGING_INSTALLATION_ACCOUNT_IDS must be a JSON array of positive numeric account IDs.'); }
  if (!Array.isArray(ids) || ids.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new TypeError('APP_STAGING_INSTALLATION_ACCOUNT_IDS must be a JSON array of positive numeric account IDs.');
  return new Set(ids);
}
