// Keep the Worker's global fetch receiver when it is passed through a client object.
export function bindPlatformFetch(fetch) {
  return fetch === globalThis.fetch ? globalThis.fetch.bind(globalThis) : fetch;
}
