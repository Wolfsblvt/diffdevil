// SPDX-License-Identifier: AGPL-3.0-only
import { bytes } from '../shared/settings.js';
import type { CacheInfo } from '../shared/protocol.js';
export interface CacheEntry { key: string; kind: 'report' | 'policy'; size: number; touched: number; value: unknown }
/** Backend-independent budget decisions are tested with the same production entries. */
export function evictions(entries: readonly CacheEntry[], maximum: number, incoming?: CacheEntry): readonly string[] {
  const existing = entries.filter(entry => entry.key !== incoming?.key).sort((a, b) => a.touched - b.touched || a.key.localeCompare(b.key));
  let size = existing.reduce((n, entry) => n + entry.size, incoming?.size ?? 0); const removed: string[] = [];
  for (const entry of existing) { if (size <= maximum) break; removed.push(entry.key); size -= entry.size; }
  return removed;
}
const read = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
const done = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error ?? new Error('Cache transaction aborted.')); });
/** Disposable, size-bounded cache. Generations prevent late writes after a clear. */
export class AnalysisCache {
  private connection?: Promise<IDBDatabase>;
  private maximum = 16 * 1024 * 1024;
  private revision = 0;
  get generation(): number { return this.revision; }
  constructor(private readonly factory: IDBFactory) {}
  private database(): Promise<IDBDatabase> {
    return this.connection ??= new Promise((resolve, reject) => {
      const request = this.factory.open('diffdevil-rebuildable-v1', 1);
      request.onupgradeneeded = () => { const store = request.result.createObjectStore('entries', { keyPath: 'key' }); store.createIndex('kind', 'kind'); };
      request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); delete this.connection; }; resolve(request.result); };
      request.onerror = () => { delete this.connection; reject(request.error); };
      request.onblocked = () => { delete this.connection; reject(new Error('Another extension page is holding an older cache database.')); };
    });
  }
  async configure(mebibytes: number): Promise<void> {
    if (!Number.isSafeInteger(mebibytes) || mebibytes < 4 || mebibytes > 128) throw new Error('Cache capacity must be 4–128 MiB.');
    const maximum = mebibytes * 1024 * 1024; if (maximum === this.maximum) return;
    const db = await this.database(); const tx = db.transaction('entries', 'readwrite'); const finished = done(tx); const store = tx.objectStore('entries');
    for (const key of evictions(await read(store.getAll()) as CacheEntry[], maximum)) store.delete(key); await finished; this.maximum = maximum;
  }
  async get<T>(key: string): Promise<T | undefined> {
    const db = await this.database(); const tx = db.transaction('entries', 'readwrite'); const finished = done(tx); const store = tx.objectStore('entries');
    const entry = await read(store.get(key)) as CacheEntry | undefined;
    if (entry) store.put({ ...entry, touched: Date.now() }); await finished; return entry?.value as T | undefined;
  }
  async put(key: string, kind: CacheEntry['kind'], value: unknown, generation = this.revision): Promise<void> {
    if (generation !== this.revision) return;
    const entry: CacheEntry = { key, kind, value, touched: Date.now(), size: bytes(value) + bytes(key) + 96 };
    if (entry.size > this.maximum) return;
    const db = await this.database(); if (generation !== this.revision) return;
    const tx = db.transaction('entries', 'readwrite'); const finished = done(tx); const store = tx.objectStore('entries');
    const entries = await read(store.getAll()) as CacheEntry[];
    if (generation !== this.revision) { tx.abort(); await finished.catch(() => undefined); return; }
    for (const key of evictions(entries, this.maximum, entry)) store.delete(key); store.put(entry); await finished;
  }
  async clear(kind?: CacheEntry['kind']): Promise<void> {
    this.revision++; const db = await this.database(); const tx = db.transaction('entries', 'readwrite'); const finished = done(tx); const store = tx.objectStore('entries');
    if (!kind) store.clear(); else for (const key of await read(store.index('kind').getAllKeys(kind))) store.delete(key); await finished;
  }
  async summary(): Promise<CacheInfo> {
    const db = await this.database(); const tx = db.transaction('entries', 'readonly'); const finished = done(tx); const entries = await read(tx.objectStore('entries').getAll()) as CacheEntry[]; await finished;
    const reports = entries.filter(entry => entry.kind === 'report'); const policies = entries.filter(entry => entry.kind === 'policy');
    return { entries: entries.length, bytes: entries.reduce((sum, entry) => sum + entry.size, 0), reportEntries: reports.length, reportBytes: reports.reduce((sum, entry) => sum + entry.size, 0), policyEntries: policies.length, policyBytes: policies.reduce((sum, entry) => sum + entry.size, 0), maximumBytes: this.maximum };
  }
}
