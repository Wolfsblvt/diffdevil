// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Coverage is how much of a comparison was actually measured. It is persisted beside the canonical
 * report, never inferred from it afterwards: a file the provider declined, a file the automatic
 * limit left bounded and a file nobody has asked about yet are different standings.
 */
/** `omitted` is a text file for which the provider simply supplied no patch. */
export type DeclineReason = 'binary' | 'submodule' | 'too-big' | 'truncated' | 'omitted';
export type FileStanding = 'measured' | 'bounded' | 'declined';
/** Automatic work is bounded by one configured number per comparison; an explicit act is bounded only by the comparison. */
export interface Coverage {
  /** Automatic limit in force when automatic work last ran for this comparison. */
  readonly limit: number;
  /** Files measured by the first automatic pass, or by a later pass after the limit was raised. */
  readonly automatic: number;
  /** Files measured automatically because the reader scrolled onto them. */
  readonly topUp: number;
  /** Files measured because the reader opened one or chose Analyze remaining files. */
  readonly explicit: number;
  /** Text files the provider declined to supply lines for, with why. A declined path is never asked again; files that are not text are declined by their kind. */
  readonly declined: Readonly<Record<string, DeclineReason>>;
}
export interface CoverageSummary {
  readonly measured: number; readonly bounded: number; readonly declined: number;
  /** The provider's file count, or the number of files seen when the provider named none. */
  readonly total: number; readonly totalExact: boolean;
  readonly limit: number; readonly automatic: number; readonly topUp: number; readonly explicit: number;
  /** Files measured beyond the first automatic pass: what on-demand work changed. */
  readonly onDemand: number;
  readonly declinedReasons: Readonly<Partial<Record<DeclineReason, number>>>;
}
export const FILE_LIMIT = { minimum: 1, maximum: 3000 } as const;
/** Chosen from measured elapsed time, packet size, memory and GitHub request behavior; see the extension qualification. */
export const DEFAULT_FILE_LIMIT = 150;
export const emptyCoverage = (limit: number): Coverage => ({ limit, automatic: 0, topUp: 0, explicit: 0, declined: {} });
export const isDeclineReason = (value: unknown): value is DeclineReason => value === 'binary' || value === 'submodule' || value === 'too-big' || value === 'truncated' || value === 'omitted';
/** What a file is, as the report knows it: measured, or declined (with why), or neither yet. */
export interface FileFact { readonly path: string; readonly measured: boolean; readonly declined?: DeclineReason }
/** Files measured without an explicit act: the opening pass, a pass after the limit was raised, and scrolling. */
export const measuredAutomatically = (coverage: Pick<Coverage, 'automatic' | 'topUp'>): number => coverage.automatic + coverage.topUp;
/** How many more files automatic work may measure for this comparison: one budget, shared by every automatic pass and by scrolling. */
export const automaticRemaining = (coverage: Pick<Coverage, 'automatic' | 'topUp'>, limit: number): number => Math.max(0, limit - measuredAutomatically(coverage));
export const standing = (file: FileFact): FileStanding => file.measured ? 'measured' : file.declined ? 'declined' : 'bounded';
/** Counts that always add up: measured + bounded + declined = total. A file the provider never listed is bounded. */
export function summarize(files: readonly FileFact[], declaredTotal: number | undefined, coverage: Coverage): CoverageSummary {
  let measured = 0; let declined = 0; const declinedReasons: Partial<Record<DeclineReason, number>> = {};
  for (const file of files) {
    const state = standing(file);
    if (state === 'measured') measured++;
    else if (state === 'declined') { declined++; declinedReasons[file.declined!] = (declinedReasons[file.declined!] ?? 0) + 1; }
  }
  const total = Math.max(declaredTotal ?? files.length, files.length);
  return { measured, declined, bounded: total - measured - declined, total, totalExact: declaredTotal !== undefined && declaredTotal >= files.length,
    limit: coverage.limit, automatic: coverage.automatic, topUp: coverage.topUp, explicit: coverage.explicit, onDemand: coverage.topUp + coverage.explicit, declinedReasons };
}
/**
 * The paths one automatic pass measures: files the reader can see first, in the order the page shows
 * them, then the rest in provider order, never more than the budget and never a path already measured
 * or declined. Deterministic for equal inputs.
 */
export function selectFiles(order: readonly string[], visible: readonly string[], budget: number, skip: ReadonlySet<string> = new Set()): string[] {
  if (!(budget > 0)) return [];
  const known = new Set(order); const chosen = new Set<string>();
  for (const path of [...visible, ...order]) {
    if (chosen.size >= budget) break;
    if (known.has(path) && !skip.has(path)) chosen.add(path);
  }
  return [...chosen];
}
/** A persisted coverage record is data from storage: anything unrecognized falls back to nothing declined. */
export function readCoverage(value: unknown, fallbackLimit: number): Coverage {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const count = (item: unknown): number => Number.isSafeInteger(item) && Number(item) >= 0 ? Number(item) : 0;
  const declined: Record<string, DeclineReason> = Object.create(null) as Record<string, DeclineReason>;
  if (record.declined && typeof record.declined === 'object') for (const [path, reason] of Object.entries(record.declined)) if (isDeclineReason(reason)) declined[path] = reason;
  return { limit: Number.isSafeInteger(record.limit) && Number(record.limit) >= FILE_LIMIT.minimum ? Number(record.limit) : fallbackLimit, automatic: count(record.automatic), topUp: count(record.topUp), explicit: count(record.explicit), declined };
}
