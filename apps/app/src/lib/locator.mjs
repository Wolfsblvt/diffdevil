// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/**
 * Opaque file locators. A file-detail URL must not carry a repository-relative path: a URL
 * reaches browser history, referrers and request logs that the privacy contract does not
 * describe. The App addresses a file by an HMAC of (repository, path) under the operator's
 * seal key instead. The locator reveals nothing without the key, is stable for a deployment,
 * and is resolved server-side against the files the reader is entitled to see. It is a
 * handle, not a name.
 */

const encoder = new TextEncoder();
const LENGTH = 22;
const SHAPE = /^[A-Za-z0-9_-]{22}$/u;

function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

export function createLocator({ secret }) {
  if (typeof secret !== 'string' || secret.length < 16) throw new TypeError('The locator secret must be a string of at least 16 characters.');
  let keyPromise;
  const signatures = new Map();
  const key = () => {
    keyPromise ??= crypto.subtle.importKey('raw', encoder.encode(`diffdevil-app-file-locator:${secret}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return keyPromise;
  };
  return {
    /** The locator for one file of one repository. Deterministic for the deployment's secret. */
    async of(repositoryId, path) {
      const identity = `${repositoryId}\n${path}`;
      if (signatures.has(identity)) return signatures.get(identity);
      const signature = new Uint8Array(await crypto.subtle.sign('HMAC', await key(), encoder.encode(identity)));
      const value = toBase64Url(signature).slice(0, LENGTH);
      signatures.set(identity, value);
      return value;
    },
    /** Whether a route parameter has the locator shape; anything else is refused before lookup. */
    plausible(value) { return typeof value === 'string' && SHAPE.test(value); },
    /** Resolve a locator against candidate file rows the reader may see; undefined when none matches. */
    async resolve(value, rows) {
      if (!this.plausible(value)) return undefined;
      for (const row of rows) if (await this.of(row.repositoryId, row.path) === value) return row;
      return undefined;
    }
  };
}
