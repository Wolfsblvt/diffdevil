// SPDX-License-Identifier: AGPL-3.0-only
/**
 * URL state for the App. Every view is a URL: scope (`s`), period (`per`), filters, sort,
 * selected bucket and metric live in the query string, so a view can be shared, reloaded
 * and re-authorised when opened. Possession of a link is not access; the server re-checks.
 */

export const PERIODS = Object.freeze({
  '7d': { key: '7d', days: 7, label: '7 days' },
  '30d': { key: '30d', days: 30, label: '30 days' },
  '90d': { key: '90d', days: 90, label: '90 days' },
  '1y': { key: '1y', days: 365, label: '1 year' }
});
export const DEFAULT_PERIOD = '30d';

const STATE_KEYS = Object.freeze({
  s: 'all', per: DEFAULT_PERIOD, f: '', band: '', ev: '', sort: '', q: '', page: '', w: '', m: '', rm: '', cm: ''
});

const SCOPE = /^(?:all|@[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})|[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/[A-Za-z0-9._-]{1,100})$/u;
const REPOSITORY = /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100})$/u;
const SHORT = /^[A-Za-z0-9._/-]{0,40}$/u;

function clean(value, pattern = SHORT) { return typeof value === 'string' && pattern.test(value) ? value : ''; }

/** Parse the query string into the view state; anything malformed falls back to its default. */
export function readViewState(url) {
  const query = url instanceof URL ? url.searchParams : new URLSearchParams(url);
  const scope = query.get('s');
  const period = query.get('per');
  const page = Number(query.get('page'));
  const bucket = query.get('w');
  return {
    s: scope && SCOPE.test(scope) ? scope : 'all',
    per: period && Object.hasOwn(PERIODS, period) ? period : DEFAULT_PERIOD,
    f: clean(query.get('f')),
    band: clean(query.get('band')),
    ev: clean(query.get('ev')),
    sort: clean(query.get('sort')),
    q: typeof query.get('q') === 'string' ? query.get('q').slice(0, 120) : '',
    page: Number.isSafeInteger(page) && page > 1 ? String(page) : '',
    w: bucket !== null && /^\d{1,3}$/u.test(bucket) ? bucket : '',
    m: clean(query.get('m')),
    rm: clean(query.get('rm')),
    cm: clean(query.get('cm'))
  };
}

/** Describe the scope selector: everything, one namespace, or one repository. */
export function describeScope(selector) {
  if (selector === 'all') return { kind: 'all' };
  if (selector.startsWith('@')) return { kind: 'namespace', namespace: selector.slice(1) };
  const match = REPOSITORY.exec(selector);
  return match ? { kind: 'repository', namespace: match[1], repository: selector, name: match[2] } : { kind: 'all' };
}

/**
 * Build a link to `path` carrying the current state plus a patch. Defaults are omitted so
 * the plain route stays plain. Keys set to '' are removed.
 */
export function link(state, path, patch = {}) {
  const next = { ...state, ...patch };
  const query = new URLSearchParams();
  for (const key of Object.keys(STATE_KEYS)) {
    const value = next[key];
    if (value === undefined || value === '' || value === STATE_KEYS[key]) continue;
    query.set(key, value);
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}

/** The scope-and-period subset that every page carries; filters belong to the page that set them. */
export function carried(state) { return { s: state.s, per: state.per }; }

export function periodOf(state) { return PERIODS[state.per] ?? PERIODS[DEFAULT_PERIOD]; }

export function pullRequestPath(repositoryFullName, number) { return `/pr/${repositoryFullName}/${number}`; }
export function filePath(repositoryFullName, path) { return `/file/${repositoryFullName}/${path.split('/').map(encodeURIComponent).join('/')}`; }
