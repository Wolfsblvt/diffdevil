// SPDX-License-Identifier: AGPL-3.0-only
/** The manual projects the selected offer; it never owns another price/allowance table. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {generatedIsland} from './generated-islands.mjs';
import {committedIslands} from './generated-content.mjs';

test('plan projections follow their canonical table and reject ambiguous or absent source',t=>{
 const root=mkdtempSync(join(tmpdir(),'diffdevil-manual-plans-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 mkdirSync(join(root,'docs'));
 writeFileSync(join(root,'package.json'),JSON.stringify({bin:{diffdevil:'unused-cli.js'}}));
 const prices='| Purchase | Monthly | Annually |\n| --- | ---: | ---: |\n| Sample | €12 | €120 |';
 const capabilities='| Capability | Free | Pro | Business |\n| --- | --- | --- | --- |\n| Sample capacity | 2 | 4 | 8 |';
 const write=(priceTable=prices)=>writeFileSync(join(root,'docs/app-plans.md'),`# Plans\n\n${priceTable}\n\nProse is not another inventory.\n\n${capabilities}\n`);
 const inputs=new Set();
 write();
 assert.equal(generatedIsland('app-plan-prices',{root,onSource:path=>inputs.add(path)}),prices);
 assert.equal(generatedIsland('app-plan-capabilities',{root}),capabilities);
 assert.ok(inputs.has('docs/app-plans.md'));
 const changed=prices.replace('€12 |','€17 |');
 write(changed);
 assert.equal(generatedIsland('app-plan-prices',{root}),changed,'A canonical price change must reach the manual.');
 write(prices+'\n\n'+prices);
 assert.throws(()=>generatedIsland('app-plan-prices',{root}),/expected one Purchase table/u);
 write('No price table.');
 assert.throws(()=>generatedIsland('app-plan-prices',{root}),/expected one Purchase table/u);
});

test('the authored plan chapter keeps both reference tables inside checked generated boundaries',()=>{
 const root=resolve(import.meta.dirname,'../..');
 const source='docs/manual/use/managed-app/plans-and-sharing.md';
 const raw=readFileSync(join(root,source),'utf8'),receipts=[];
 assert.equal(committedIslands(raw,{root,source,receipts}),raw);
 assert.deepEqual(receipts.map(receipt=>receipt.island),['app-plan-prices','app-plan-capabilities']);
 for(const receipt of receipts)assert.ok(receipt.inputs.some(input=>input.path==='docs/app-plans.md'));
 assert.throws(()=>committedIslands(raw.replace('<!-- manual:generated app-plan-prices -->\n','<!-- manual:generated app-plan-prices -->\nDRIFT\n'),{root,source}),/generated app-plan-prices drift/u);
});
