// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Type-check the website with Astro's own checker against the aliased `typescript-6`.
 *
 * diffdevil compiles with TypeScript 7. `astro check` always loads the package named
 * `typescript`, and TypeScript 7's native compiler does not yet ship the programmatic
 * API that checker needs. Astro's `AstroCheck` accepts an explicit TypeScript path, so
 * this runs the same checker with TypeScript 6 until Astro supports 7:
 * https://github.com/withastro/roadmap/discussions/1321
 * When it does, return `website:check` to `astro check` and remove `typescript-6`,
 * the `@astrojs/check` override and this file.
 *
 * Run after `astro sync`, which generates the content-collection types this checks.
 */
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(process.argv[2] ?? 'apps/website');
// Load the language server through @astrojs/check so the checker is exactly the one it pins.
const checkRequire = createRequire(fileURLToPath(import.meta.resolve('@astrojs/check')));
const { AstroCheck } = checkRequire('@astrojs/language-server');

console.info(`Checking Astro files in ${root} with TypeScript ${require('typescript-6/package.json').version}...`);
const result = await new AstroCheck(root, require.resolve('typescript-6'), undefined).lint({ logErrors: { level: 'hint' } });
console.info(`Result (${result.fileChecked} files): ${result.errors} errors, ${result.warnings} warnings, ${result.hints} hints`);
if (result.errors > 0) process.exitCode = 1;
