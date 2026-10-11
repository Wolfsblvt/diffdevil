// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
import { createGitHubAppWorker } from './app.mjs';
// Build alias: the premium PR-brief provider when this build joins it, otherwise the Community stub (null).
import briefProvider from '@diffdevil/premium-brief';
export default createGitHubAppWorker({ briefProvider });
