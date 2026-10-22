// SPDX-License-Identifier: AGPL-3.0-only
// Apply before paint; the authoritative preference is re-read from Chrome storage. The
// bounce side travels with it so the header capsule never jumps once settings arrive.
import { THEME_KEY, THEME_NEXT_KEY, applyThemeState, isPreference, nextSide, type ThemePreference } from '../shared/theme-state.js';
let preference: ThemePreference = 'system'; let stored: string | null = null;
try { const saved = localStorage.getItem(THEME_KEY); if (isPreference(saved)) preference = saved; stored = localStorage.getItem(THEME_NEXT_KEY); } catch { /* Storage denial never prevents Settings from opening. */ }
applyThemeState(document.documentElement, { preference, next: nextSide(preference, stored) });
