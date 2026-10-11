// Render the standard PR brief for inspection. Writes every preview state (with the premium provider when present)
// plus an adversarial-identity case to artifacts/pr-brief/*.md. With --github it also renders each body through
// GitHub's Markdown API (POST /markdown, read-only; synthetic content only) and checks the native structure: one NOTE
// alert where context leads, one details fold, no live mention, element or script from untrusted text.
// This is renderer evidence, not a real PR: desktop, narrow, zoom and assistive-technology behavior still need a PR.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { previewBrief } from '../apps/shared/pr-brief/preview.mjs';
import { readBriefSettings } from '../apps/shared/pr-brief/settings.mjs';
import { standardBrief } from '../apps/shared/pr-brief/standard.mjs';
import { FIXTURE_LINKS, fixtureContextFacts, fixtureCurrent, fixtureHistory } from '../apps/shared/pr-brief/fixture.mjs';

const premiumEntry = resolve('premium/pr-brief/index.mjs');
const provider = process.env.DIFFDEVIL_PREMIUM !== 'off' && existsSync(premiumEntry) ? (await import(pathToFileURL(premiumEntry).href)).premiumBrief : null;
const settings = readBriefSettings({ mode: 'standard', finalSummary: true });
const preview = previewBrief({ settings, provider, route: { mode: 'standard', effective: 'standard', reason: 'standard-selected', templateRules: [] },
  source: { standing: 'observed', kind: 'bundled-default', identity: 'size@1', policyId: 'fixture' }, writer: { login: 'diffdevil[bot]', confidence: 'fixture' },
  eligibility: { history: { standing: 'available' }, premium: { eligible: true } } });

const bodies = Object.fromEntries(Object.entries(preview.states).map(([state, value]) => [state, value.markdown]));
bodies['final-summary'] = preview.finalSummaryMarkdown;
// Untrusted titles and paths carrying Markdown, HTML, mentions, pipes and backticks.
const current = fixtureCurrent('exact');
current.files[0] = { ...current.files[0], path: 'src/we|ird`name<b>.ts' };
const facts = fixtureContextFacts();
facts.neighbours.items[0] = { ...facts.neighbours.items[0], title: '@octocat <img src=x onerror=alert(1)> [click](javascript:alert(1)) **bold** #1 | pipe', files: ['src/we|ird`name<b>.ts', 'src/config.ts'] };
facts.files[0] = { ...facts.files[0], path: 'src/we|ird`name<b>.ts' };
bodies.adversarial = standardBrief({ current, settings, history: { standing: 'available', facts: fixtureHistory() }, premium: { provider, eligible: true, facts }, links: FIXTURE_LINKS }).markdown;

const out = resolve('artifacts/pr-brief');
await mkdir(out, { recursive: true });
for (const [name, body] of Object.entries(bodies)) await writeFile(resolve(out, `${name}.md`), `${body}\n`, 'utf8');
console.log(`Wrote ${Object.keys(bodies).length} bodies to ${out} (${provider ? 'premium provider joined' : 'Community: no premium provider'}).`);

if (process.argv.includes('--github')) {
  const token = process.env.GITHUB_TOKEN ?? execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', windowsHide: true }).trim();
  const failures = [];
  for (const [name, body] of Object.entries(bodies)) {
    const response = await fetch('https://api.github.com/markdown', { method: 'POST',
      headers: { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'content-type': 'application/json' },
      body: JSON.stringify({ text: body, mode: 'gfm', context: 'Wolfsblvt/diffdevil' }) });
    if (!response.ok) { failures.push(`${name}: GitHub answered ${response.status}`); continue; }
    const html = await response.text();
    await writeFile(resolve(out, `${name}.html`), html, 'utf8');
    const leads = body.startsWith('> [!NOTE]');
    const checks = [
      [(html.match(/<details>/gu) ?? []).length === 1, 'one details fold'],
      [/<summary>[^<]+<\/summary>/u.test(html), 'a summary label'],
      [leads === /markdown-alert-note/u.test(html), leads ? 'a native NOTE alert' : 'no alert'],
      [!/user-mention|<img|<script|href="javascript:/u.test(html), 'no live mention, element or script from untrusted text']
    ];
    for (const [ok, label] of checks) if (!ok) failures.push(`${name}: expected ${label}`);
  }
  if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1; }
  else console.log(`GitHub rendered ${Object.keys(bodies).length} bodies with the expected native structure; HTML is beside the Markdown.`);
}
