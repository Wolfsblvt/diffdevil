// SPDX-License-Identifier: AGPL-3.0-only
import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { themeTransferUrl, wireThemeTransfer } from './src/lib/theme-transfer.mjs';

// Model only the browser's resolved href property versus literal href attribute.
// The full FAQ browser journey independently exercises disclosure/focus/clipboard.
function navigation(current = 'https://diffdevil.dev/faq/') {
 const listeners = new Map();
 class Link {
  constructor(raw, download = false) { this.raw = raw; this.download = download; }
  get href() { return new URL(this.raw,current).href; }
  set href(value) { this.raw = value; }
  closest() { return this; }
  hasAttribute(name) { return name === 'download' && this.download; }
 }
 const document = {
  documentElement: { dataset: { themePref:'light', themeNext:'dark' } },
  addEventListener(type, handler) { listeners.set(type,handler); },
 };
 vm.runInNewContext(`(${wireThemeTransfer.toString()})(${themeTransferUrl.toString()});`, {
  document, location:{href:current}, Element:Link, URL,
 });
 return { Link, prepare(link) { for (const listener of listeners.values()) listener({target:link}); } };
}
test('appearance handoff preserves literal local, fragment, external and download links', () => {
 const {Link,prepare} = navigation();
 for (const raw of ['#no-language-required','/faq/#code-data','../playground/','https://github.com/Wolfsblvt/diffdevil']) {
  const link = new Link(raw); prepare(link); assert.equal(link.raw,raw);
 }
 const download = new Link('https://docs.diffdevil.dev/',true);
 prepare(download); assert.equal(download.raw,'https://docs.diffdevil.dev/');
});
test('appearance handoff changes only an owned cross-host HTML destination', () => {
 const {Link,prepare} = navigation();
 const link = new Link('https://docs.diffdevil.dev/use/?q=one#example');
 prepare(link);
 const target = new URL(link.href);
 assert.equal(target.origin,'https://docs.diffdevil.dev');
 assert.equal(target.pathname,'/use/');
 assert.equal(target.searchParams.get('q'),'one');
 assert.equal(target.searchParams.get('dd-theme'),'light.dark');
 assert.equal(target.searchParams.getAll('dd-theme').length,1);
 assert.equal(target.hash,'#example');
});
