// SPDX-License-Identifier: AGPL-3.0-only
import { run, root } from './manual-package.mjs';
import { readFileSync, copyFileSync } from 'node:fs';
process.chdir(root);
const manifest=JSON.parse(readFileSync('artifacts/manual/manifest.json','utf8'));
if(manifest.qa) throw new Error('Build the ordinary production candidate before the isolated qualification build.');
copyFileSync('artifacts/manual/manifest.json','artifacts/manual/production-manifest.json');
run(process.execPath,['tools/public-build.mjs'],{env:{...process.env,DIFFDEVIL_DOCS_QA:'1'}});
run(process.execPath,['--test','apps/manual/render.spec.mjs']);
run(process.execPath,['apps/manual/qa/run.mjs']);
