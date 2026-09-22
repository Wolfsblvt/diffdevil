// SPDX-License-Identifier: AGPL-3.0-only
export function themeTransferUrl(href, current, preference, next) {
 const owned = new Set(['https://diffdevil.dev','https://docs.diffdevil.dev']);
 const here = new URL(current), target = new URL(href,here);
 if (!owned.has(here.origin) || !owned.has(target.origin) || here.origin === target.origin || !target.pathname.endsWith('/')) return target.href;
 if (!['dark','auto','light'].includes(preference) || !['dark','light'].includes(next)) return target.href;
 target.searchParams.set('dd-theme',preference+'.'+next);
 return target.href;
}
export function wireThemeTransfer(resolve) {
 const prepare = event => {
  const element = event.target instanceof Element ? event.target.closest('a[href]') : null;
  if (!element || element.hasAttribute('download')) return;
  const d = document.documentElement;
  element.href = resolve(element.href,location.href,d.dataset.themePref,d.dataset.themeNext);
 };
 for (const event of ['pointerdown','focusin','click','auxclick','contextmenu']) document.addEventListener(event,prepare,true);
}
