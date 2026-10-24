// SPDX-License-Identifier: AGPL-3.0-only
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { writeWebAppAssets } from '../../tools/web-app-assets.mjs';
import { GROUND_RGB } from '../../tools/identity-frames.mjs';

test('App and Playground emit independent launch identities and complete, opaque mask-safe icons', () => {
 const directory = mkdtempSync(join(tmpdir(),'diffdevil-install-'));
 try {
  const icons = [];
  for (const [kind,id,name,short] of [['app','/','diffdevil App','diffdevil'],['playground','/playground/','diffdevil Playground','Playground']]) {
   const out = join(directory,kind);
   writeWebAppAssets(kind,out);
   const manifest = JSON.parse(readFileSync(join(out,id,'manifest.webmanifest'),'utf8'));
   assert.equal(manifest.id,id);
   assert.equal(manifest.start_url,id);
   assert.equal(manifest.scope,id);
   assert.equal(manifest.name,name);
   assert.equal(manifest.short_name,short);
   assert.equal(manifest.display,'standalone');
   assert.deepEqual(manifest.icons.map(icon=>icon.sizes),['192x192','512x512']);
   for (const icon of manifest.icons) {
    assert.equal(icon.purpose,'any maskable');
    assert.equal(icon.type,'image/png');
    const png = readFileSync(join(out,icon.src));
    const size = Number(icon.sizes.split('x')[0]);
    assert.equal(png.readUInt32BE(16),size);
    assert.equal(png.readUInt32BE(20),size);
    const { pixels } = new Resvg(readFileSync(join(out,icon.src.replace('.png','.svg')))).render();
    let foreground = 0, transparent = 0, outside = 0;
    for (let y=0;y<size;y++) for (let x=0;x<size;x++) {
     const i=(y*size+x)*4;
     if (pixels[i+3]!==255) transparent++;
     if (pixels[i]!==GROUND_RGB[0] || pixels[i+1]!==GROUND_RGB[1] || pixels[i+2]!==GROUND_RGB[2]) {
      foreground++;
      if (Math.hypot(x+0.5-size/2,y+0.5-size/2)>size*0.4) outside++;
     }
    }
    assert.ok(foreground>size*size*0.02,'the mark is actually visible');
    assert.equal(transparent,0,`${kind}: opaque background`);
    assert.equal(outside,0,`${kind}: visible mark must survive a circular mask`);
   }
   const touch=readFileSync(join(out,id,'apple-touch-icon.png'));
   assert.equal(touch.readUInt32BE(16),180);
   assert.equal(touch.readUInt32BE(20),180);
   icons.push(readFileSync(join(out,id,'icon-512.png')));
  }
  assert.notDeepEqual(icons[0],icons[1],'the two surfaces use distinct approved mark treatments');
 } finally { rmSync(directory,{recursive:true,force:true}); }
});
