// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Astro module scripts in acquired HTML must register their charts just as in a native document. */
const modules = new Map<string, Promise<void>>();

export async function loadFragmentModules(fragment: Document): Promise<void> {
  const existing = new Set([...document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]')].map(script => script.src));
  await Promise.all([...fragment.querySelectorAll<HTMLScriptElement>('script[type="module"][src]')].map(async source => {
    const url = new URL(source.getAttribute('src')!, location.href);
    // These are the App's compiled modules, from its authenticated server response.
    // Do not give acquired HTML a different script-origin policy or execute inline text.
    if (url.origin !== location.origin) throw new Error('E_FRAGMENT_MODULE_ORIGIN');
    if (modules.has(url.href)) return modules.get(url.href);
    if (existing.has(url.href)) return;
    const script = document.createElement('script');
    script.type = 'module'; script.src = url.href;
    const loaded = new Promise<void>((resolve, reject) => {
      script.onload = () => resolve();
      script.onerror = () => { script.remove(); modules.delete(url.href); reject(new Error('E_FRAGMENT_MODULE_LOAD')); };
    });
    modules.set(url.href, loaded);
    document.head.append(script);
    return loaded;
  }));
}
