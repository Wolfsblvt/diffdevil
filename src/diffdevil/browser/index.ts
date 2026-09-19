// SPDX-License-Identifier: MIT
/** Portable, read-only browser adapter over the same diffdevil engine and policy compiler. */
export { analyzeUnifiedDiff, unavailableBrowserReport, browserSource, comparisonKey, validateComparison, BROWSER_DIFF_LIMIT, BROWSER_ADAPTER_VERSION } from './acquisition.js';
export type { BrowserComparison, AcquisitionEvidence } from './acquisition.js';
export { compileBrowserPolicy, browserTemplatePaths } from './policy.js';
export type { BrowserPolicy, BrowserPolicyInput, BrowserPolicyLayer, BrowserPolicyMode } from './policy.js';
export { buildHumanReportView, buildUnclassifiedView, measurementText, evidenceText, HUMAN_REPORT_VIEW_VERSION } from './view.js';
export type { HumanReportView, BandView, BandCell } from './view.js';
export { assessAppReport } from './app.js';
export type { BrowserAppReport, AppStanding } from './app.js';
export { readPolicyYaml } from '../policy/yaml.js';
export { compilePolicy, explainPolicy } from '../policy/compile.js';
export { readReport, withPathPolicy } from '../report.js';
export { SEMANTICS } from '../model.js';
export type { Report, Result, Diagnostic, NumericMeasurement } from '../model.js';
export type { PolicyDocument } from '../policy/types.js';
