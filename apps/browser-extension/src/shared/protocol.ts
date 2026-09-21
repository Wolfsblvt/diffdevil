// SPDX-License-Identifier: AGPL-3.0-only
import type { BrowserComparison, BrowserInput, HumanReportView, PolicyLayers } from '@wolfsblvt/diffdevil/browser';
import type { Settings } from './catalogue.js';
export interface PolicySource { status: 'present' | 'absent' | 'unavailable'; text?: string; blob?: string; at: number }
export interface AnalysisInput { comparison: BrowserComparison; acquisition?: BrowserInput; policy: PolicySource; templates?: Record<string, string> }
export interface Packet { key: string; comparison: BrowserComparison; view: HumanReportView; files: readonly { path: string; oldPath?: string }[]; refreshedAt: number; cached: boolean }
export interface Lookup { settings: Settings; selected: PolicyLayers; reportCached: boolean; policy?: PolicySource }
export interface PublicPull { comparison: BrowserComparison; files?: readonly unknown[] }
export interface CacheInfo { entries: number; bytes: number; reportEntries: number; reportBytes: number; policyEntries: number; policyBytes: number; maximumBytes: number }
export interface Diagnostics { version: string; engine: string; schema: string; measurement: string; presenter: string; cache: CacheInfo; localBytes: number; syncBytes: number; errors: readonly { code: string; at: number }[]; last?: { repository: string; pullRequest: number; base: string; head: string; at: number } }
export type Message =
  | { type: 'settings.get' } | { type: 'settings.save'; patch: unknown; replace?: boolean }
  | { type: 'policy.templates'; layers: PolicyLayers }
  | { type: 'source.public'; repository: string; pullRequest: number; files?: boolean }
  | { type: 'source.policy'; repository: string; base: string; path: string }
  | { type: 'cache.lookup'; comparison: BrowserComparison }
  | { type: 'analysis.run'; input: AnalysisInput }
  | { type: 'analysis.files'; key: string; paths: string[] }
  | { type: 'diagnostics.get' } | { type: 'data.action'; action: string; confirmed?: boolean }
  | { type: 'options.open' };
export async function request<T>(input: Message): Promise<T> {
  const response = await chrome.runtime.sendMessage(input) as { ok: true; value: T } | { ok: false; code: string; message: string } | undefined;
  if (!response) throw new Error('The extension worker did not respond. Reload the extension and this page.');
  if (!response.ok) throw Object.assign(new Error(response.message), { code: response.code }); return response.value;
}
