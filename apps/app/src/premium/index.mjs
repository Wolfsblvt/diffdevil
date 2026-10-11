// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The build-time join. `@diffdevil/premium-app` is resolved by the Astro build to the premium extension entry when one
 * is present and to `absent.mjs` otherwise (premium-selection.mjs); only the Worker entry and the request middleware
 * import this module, so everything else stays buildable and testable on its own.
 */
import extension from '@diffdevil/premium-app';
import { composePremium } from './registry.mjs';

export const premium = composePremium(extension);
