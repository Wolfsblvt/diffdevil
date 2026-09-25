// SPDX-License-Identifier: AGPL-3.0-only
/** Surface examples exercise public operations; prose remains reader-authored. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
import {unwrap,analyzeDiff} from '../../dist/lib/index.js';
import {compilePolicy,readPolicyYaml,evaluatePolicy,createPlan,readPlan} from '../../dist/lib/policy/index.js';
import {GitHubClient} from '../../dist/lib/github/client.js';
import {runAction} from '../../dist/lib/actions/run.js';
import {FakeGitHub,TARGET} from '../../src/diffdevil/tests/helpers/github.mjs';
import {pages,sidebar} from './manifest.mjs';
import {isRetired,legacyRedirects,pageIsCurrent} from './migration.mjs';
import {sourceTargets,resolveSource} from './source-resolver.mjs';
const root=resolve(import.meta.dirname,'../..');
const read=path=>readFileSync(join(root,path),'utf8');
const state=JSON.parse(read('apps/manual/authoring-state.json'));
const blocks=path=>[...read(path).matchAll(/```([^\n]*)\n([\s\S]*?)\n```/gu)];
function workspace(t){const home=mkdtempSync(join(tmpdir(),'diffdevil surface examples '));t.after(()=>rmSync(home,{recursive:true,force:true}));return home;}
function command(line,home,expected=0){
 const tokens=[...line.matchAll(/'([^']*)'|"([^"]*)"|(\S+)/gu)].map(m=>m[1]??m[2]??m[3]);
 assert.deepEqual(tokens.slice(0,4),['npm','exec','--','diffdevil']);
 const args=tokens.slice(4).map(value=>value.startsWith('node_modules/@wolfsblvt/diffdevil/')?join(root,value.slice('node_modules/@wolfsblvt/diffdevil/'.length)):value);
 assert.ok(!['apply','labels'].includes(args[0]),'Provider examples are exercised only through fixture HTTP.');
 const result=spawnSync(process.execPath,[join(root,'dist/lib/cli/main.js'),...args],{cwd:home,encoding:'utf8',windowsHide:true,env:{...process.env,NO_COLOR:'1'}});
 assert.ifError(result.error);assert.equal(result.status,expected,line+'\n'+result.stderr);return result.stdout;
}

test('complete surface workflows, policies and library program equal their canonical files',()=>{
 for(const [page,asset,language] of [
  ['github-actions.md','workflows/size.yml','yaml'],
  ['github-actions.md','workflows/analyze.yml','yaml'],
  ['github-actions.md','workflows/analyze-and-apply.yml','yaml'],
  ['shared-workflows/labels-comments-and-definitions.md','policies/review-signals.yml','yaml'],
  ['shared-workflows/labels-comments-and-definitions.md','policies/review-comment.yml','yaml'],
  ['typescript-library.md','library/inspect-change.mts','typescript'],
 ]) assert.ok(blocks('docs/manual/use/'+page).some(([,kind,body])=>kind===language&&body===read('docs/examples/'+asset).trimEnd()),asset);
});

test('the report workflow executes capture, replay, re-policy, desired planning and a held return',t=>{
 const home=workspace(t),groups=blocks('docs/manual/use/shared-workflows/reports-plans-and-apply.md').filter(([,kind])=>kind==='sh').map(([, ,body])=>body.split('\n'));
 const capture=groups.find(lines=>lines[0].includes('--output report.json'));
 assert.ok(capture);for(const line of capture)command(line,home);
 const report=JSON.parse(readFileSync(join(home,'report.json'),'utf8'));
 assert.equal(report.totals.lines.changed.value,10);assert.equal(report.totals.raw.churn.value,16);
 assert.equal(report.bands.size.id,'xs');
 for(const line of groups.find(lines=>lines[0].includes('--expr totals.raw.churn')))command(line,home);
 command(groups.find(lines=>lines[0].includes('--output selected-report.json'))[0],home);
 const selected=JSON.parse(readFileSync(join(home,'selected-report.json'),'utf8'));
 assert.equal(selected.totals.lines.changed.value,6);assert.equal(selected.totals.raw.churn.value,8);
 assert.equal(selected.metrics.sourceReview.value,3);assert.equal(selected.metrics.testsReview.value,2);
 for(const line of groups.find(lines=>lines[0].includes('--output desired.json')))command(line,home);
 const plan=unwrap(readPlan(readFileSync(join(home,'desired.json'),'utf8')));
 assert.equal(plan.stage,'desired');assert.ok(plan.operations.some(op=>op.kind==='label.select'&&op.selected==='size/XS'));
 command(groups.find(lines=>lines[0].includes('--output held.json'))[0],home,3);
 const held=unwrap(readPlan(readFileSync(join(home,'held.json'),'utf8')));
 assert.equal(held.held.length,1);assert.deepEqual(held.operations,[]);
});

test('the two-step Action consumes the full runner report, reacquires it and refuses source drift',async t=>{
 const home=workspace(t),workflow=parse(read('docs/examples/workflows/analyze-and-apply.yml'));
 const [first,second]=workflow.jobs.size.steps;
 assert.equal(first.uses,'Wolfsblvt/diffdevil/actions/analyze@v1');
 assert.equal(second.with['input-report'],'${{ steps.measured.outputs.report-path }}');
 assert.equal(workflow.permissions['pull-requests'],'write');
 assert.ok(workflow.on.pull_request_target);assert.equal(workflow.concurrency['cancel-in-progress'],false);
 const fake=new FakeGitHub(),client=new GitHubClient({fetch:fake.fetch,readRetries:0});
 const environment={GITHUB_WORKSPACE:home,RUNNER_TEMP:home,GITHUB_REPOSITORY:TARGET.repository,GITHUB_EVENT_NAME:'pull_request_target',GITHUB_EVENT_PATH:join(home,'event.json'),GITHUB_OUTPUT:join(home,'output'),GITHUB_STEP_SUMMARY:join(home,'summary')};
 writeFileSync(environment.GITHUB_EVENT_PATH,JSON.stringify({repository:{full_name:TARGET.repository},pull_request:{number:42}}));
 writeFileSync(environment.GITHUB_OUTPUT,'');writeFileSync(environment.GITHUB_STEP_SUMMARY,'');
 const measured=unwrap(await runAction('analyze',{environment,client}));
 assert.equal(measured.exitCode,0);assert.equal(fake.writes().length,0);
 assert.ok(existsSync(measured.outputs['report-path']));
 assert.equal(JSON.parse(readFileSync(measured.outputs['report-path'],'utf8')).kind,'diffdevil.report');
 const calls=fake.calls.length;
 const applying={...environment,'INPUT_INPUT-REPORT':measured.outputs['report-path']};
 assert.equal(unwrap(await runAction('apply',{environment:applying,client})).exitCode,0);
 assert.ok(fake.calls.slice(calls).some(call=>call.path.endsWith('/pulls/42/files')),'Apply must reacquire, not trust its same-job file.');
 assert.ok(fake.labels.has('size/XS'));assert.equal(fake.comments.length,0);
 const writes=fake.writes().length;
 fake.head='d'.repeat(40);
 const stale=await runAction('apply',{environment:applying,client});
 assert.ok(!stale.ok||stale.value.exitCode!==0);assert.equal(fake.writes().length,writes);
});

test('label and comment teaching policies retain false-removal, optional comments and exact shared facts',()=>{
 const report=unwrap(analyzeDiff(read('docs/examples/diffs/review.diff')));
 const evaluate=name=>unwrap(evaluatePolicy(unwrap(compilePolicy(unwrap(readPolicyYaml(read('docs/examples/policies/'+name+'.yml'))))),report));
 const labels=unwrap(createPlan(evaluate('review-signals'),TARGET,{definitions:'ensure'}));
 assert.ok(labels.operations.some(op=>op.kind==='label.remove'&&op.name==='review/source-without-tests'));
 assert.equal(labels.operations.some(op=>op.kind==='comment.reconcile'),false);
 const comments=unwrap(createPlan(evaluate('review-comment'),TARGET));
 assert.equal(comments.operations.length,1);assert.equal(comments.operations[0].kind,'comment.reconcile');
 assert.match(comments.operations[0].body,/changed lines: 10\nRaw churn: 16\nDeleted-only or modified lines: 6\nIncluded files: 4/u);
});

test('accepted Wave 2 transfers survive later completed source waves',()=>{
 for(const page of pages.filter(page=>page.wave===2))assert.equal(state.pages[page.key].status,'authored',page.key);
 const ref='1'.repeat(40),targets=sourceTargets({ref,state,exists:path=>existsSync(join(root,path))});
 for(const source of ['docs/guides/auto-label-pull-requests.md','docs/guides/local-automation.md','docs/integration/playground.md']){
  assert.equal(isRetired(source,state),true);assert.equal(existsSync(join(root,source)),false);
  for(const [old,destination] of Object.entries(state.transfers[source].anchors)){
   const page=pages.find(page=>page.key===destination.page);
   assert.equal(resolveSource('/source/?f='+encodeURIComponent(source)+'#'+old,targets),`https://github.com/Wolfsblvt/diffdevil/blob/${ref}/${page.source}#${destination.anchor}`);
  }
 }
 assert.ok(legacyRedirects(state).some(rule=>rule.from==='/docs/get-started/auto-label-pull-requests/'));
 assert.ok(legacyRedirects(state).some(rule=>rule.from==='/docs/get-started/local-automation/'));
 assert.ok(legacyRedirects(state).some(rule=>rule.from==='/docs/playground/'));
 assert.equal(pageIsCurrent('playground',state),true);assert.equal(pageIsCurrent('cli',state),true);
});

test('extension navigation, selected assets and canonical Skill sources have separate identities',()=>{
 const leaves=[];function walk(items){for(const item of items){leaves.push(item);walk(item.items??[]);}}walk(sidebar());
 const page=pages.find(page=>page.key==='browser-extension');assert.equal(page.title,'diffdevil for GitHub');
 assert.ok(leaves.some(item=>item.label==='Browser extension'&&item.slug==='use/browser-extension'));
 const assets=JSON.parse(read('apps/manual/assets.json'));
 assert.equal(assets['apps/website/src/assets/extension/settings-policy-bands-light.png'],'/assets/manual/settings-policy-bands-light.png');
 assert.ok(existsSync(join(root,'skills/diffdevil/references/install-and-update.md')));
 const source=read('apps/website/src/lib/sources.ts');assert.match(source,/skill: 'docs\/setup\/skill\.md'/u);
 // Public install snippets select the registry route, not a stale fixed patch release.
 const installSources=[...pages.filter(page=>page.wave===1||page.wave===2).map(page=>page.source),'docs/setup/cli.md'];
 for(const source of installSources)
  for(const [,kind,body] of blocks(source))if(['sh','bash','powershell'].includes(kind))assert.doesNotMatch(body,/@wolfsblvt\/diffdevil@\d/u,source);
});
