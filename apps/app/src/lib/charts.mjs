// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The small server-rendered marks of the tiles: recent values as bars, and the figure frame the
 * premium extension's file tiles (a size line, one tick per merged PR) share. They are part of the
 * ratified tile grammar, not charts; the analytical charts live in Chart Grammar v1.1
 * (`src/lib/charts/` for the models and `src/client/charts/` for the renderer).
 */
import { escapeHtml as esc } from './format.mjs';

export const figure = (name, w, h, body, label) => `<figure class="a-chart" data-mark="${name}" role="img" aria-label="${esc(label)}"><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" focusable="false">${body}</svg></figure>`;

export function minibars(values, w = 150, h = 24) {
  const max = Math.max(1, ...values), gap = 2, bw = (w - gap * (values.length - 1)) / Math.max(1, values.length);
  return figure('minibars', w, h, values.map((value, index) => `<rect x="${(index * (bw + gap)).toFixed(1)}" y="${(h - (value / max) * h).toFixed(1)}" width="${bw.toFixed(1)}" height="${((value / max) * h).toFixed(1)}" fill="${index === values.length - 1 ? 'var(--fg)' : 'var(--fg-3)'}"/>`).join(''), 'Recent values as small bars');
}
