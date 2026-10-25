// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0

/**
 * Reports whether a mounted cloud is visibly settled in the browser.
 * This function is serialized by Playwright and must remain self-contained.
 * @param {string} selector Cloud chart host selector.
 * @returns {boolean} Whether the cloud is ready for user-visible assertions.
 */
export function cloudViewIsReady(selector) {
  const host = document.querySelector(selector);
  const cloud = host?.querySelector('.cl');
  const stage = host?.querySelector('.cl-wrap');
  const list = host?.querySelector('.cl-list');
  const cloudRect = cloud?.getBoundingClientRect();
  const stageRect = stage?.getBoundingClientRect();
  const listHidden = list && (getComputedStyle(list).display === 'none' || list.getClientRects().length === 0);

  return host?.classList.contains('is-mounted')
    && !document.body.classList.contains('is-drawing')
    && cloud && !cloud.classList.contains('is-busy')
    && getComputedStyle(cloud).visibility !== 'hidden'
    && cloud.getClientRects().length > 0 && cloudRect.width > 0 && cloudRect.height > 0
    && stage && getComputedStyle(stage).display !== 'none'
    && getComputedStyle(stage).visibility !== 'hidden'
    && stage.getClientRects().length > 0 && stageRect.width > 0 && stageRect.height > 0
    && listHidden
    && host.querySelectorAll('.cl-words .cl-w').length > 0;
}
