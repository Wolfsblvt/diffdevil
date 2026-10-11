// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The participation campaign a deployment runs, read from `APP_PARTICIPATION_CAMPAIGN`. Its key and version name the
 * campaign Wirt registered; its window, invitation delay and reminder delay are campaign configuration, so nothing here
 * carries a launch date, cohort or timing default. Without it there is no survey, no invitation and no reward section.
 *
 *   { "key": "diffdevil-beta-survey", "version": 1, "survey": "beta-v1", "name": "Beta survey",
 *     "opensAt": "2027-03-01T00:00:00Z", "closesAt": "2027-04-01T00:00:00Z",
 *     "inviteAfterDays": 10, "reminderAfterDays": 7 }
 */
import { SURVEYS } from './survey.mjs';

const KEY = /^[a-z0-9][a-z0-9-]{0,79}$/u;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const days = (value, min) => Number.isSafeInteger(value) && value >= min && value <= 120;

export function readCampaign(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const spec = typeof value === 'string' ? JSON.parse(value) : value;
  const problem = message => { throw new TypeError(`APP_PARTICIPATION_CAMPAIGN: ${message}`); };
  if (!spec || typeof spec !== 'object') problem('expected an object.');
  if (typeof spec.key !== 'string' || !KEY.test(spec.key)) problem('key must be the campaign key Wirt registered.');
  if (!Number.isSafeInteger(spec.version) || spec.version < 1) problem('version must be a positive integer.');
  if (!Object.hasOwn(SURVEYS, spec.survey)) problem(`survey must be one of ${Object.keys(SURVEYS).join(', ')}.`);
  if (typeof spec.name !== 'string' || spec.name.length === 0 || spec.name.length > 80) problem('name is the short public name of the survey.');
  if (!INSTANT.test(spec.opensAt ?? '') || !INSTANT.test(spec.closesAt ?? '') || Date.parse(spec.closesAt) <= Date.parse(spec.opensAt)) problem('opensAt and closesAt are UTC instants, closesAt after opensAt.');
  if (!days(spec.inviteAfterDays, 0) || !days(spec.reminderAfterDays, 1)) problem('inviteAfterDays (0-120) and reminderAfterDays (1-120) are whole days.');
  return Object.freeze({ key: spec.key, version: spec.version, survey: spec.survey, name: spec.name, opensAt: spec.opensAt, closesAt: spec.closesAt,
    inviteAfterDays: spec.inviteAfterDays, reminderAfterDays: spec.reminderAfterDays });
}

/** Where the campaign's completion window stands at `now`. */
export function windowOf(campaign, now) {
  const at = Date.parse(now);
  return at < Date.parse(campaign.opensAt) ? 'not-open' : at >= Date.parse(campaign.closesAt) ? 'closed' : 'open';
}
