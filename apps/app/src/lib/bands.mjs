// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * The size-v1 label vocabulary: the shipped preset's bands and GitHub label colours. A small
 * module of its own because both the server's record model and the browser's chart models
 * read it, and the browser must not drag the analytical service behind it.
 */
export const BANDS = Object.freeze([
  { id: 'xs', label: 'size/XS', short: 'XS', color: '#C2E0C6', lt: 20 },
  { id: 's', label: 'size/S', short: 'S', color: '#BFDADC', lt: 100 },
  { id: 'm', label: 'size/M', short: 'M', color: '#C5DEF5', lt: 500 },
  { id: 'l', label: 'size/L', short: 'L', color: '#D4C5F9', lt: 1000 },
  { id: 'xl', label: 'size/XL', short: 'XL', color: '#DCC6E0', lt: Infinity }
]);
export const UNKNOWN_BAND = Object.freeze({ id: 'unknown', label: 'size/Unknown', short: 'Unknown', color: '#D1D5DB' });
export const bandById = id => BANDS.find(band => band.id === id);
