// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Theme before first paint, shared by the site layout and the manual's Starlight head.
 * A persisted explicit choice sets <html data-theme>; absence means "follow the system".
 * `data-theme-choice` always states the choice (light | system | dark) so the three-state
 * switch renders in its final position without waiting for the page script.
 */
export const themeScript = '(function(){var c="system";try{var t=localStorage.getItem("diffdevil.theme");if(t==="dark"||t==="light"){c=t;document.documentElement.setAttribute("data-theme",t);}}catch(e){}document.documentElement.setAttribute("data-theme-choice",c);})();';
