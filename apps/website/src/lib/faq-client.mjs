// SPDX-License-Identifier: AGPL-3.0-only
/** Native disclosures remain usable without this focus/permalink enhancement. */
export function wireFaq(root = document.querySelector('[data-faq-page]')) {
  if (!root || root.dataset.faqWired) return;
  root.dataset.faqWired = 'true';
  const status = root.querySelector('[data-faq-status]');
  const reveal = () => {
    let id;
    try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target || !root.contains(target)) return;
    const article = target.closest('.faq-question');
    if (!article) return; // Category links keep their ordinary browser behavior.
    const details = article.querySelector('details');
    if (!details) return;
    details.open = true;
    requestAnimationFrame(() => {
      article.querySelector('summary')?.focus({ preventScroll: true });
      article.scrollIntoView({ block: 'start', behavior: 'instant' });
    });
  };
  root.addEventListener('click', async event => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest('a.faq-id');
    if (!link || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const hash = link.getAttribute('href');
    if (!hash?.startsWith('#')) return;
    if (location.hash !== hash) location.hash = hash;
    reveal(); // Clicking the same fragment must reveal a manually closed answer too.
    const canonical = new URL(root.dataset.faqCanonical || location.href);
    canonical.hash = hash;
    try {
      await navigator.clipboard.writeText(canonical.href);
      if (status) status.textContent = `Copied link to ${link.textContent}.`;
    } catch {
      if (status) status.textContent = 'Link opened. Use the link menu to copy its address.';
    }
  });
  // A search result can target the fragment already in the address bar after its
  // answer was closed. Native navigation then need not emit hashchange.
  document.addEventListener('click', event => {
    if (!(event.target instanceof Element) || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.classList.contains('faq-id')) return;
    const target = new URL(link.href);
    if (target.origin === location.origin && target.pathname === location.pathname && target.hash) requestAnimationFrame(reveal);
  });
  window.addEventListener('hashchange', reveal);
  window.addEventListener('pageshow', reveal);
  reveal();
}
