// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** Synthetic-only preloader: qualify the real capture and installer children without live GitHub reads. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

if (process.argv[1]?.endsWith('manifest-convert.mjs')) {
  const options = JSON.parse(await readFile(join(process.env.DIFFDEVIL_OPERATOR_FIXTURE_DIRECTORY, 'fixture-options.json'), 'utf8'));
  for (const name of options.absentEnvironmentNames ?? []) assert.equal(process.env[name], undefined);
} else if (process.argv[1]?.endsWith('manifest-helper.mjs') && process.argv[2] === 'install') {
  await import('./operator-github.mjs');
}
