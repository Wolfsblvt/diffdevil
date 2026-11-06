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
import { SURVEYS, ACTIVITIES } from './survey.mjs';

const KEY = /^[a-z0-9][a-z0-9-]{0,79}$/u;
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/u;
const instant = value => typeof value === 'string' && INSTANT.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value.replace('Z', '.000Z');
const days = (value, min) => Number.isSafeInteger(value) && value >= min && value <= 120;

export function readCampaign(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const spec = typeof value === 'string' ? JSON.parse(value) : value;
  const problem = message => { throw new TypeError(`APP_PARTICIPATION_CAMPAIGN: ${message}`); };
  if (!spec || typeof spec !== 'object') problem('expected an object.');
  if (typeof spec.key !== 'string' || !KEY.test(spec.key)) problem('key must be the campaign key Wirt registered.');
  if (!Number.isSafeInteger(spec.version) || spec.version < 1) problem('version must be a positive integer.');
  const activity = Object.hasOwn(ACTIVITIES, spec.survey);
  if (!Object.hasOwn(SURVEYS, spec.survey) && !activity) problem(`survey must be one of ${[...Object.keys(SURVEYS), ...Object.keys(ACTIVITIES)].join(', ')}.`);
  if (activity && (!Number.isSafeInteger(spec.participantUserId) || spec.participantUserId < 1)) problem('later activities require the selected authenticated participantUserId in private server configuration.');
  if (typeof spec.name !== 'string' || spec.name.length === 0 || spec.name.length > 80) problem('name is the short public name of the survey.');
  if (activity && spec.name !== ACTIVITIES[spec.survey].name) problem('later activity name must match its selected public name.');
  if (!instant(spec.opensAt) || !instant(spec.closesAt) || Date.parse(spec.closesAt) <= Date.parse(spec.opensAt)) problem('opensAt and closesAt are UTC instants, closesAt after opensAt.');
  if (!activity && (!days(spec.inviteAfterDays, 0) || !days(spec.reminderAfterDays, 1))) problem('inviteAfterDays (0-120) and reminderAfterDays (1-120) are whole days.');
  return Object.freeze({ key: spec.key, version: spec.version, survey: spec.survey, name: spec.name, opensAt: spec.opensAt, closesAt: spec.closesAt,
    ...(activity ? { participantUserId: spec.participantUserId } : { inviteAfterDays: spec.inviteAfterDays, reminderAfterDays: spec.reminderAfterDays }) });
}

/** A-only later activities are opt-in server configuration, independent of the original A/B survey. */
export function readActivityCampaigns(value, original) {
  if (value === undefined || value === null || value === '') return [];
  const specs = typeof value === 'string' ? JSON.parse(value) : value;
  if (!Array.isArray(specs)) throw new TypeError('APP_PARTICIPATION_ACTIVITIES must be an array.');
  const campaigns = specs.map(readCampaign);
  if (campaigns.some(campaign => !campaign || !Object.hasOwn(ACTIVITIES, campaign.survey))) throw new TypeError('APP_PARTICIPATION_ACTIVITIES admits only later activities.');
  if (new Set(campaigns.map(campaign => campaign.participantUserId)).size > 1) throw new TypeError('All later activities must select the same participant.');
  const keys = [...(original ? [original.key] : []), ...campaigns.map(campaign => campaign.key)];
  if (new Set(keys).size !== keys.length || new Set(campaigns.map(campaign => campaign.survey)).size !== campaigns.length) throw new TypeError('Each activity needs its own campaign key and response form.');
  return campaigns;
}

/** Explicit unknown keys never fall back to the broad original survey. */
export function participationOf(runtime, key) {
  if (key === undefined || key === null || key === '') return runtime.participation;
  return (runtime.participations ?? [runtime.participation]).find(service => service?.campaign.key === key);
}

export function activityPath(campaign) { return `/manage/plan/survey?activity=${encodeURIComponent(campaign.key)}`; }

/** Where the campaign's completion window stands at `now`. */
export function windowOf(campaign, now) {
  const at = Date.parse(now);
  return at < Date.parse(campaign.opensAt) ? 'not-open' : at >= Date.parse(campaign.closesAt) ? 'closed' : 'open';
}
