// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The Settings theme as the website's header speaks it: one cycling control that bounces
 * Dark → Auto → Light → Auto → Dark. The saved preference is the `appearance.theme`
 * setting (its `system` is the website's `auto`); the side the bounce is heading for is an
 * interaction detail kept beside the early-paint copy in localStorage, never a fourth theme.
 */
export type Side = 'dark' | 'light';
export type ThemePreference = Side | 'system';
export interface ThemeState { readonly preference: ThemePreference; readonly next: Side }
export const THEME_KEY = 'diffdevil.options.theme';
export const THEME_NEXT_KEY = 'diffdevil.options.theme.next';
export const isSide = (value: unknown): value is Side => value === 'dark' || value === 'light';
export const isPreference = (value: unknown): value is ThemePreference => isSide(value) || value === 'system';
export const opposite = (side: Side): Side => side === 'dark' ? 'light' : 'dark';
export function systemSide(): Side { try { return matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'; } catch { return 'dark'; } }
export const resolveSide = (state: ThemeState): Side => state.preference === 'system' ? systemSide() : state.preference;
/** The bounce side that belongs to a preference: an explicit side heads to the other one; Automatic keeps its stored direction, or heads away from the current appearance. */
export function nextSide(preference: ThemePreference, stored: unknown): Side {
  if (preference !== 'system') return opposite(preference);
  return isSide(stored) ? stored : opposite(systemSide());
}
/** One step of the traversal. In Automatic, `next` is the manual side the bounce is heading for. */
export function stepTheme(state: ThemeState, direction: 1 | -1): ThemeState {
  if (state.preference === 'system') { const preference = direction === 1 ? state.next : opposite(state.next); return { preference, next: opposite(preference) }; }
  return { preference: 'system', next: direction === 1 ? opposite(state.preference) : state.preference };
}
/** Write the state onto <html>: the stylesheet, the capsule and the identity assets all read it there, so nothing jumps after paint. */
export function applyThemeState(root: HTMLElement, state: ThemeState): void {
  root.dataset.theme = resolveSide(state); root.dataset.themePref = state.preference === 'system' ? 'auto' : state.preference; root.dataset.themeNext = state.next;
}
const label = (side: Side): string => side === 'dark' ? 'Dark' : 'Light';
/** The control's name, current state and next click, in the website's words. */
export function describeTheme(state: ThemeState): string {
  const current = state.preference === 'system' ? `Automatic, using ${resolveSide(state)}` : label(state.preference);
  const after = stepTheme(state, 1);
  return `${current}. Next click: ${after.preference === 'system' ? 'Automatic' : label(after.preference)}.`;
}
