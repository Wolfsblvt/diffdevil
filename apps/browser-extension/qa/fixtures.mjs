// SPDX-License-Identifier: AGPL-3.0-only
// Authored fixtures, not captures of GitHub/private source. Counts use the real engine.
import { createHash } from 'node:crypto';
export const comparison = { host: 'github.com', repository: 'example/cinder', pullRequest: 42, base: 'a'.repeat(40), head: 'b'.repeat(40), changedFiles: 2, additions: 160, deletions: 118 };
export function filePatch(path, modified, added, deleted) {
  return `diff --git a/${path} b/${path}\n--- a/${path}\n+++ b/${path}\n@@ -1,${modified + deleted + 2} +1,${modified + added + 2} @@\n`
    + Array.from({ length: modified }, (_, i) => `-old_${i}\n`).join('')
    + Array.from({ length: modified }, (_, i) => `+new_${i}\n`).join('')
    + ' unchanged_separator\n' + Array.from({ length: added }, (_, i) => `+added_${i}\n`).join('')
    + ' another_separator\n' + Array.from({ length: deleted }, (_, i) => `-removed_${i}\n`).join('');
}
export const diff = filePatch('src/cache.ts', 20, 10, 2) + filePatch('src/renderer.ts', 80, 50, 16);
export const fileHeader = (path, modern = false) => `<section class="fixture-file" data-path="${path}"><div ${modern ? 'data-testid="file-header"' : 'class="file-header"'} data-path="${path}"><span class="fixture-file-name">${path}</span><span class="diffstat"><span class="color-fg-success">+${path === 'src/cache.ts' ? 30 : 130}</span> <span class="color-fg-danger">−${path === 'src/cache.ts' ? 22 : 96}</span></span></div><pre class="fixture-code"><span class="line-context">  export function ${path === 'src/cache.ts' ? 'readCache' : 'renderReport'}(input) {</span>\n<span class="line-removed">−   return previousBehavior(input);</span>\n<span class="line-added">+   return currentBehavior(input);</span>\n<span class="line-context">  }</span></pre></section>`;
export function githubChangesHtml(data = comparison) {
  // GitHub's React churn seat: the `+n −m` counts precede an inner group of
  // squares; only the squares carry `diffstat` test ids. A seat must lead the
  // whole group, never split it. Signed-in header names arrive wrapped in
  // U+200E bidi marks, exactly as observed on the live page.
  const churn = (added, deleted, blocks = 'AAAAD') => `<div class="Diffstat-module__container__fixture"><span class="Diffstat-module__count__fixture">+${added}</span><span class="Diffstat-module__count__fixture">−${deleted}</span><span class="Diffstat-module__squares__fixture">${[...blocks].map(block => `<span data-testid="${block === 'A' ? 'addition' : block === 'D' ? 'deletion' : 'neutral'} diffstat"></span>`).join('')}</span></div>`;
  const fileChurn = (added, deleted, blocks = 'AAAAD') => `<span class="Diffstat-module__count__fixture">+${added}</span><span class="Diffstat-module__count__fixture">−${deleted}</span><span class="Diffstat-module__squares__fixture d-flex">${[...blocks].map(block => `<span data-testid="${block === 'A' ? 'addition' : block === 'D' ? 'deletion' : 'neutral'} diffstat"></span>`).join('')}</span>`;
  const header = (path, attribute) => `<div class="PullRequestDiffsList-module__diffEntry__fixture"><div data-diff-header-wrapper><div class="DiffFileHeader-module__diff-file-header__fixture"><div class="DiffFileHeader-module__file-path-section__fixture">${attribute ? `<button data-file-path="${path}">Path</button>` : ''}<h3 class="DiffFileHeader-module__file-name__fixture">‎${path}‎</h3></div>${fileChurn(path === 'src/cache.ts' ? 30 : 130, path === 'src/cache.ts' ? 22 : 96)}</div></div></div>`;
  // The page's own file evidence: every file's summary, and diff content for
  // some files only. Unknown files and files without content stay honest.
  const summaries = (data.embeddedSummaries ?? [['src/cache.ts', 30, 22, 'MODIFIED'], ['src/renderer.ts', 130, 96, 'MODIFIED']]).map(([path, linesAdded, linesDeleted, changeType, oldPath, flags]) => ({ path, pathDigest: createHash('sha256').update(path).digest('hex'), linesAdded, linesDeleted, changeType, isBinary: false, ...(oldPath ? { oldPath } : {}), ...(flags ?? {}) }));
  const contents = data.embeddedContents === undefined ? [] : data.embeddedContents;
  const embedded = { payload: { pullRequestsChangesRoute: { comparison: { fullDiff: { baseOid: data.base, headOid: data.head, changedFiles: data.changedFiles }, diffSummaries: summaries, diffContents: contents } } } };
  // Modelled on GitHub's current React file tree: rows are treeitems whose only
  // path binding is the `#diff-<sha256(path)>` anchor; labels are file names only,
  // nested under directory rows. Decoy counters without a row or on the directory
  // row must never receive a seat.
  const anchor = path => `diff-${createHash('sha256').update(path).digest('hex')}`;
  const leaf = (path, added, deleted) => `<li role="treeitem" aria-level="2" id="file-tree-item-${anchor(path)}" class="PRIVATE_TreeView-item"><div class="PRIVATE_TreeView-item-container"><a href="#${anchor(path)}"><span class="PRIVATE_TreeView-item-content-text"><span>${path.split('/').pop()}</span></span></a><span class="PRIVATE_TreeView-item-trailing-visual"><span data-testid="addition diffstat">+${added}</span><span data-testid="deletion diffstat">−${deleted}</span></span></div></li>`;
  const decoys = Array.from({ length: 20 }, (_, index) => `<span data-testid="${index % 2 ? 'deletion' : 'addition'} diffstat">${index + 1}</span>`).join('');
  const tree = `<nav aria-label="File tree" data-testid="file-tree"><div class="fixture-tree-summary">${decoys}</div><ul role="tree"><li role="treeitem" aria-level="1" data-tree-entry-type="directory" aria-expanded="true"><div class="PRIVATE_TreeView-item-container"><span class="PRIVATE_TreeView-item-content-text"><span>src</span></span><span data-testid="neutral diffstat">2 files</span></div><ul role="group">${leaf('src/cache.ts', 30, 22)}${leaf('src/renderer.ts', 130, 96)}${leaf('src/missing.ts', 1, 1)}</ul></li></ul></nav>`;
  return `<!doctype html><html><body><main><h1>Pull request #42</h1>${tree}<div class="fixture-header-meta"><span class="fixture-review-state">Open</span>${churn(data.additions ?? 160, data.deletions ?? 118)}</div><div data-testid="progressive-diffs-list">${header('src/cache.ts', true)}${header('src/renderer.ts', false)}</div><script type="application/json" data-target="react-app.embeddedData">${JSON.stringify(embedded)}</script></main></body></html>`;
}
function summaryHtml(mode, data) {
  if (mode === 'missing') return '<div class="fixture-summary-slot"></div>';
  if (mode === 'current') return `<div class="fixture-current-summary"><span data-testid="addition diffstat">+${data.additions ?? 0}</span><span data-testid="deletion diffstat">−${data.deletions ?? 0}</span><span data-testid="neutral diffstat">${data.changedFiles} files</span></div>`;
  return '<div class="gh-header-meta"><span class="diffstat"><span class="color-fg-success">+160</span> <span class="color-fg-danger">−118</span> <span class="diffstat-block-added"></span><span class="diffstat-block-added"></span><span class="diffstat-block-deleted"></span></span></div>';
}
export function githubHtml({ dark = true, modern = false, files = true, data = comparison, summary = 'legacy' } = {}) {
  return `<!doctype html><html lang="en" data-color-mode="${dark ? 'dark' : 'light'}"><head><meta charset="utf-8"></head><body><header class="fixture-top"><strong>GitHub</strong><span>example / <b>cinder</b></span><span class="fixture-search">Search or jump to…</span></header><main id="repo-content-pjax-container"><div class="fixture-pr"><h1>Make the report cache predictable <span>#42</span></h1><p class="fixture-pr-meta"><span class="fixture-open">Open</span> example wants to merge 3 commits into <code>main</code> from <code>cache-lifecycle</code></p>${summaryHtml(summary, data)}</div><nav class="fixture-tabs"><a href="https://github.com/example/cinder/pull/42">Conversation <span class="Counter">4</span></a><a href="https://github.com/example/cinder/pull/42/commits">Commits <span class="Counter">3</span></a><a href="https://github.com/example/cinder/pull/42/checks">Checks <span class="Counter">2</span></a><a class="tabnav-tab current" href="https://github.com/example/cinder/pull/42/files">Files changed <span class="Counter">${data.changedFiles}</span></a></nav><div class="fixture-toolbar"><span>Changes from all commits</span><span class="diffbar-item diffstat">Showing <strong>${data.changedFiles} changed files</strong> with <strong>${data.additions ?? 0} additions</strong> and <strong>${data.deletions ?? 0} deletions</strong>.</span><span>File filter ▾　Conversations ▾　Review changes</span></div><div id="fixture-files">${files ? fileHeader('src/cache.ts', modern) + fileHeader('src/renderer.ts', modern) : ''}</div><aside class="sidebar-labels"><h3>Labels</h3><details id="labels-select-menu"><summary>Edit labels</summary><input placeholder="Filter labels" aria-label="Filter labels"><div class="fixture-label-results">size/XS　 size/S　 size/M　 size/L</div></details><span class="IssueLabel">documentation</span></aside><script type="application/json">${JSON.stringify({ payload: { pullRequest: { number: data.pullRequest, baseRefOid: data.base, headRefOid: data.head, changedFiles: data.changedFiles, additions: data.additions, deletions: data.deletions } } })}</script></main><footer class="fixture-disclaimer">Authored GitHub-style fixture · Local source candidate · Not a live repository capture</footer></body></html>`;
}
export const githubCss = `
:root{--fgColor-default:#1f2328;--fgColor-muted:#59636e;--fgColor-success:#1a7f37;--fgColor-danger:#cf222e;--fgColor-attention:#9a6700;--fgColor-accent:#0969da;--bgColor-default:#fff;--bgColor-muted:#f6f8fa;--borderColor-default:#d1d9e0;--focus-outlineColor:#0969da;color-scheme:light}
:root[data-color-mode=dark]{--fgColor-default:#f0f6fc;--fgColor-muted:#9198a1;--fgColor-success:#3fb950;--fgColor-danger:#f85149;--fgColor-attention:#d29922;--fgColor-accent:#4493f8;--bgColor-default:#0d1117;--bgColor-muted:#151b23;--borderColor-default:#3d444d;--focus-outlineColor:#1f6feb;color-scheme:dark}
*{box-sizing:border-box}body{margin:0;background:var(--bgColor-default);color:var(--fgColor-default);font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}button,input{font:inherit}.fixture-top{display:flex;align-items:center;gap:28px;padding:18px 32px;border-bottom:1px solid var(--borderColor-default);background:var(--bgColor-muted);height:70px}.fixture-top>strong{font-size:20px}.fixture-search{margin-left:auto;color:var(--fgColor-muted);border:1px solid var(--borderColor-default);border-radius:6px;padding:5px 14px;min-width:290px;font-size:12px}main{max-width:1180px;margin:0 auto;padding:28px 28px 48px}.fixture-pr h1{font-size:26px;font-weight:400;line-height:1.3;margin:0 0 12px}.fixture-pr h1>span{color:var(--fgColor-muted)}.fixture-pr-meta{color:var(--fgColor-muted);margin:0 0 14px;font-size:13px}.fixture-open{display:inline-block;padding:4px 12px;margin-right:8px;border-radius:20px;background:#238636;color:white}.fixture-pr-meta code{font-size:12px;background:var(--bgColor-muted);padding:2px 5px;border-radius:4px}.gh-header-meta,.fixture-current-summary{display:inline-flex;align-items:center;gap:8px}.fixture-current-summary [data-testid~="diffstat"]{font-size:12px;white-space:nowrap}.fixture-tabs{display:flex;gap:26px;border-bottom:1px solid var(--borderColor-default);margin:18px 0 16px;font-size:13px;overflow:auto;white-space:nowrap}.fixture-tabs a{color:inherit;text-decoration:none;padding:10px 0}.fixture-tabs .current{border-bottom:2px solid #f78166;font-weight:600}.Counter{border-radius:12px;background:var(--bgColor-muted);padding:1px 6px;color:var(--fgColor-muted);font-size:11px}.fixture-toolbar{display:flex;justify-content:space-between;gap:16px;color:var(--fgColor-muted);font-size:12px;margin-bottom:14px}.fixture-file{border:1px solid var(--borderColor-default);border-radius:6px;overflow:hidden;margin:18px 0}.file-header,[data-testid=file-header]{background:var(--bgColor-muted);padding:9px 14px;border-bottom:1px solid var(--borderColor-default);display:flex;align-items:center;flex-wrap:wrap;gap:8px}.fixture-file-name{font:12px/1.4 ui-monospace,Consolas,monospace;min-width:155px}.fixture-file .diffstat{font-size:11px}.diffstat{white-space:nowrap;font-size:12px}.color-fg-success{color:var(--fgColor-success)}.color-fg-danger{color:var(--fgColor-danger)}.diffstat-block-added,.diffstat-block-deleted{display:inline-block;width:8px;height:8px;margin-left:2px;background:var(--fgColor-success)}.diffstat-block-deleted{background:var(--fgColor-danger)}.fixture-code{font:12px/1.8 ui-monospace,Consolas,monospace;margin:0;padding:10px 0;background:var(--bgColor-default);overflow:auto}.fixture-code span{display:inline-block;width:100%;padding:0 18px}.line-removed{background:color-mix(in srgb,var(--fgColor-danger) 12%,transparent)}.line-added{background:color-mix(in srgb,var(--fgColor-success) 12%,transparent)}.sidebar-labels{font-size:12px;color:var(--fgColor-muted);margin-top:20px}.sidebar-labels h3{font-size:12px;margin:0 0 6px}.sidebar-labels summary{cursor:pointer;font-size:11px}.sidebar-labels input{padding:6px;background:var(--bgColor-default);border:1px solid var(--borderColor-default);color:inherit;margin:8px 0}.IssueLabel{display:inline-block;border:1px solid var(--borderColor-default);border-radius:20px;padding:1px 8px;margin-top:8px}.fixture-disclaimer{position:fixed;bottom:0;left:0;right:0;text-align:center;color:var(--fgColor-muted);font-size:10px;background:var(--bgColor-default);padding:5px;border-top:1px solid var(--borderColor-default)}@media(max-width:600px){main{padding:18px 12px}.fixture-search{display:none}.fixture-top{padding:14px 16px}.fixture-top>strong{font-size:15px}.fixture-pr h1{font-size:21px}.fixture-toolbar{font-size:10px}.fixture-tabs{gap:16px}.fixture-file-name{min-width:100%;}.fixture-code{font-size:10px}.fixture-pr-meta{font-size:11px}}
`;

// Store specimens preserve the current host's right-edge seats. The native
// auto margin is present before the production controller takes over alignment.
export const storeSeatCss = `.gh-header-meta{display:flex;align-items:center;gap:8px}
.gh-header-meta>.diffstat,.fixture-file .diffstat{margin-left:auto!important}`;
/**
 * Host layouts for the alignment qualification (Extension Grammar v1 §4). `classic` is
 * modelled on the anonymous classic DOM observed on a public pull request: the
 * aggregate diffstat sits in a `.tabnav-extra.float-right` container; a file header's
 * diffstat precedes its path. `react` models the signed-in React layouts as the owner
 * and the paused/active witness describe them: the diffstat node itself carries the auto
 * start margin (Primer's `ml-auto` is !important) that keeps the seat at the end of its row.
 * Authored, not captures of GitHub.
 */
export const endSeatHosts = {
  react: {
    css: `.fixture-header-meta{display:flex;align-items:center}.fixture-header-meta .Diffstat-module__container__fixture{margin-left:auto!important}
[data-diff-header-wrapper]>div{display:flex;align-items:center;gap:8px;padding:6px 12px;background:var(--bgColor-muted)}.DiffFileHeader-module__file-path-section__fixture{flex:0 1 auto}
[data-diff-header-wrapper]>div .Diffstat-module__count__fixture:first-of-type{margin-left:auto!important}.fixture-viewed{margin-left:12px}.Diffstat-module__squares__fixture [data-testid~=diffstat]{display:inline-block;width:8px;height:8px;margin-right:2px;background:currentColor}
.fixture-toolbar-end{display:flex;align-items:center;gap:16px;margin:12px 0}.fixture-toolbar-end .diffbar-item{margin-left:auto!important}`,
    prepare: `for (const header of document.querySelectorAll('[data-diff-header-wrapper]>div')) { const viewed = document.createElement('button'); viewed.className = 'fixture-viewed'; viewed.textContent = 'Viewed'; header.append(viewed); }
document.querySelector('[data-testid="progressive-diffs-list"]').insertAdjacentHTML('beforebegin', '<div class="fixture-toolbar-end"><span>Changes from all commits ▾</span><span class="diffbar-item diffstat">Showing 2 changed files with 160 additions and 118 deletions.</span><span>File filter ▾</span></div>');`,
    seats: [
      { id: 'aggregate', end: true, scope: '.fixture-header-meta', native: '.Diffstat-module__container__fixture', root: '[data-ddx=aggregate], [data-ddx=reading], [data-ddx=failure], [data-ddx=paused]' },
      { id: 'toolbar', end: true, scope: '.fixture-toolbar-end', native: '.diffbar-item', root: '[data-ddx=toolbar]' },
      { id: 'file', end: true, scope: '[data-diff-header-wrapper]', native: '.Diffstat-module__count__fixture, .Diffstat-module__squares__fixture', root: '[data-ddx=file]' },
    ],
  },
  // Shape measured on the real signed-in React header (wolf-leitsatz#434 Files): a block `prc-PageHeader-Navigation` whose
  // `rightContentWrapper` holds the churn and is `float: right`, beside a `.flex-auto` block. An auto margin cannot move an
  // inline-level box in a block container; only the float holds the seat at the page header's right edge.
  float: {
    css: `.prc-PageHeader-Navigation{display:block}.PullRequestHeader-module__rightContentWrapper{float:right}.prc-PageHeader-Navigation>.flex-auto{min-height:26px}`,
    prepare: `const meta = document.querySelector('.fixture-header-meta'); const churn = meta.querySelector('.Diffstat-module__container__fixture');
meta.className = 'prc-PageHeader-Navigation';
const wrapper = Object.assign(document.createElement('div'), { className: 'PullRequestHeader-module__rightContentWrapper' }); wrapper.append(churn);
const tabs = Object.assign(document.createElement('div'), { className: 'flex-auto', textContent: 'Conversation  Commits  Checks  Files changed' });
meta.replaceChildren(wrapper, tabs);`,
    seats: [
      { id: 'aggregate', end: true, scope: '.prc-PageHeader-Navigation', native: '.PullRequestHeader-module__rightContentWrapper', root: '[data-ddx=aggregate], [data-ddx=reading], [data-ddx=failure], [data-ddx=paused]' },
    ],
  },
  classic: {
    css: `.float-right{float:right}.fixture-tabnav{overflow:hidden;min-height:24px}`,
    prepare: `document.querySelector('.gh-header-meta').replaceWith(Object.assign(document.createElement('div'), { className: 'fixture-tabnav', innerHTML: '<div class="tabnav-extra float-right"><span class="diffstat"><span class="color-fg-success">+160</span> <span class="color-fg-danger">−118</span> <span class="diffstat-block-added"></span><span class="diffstat-block-added"></span><span class="diffstat-block-deleted"></span></span></div>' }));`,
    seats: [
      { id: 'aggregate', end: true, scope: '.tabnav-extra', native: '.diffstat', root: '[data-ddx=aggregate], [data-ddx=reading], [data-ddx=failure], [data-ddx=paused]' },
      { id: 'file', end: false, scope: '.file-header', native: '.diffstat', root: '[data-ddx=file]' },
    ],
  },
};
