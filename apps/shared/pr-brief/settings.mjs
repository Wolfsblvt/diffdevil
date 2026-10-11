// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The App-only bounded brief controls. They are not policy and not a `.diffdevil.yml` surface: an administrator picks
 * supported behavior; wording stays product-authored, and repository-authored wording keeps the existing portable
 * template route. Comments stay off until an administrator turns them on.
 *
 * Field vocabulary, the window choices and the 90-day default are this implementation's qualification of Nyxara's
 * handoff proposal (§7), not owner-ratified UI; the Account/Manage layout that presents them remains owner co-design.
 */
import { CONTEXT_MODULES } from './contract.mjs';

export const BRIEF_MODES = Object.freeze(['off', 'standard', 'advanced']);
export const HISTORY_WINDOWS = Object.freeze([30, 90, 180, 365]);
export const DEFAULT_BRIEF_SETTINGS = Object.freeze({ mode: 'off', modules: CONTEXT_MODULES, priority: CONTEXT_MODULES, historyWindowDays: 90, finalSummary: false });

function settingsError(message) { return Object.assign(new TypeError(message), { code: 'E_BRIEF_SETTINGS' }); }

/** Validate stored or submitted settings; absent fields take the defaults, unknown fields are refused. */
export function readBriefSettings(value) {
  if (value === undefined || value === null) return DEFAULT_BRIEF_SETTINGS;
  if (typeof value !== 'object' || Array.isArray(value)) throw settingsError('Brief settings must be an object.');
  for (const key of Object.keys(value)) if (!Object.hasOwn(DEFAULT_BRIEF_SETTINGS, key)) throw settingsError(`Brief settings do not allow ${key}.`);
  const mode = value.mode ?? DEFAULT_BRIEF_SETTINGS.mode;
  if (!BRIEF_MODES.includes(mode)) throw settingsError('Brief mode must be off, standard or advanced.');
  const ids = (name, list) => {
    if (list === undefined) return DEFAULT_BRIEF_SETTINGS[name];
    if (!Array.isArray(list) || list.some(id => !CONTEXT_MODULES.includes(id)) || new Set(list).size !== list.length) throw settingsError(`Brief ${name} must name distinct supported context modules.`);
    return Object.freeze([...list]);
  };
  const modules = ids('modules', value.modules);
  const priority = ids('priority', value.priority);
  if (value.priority !== undefined && priority.length !== CONTEXT_MODULES.length) throw settingsError('Brief priority must order every supported context module.');
  const historyWindowDays = value.historyWindowDays ?? DEFAULT_BRIEF_SETTINGS.historyWindowDays;
  if (!HISTORY_WINDOWS.includes(historyWindowDays)) throw settingsError(`Brief history window must be one of ${HISTORY_WINDOWS.join(', ')} days.`);
  const finalSummary = value.finalSummary ?? DEFAULT_BRIEF_SETTINGS.finalSummary;
  if (typeof finalSummary !== 'boolean') throw settingsError('Brief final summary must be true or false.');
  return Object.freeze({ mode, modules, priority, historyWindowDays, finalSummary });
}

/**
 * The window a history-backed module may read: the selected days, clipped to history retention, ending at the next
 * UTC midnight so repeated evaluations on one day read the same window and an unchanged brief causes no write.
 */
export function historyWindow(settings, { now, retentionDays = null }) {
  const days = retentionDays === null ? settings.historyWindowDays : Math.min(settings.historyWindowDays, retentionDays);
  const today = new Date(now); today.setUTCHours(0, 0, 0, 0);
  const to = new Date(today.getTime() + 86_400_000), from = new Date(to.getTime() - days * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString(), displayTo: today.toISOString(), days, clipped: days !== settings.historyWindowDays };
}
