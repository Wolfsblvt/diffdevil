// SPDX-License-Identifier: AGPL-3.0-only
/** The built Worker, fixture authentication and Chromium media emulation; never a device-install claim. */
export async function installEntry({ page, context, check, ORIGIN, shot }) {
 const launch=await context.request.get(`${ORIGIN}/`,{maxRedirects:0});
 check('manifest launch without a session still redirects before protected content',launch.status()===303 && launch.headers().location==='/sign-in?reason=E_SESSION_UNAVAILABLE');
 const response=await page.goto(`${ORIGIN}/sign-in`);
 check('the sign-in threshold remains private and uncacheable',response.headers()['cache-control']?.includes('no-store') && response.headers()['x-robots-tag']?.includes('noindex'));
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
 await session.send('Emulation.setEmulatedMedia',{features:[{name:'display-mode',value:'standalone'}]});
 check('Chromium emulates standalone display mode',await page.evaluate(()=>matchMedia('(display-mode: standalone)').matches));
 await page.setViewportSize({width:390,height:844});
 await shot('install-sign-in-phone-emulated');
 await page.setViewportSize({width:1440,height:900});
 await session.detach();
}

export async function installedShell({page,check}) {
 const response=await page.request.get(new URL('/',page.url()).href);
 check('authenticated launch keeps protected response and cache policy',response.status()===200 && response.headers()['cache-control']?.includes('no-store') && response.headers()['x-robots-tag']?.includes('noindex'));
 check('authenticated shell keeps the same public install identity',await page.locator('link[rel="manifest"]').count()===1 && await page.locator('link[rel="manifest"]').getAttribute('href')==='/manifest.webmanifest');
 check('install identity introduces no service worker or browser cache',await page.evaluate(async()=> (await navigator.serviceWorker.getRegistrations()).length===0 && (await caches.keys()).length===0));
}
