// SPDX-License-Identifier: MIT
const escapeHtml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

// Notices use headings, paragraphs, inline code and HTTPS links. Keep all other
// Markdown and raw HTML as text; no remote renderer or executable content ships.
function inline(text) {
  let html = ''; let cursor = 0;
  for (const match of text.matchAll(/`([^`\n]+)`|\[([^\]\n]+)\]\(([^\s)]+)\)/gu)) {
    html += escapeHtml(text.slice(cursor, match.index));
    if (match[1] !== undefined) html += `<code>${escapeHtml(match[1])}</code>`;
    else if (URL.canParse(match[3]) && new URL(match[3]).protocol === 'https:') {
      html += `<a href="${escapeHtml(match[3])}" target="_blank" rel="noopener noreferrer">${escapeHtml(match[2])}</a>`;
    } else html += escapeHtml(match[0]);
    cursor = match.index + match[0].length;
  }
  return html + escapeHtml(text.slice(cursor));
}

/** Render the extension's bundled Markdown notices without executable markup. */
export function extensionNotice(title, text) {
  const paragraphs = text.trim().split(/\n\s*\n/u).map(block => {
    const header = /^(#{1,3}) (.+)$/u.exec(block.trim());
    return header ? `<h${header[1].length}>${inline(header[2])}</h${header[1].length}>` : `<p>${inline(block.replaceAll('\n', ' '))}</p>`;
  }).join('\n');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} · diffdevil</title><script src="theme.js"></script><link rel="stylesheet" href="options.css"></head><body><main class="app-main extension-notice"><a href="options.html">← Settings</a>${paragraphs}</main></body></html>`;
}
