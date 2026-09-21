// SPDX-License-Identifier: AGPL-3.0-only
// Apply before paint; the authoritative preference is re-read from Chrome storage.
try { const theme = localStorage.getItem('diffdevil.options.theme'); if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme; } catch { /* Storage denial never prevents Settings from opening. */ }
