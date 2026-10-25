import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, sep } from 'node:path';

const PROHIBITED_DISPLAY_NAMES = [
  'DiffDevil',
  'Diffdevil',
  'diffDevil',
  'Diff Devil',
  'Diff-Devil',
];

const TEXT_EXTENSIONS = new Set([
  '.astro', '.cjs', '.css', '.html', '.js', '.json', '.jsonc', '.jsx', '.md', '.mdx', '.mjs',
  '.scss', '.svg', '.toml', '.ts', '.tsx', '.txt', '.xml', '.yaml', '.yml',
]);

const IGNORED_DIRECTORIES = new Set([
  '.astro', '.git', '.handoff', 'artifacts', 'coverage', 'dist', 'node_modules', 'source-inputs',
]);

// These files necessarily contain the forbidden examples as contract or regression data.
const IGNORED_FILES = new Set([
  'apps/website/product-name-check.test.mjs',
  // Decisions preserve attributable historical rationale rather than current product copy.
  'docs/DECISIONS.md',
  'docs/branding.md',
  'tools/product-name-check.mjs',
]);

// Dated evidence remains attributable history rather than current product copy.
const IGNORED_PREFIXES = [
  'docs/reference/',
  'evidence/',
  'results/',
  'workbench/',
];

const escaped = PROHIBITED_DISPLAY_NAMES.map((value) => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'));
const displayNamePattern = new RegExp(
  `(?<![A-Za-z0-9_$])(?:${escaped.join('|')})(?![A-Za-z0-9_$])`,
  'gu',
);

export function findProhibitedProductNames(text) {
  const findings = [];
  for (const match of text.matchAll(displayNamePattern)) {
    const prefix = text.slice(0, match.index);
    const lineStart = prefix.lastIndexOf('\n');
    findings.push({
      value: match[0],
      index: match.index,
      line: prefix.split('\n').length,
      column: match.index - lineStart,
    });
  }
  return findings;
}

export async function findProductNameViolations(rootDirectory) {
  const files = await collectTextFiles(rootDirectory, rootDirectory);
  const violations = [];
  for (const file of files) {
    const relativePath = normalize(relative(rootDirectory, file));
    const text = await readFile(file, 'utf8');
    for (const finding of findProhibitedProductNames(text)) {
      violations.push({ path: relativePath, ...finding });
    }
  }
  return violations;
}

async function collectTextFiles(rootDirectory, directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue;
    const path = join(directory, entry.name);
    const relativePath = normalize(relative(rootDirectory, path));
    if (entry.isDirectory()) {
      if (!IGNORED_PREFIXES.some((prefix) => `${relativePath}/`.startsWith(prefix))) {
        files.push(...await collectTextFiles(rootDirectory, path));
      }
      continue;
    }
    if (!entry.isFile() || !TEXT_EXTENSIONS.has(extname(entry.name).toLowerCase())) continue;
    if (IGNORED_FILES.has(relativePath) || IGNORED_PREFIXES.some((prefix) => relativePath.startsWith(prefix))) continue;
    files.push(path);
  }
  return files;
}

function normalize(path) {
  return path.split(sep).join('/');
}
