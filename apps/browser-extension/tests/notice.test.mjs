// SPDX-License-Identifier: MIT
import test from 'node:test';
import assert from 'node:assert/strict';
import { extensionNotice } from '../../../tools/browser-extension-notice.mjs';

test('bundled notices expose usable HTTPS links and readable inline code', () => {
  const html = extensionNotice('Privacy', '# Privacy\n\nRead the [data FAQ](https://example.com/faq/?product=diffdevil&topic=data#privacy) about `.diffdevil.yml`.');
  assert.match(html, /<h1>Privacy<\/h1>/u);
  assert.match(html, /<a href="https:\/\/example\.com\/faq\/\?product=diffdevil&amp;topic=data#privacy" target="_blank" rel="noopener noreferrer">data FAQ<\/a>/u);
  assert.match(html, /<code>\.diffdevil\.yml<\/code>/u);
});

test('notice content cannot inject markup or executable links', () => {
  const html = extensionNotice('<Privacy>', '[<img src=x onerror=alert(1)>](https://example.com/)\n\n[unsafe](javascript:alert) [data](data:text/html,evil) <script>evil()</script>\n\n`[literal](https://example.com/)`');
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('<script>evil'));
  assert.ok(!html.includes('href="javascript:'));
  assert.ok(!html.includes('href="data:'));
  assert.match(html, /<title>&lt;Privacy&gt;/u);
  assert.match(html, /<code>\[literal\]\(https:\/\/example\.com\/\)<\/code>/u);
});
