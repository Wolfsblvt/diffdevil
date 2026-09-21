// SPDX-License-Identifier: MIT
import type { NumericMeasurement } from '../model.js';
/** Formatting only; hosts do not recalculate evidence or classify bands. */
export function measurementText(value: NumericMeasurement): string {
  const n = (value: number): string => new Intl.NumberFormat('en').format(value);
  switch (value.status) { case 'exact': return n(value.value); case 'bounded': return `${n(value.lower)}–${n(value.upper)}`; case 'unknown': return value.lower === undefined ? '?' : `≥${n(value.lower)}`; case 'unmeasurable': return '∅'; }
}
export function evidenceText(status: NumericMeasurement['status']): string { return `${{ exact: '=', bounded: '≈', unknown: '?', unmeasurable: '∅' }[status]} ${status}`; }
