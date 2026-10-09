// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Shared client behaviour for every page, the manual included: the bouncing theme control,
 * header destination panels (Install, Community, compact Menu), global search, clipboard
 * copies with one live region, and hash-driven disclosure opening. Plain DOM; no framework
 * on ordinary pages. The behaviours live in shell-behaviour.ts so the App can reuse them.
 */
import { announce, copyText, wireCopyButtons } from './clipboard';
import { wireSearch } from './search';
import { labelShortcut, openHashTarget, stepTheme, wirePanels, wireThemeControl } from './shell-behaviour';

wireThemeControl();
wirePanels();
wireSearch();
labelShortcut();
wireCopyButtons(document);
openHashTarget();
window.addEventListener('hashchange', openHashTarget);

export { announce, copyText, stepTheme };
