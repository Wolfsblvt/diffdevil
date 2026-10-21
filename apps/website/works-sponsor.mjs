// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Build-time binding of the shared Wolfsblvt Works sponsor section. diffdevil vendors only the component's three
 * canonical files (vendor/brand/works/components/works-sponsor.{html,mjs}, vendor/brand/works/css/works-sponsor.css)
 * byte for byte from the pinned Works bundle below: its artwork is inline SVG and it uses the host's typography, so it
 * references no other bundle file. Works owns the copy, artwork, corners, WORKS note and motion; this host supplies only
 * the placement, the enabled sponsor links, the heading level, a unique id prefix and the admitted CSS variables.
 * Update by re-copying the three files from a newer accepted Works bundle and replacing the pin and hashes together.
 */
export const worksSponsorSource = Object.freeze({
  repository: 'Wolfsblvt/wolfsblvt.works',
  carrier: '6ef384683862418a3c0864fe1e62b18389b5d0b0',
  sourceCommit: '97cbf177df1045d14e4e91b06c305c250d8e3186',
  bundleSha256: 'e203e181f0a53eab8a7b3fd5077b6e8487a16f84493c0f86760aa0a74929ee95',
  files: Object.freeze({
    'components/works-sponsor.html': '658bbdd759bb6260520146e358854d20c54587ef1d4570e0335e515a8410c573',
    'components/works-sponsor.mjs': 'cb690b0cb64d7a3c80716a60da4ddfe01993f90bae8703bf9d35b3130947cbb0',
    'css/works-sponsor.css': '4221d7da05fc2ad8761a61af99e3ce61f3b51af0367bf2487dc99a53168ee82c',
  }),
});

/** The only destinations the component admits; a route is listed only once it is actually live. */
export const SPONSOR_ROUTES = Object.freeze(['GitHub Sponsors', 'Ko-fi']);

const escape = value => String(value).replace(/[&<>"']/gu, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

/**
 * Fill the Works template. `links` are the enabled routes in order; the first is the primary action. `context` is the
 * optional escaped product line (diffdevil uses the common words only). Refuses unknown routes, non-https links,
 * a bad heading level or id, and any placeholder left unfilled.
 */
export function renderWorksSponsor(template, { id, heading = 2, links, context } = {}) {
  if (!/^[a-z][a-z0-9-]*$/u.test(id ?? '')) throw new Error('The sponsor section needs a unique lowercase id prefix.');
  if (![2, 3, 4, 5, 6].includes(heading)) throw new Error('The sponsor heading level must be 2 to 6.');
  for (const link of links ?? []) {
    if (!SPONSOR_ROUTES.includes(link.label)) throw new Error(`Unknown sponsor route: ${link.label}`);
    if (!/^https:\/\//u.test(link.href)) throw new Error(`Sponsor route ${link.label} must be an https destination.`);
  }
  const anchors = (links ?? []).map((link, index) => `<a class="${index === 0 ? 'primary' : 'secondary'}" href="${escape(link.href)}" rel="noopener">${escape(link.label)}</a>`).join('');
  const html = template
    .replaceAll('{{id}}', id)
    .replaceAll('{{heading}}', String(heading))
    .replace('{{context}}', context ? `      <p class="add">${escape(context)}</p>` : '')
    .replace('{{links}}', anchors);
  if (/\{\{\w+\}\}/u.test(html)) throw new Error('The sponsor template has an unfilled placeholder.');
  return html;
}
