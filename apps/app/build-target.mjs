// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/** The two selected App build targets. Staging uses its own configuration, artifacts and local state. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { origins } from '../website/public-origins.mjs';

/**
 * Select source configuration and output together so a staging build cannot overwrite ordinary App artifacts.
 * @param {Record<string, string | undefined>} env
 * @returns {{name: 'production' | 'staging', origin: string, configPath: string, artifacts: string}}
 */
export function appBuildTarget(env = process.env) {
  const staging = env.DIFFDEVIL_APP_TARGET === 'staging';
  if (env.DIFFDEVIL_APP_TARGET && !['production', 'staging'].includes(env.DIFFDEVIL_APP_TARGET)) {
    throw new TypeError('DIFFDEVIL_APP_TARGET must be production or staging.');
  }
  const configuration = staging ? JSON.parse(readFileSync(new URL('./staging/wrangler.json', import.meta.url), 'utf8')) : null;
  const origin = staging ? configuration.vars.APP_ORIGIN : env.DIFFDEVIL_APP_ORIGIN ?? origins.app;
  if (staging && env.DIFFDEVIL_APP_ORIGIN && env.DIFFDEVIL_APP_ORIGIN !== origin) {
    throw new TypeError('The staging build origin must match staging/wrangler.json APP_ORIGIN.');
  }
  return {
    name: staging ? 'staging' : 'production', origin,
    configPath: staging ? 'staging/wrangler.json' : 'wrangler.jsonc',
    artifacts: fileURLToPath(new URL(staging ? '../../artifacts/app-staging/' : '../../artifacts/app/', import.meta.url))
  };
}
