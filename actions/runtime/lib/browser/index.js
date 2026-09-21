// SPDX-License-Identifier: MIT
/** Self-contained browser bundle; executable dependencies and validators ship locally. */
export { analyzeBrowserInput, readComparison, comparisonKey, BROWSER_ADAPTER, MAX_ACQUISITION_BYTES } from './acquisition.js';
export { compileBrowserPolicy, readPolicyText, requiredTemplates } from './policy.js';
export { humanReport, HUMAN_VIEW_VERSION } from './view.js';
export { appStanding } from './app.js';
export { SEMANTICS } from '../model.js';
export { stringify as stringifyPolicy } from 'yaml';
export { measurementText, evidenceText } from './text.js';
//# sourceMappingURL=index.js.map