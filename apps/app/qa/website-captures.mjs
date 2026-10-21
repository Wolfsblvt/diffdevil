// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Product captures of the built signed-in App for the public website's /app/ page and homepage chapter.
 *
 *   npm run app:build && node apps/app/qa/website-captures.mjs
 *
 * Seeds its own disposable local D1 state with the same fixture as `qa:app`, serves the loopback GitHub
 * double, runs the built Worker through local Wrangler and photographs the analytical destinations at
 * 1440×900 at device scale 2, below the shared site header (the App is dark by decision). Output goes to the target's `website-captures/` directory;
 * selected files are copied into `apps/website/src/assets/app/` by hand after looking at them. Every
 * figure is fixture data for the sample accounts, captured from whichever edition the build carries
 * (`edition.json`); this is product imagery, not qualification and not evidence of a live service.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { once } from 'node:events';
import { join, resolve } from 'node:path';
import { createFakeGitHub, CODE } from './fixture.mjs';
import { seedLocalState } from './seed.mjs';
import { COMMERCIAL_BUSINESS } from './manage.mjs';
import { appBuildTarget } from '../build-target.mjs';

const target = appBuildTarget();
const APP_PORT = Number(process.env.DIFFDEVIL_APP_QA_PORT ?? 4712);
const GITHUB_PORT = Number(process.env.DIFFDEVIL_APP_QA_GITHUB_PORT ?? 4733);
const ORIGIN = `http://localhost:${APP_PORT}`;
const CONFIG = join(target.artifacts, 'dist/server/wrangler.json');
const STATE = join(target.artifacts, 'state-website-captures');
const OUT = join(target.artifacts, 'website-captures');
if (!existsSync(CONFIG)) { console.error('Build the App first: npm run app:build'); process.exit(2); }
const edition = JSON.parse(readFileSync(join(target.artifacts, 'edition.json'), 'utf8'));
console.log(`Capturing the ${edition.premium ? 'premium-joined' : 'Community'} build.`);

/** The destinations the website shows; `content` crops to the page column, without the navigation sidebar. Files is absent: its file history needs the premium extension. */
const VIEWS = [
  { name: 'overview', path: '/?per=30d' },
  { name: 'prs', path: '/prs?per=30d', content: true },
  { name: 'history', path: '/history?per=30d', content: true },
  { name: 'pr-detail', path: '/pr/northwind-tools/ci-recipes/399', content: true },
  { name: 'manage-repositories', path: '/manage/repositories', content: true },
];

const listening = port => (spawnSync('netstat', ['-ano'], { encoding: 'utf8', windowsHide: true }).stdout ?? '').split(/\r?\n/u).some(line => line.includes(`:${port} `) && /LISTENING/u.test(line));
if (process.platform === 'win32' && (listening(APP_PORT) || listening(GITHUB_PORT))) { console.error(`Port ${APP_PORT} or ${GITHUB_PORT} is held; choose DIFFDEVIL_APP_QA_PORT / DIFFDEVIL_APP_QA_GITHUB_PORT.`); process.exit(2); }

const github = createFakeGitHub();
const githubServer = createServer(async (request, response) => {
  const chunks = []; for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const answer = await github.fetch(new URL(request.url, `http://127.0.0.1:${GITHUB_PORT}`), { method: request.method, headers: request.headers, body: body.length ? body.toString() : undefined });
  response.writeHead(answer.status, Object.fromEntries(answer.headers));
  response.end(Buffer.from(await answer.arrayBuffer()));
});
githubServer.listen(GITHUB_PORT, '127.0.0.1'); await once(githubServer, 'listening');

await rm(STATE, { recursive: true, force: true });
await seedLocalState(STATE);
await mkdir(OUT, { recursive: true });

// Fixture values only, never real credentials; the same shape `qa:app` passes.
const vars = { APP_ORIGIN: ORIGIN, GITHUB_API_BASE: `http://127.0.0.1:${GITHUB_PORT}`, GITHUB_OAUTH_BASE: `http://127.0.0.1:${GITHUB_PORT}`, GITHUB_OAUTH_CLIENT_ID: 'fixture-client', GITHUB_OAUTH_CLIENT_SECRET: 'fixture-secret-private', APP_SEAL_KEY: 'fixture-seal-key-with-enough-length', APP_SESSION_DAYS: '30', GITHUB_WEBHOOK_SECRET: 'fixture-webhook-secret', APP_COMMERCIAL_FIXTURE: JSON.stringify(COMMERCIAL_BUSINESS) };
const worker = spawn(process.execPath, [resolve('tools/run-wrangler.mjs'), 'dev', '--config', CONFIG, '--local', '--persist-to', STATE, '--ip', '127.0.0.1', '--port', String(APP_PORT), '--show-interactive-dev-session=false', ...Object.entries(vars).flatMap(([key, value]) => ['--var', `${key}:${value}`])], { cwd: resolve('.'), stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true, env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' } });
let log = ''; worker.stdout.on('data', chunk => { log += chunk; }); worker.stderr.on('data', chunk => { log += chunk; });
const stop = () => { if (worker.exitCode === null) { if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(worker.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); else worker.kill('SIGKILL'); } githubServer.close(); };

try {
  let ready = false;
  for (let attempt = 0; attempt < 180 && !ready; attempt++) {
    await new Promise(done => setTimeout(done, 500));
    try { ready = (await fetch(`http://127.0.0.1:${APP_PORT}/health/ready`)).ok; } catch { /* not yet */ }
    if (worker.exitCode !== null) break;
  }
  if (!ready) throw new Error(`The local Worker did not become ready.\n${log.slice(-3000)}`);

  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark', deviceScaleFactor: 2, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const started = await context.request.get(`${ORIGIN}/auth/start`, { maxRedirects: 0 });
    const state = new URL(started.headers().location).searchParams.get('state');
    await page.goto(`${ORIGIN}/auth/callback?state=${state}&code=${CODE}`, { waitUntil: 'networkidle' });
    for (const view of VIEWS) {
      await page.goto(`${ORIGIN}${view.path}`, { waitUntil: 'networkidle' });
      try { await page.waitForFunction(() => [...document.querySelectorAll('[data-chart]')].every(host => host.classList.contains('is-mounted') || host.classList.contains('is-failed')) && !document.body.classList.contains('is-drawing'), null, { timeout: 25_000 }); } catch { console.warn(`${view.name}: charts did not settle`); }
      await page.evaluate(() => new Promise(done => setTimeout(done, 300)));
      const header = await page.evaluate(() => Math.ceil(document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 0));
      const file = join(OUT, `${view.name}.png`);
      const left = view.content ? await page.evaluate(() => Math.floor((document.querySelector('main h1')?.getBoundingClientRect().left ?? 24) - 24)) : 0;
      await page.screenshot({ path: file, clip: { x: left, y: header, width: 1440 - left - (view.content ? 16 : 0), height: 900 - header } });
      console.log(file);
    }
    await context.close();
  }
  await browser.close();
} finally { stop(); }
