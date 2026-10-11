// SPDX-License-Identifier: AGPL-3.0-only
import { DEFAULTS, type Settings } from '../shared/catalogue.js';
import { bytes, SETTINGS_KEY, validateSettings } from '../shared/settings.js';
const LOCAL = new Set(['policy.advancedYaml', 'policy.repositoryOverrides', 'repositories.paused']);
const JOURNAL = 'diffdevil.settings.pending.v1';
/** Recoverable settings changes across local and sync; never silently erase policy. */
export class Preferences {
  private tail: Promise<unknown> = Promise.resolve();
  constructor(private readonly areas: Pick<typeof chrome.storage, 'local' | 'sync' | 'session'>) {}
  private queue<T>(operation: () => Promise<T>): Promise<T> { const result = this.tail.then(operation); this.tail = result.catch(() => undefined); return result; }
  private async recover(): Promise<void> {
    const value = (await this.areas.local.get(JOURNAL))[JOURNAL]; if (value === undefined) return;
    if (!value || typeof value !== 'object' || (value as Record<string, unknown>).version !== 1 || !Object.hasOwn(value, 'sync') || !Object.hasOwn(value, 'local')) throw new Error('The settings recovery journal is invalid. Your data has not been overwritten.');
    const previous = value as { sync: unknown; local: unknown };
    for (const name of ['sync', 'local'] as const) {
      if (previous[name] === null) await this.areas[name].remove(SETTINGS_KEY);
      else await this.areas[name].set({ [SETTINGS_KEY]: previous[name] });
    }
    await this.areas.local.remove(JOURNAL);
  }
  private async read(): Promise<Settings> {
    const values = await Promise.all([this.areas.sync.get(SETTINGS_KEY), this.areas.local.get(SETTINGS_KEY)]);
    const object = (value: unknown): Record<string, unknown> => { if (value === undefined) return {}; if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Stored settings are damaged. They have not been overwritten.'); return value as Record<string, unknown>; };
    return validateSettings({ ...object(values[0]?.[SETTINGS_KEY]), ...object(values[1]?.[SETTINGS_KEY]) });
  }
  load(): Promise<Settings> { return this.queue(async () => { await this.recover(); return this.read(); }); }
  /** Validate and persist one change across both areas, with the recovery journal around the write. Runs inside the queue. */
  private async commit(patch: unknown, previous: Settings): Promise<Settings> {
    const settings = validateSettings(patch, previous);
    const sync = Object.fromEntries(Object.entries(settings).filter(([id]) => !LOCAL.has(id)));
    const local = Object.fromEntries(Object.entries(settings).filter(([id]) => LOCAL.has(id)));
    if (bytes(sync) > 7500) throw new Error('Portable settings exceed the sync budget. Keep larger policies in local Advanced YAML.');
    const [oldSync, oldLocal] = await Promise.all([this.areas.sync.get(SETTINGS_KEY), this.areas.local.get(SETTINGS_KEY)]);
    await this.areas.local.set({ [JOURNAL]: { version: 1, sync: oldSync[SETTINGS_KEY] ?? null, local: oldLocal[SETTINGS_KEY] ?? null } });
    try { await this.areas.local.set({ [SETTINGS_KEY]: local }); await this.areas.sync.set({ [SETTINGS_KEY]: sync }); await this.areas.local.remove(JOURNAL); }
    catch (error) { try { await this.recover(); } catch { throw new Error('Saving failed and recovery remains pending. The recovery journal is retained.'); } throw error; }
    return settings;
  }
  save(patch: unknown, replace = false): Promise<Settings> {
    return this.queue(async () => { await this.recover(); return this.commit(patch, replace ? { ...DEFAULTS } : await this.read()); });
  }
  /** Read-modify-write inside the queue, so two tabs pausing different repositories never overwrite each other. */
  update(change: (settings: Settings) => Record<string, unknown>): Promise<Settings> {
    return this.queue(async () => { await this.recover(); const current = await this.read(); return this.commit(change(current), current); });
  }
  reset(): Promise<void> { return this.queue(async () => { await Promise.all([this.areas.local.clear(), this.areas.sync.clear(), this.areas.session.clear()]); }); }
}
