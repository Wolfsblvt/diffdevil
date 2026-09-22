// SPDX-License-Identifier: AGPL-3.0-only
/** Consume the exact accepted source package through its own build/pack tools.
 * No registry publication, local implementation fork, provider write or ambient token.
 * The existing website keeps its locked graph; the manual uses the supported peer.
 */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageSource } from '../apps/manual/manifest.mjs';
export const root = fileURLToPath(new URL('../',import.meta.url));
export const manualRoot = join(root,'apps/manual');
const cache = join(root,'artifacts/manual-toolchain');
const checkout = join(cache,'source');
const tarball = join(cache,'starlight-works.tgz');
const receiptPath = join(cache,'source-receipt.json');
export function run(command,args,options={}) {
 return execFileSync(command,args,{cwd:root,stdio:'inherit',shell:false,...options});
}
export function npm(args,cwd=root,options={}) {
 const cli=process.env.npm_execpath;
 if(cli) return run(process.execPath,[cli,...args],{cwd,...options});
 if(process.platform==='win32') throw new Error('Use an npm run command so the Windows npm CLI path is explicit.');
 return run('npm',args,{cwd,...options});
}
export function packageBin(packageName,bin,args,cwd=manualRoot,options={}) {
 const require=createRequire(join(cwd,'package.json'));
 const file=require.resolve(`${packageName}/package.json`);
 const manifest=JSON.parse(readFileSync(file,'utf8'));
 const entry=typeof manifest.bin==='string'?manifest.bin:manifest.bin?.[bin];
 if(!entry) throw new Error(`Missing executable ${packageName}/${bin}`);
 return run(process.execPath,[join(dirname(file),entry),...args],{cwd:root,...options});
}
const sha256=file=>createHash('sha256').update(readFileSync(file)).digest('hex');
export function prepareManual() {
 const offline = process.env.DIFFDEVIL_DOCS_OFFLINE === '1';
 mkdirSync(cache,{recursive:true});
 let receipt=existsSync(receiptPath)?JSON.parse(readFileSync(receiptPath,'utf8')):undefined;
 if(receipt && (receipt.commit!==packageSource.commit || !existsSync(tarball) || receipt.tarballSha256!==sha256(tarball))) throw new Error('The manual source-package cache does not match the selected coordinate. Remove artifacts/manual-toolchain and rebuild.');
 if(!receipt) {
  if (offline) throw new Error('The exact manual source package is not cached. Run npm run manual:prepare while online first.');
  if(!existsSync(join(checkout,'.git'))) run('git',['init',checkout]);
  run('git',['-C',checkout,'fetch','--depth=1',`https://github.com/${packageSource.repository}.git`,packageSource.commit]);
  run('git',['-C',checkout,'config','core.autocrlf','false']);
  run('git',['-C',checkout,'checkout','--detach',packageSource.commit]);
  const actual=run('git',['-C',checkout,'rev-parse','HEAD'],{encoding:'utf8',stdio:'pipe'}).trim();
  if(actual!==packageSource.commit) throw new Error(`Wrong starlight-works source: ${actual}`);
  npm(['install','--ignore-scripts','--no-audit','--no-fund'],checkout);
  npm(['run','pack'],checkout);
  const packed=JSON.parse(readFileSync(join(checkout,'artifacts/package/pack.json'),'utf8'));
  if(packed.name!==packageSource.name || packed.version!==packageSource.version) throw new Error('The accepted source packed an unexpected package.');
  copyFileSync(join(checkout,'artifacts/package',packed.filename),tarball);
  receipt={repository:packageSource.repository,commit:actual,name:packed.name,version:packed.version,integrity:packed.integrity,tarballSha256:sha256(tarball)};
  writeFileSync(receiptPath,JSON.stringify(receipt,null,2)+'\n');
 }
 const unpacked=join(cache,'package');
 rmSync(unpacked,{recursive:true,force:true}); mkdirSync(unpacked,{recursive:true});
 run('tar',['-xzf',tarball,'-C',unpacked,'--strip-components=1']);
 // Directory packaging plus install-links preserves a portable lock: source identity
 // is proven by the accepted Git SHA and package receipt, not OS-specific tar headers.
 npm([existsSync(join(manualRoot,'package-lock.json'))?'ci':'install','--install-links','--ignore-scripts','--no-audit','--no-fund',...(offline?['--offline']:[])],manualRoot);
 const installed=name=>JSON.parse(readFileSync(join(manualRoot,'node_modules',name,'package.json'),'utf8')).version;
 const actualPackage=JSON.parse(readFileSync(join(manualRoot,'node_modules/@wolfsblvt/starlight-works/package.json'),'utf8'));
 if(installed('@astrojs/starlight')!==packageSource.starlight || installed('astro')!==packageSource.astro || actualPackage.name!==packageSource.name || actualPackage.version!==packageSource.version) throw new Error('The manual must use the accepted package and its supported peer graph.');
 writeFileSync(join(cache,'consumer-receipt.json'),JSON.stringify({...receipt,starlight:installed('@astrojs/starlight'),astro:installed('astro'),lockSha256:sha256(join(manualRoot,'package-lock.json'))},null,2)+'\n');
 return receipt;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) prepareManual();
