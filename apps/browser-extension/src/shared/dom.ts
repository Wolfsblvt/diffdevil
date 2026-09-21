// SPDX-License-Identifier: AGPL-3.0-only
export function node<K extends keyof HTMLElementTagNameMap>(tag: K, className = '', text = ''): HTMLElementTagNameMap[K] {
  const result = document.createElement(tag); if (className) result.className = className; if (text) result.textContent = text; return result;
}
export function button(text: string, action: () => void, className = ''): HTMLButtonElement { const result = node('button', className, text); result.type = 'button'; result.addEventListener('click', action); return result; }
export function isDark(document: Document): boolean {
  const mode = document.documentElement.dataset.colorMode ?? document.documentElement.dataset.theme;
  return mode === 'dark' || mode !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches;
}
