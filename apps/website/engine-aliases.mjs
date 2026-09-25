// SPDX-License-Identifier: AGPL-3.0-only
import { fileURLToPath } from 'node:url';

// Both static hosts use the same compiled engine and browser shims.
const engine = path => fileURLToPath(new URL(`../../dist/lib/${path}`, import.meta.url));
export const engineAliases = [
  { find: /^node:crypto$/u, replacement: fileURLToPath(new URL('./src/shims/node-crypto.mjs', import.meta.url)) },
  { find: /^node:util$/u, replacement: fileURLToPath(new URL('./src/shims/node-util.mjs', import.meta.url)) },
  { find: /^@wolfsblvt\/diffdevil\/core$/u, replacement: engine('core.js') },
  { find: /^@wolfsblvt\/diffdevil\/policy$/u, replacement: engine('policy/index.js') },
  { find: /^@wolfsblvt\/diffdevil\/language$/u, replacement: engine('language/index.js') },
  { find: /^@wolfsblvt\/diffdevil\/format$/u, replacement: engine('format.js') },
  { find: /^@wolfsblvt\/diffdevil\/errors$/u, replacement: engine('errors.js') },
];
