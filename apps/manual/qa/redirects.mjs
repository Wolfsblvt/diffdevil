// SPDX-License-Identifier: AGPL-3.0-only
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

/** Exercise real HTTP redirects through the emitted handlers. Playwright's route
 * interception does not cover a redirect's second hop, so this journey uses three
 * loopback origins. Only the network origin in Location is adapted; production
 * status/path/query are observed before adaptation and fragments stay browser-owned.
 */
export async function qualifyRedirects(browser, handlers, asset, origins) {
 const servers = [], local = new Map(), observed = [], failures = [];
 let context;
 try {
  for (const canonical of [origins.site,origins.docs,origins.compatibility]) {
   const host = canonical === origins.docs ? 'docs' : 'site';
   const server = createServer(async (incoming,outgoing) => {
    try {
     const url = new URL(incoming.url,canonical);
     const request = new Request(url,{method:incoming.method});
     const response = await handlers[host].fetch(request,{
      ASSETS:{fetch:request=>asset(request,host === 'docs' ? 'manual' : 'website')},
     });
     const headers = Object.fromEntries(response.headers);
     if (headers.location) {
      observed.push({from:url.href,status:response.status,to:headers.location});
      const target = new URL(headers.location);
      const origin = local.get(target.origin);
      if (!origin) throw new Error(`Redirect left selected hosts: ${target.href}`);
      headers.location = origin + target.pathname + target.search + target.hash;
     }
     outgoing.writeHead(response.status,headers);
     outgoing.end(Buffer.from(await response.arrayBuffer()));
    } catch (error) {
     failures.push(String(error));
     outgoing.writeHead(500,{'Content-Type':'text/plain'});
     outgoing.end('Redirect qualification failed');
    }
   });
   servers.push(server);
   await new Promise((resolve,reject) => {
    server.once('error',reject);
    server.listen(0,'127.0.0.1',resolve);
   });
   local.set(canonical,`http://127.0.0.1:${server.address().port}`);
  }
  context = await browser.newContext({javaScriptEnabled:false});
  const page = await context.newPage();
  const responses = [];
  page.on('response',response=>{if(response.status() === 308) responses.push(response.url());});
  let response = await page.goto(local.get(origins.docs)+'/start/what-is-diffdevil/?keep=1#related-questions');
  assert.equal(response.status(),200);
  assert.equal(page.url(),local.get(origins.docs)+'/?keep=1#related-questions');
  assert.equal(await page.locator('h1').first().textContent(),'What is diffdevil');
  response = await page.goto(local.get(origins.compatibility)+'/faq/?keep=2#changed-vs-churn');
  assert.equal(response.status(),200);
  assert.equal(page.url(),local.get(origins.site)+'/faq/?keep=2#changed-vs-churn');
  assert.equal(await page.locator('[data-faq-page]').count(),1);
  assert.equal(responses.length,2);
  assert.deepEqual(observed,[
   {from:origins.docs+'/start/what-is-diffdevil/?keep=1',status:308,to:origins.docs+'/?keep=1'},
   {from:origins.compatibility+'/faq/?keep=2',status:308,to:origins.site+'/faq/?keep=2'},
  ]);
  assert.deepEqual(failures,[]);
  return {transport:'loopback HTTP through emitted handlers',observed,browserFragmentInheritance:true};
 } finally {
  await context?.close();
  await Promise.all(servers.map(server=>new Promise(resolve=>{
   server.closeAllConnections();
   server.close(resolve);
  })));
 }
}
