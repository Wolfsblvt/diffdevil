// SPDX-License-Identifier: AGPL-3.0-only
/**
 * The two production controllers start from GitHub's native `paths` filters. These cases keep the
 * filters equal to what each deployment actually consumes: shared engine changes reach both,
 * runtime-only and static-only changes reach one, App/extension/Action/test changes reach neither,
 * and a controller-only change publishes nothing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, posix, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

const root = fileURLToPath(new URL('../../', import.meta.url));
const workflow = name => parse(readFileSync(join(root, '.github/workflows', name), 'utf8'));
const website = workflow('publish-website.yml');
const playground = workflow('deploy-playground.yml');

/** GitHub's filter-pattern subset used here: `**`, `*`, `?`, with later patterns overriding earlier ones. */
function pattern(glob) {
  let source = '';
  for (let index = 0; index < glob.length; index += 1) {
    if (glob.startsWith('**/', index)) { source += '(?:.*/)?'; index += 2; }
    else if (glob.startsWith('**', index)) { source += '.*'; index += 1; }
    else if (glob[index] === '*') source += '[^/]*';
    else if (glob[index] === '?') source += '[^/]?';
    else source += glob[index].replace(/[.+^${}()|[\]\\]/u, '\\$&');
  }
  return new RegExp(`^${source}$`, 'u');
}
export function triggers(paths, file) {
  let included = false;
  for (const entry of paths) {
    const negated = entry.startsWith('!');
    if (pattern(negated ? entry.slice(1) : entry).test(file)) included = !negated;
  }
  return included;
}
const publishes = file => triggers(website.on.push.paths, file);
const deploys = file => triggers(playground.on.push.paths, file);

const cases = [
  // [path, static family, Playground Worker]
  ['src/diffdevil/policy/evaluate.ts', true, true],
  ['src/diffdevil/contracts/schemas/report-v1.schema.json', true, true],
  ['package-lock.json', true, true],
  ['package.json', true, true],
  ['tsconfig.json', true, true],
  ['tools/build.mjs', true, true],
  ['apps/playground/app.mjs', false, true],
  ['apps/playground/worker.mjs', false, true],
  ['apps/playground/wrangler.jsonc', false, true],
  ['apps/playground/public/index.html', false, true],
  ['apps/playground/README.md', true, false],
  ['apps/website/src/pages/playground/index.astro', true, false],
  ['apps/website/src/pages/faq.astro', true, false],
  ['apps/manual/manifest.mjs', true, false],
  ['apps/manual/package-lock.json', true, false],
  ['docs/manual/use/playground.md', true, false],
  ['docs/examples/reports/exact.json', true, false],
  ['docs/PRIVACY-AND-DATA.md', true, false],
  ['packages/design/tokens.css', true, false],
  ['brand/source/diffdevil/diffdevil-symbol-micro-dark.svg', true, false],
  ['vendor/brand/works/css/works-sponsor.css', true, false],
  ['skills/diffdevil/SKILL.md', true, false],
  ['SECURITY.md', true, false],
  ['LICENSES/README.md', true, false],
  ['apps/shared/check-summary.mjs', true, false],
  ['tools/website-publication.mjs', true, false],
  ['tools/public-build.mjs', true, false],
  ['apps/github-app/README.md', true, false],
  ['apps/browser-extension/README.md', true, false],
  ['apps/browser-extension/privacy.md', true, false],
  ['apps/browser-extension/store/assets/screenshots/02-inspect-the-report.png', true, false],
  // Generated manual islands read these release/metadata sources from otherwise excluded trees.
  ['action.yml', true, false],
  ['actions/analyze/action.yml', true, false],
  ['apps/github-app/app.mjs', true, false],
  ['apps/github-app/release.json', true, false],
  ['apps/browser-extension/manifest.json', true, false],
  ['apps/app/README.md', true, false],
  // Neither deployment consumes these.
  ['apps/app/src/pages/index.astro', false, false],
  ['apps/github-app/storage.mjs', false, false],
  ['apps/browser-extension/src/background/worker.ts', false, false],
  ['actions/runtime/analyze/index.js', false, false],
  ['apps/github-app/storage.mjs', false, false],
  ['src/diffdevil/tests/policy.test.mjs', false, false],
  ['apps/website/website.test.mjs', false, false],
  ['apps/playground/playground.test.mjs', false, false],
  ['.github/workflows/verify.yml', false, false],
  // A controller-only landing publishes nothing.
  ['.github/workflows/publish-website.yml', false, false],
  ['.github/workflows/deploy-playground.yml', false, false],
  ['tools/publication/static-family.mjs', false, false],
  ['tools/publication/playground.mjs', false, false],
];

test('each deployment triggers on exactly the inputs it consumes', () => {
  for (const [file, staticFamily, worker] of cases) {
    assert.equal(publishes(file), staticFamily, `static family ${staticFamily ? 'must' : 'must not'} publish for ${file}`);
    assert.equal(deploys(file), worker, `Playground ${worker ? 'must' : 'must not'} deploy for ${file}`);
  }
});

test('pull requests validate the controller without entering a production path', () => {
  for (const definition of [website, playground]) {
    for (const file of ['tools/publication/static-family.mjs', 'tools/publication/playground.mjs']) {
      assert.ok(triggers(definition.on.pull_request.paths, file), `${file} changes are validated on pull requests`);
    }
  }
});

/**
 * The static build's own code. Any file it imports or names by repository path inside a tree the
 * website filter excludes must be re-included, or a real input change would never publish.
 * Browser QA harnesses run against a finished build and are not part of it.
 */
const BUILD_CODE = ['apps/website', 'apps/manual', 'apps/shared', 'packages/design'];
const NOT_BUILD = ['apps/website/qa/', 'apps/manual/qa/'];
const BUILD_TOOLS = /^tools\/(?:website-[\w-]+|public-build|manual-[\w-]+|build|schema-build|browser-library-build)\.mjs$/u;
const CODE = /\.(?:mjs|js|ts|tsx|astro|css)$/u;
/** References that cannot change published bytes, each with its reason. */
const NOT_CONSUMED = new Map([
  ['actions/runtime/', 'apps/manual/render.mjs skips generated Action runtime Markdown in its inbound-link scan'],
  ['tools/publication/tree.mjs', 'tools/website-publication.mjs uses it to write the receipt, not the upload trees'],
]);
const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8', windowsHide: true }).split('\n').filter(Boolean);
const trackedSet = new Set(tracked);

function buildFiles() {
  return tracked.filter(file => CODE.test(file) && !file.endsWith('.test.mjs') && !NOT_BUILD.some(prefix => file.startsWith(prefix)) &&
    (BUILD_CODE.some(directory => file.startsWith(`${directory}/`)) || BUILD_TOOLS.test(file)));
}

function references(file) {
  const text = readFileSync(join(root, file), 'utf8');
  const found = new Set();
  // Relative module, asset and stylesheet references resolve from the referring file.
  for (const match of text.matchAll(/(?:from\s*|import\s*\(\s*|import\s+|url\(\s*|new URL\(\s*|@import\s+)['"](\.{1,2}\/[^'"?#]+)/gu)) {
    found.add(posix.normalize(posix.join(posix.dirname(file), match[1])));
  }
  // Repository-root paths read through manifests and helpers such as readRepositoryFile().
  for (const match of text.matchAll(/['"`]((?:apps|actions|src|tools|docs|skills|vendor|brand|packages|LICENSES)\/[^'"`\s*${}]+)['"`]/gu)) found.add(match[1]);
  return [...found];
}

test('every repository file the static build code references triggers publication', () => {
  const missing = [];
  for (const file of buildFiles()) {
    for (const reference of references(file)) {
      const directory = `${reference.replace(/\/$/u, '')}/`;
      if (NOT_CONSUMED.has(reference)) continue;
      if (trackedSet.has(reference)) {
        if (!publishes(reference)) missing.push(`${file} -> ${reference}`);
      } else if (!NOT_CONSUMED.has(directory) && tracked.some(path => path.startsWith(directory)) && !publishes(`${directory}any-new-file`)) {
        // A directory the build walks must publish for an ordinary new file inside it.
        missing.push(`${file} -> ${directory}`);
      }
    }
  }
  assert.deepEqual(missing, [], 'Re-include each consumed path in publish-website.yml');
});

test('the Worker bundle imports only what its filter watches', () => {
  const entries = ['apps/playground/worker.mjs', 'apps/playground/app.mjs'];
  for (const file of entries) {
    for (const reference of references(file)) {
      const source = reference.startsWith('dist/lib/') ? 'src/diffdevil/index.ts' : reference;
      if (trackedSet.has(source)) assert.ok(deploys(source), `${file} imports ${reference}, which must trigger the Worker deployment`);
    }
  }
});
