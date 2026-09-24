// SPDX-License-Identifier: AGPL-3.0-only
import { origins, pageUrl } from '../manual/manifest.mjs';

const names = new Set(['PUBLIC_ORIGIN', 'APP_INSTALL_URL', 'APP_DASHBOARD_URL']);
const token = /(?<!\$)\{\{([A-Z][A-Z0-9_]*)\}\}/gu;

/** Bind only the setup template's declared public URL inputs. GitHub expressions
 * such as ${{ github.event.pull_request.number }} are payload, not template input.
 * An unconfigured App returns an explicit unavailable result, never invented URLs.
 */
export function renderSetup(source, bindings = {}) {
  const required = [...new Set([...source.matchAll(token)].map(match => match[1]))];
  for (const name of required) if (!names.has(name)) throw new Error(`Unknown setup binding: ${name}`);
  const values = { PUBLIC_ORIGIN: origins.site, ...bindings };
  const missing = required.filter(name => !values[name]);
  for (const name of required.filter(name => values[name])) {
    let url;
    try { url = new URL(values[name]); } catch { throw new Error(`Invalid setup URL binding: ${name}`); }
    if (url.protocol !== 'https:' || url.username || url.password || /[\s<>"\x27]/u.test(values[name])) {
      throw new Error(`Setup URL binding must be a public HTTPS URL: ${name}`);
    }
  }
  if (missing.length) return {
    available: false, missing,
    text: '# App setup is not available in this build\n\nThe official installation and dashboard destinations have not both been configured. Do not invent an installation URL, sign in elsewhere, or report successful setup.\n\nRead the complete [managed-service guide](' + pageUrl('managed-service') + ') for the selected product, prerequisites and current availability. The CLI, library and Actions remain usable independently.\n',
  };
  const text = source.replace(token, (_match, name) => values[name]);
  if ([...text.matchAll(token)].length) throw new Error('Unresolved setup URL binding.');
  return { available: true, missing: [], text };
}
