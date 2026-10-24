// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** The built Worker, fixture authentication and optional uninstalled headless app window. */
export async function installEntry({ page, context, check, ORIGIN, shot, standalone, target }) {
 const launch=await context.request.get(`${ORIGIN}/`,{maxRedirects:0});
 const entrance=await launch.text();
 check('signed-out manifest launch returns the useful public App entrance',launch.status()===200 && entrance.includes('data-public-app-entrance') && entrance.includes('diffdevil, with a memory.') && entrance.includes('Sign in with GitHub'));
 check('public and private root variants cannot enter a shared response cache',launch.headers()['cache-control']==='private, no-store' && launch.headers().vary==='Cookie');
 const crawler=await context.request.get(`${ORIGIN}/`,{headers:{'user-agent':'Googlebot'}});
 check('people and crawlers receive the same neutral App entrance',(await crawler.text())===entrance);
 check('public entry has a self-canonical and contains no analytical or viewer state',entrance.includes(`rel="canonical" href="${ORIGIN}/"`) && !/data-analytical-loading|parser-guild|lexer-kit|qa\.reader/u.test(entrance));
 check('only the production public entry is indexable',/name="robots" content="noindex/u.test(entrance)===(target.name==='staging'));
 const invalid=await context.request.get(`${ORIGIN}/`,{headers:{cookie:'__Host-diffdevil-session=invalid-fixture-session'}});
 check('an invalid cookie reveals only the same neutral entrance',invalid.status()===200 && (await invalid.text())===entrance);
 const privatePage=await context.request.get(`${ORIGIN}/manage`,{maxRedirects:0});
 check('private destinations still refuse an unauthenticated request',privatePage.status()===303 && privatePage.headers().location?.startsWith('/sign-in?reason='));
 const internal=await context.request.get(`${ORIGIN}/render/app-entrance`);
 check('the internal entrance renderer is not a second public route',internal.status()===404);
 const map=await context.request.get(`${ORIGIN}/sitemap.xml`);
 const urls=[...(await map.text()).matchAll(/<loc>(.*?)<\/loc>/gu)].map(([,url])=>url);
 check('App discovery lists only the neutral production root',map.status()===200 && JSON.stringify(urls)===JSON.stringify(target.name==='production'?[target.origin+'/']:[]));
 const robots=await context.request.get(`${ORIGIN}/robots.txt`);
 check('App robots points at its own canonical sitemap',robots.status()===200 && (await robots.text()).includes(`Sitemap: ${target.origin}/sitemap.xml`));
 await page.goto(`${ORIGIN}/`);
 const rootMeta=await page.evaluate(()=>({title:document.title,
  description:document.querySelector('meta[name="description"]')?.getAttribute('content'),
  og:document.querySelector('meta[property="og:url"]')?.getAttribute('content'),
  twitter:document.querySelector('meta[name="twitter:title"]')?.getAttribute('content'),
  manifests:[...document.querySelectorAll('link[rel="manifest"]')].map(link=>link.getAttribute('href'))}));
 check('public entrance emits its own useful App identity and only the App manifest',rootMeta.title===(target.name==='staging'?'Staging · diffdevil App':'diffdevil App')
  && rootMeta.description?.includes('GitHub access') && rootMeta.og===ORIGIN+'/' && rootMeta.twitter==='diffdevil App' && JSON.stringify(rootMeta.manifests)==='["/manifest.webmanifest"]',JSON.stringify(rootMeta));
 const rootBrowser=await context.newCDPSession(page);
 const rootManifest=await rootBrowser.send('Page.getAppManifest');
 check('the public entrance manifest is accepted through its own response CSP',rootManifest.errors.length===0 && JSON.parse(rootManifest.data).id==='/',JSON.stringify(rootManifest.errors));
 await rootBrowser.detach();
 await page.setViewportSize({width:390,height:844});
 await shot('install-public-entrance-phone');
 await page.setViewportSize({width:1440,height:900});
 const response=await page.goto(`${ORIGIN}/sign-in`);
 check('the sign-in threshold remains private and uncacheable',response.headers()['cache-control']==='private, no-store'
  && await page.locator('meta[name="robots"]').getAttribute('content')==='noindex, nofollow, nosnippet');
 check('sign-in links only the App manifest and Apple standalone identity',await page.locator('link[rel="manifest"]').count()===1
  && await page.locator('link[rel="manifest"]').getAttribute('href')==='/manifest.webmanifest'
  && await page.locator('meta[name="apple-mobile-web-app-capable"]').getAttribute('content')==='yes');
 const fetched=await context.request.get(`${ORIGIN}/manifest.webmanifest`);
 check('the App manifest is publicly fetchable with manifest MIME',fetched.status()===200 && fetched.headers()['content-type']?.includes('application/manifest+json'),JSON.stringify({status:fetched.status(),type:fetched.headers()['content-type']}));
 const manifest=await fetched.json();
 check('the App has a stable standalone root identity',manifest.id==='/' && manifest.scope==='/' && manifest.start_url==='/' && manifest.display==='standalone' && manifest.name==='diffdevil App');
 for (const icon of [...manifest.icons,{src:'/apple-touch-icon.png',sizes:'180x180'}]) {
  const response=await context.request.get(ORIGIN+icon.src);
  const png=await response.body();
  const size=Number(icon.sizes.split('x')[0]);
  check(`built App serves ${icon.src} as a real ${size}px PNG`,response.status()===200 && response.headers()['content-type']?.includes('image/png') && png.subarray(1,4).toString()==='PNG' && png.readUInt32BE(16)===size && png.readUInt32BE(20)===size);
 }
 const session=await context.newCDPSession(page);
 const parsed=await session.send('Page.getAppManifest');
 check('Chromium accepts the App manifest through its actual CSP',parsed.errors.length===0 && parsed.url.endsWith('/manifest.webmanifest') && JSON.parse(parsed.data).name==='diffdevil App',JSON.stringify(parsed.errors));
 check(`Chromium opens in ${standalone?'standalone app-window':'browser'} display`,await page.evaluate(()=>matchMedia('(display-mode: standalone)').matches)===standalone);
 await page.setViewportSize({width:390,height:844});
 await shot(`install-sign-in-phone-${standalone?'standalone':'browser'}`);
 await page.setViewportSize({width:1440,height:900});
 await session.detach();
}

export async function installedShell({page,check}) {
 const response=await page.request.get(new URL('/',page.url()).href);
 check('authenticated launch keeps protected response and cache policy',response.status()===200 && response.headers()['cache-control']==='private, no-store'
  && (await response.text()).includes('content="noindex, nofollow, nosnippet"'));
 check('authenticated root never contains the public entrance',!(await page.content()).includes('data-public-app-entrance'));
 check('authenticated shell keeps the same public install identity',await page.locator('link[rel="manifest"]').count()===1 && await page.locator('link[rel="manifest"]').getAttribute('href')==='/manifest.webmanifest');
 check('install identity introduces no service worker or browser cache',await page.evaluate(async()=> (await navigator.serviceWorker.getRegistrations()).length===0 && (await caches.keys()).length===0));
}
