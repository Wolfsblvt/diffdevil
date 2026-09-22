// SPDX-License-Identifier: AGPL-3.0-only
import { npm } from './manual-package.mjs';
npm(['run','verify'],undefined,{env:{...process.env,DIFFDEVIL_DOCS_OFFLINE:'1'}});
