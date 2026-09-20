// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Theme before first paint, shared verbatim by the site layout and the manual's Starlight
 * head, so every route resolves the theme by one rule:
 *
 *   preference  `diffdevil.theme`       dark | auto | light     (explicit Dark when absent or invalid)
 *   bounce      `diffdevil.theme.next`  light | dark            (the next manual side while in Auto)
 *
 * `<html data-theme>` is always the resolved appearance (dark | light) and
 * `<html data-theme-pref>` the preference, so the control renders in its final state
 * without waiting for the page script. Auto resolves from the system and falls back to
 * dark when that cannot be read. A legacy Auto value (`system`) migrates to `auto`; an Auto
 * without a stored bounce side gets the opposite of its resolved appearance, once.
 * Older builds removed the key for Auto, so an absent key cannot be told from "never
 * chosen": it takes the dark-first default. Storage failure leaves a working in-page theme.
 */
export const THEME_KEY = 'diffdevil.theme';
export const THEME_NEXT_KEY = 'diffdevil.theme.next';

export const themeScript = `(function(){var d=document.documentElement,p="dark",n="light",s=false;try{var v=localStorage.getItem("${THEME_KEY}");if(v==="system")v="auto";if(v==="dark"||v==="light"||v==="auto")p=v;var x=localStorage.getItem("${THEME_NEXT_KEY}");if(x==="light"||x==="dark"){n=x;s=true}}catch(e){}var l=false;try{l=window.matchMedia("(prefers-color-scheme: light)").matches}catch(e){}var r=p==="auto"?(l?"light":"dark"):p;if(p==="auto"&&!s){n=r==="dark"?"light":"dark";try{localStorage.setItem("${THEME_NEXT_KEY}",n);localStorage.setItem("${THEME_KEY}","auto")}catch(e){}}if(p!=="auto")n=p==="dark"?"light":"dark";d.setAttribute("data-theme",r);d.setAttribute("data-theme-pref",p);d.setAttribute("data-theme-next",n)})();`;
