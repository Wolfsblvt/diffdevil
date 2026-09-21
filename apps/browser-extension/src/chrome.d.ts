// SPDX-License-Identifier: AGPL-3.0-only
/** The explicit subset used by this application; no broad browser authority. */
declare namespace chrome {
  namespace runtime {
    const id: string;
    function getURL(path: string): string;
    function getManifest(): { version: string; name: string; version_name?: string };
    function openOptionsPage(): Promise<void>;
    function sendMessage(input: unknown): Promise<unknown>;
    interface Sender { id?: string; url?: string; frameId?: number; tab?: { id?: number; url?: string; incognito?: boolean } }
    const onMessage: { addListener(listener: (input: unknown, sender: Sender, reply: (value: unknown) => void) => boolean | void): void };
    const onInstalled: { addListener(listener: () => void): void };
  }
  namespace storage {
    interface Area { get(keys?: string | string[] | null): Promise<Record<string, unknown>>; set(items: Record<string, unknown>): Promise<void>; remove(keys: string | string[]): Promise<void>; clear(): Promise<void>; getBytesInUse(keys?: string | string[] | null): Promise<number>; setAccessLevel(options: { accessLevel: 'TRUSTED_CONTEXTS' }): Promise<void> }
    const sync: Area; const local: Area; const session: Area;
    const onChanged: { addListener(listener: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string) => void): void; removeListener(listener: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string) => void): void };
  }
  namespace action { const onClicked: { addListener(listener: () => void): void } }
}
