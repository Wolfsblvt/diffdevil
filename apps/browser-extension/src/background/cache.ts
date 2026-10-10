// SPDX-License-Identifier: AGPL-3.0-only
import { bytes } from '../shared/settings.js';
import type { CacheInfo, Inventory } from '../shared/protocol.js';
export type CacheKind = 'report' | 'policy' | 'pointer';
/** What an entry is about, so a scope can be purged without parsing keys: `github.com/owner/repo` and optionally a pull request. */
export interface CacheScope { readonly repository: string; readonly pullRequest?: number }
export interface CacheEntry extends CacheScope {
  key: string; kind: CacheKind; size: number; touched: number;
  /** The meaning of the stored value. An entry made under another compatibility is a miss, never stale data. */
  compat: string;
  /** A few facts about the value, readable without decoding it. */
  meta?: Readonly<Record<string, string | number>>;
  value: unknown;
}
/** Backend-independent budget decisions are tested with the same production entries. */
export function evictions(entries: readonly CacheEntry[], maximum: number, incoming?: CacheEntry): readonly string[] {
  const existing = entries.filter(entry => entry.key !== incoming?.key).sort((a, b) => a.touched - b.touched || a.key.localeCompare(b.key));
  let size = existing.reduce((n, entry) => n + entry.size, incoming?.size ?? 0); const removed: string[] = [];
  for (const entry of existing) { if (size <= maximum) break; removed.push(entry.key); size -= entry.size; }
  return removed;
}
/** One atomic unit of work against the entries. */
export interface Transaction {
  all(): Promise<CacheEntry[]>;
  get(key: string): Promise<CacheEntry | undefined>;
  put(entry: CacheEntry): void;
  delete(keys: Iterable<string>): void;
  clear(): void;
}
export interface CacheStore { run<T>(mode: 'readonly' | 'readwrite', work: (transaction: Transaction) => Promise<T>): Promise<T> }
const read = <T>(request: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
const done = (transaction: IDBTransaction): Promise<void> => new Promise((resolve, reject) => { transaction.oncomplete = () => resolve(); transaction.onerror = () => reject(transaction.error); transaction.onabort = () => reject(transaction.error ?? new Error('Cache transaction aborted.')); });
/** Version 2 keys entries by scope. The cache is rebuildable, so an older layout is dropped rather than migrated. */
const DATABASE = 'diffdevil-rebuildable-v1'; const SCHEMA = 2; const TOUCH_RESOLUTION_MS = 60_000;
export class IndexedDbStore implements CacheStore {
  private connection?: Promise<IDBDatabase>;
  constructor(private readonly factory: IDBFactory) {}
  private database(): Promise<IDBDatabase> {
    return this.connection ??= new Promise((resolve, reject) => {
      const request = this.factory.open(DATABASE, SCHEMA);
      request.onupgradeneeded = () => {
        const db = request.result; if (db.objectStoreNames.contains('entries')) db.deleteObjectStore('entries');
        const store = db.createObjectStore('entries', { keyPath: 'key' }); store.createIndex('kind', 'kind'); store.createIndex('repository', 'repository');
      };
      request.onsuccess = () => { request.result.onversionchange = () => { request.result.close(); delete this.connection; }; resolve(request.result); };
      request.onerror = () => { delete this.connection; reject(request.error); };
      request.onblocked = () => { delete this.connection; reject(new Error('Another extension page is holding an older cache database.')); };
    });
  }
  async run<T>(mode: 'readonly' | 'readwrite', work: (transaction: Transaction) => Promise<T>): Promise<T> {
    const db = await this.database(); const tx = db.transaction('entries', mode); const finished = done(tx); const store = tx.objectStore('entries');
    const transaction: Transaction = { all: () => read(store.getAll()) as Promise<CacheEntry[]>, get: key => read(store.get(key)) as Promise<CacheEntry | undefined>,
      put: entry => { store.put(entry); }, delete: keys => { for (const key of keys) store.delete(key); }, clear: () => { store.clear(); } };
    try { const result = await work(transaction); await finished; return result; }
    catch (error) { try { tx.abort(); } catch { /* Already finished. */ } await finished.catch(() => undefined); throw error; }
  }
}
/**
 * The same contract in memory: used where no IndexedDB exists and to test the cache's own rules. Work is
 * serialized like a transaction: each one sees every earlier commit, and a read-only one cannot write.
 */
export class MemoryStore implements CacheStore {
  readonly entries = new Map<string, CacheEntry>(); private tail: Promise<unknown> = Promise.resolve();
  run<T>(mode: 'readonly' | 'readwrite', work: (transaction: Transaction) => Promise<T>): Promise<T> {
    const result = this.tail.then(async () => {
      // The snapshot is taken when this transaction's turn comes, not when it was requested.
      const staged = new Map(this.entries);
      const writable = (): void => { if (mode === 'readonly') throw new Error('A read-only cache transaction cannot write.'); };
      const transaction: Transaction = { all: async () => [...staged.values()].map(entry => structuredClone(entry)), get: async key => { const entry = staged.get(key); return entry && structuredClone(entry); },
        put: entry => { writable(); staged.set(entry.key, structuredClone(entry)); }, delete: keys => { writable(); for (const key of keys) staged.delete(key); }, clear: () => { writable(); staged.clear(); } };
      const value = await work(transaction);
      if (mode === 'readwrite') { this.entries.clear(); for (const [key, entry] of staged) this.entries.set(key, entry); }
      return value;
    });
    this.tail = result.catch(() => undefined); return result;
  }
}
const inScope = (entry: CacheEntry, scope: CacheScope): boolean => entry.repository === scope.repository && (scope.pullRequest === undefined || entry.pullRequest === scope.pullRequest);
const kindOf = (entries: readonly CacheEntry[], kind: CacheKind): CacheEntry[] => entries.filter(entry => entry.kind === kind);
/** Disposable, size-bounded cache. Generations prevent late writes after a clear. */
export class AnalysisCache {
  private maximum = 16 * 1024 * 1024;
  private revision = 0;
  get generation(): number { return this.revision; }
  private readonly store: CacheStore;
  constructor(backend: IDBFactory | CacheStore) { this.store = 'run' in backend ? backend : new IndexedDbStore(backend); }
  async configure(mebibytes: number): Promise<void> {
    if (!Number.isSafeInteger(mebibytes) || mebibytes < 4 || mebibytes > 128) throw new Error('Cache capacity must be 4–128 MiB.');
    const maximum = mebibytes * 1024 * 1024; if (maximum === this.maximum) return;
    await this.store.run('readwrite', async tx => { tx.delete(evictions(await tx.all(), maximum)); }); this.maximum = maximum;
  }
  /** An entry made under another compatibility is deleted and reported as a miss. */
  async get<T>(key: string, compat: string): Promise<T | undefined> {
    return this.store.run('readwrite', async tx => {
      const entry = await tx.get(key); if (!entry) return undefined;
      if (entry.compat !== compat) { tx.delete([key]); return undefined; }
      // Recency only needs minute resolution; rewriting a large report on every read would cost more than the ordering is worth.
      if (Date.now() - entry.touched > TOUCH_RESOLUTION_MS) tx.put({ ...entry, touched: Date.now() });
      return entry.value as T;
    });
  }
  async put(key: string, kind: CacheKind, scope: CacheScope, compat: string, value: unknown, generation = this.revision, meta?: CacheEntry['meta']): Promise<void> {
    if (generation !== this.revision) return;
    const entry: CacheEntry = { key, kind, repository: scope.repository, ...(scope.pullRequest === undefined ? {} : { pullRequest: scope.pullRequest }), compat, value, touched: Date.now(), size: bytes(value) + bytes(key) + 96, ...(meta ? { meta } : {}) };
    if (entry.size > this.maximum) return;
    await this.store.run('readwrite', async tx => {
      const entries = await tx.all();
      // A clear that finished while this write was reading must win.
      if (generation !== this.revision) throw new GenerationChanged();
      tx.delete(evictions(entries, this.maximum, entry)); tx.put(entry);
    }).catch(error => { if (!(error instanceof GenerationChanged)) throw error; });
  }
  /** Clearing is a boundary: anything that began earlier and has not been written yet is dropped. */
  async clear(kind?: CacheKind): Promise<void> {
    this.revision++;
    await this.store.run('readwrite', async tx => { if (!kind) tx.clear(); else tx.delete(kindOf(await tx.all(), kind).map(entry => entry.key)); });
  }
  /** Clear one repository or one pull request. A repository scope also removes its trusted-policy entries. */
  async clearScope(scope: CacheScope): Promise<number> {
    this.revision++;
    return this.store.run('readwrite', async tx => { const keys = (await tx.all()).filter(entry => inScope(entry, scope)).map(entry => entry.key); tx.delete(keys); return keys.length; });
  }
  /** Remove every entry whose kind is now understood differently. Runs once when the worker starts using the cache. */
  async purgeIncompatible(current: Readonly<Record<CacheKind, string>>): Promise<number> {
    return this.store.run('readwrite', async tx => { const keys = (await tx.all()).filter(entry => current[entry.kind] !== entry.compat).map(entry => entry.key); tx.delete(keys); return keys.length; });
  }
  async summary(): Promise<CacheInfo> {
    const entries = await this.store.run('readonly', tx => tx.all()); const reports = kindOf(entries, 'report'); const policies = kindOf(entries, 'policy');
    const total = (list: readonly CacheEntry[]): number => list.reduce((sum, entry) => sum + entry.size, 0);
    return { entries: entries.length, bytes: total(entries), reportEntries: reports.length, reportBytes: total(reports), policyEntries: policies.length, policyBytes: total(policies), maximumBytes: this.maximum };
  }
  /** What is held, by repository and pull request, from entry facts alone. */
  async inventory(): Promise<Inventory> {
    const entries = await this.store.run('readonly', tx => tx.all()); const repositories = new Map<string, Inventory['repositories'][number]>();
    const repository = (name: string): Inventory['repositories'][number] => { let item = repositories.get(name); if (!item) { item = { repository: name, bytes: 0, policyBytes: 0, pullRequests: [] }; repositories.set(name, item); } return item; };
    for (const entry of entries) {
      const item = repository(entry.repository); item.bytes += entry.size;
      if (entry.kind === 'policy') item.policyBytes += entry.size;
      if (entry.kind !== 'report' || entry.pullRequest === undefined) continue;
      const number = (key: string): number => typeof entry.meta?.[key] === 'number' ? entry.meta[key] as number : 0;
      item.pullRequests.push({ pullRequest: entry.pullRequest, bytes: entry.size, base: String(entry.meta?.base ?? ''), head: String(entry.meta?.head ?? ''), files: number('files'), measured: number('measured'), bounded: number('bounded'), declined: number('declined'), touched: entry.touched });
    }
    const list = [...repositories.values()].sort((a, b) => a.repository.localeCompare(b.repository));
    for (const item of list) item.pullRequests.sort((a, b) => b.touched - a.touched);
    return { repositories: list, info: await this.summary() };
  }
}
class GenerationChanged extends Error {}
