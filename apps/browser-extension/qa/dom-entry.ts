// SPDX-License-Identifier: AGPL-3.0-only
// Test exports of production code, not a separate demonstration implementation.
export { startContent } from '../src/content/controller.js';
export { acquire } from '../src/content/acquire.js';
export { Popover } from '../src/content/popover.js';
export { projection, reportPanel } from '../src/content/render.js';
export { filePanel, errorPanel } from '../src/content/report.js';
export { route, pageComparison, filePath, blobText, fullFilesView } from '../src/content/github.js';
export { labelHandoff, observedLabels } from '../src/content/labels.js';
export { productIcon } from '../src/shared/icons.js';
