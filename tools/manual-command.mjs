// SPDX-License-Identifier: AGPL-3.0-only
import { prepareManual, run, packageBin, manualRoot } from './manual-package.mjs';
const command=process.argv[2];
if (!['check','dev'].includes(command)) throw new Error('Use manual-command.mjs check or dev.');
prepareManual();
run(process.execPath,['tools/website-assets.mjs']);
run(process.execPath,['apps/manual/render.mjs']);
packageBin('astro','astro',[command,'--root','apps/manual',...(command==='dev'?['--host','127.0.0.1','--port','4322']:[])],manualRoot,{env:{...process.env,DIFFDEVIL_SURFACE:'manual'}});
