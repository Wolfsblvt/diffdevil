// SPDX-License-Identifier: AGPL-3.0-only
/**
 * Seals GitHub user-authorization material before it reaches D1 and opens it only for
 * server-side provider calls. AES-256-GCM through WebCrypto; the key is derived from one
 * operator secret. A handle that cannot be opened is `undefined`, which the authorization
 * service treats as an unavailable authorization rather than a crash.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const VERSION = 'v1';

function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}
function fromBase64Url(text) {
  const padded = text.replaceAll('-', '+').replaceAll('_', '/').padEnd(Math.ceil(text.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), character => character.charCodeAt(0));
}

export function createProtector({ secret }) {
  if (typeof secret !== 'string' || secret.length < 16) throw new TypeError('The seal secret must be a string of at least 16 characters.');
  let keyPromise;
  const key = () => {
    keyPromise ??= crypto.subtle.digest('SHA-256', encoder.encode(secret))
      .then(digest => crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']));
    return keyPromise;
  };
  return {
    async seal(material) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const plaintext = encoder.encode(JSON.stringify(material));
      const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await key(), plaintext));
      return `${VERSION}.${toBase64Url(iv)}.${toBase64Url(ciphertext)}`;
    },
    async open(handle) {
      try {
        const [version, iv, ciphertext] = String(handle).split('.');
        if (version !== VERSION || !iv || !ciphertext) return undefined;
        const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64Url(iv) }, await key(), fromBase64Url(ciphertext));
        return JSON.parse(decoder.decode(plaintext));
      } catch {
        return undefined;
      }
    }
  };
}
