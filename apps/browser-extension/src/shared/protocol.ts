// SPDX-License-Identifier: AGPL-3.0-only
import type { BrowserComparison, BrowserInput, HumanReportView, PolicyLayers } from '@wolfsblvt/diffdevil/browser';
import type { Settings } from './catalogue.js';
import type { CoverageSummary, DeclineReason, FileStanding } from './coverage.js';
export interface PolicySource { status: 'present' | 'absent' | 'unavailable'; text?: string; blob?: string; at: number }
/** What the acquiring page knew about the limit it applied; the worker adds what the report itself proves. */
export interface AcquisitionCoverage { limit: number; declined: Record<string, DeclineReason> }
export interface AnalysisInput { comparison: BrowserComparison; acquisition?: BrowserInput; policy: PolicySource; templates?: Record<string, string>; /** Template paths the exact trusted base was confirmed not to have. */ absentTemplates?: string[]; coverage?: AcquisitionCoverage }
export interface PacketFile { path: string; oldPath?: string; standing: FileStanding; /** Why the provider declined, when it did. */ reason?: DeclineReason }
export interface Packet { key: string; comparison: BrowserComparison; view: HumanReportView; files: readonly PacketFile[]; refreshedAt: number; cached: boolean; coverage: CoverageSummary }
export interface Lookup { settings: Settings; selected: PolicyLayers; reportCached: boolean; policy?: PolicySource; /** Trusted-base template paths already held for this comparison, found or confirmed absent. */ templatePaths?: string[]; coverage?: CoverageSummary; paused?: boolean; /** Of the paths asked about, those the held report still has bounded. */ bounded?: string[] }
export interface PublicPull { comparison: BrowserComparison; files?: readonly unknown[] }
export interface CacheInfo { entries: number; bytes: number; reportEntries: number; reportBytes: number; policyEntries: number; policyBytes: number; maximumBytes: number }
export interface InventoryPullRequest { pullRequest: number; bytes: number; base: string; head: string; files: number; measured: number; bounded: number; declined: number; touched: number }
export interface InventoryRepository { repository: string; bytes: number; policyBytes: number; pullRequests: InventoryPullRequest[] }
export interface Inventory { repositories: InventoryRepository[]; info: CacheInfo }
export interface Diagnostics { version: string; engine: string; schema: string; measurement: string; presenter: string; cache: CacheInfo; localBytes: number; syncBytes: number; errors: readonly { code: string; phase?: string; at: number; frameId?: number | null; documentId?: string | null; senderUrl?: string; tabUrl?: string; routeAgreement?: 'same' | 'different' | 'unavailable'; tabId?: number | null }[]; last?: { repository: string; pullRequest: number; base: string; head: string; at: number } }
/** `automatic` fills the limit again after it was raised; `visible` is scrolling; `explicit` is an act of the reader. */
export type MeasureVia = 'automatic' | 'visible' | 'explicit';
export type Message =
  | { type: 'settings.get' } | { type: 'settings.save'; patch: unknown; replace?: boolean }
  | { type: 'policy.templates'; layers: PolicyLayers }
  | { type: 'source.public'; repository: string; pullRequest: number; files?: boolean; page?: number; optionalFallback?: true }
  | { type: 'source.policy'; repository: string; base: string; path: string }
  | { type: 'cache.lookup'; comparison: BrowserComparison; paths?: string[] }
  | { type: 'cache.recent'; repository: string; pullRequest: number }
  | { type: 'analysis.run'; input: AnalysisInput }
  | { type: 'analysis.extend'; comparison: BrowserComparison; patches: { path: string; patch: string }[]; declined?: Record<string, DeclineReason>; via: MeasureVia }
  | { type: 'analysis.files'; key: string; comparison: BrowserComparison; paths: string[] }
  | { type: 'report.text'; key: string; comparison: BrowserComparison; path?: string }
  | { type: 'repository.pause'; repository: string; paused: boolean }
  | { type: 'diagnostics.get' } | { type: 'data.inventory' } | { type: 'data.action'; action: string; confirmed?: boolean; repository?: string; pullRequest?: number }
  | { type: 'options.open' };
export function isCaughtOptionalPublicAbsence(input: Message, code: string): boolean {
  return input.type === 'source.public' && input.optionalFallback === true && code === 'PUBLIC_UNAVAILABLE';
}
export async function request<T>(input: Message): Promise<T> {
  const response = await chrome.runtime.sendMessage(input) as { ok: true; value: T } | { ok: false; code: string; message: string } | undefined;
  if (!response) throw new Error('The extension worker did not respond. Reload the extension and this page.');
  if (!response.ok) {
    if (!isCaughtOptionalPublicAbsence(input, response.code) && response.code !== 'REPOSITORY_PAUSED') console.error('diffdevil content request failed', { code: response.code, phase: input.type });
    throw Object.assign(new Error(response.message), { code: response.code });
  }
  return response.value;
}
