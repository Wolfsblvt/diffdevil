// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The end edge of a GitHub diffstat seat (Extension Grammar v1 §4: "the seat is right-aligned").
 *
 * GitHub right-aligns its diffstat in several layouts, and often not through the row
 * but through the diffstat node itself (an auto start margin). Hiding that node discards
 * the alignment with it, so the seat that replaces it, or the marker that leads it, would
 * drift to the start of the row. This module reads, before diffdevil touches the row, whether
 * the host seat sits at the end, so the injected group can take over that responsibility.
 * A seat GitHub itself places at the start (a classic file header's diffstat precedes the
 * path) reads as `undefined` and keeps the start.
 */
import type { NativeStat } from './github.js';

/** `push`: a native node's own auto start margin keeps it at the end. `flush`: it ends where its row ends. */
export type EndSeat = 'push' | 'flush';
/** Marks a retained native node whose pushing margin the group in front of it carries instead. */
export const NATIVE_END = 'ddx-native-end';
export interface EndReading { readonly kind: EndSeat | undefined; readonly pushing: readonly HTMLElement[] }
/** Past a pixel or two, layout is not rounding. */
const TOLERANCE = 1;
/** A native node display:none cannot be measured; what it was when it last could stands in. */
const remembered = new WeakMap<HTMLElement, EndReading>();
/** Inline and !important: Primer's margin utilities are !important, and no stylesheet of ours can outrank a host rule of equal weight. */
const claimed = new WeakMap<HTMLElement, { value: string; priority: string }>();
export function claim(node: HTMLElement): void {
  if (!claimed.has(node)) claimed.set(node, { value: node.style.getPropertyValue('margin-inline-start'), priority: node.style.getPropertyPriority('margin-inline-start') });
  node.style.setProperty('margin-inline-start', '0', 'important'); node.classList.add(NATIVE_END);
}
export function release(node: HTMLElement): void {
  const before = claimed.get(node); node.classList.remove(NATIVE_END); if (!before) return;
  claimed.delete(node);
  if (before.value) node.style.setProperty('margin-inline-start', before.value, before.priority); else node.style.removeProperty('margin-inline-start');
}
/** `display: none` (ours or the host's) leaves no box to measure; an empty box is still a box. */
const rendered = (element: HTMLElement): boolean => element.getClientRects().length > 0;
const rtl = (element: HTMLElement): boolean => getComputedStyle(element).direction === 'rtl';
/** Distance of an edge from the inline start, so one comparison serves both writing directions. */
const startEdge = (box: DOMRect, backwards: boolean): number => backwards ? -box.right : box.left;
const endEdge = (box: DOMRect, backwards: boolean): number => backwards ? -box.left : box.right;
/** The nearest ancestor that lays out as a box; `display: contents` wrappers have none. */
function layoutParent(element: HTMLElement): HTMLElement | undefined {
  for (let parent = element.parentElement; parent; parent = parent.parentElement) if (getComputedStyle(parent).display !== 'contents') return parent;
  return undefined;
}
/** Does this node's own auto start margin hold it at the end? Auto absorbs free space, so forcing auto changes nothing; a fixed margin would move. */
function pushedByMargin(node: HTMLElement): boolean {
  const style = getComputedStyle(node); const backwards = style.direction === 'rtl';
  if (!rendered(node)) return style.marginInlineStart === 'auto';
  if (!(parseFloat(backwards ? style.marginRight : style.marginLeft) > TOLERANCE)) return false;
  const before = node.getBoundingClientRect();
  const value = node.style.getPropertyValue('margin-inline-start'); const priority = node.style.getPropertyPriority('margin-inline-start');
  node.style.setProperty('margin-inline-start', 'auto', 'important');
  const after = node.getBoundingClientRect();
  if (value) node.style.setProperty('margin-inline-start', value, priority); else node.style.removeProperty('margin-inline-start');
  return Math.abs(startEdge(after, backwards) - startEdge(before, backwards)) <= TOLERANCE;
}
function endsRow(node: HTMLElement): boolean {
  const parent = layoutParent(node); if (!parent) return false;
  const backwards = rtl(node); const box = parent.getBoundingClientRect(); const style = getComputedStyle(parent);
  const inset = parseFloat(backwards ? style.paddingLeft : style.paddingRight) + parseFloat(backwards ? style.borderLeftWidth : style.borderRightWidth);
  return Math.abs(endEdge(node.getBoundingClientRect(), backwards) - (endEdge(box, backwards) - inset)) <= TOLERANCE;
}
/** Read before the seat's group enters the row, while the native nodes are still what GitHub drew. */
export function readEnd(native: NativeStat): EndReading {
  const { anchor, nodes } = native;
  // Our own neutralised margin would hide the very margin being asked about.
  const marked = nodes.filter(node => claimed.has(node)); for (const node of marked) release(node);
  try {
    const last = nodes[nodes.length - 1]!;
    if (!nodes.every(rendered)) {
      const before = remembered.get(anchor); if (before) return before;
      const pushing = nodes.filter(pushedByMargin); return { kind: pushing.length ? 'push' : undefined, pushing };
    }
    const pushing = nodes.filter(pushedByMargin);
    const reading: EndReading = { kind: pushing.length ? 'push' : endsRow(last) ? 'flush' : undefined, pushing };
    remembered.set(anchor, reading); return reading;
  } finally { for (const node of marked) claim(node); }
}
