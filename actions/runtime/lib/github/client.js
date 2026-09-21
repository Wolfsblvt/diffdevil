import { setTimeout as sleep } from 'node:timers/promises';
import { DiffdevilError, fail } from '../errors.js';
import { DEFAULT_LIMITS } from '../limits.js';
const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;
/** No response body or credential is retained in an error or its message. */
export class GitHubRequestError extends DiffdevilError {
    status;
    ambiguous;
    constructor(status, ambiguous, message, phase, rateLimited = false) {
        super({ code: ambiguous ? 'E_GITHUB_AMBIGUOUS' : rateLimited ? 'E_GITHUB_RATE_LIMIT' : status === 401 || status === 403 ? 'E_GITHUB_PERMISSION' : 'E_GITHUB_REQUEST',
            phase, severity: 'error', message, ...(status === undefined ? {} : { details: { status } }) });
        this.status = status;
        this.ambiguous = ambiguous;
    }
}
/** A narrowly configured HTTP transport. Reads may retry; writes never retry blindly. */
export class GitHubClient {
    apiUrl;
    responseBytes;
    #token;
    #fetch;
    #signal;
    #timeout;
    #retries;
    #sleep;
    #now;
    constructor(options = {}) {
        let url;
        try {
            url = new URL(options.apiUrl ?? 'https://api.github.com/');
        }
        catch {
            fail('E_CONFIG', 'GitHub API URL must be an absolute HTTPS URL.', 'config');
        }
        if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
            fail('E_CONFIG', 'GitHub API URL must use HTTPS without credentials, query or fragment.', 'config');
        this.apiUrl = url.href.replace(/\/$/, '') + '/';
        this.#token = options.token;
        if (this.#token !== undefined && /[\r\n]/u.test(this.#token))
            fail('E_CONFIG', 'GitHub token contains invalid header characters.', 'config');
        this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
        this.#signal = options.signal;
        this.#timeout = options.timeoutMs ?? 30000;
        this.#retries = options.readRetries ?? 2;
        this.responseBytes = options.responseBytes ?? DEFAULT_LIMITS.resultBytes;
        for (const [name, value] of [['timeoutMs', this.#timeout], ['readRetries', this.#retries], ['responseBytes', this.responseBytes]]) {
            if (!Number.isSafeInteger(value) || value < (name === 'readRetries' ? 0 : 1))
                fail('E_CONFIG', `${name} must be a valid nonnegative safe integer (positive for sizes and timeouts).`, 'config');
        }
        this.#sleep = options.sleep ?? (ms => sleep(ms, undefined, this.#signal ? { signal: this.#signal } : {}));
        this.#now = options.now ?? Date.now;
    }
    /** Endpoint paths are relative to the configured API root, including Enterprise /api/v3. */
    url(route) {
        if (!route.startsWith('/') || route.startsWith('//') || route.includes('\\') || /[\r\n#]/u.test(route))
            fail('E_GITHUB_ROUTE', 'Expected a relative GitHub API endpoint.', 'source');
        const result = new URL(route.slice(1), this.apiUrl);
        if (!result.href.startsWith(this.apiUrl))
            fail('E_GITHUB_ROUTE', 'GitHub endpoint escaped the configured API root.', 'source');
        return result;
    }
    async request(route, options = {}) {
        const url = this.url(route), method = options.method ?? 'GET', phase = options.phase ?? 'source';
        const headers = { accept: options.accept ?? 'application/vnd.github+json',
            'x-github-api-version': '2026-03-10', 'user-agent': 'diffdevil' };
        if (this.#token)
            headers.authorization = `Bearer ${this.#token}`;
        if (options.body !== undefined)
            headers['content-type'] = 'application/json';
        const body = options.body === undefined ? undefined : JSON.stringify(options.body);
        for (let attempt = 0;; attempt++) {
            this.#signal?.throwIfAborted();
            let response;
            try {
                const timeout = AbortSignal.timeout(this.#timeout);
                response = await this.#fetch(url, { method, headers, redirect: 'manual',
                    signal: this.#signal ? AbortSignal.any([timeout, this.#signal]) : timeout,
                    ...(body === undefined ? {} : { body }) });
            }
            catch {
                if (method === 'GET' && attempt < this.#retries && !this.#signal?.aborted) {
                    await this.#sleep(1000 * 2 ** attempt);
                    continue;
                }
                throw new GitHubRequestError(undefined, method !== 'GET', `GitHub ${method} request did not return a response. ${method === 'GET' ? 'Check network access and retry.' : 'Read back the intended state before retrying this write.'}`, phase);
            }
            const rateLimited = response.status === 429 || response.status === 403 && (response.headers.has('retry-after') || response.headers.get('x-ratelimit-remaining') === '0');
            if (method === 'GET' && attempt < this.#retries && (rateLimited || response.status >= 500)) {
                await this.discardBody(response);
                await this.#sleep(this.retryDelay(response.headers, attempt, rateLimited));
                continue;
            }
            if (response.status < 200 || response.status >= 300) {
                await this.discardBody(response);
                const detail = rateLimited
                    ? 'GitHub rate limited the request. Honor Retry-After or the reset time before retrying.'
                    : response.status === 403 || response.status === 401
                        ? method === 'GET' ? 'Check token and repository access; PR reads need Pull-requests-read, and policy-file reads need Contents-read.' : 'Check token and repository access; labels/comments need Issues-write or Pull-requests-write.'
                        : response.status === 404 ? 'The resource may be missing or inaccessible; 404 does not prove absence in a private repository.'
                            : response.status >= 300 && response.status < 400 ? 'Redirects are not followed with a credential. Select the canonical API target.' : 'Inspect the selected target and request data.';
                throw new GitHubRequestError(response.status, method !== 'GET' && response.status >= 500, `GitHub returned HTTP ${response.status} for ${method}. ${detail}`, phase, rateLimited);
            }
            const chunks = [];
            let bytes = 0;
            const reader = response.body?.getReader();
            try {
                if (reader)
                    for (;;) {
                        const part = await reader.read();
                        if (part.done)
                            break;
                        bytes += part.value.byteLength;
                        if (bytes > this.responseBytes) {
                            await reader.cancel();
                            fail('E_LIMIT', 'GitHub response exceeds the selected response budget.', phase);
                        }
                        chunks.push(part.value);
                    }
            }
            catch (error) {
                if (error instanceof DiffdevilError)
                    throw error;
                throw new GitHubRequestError(undefined, method !== 'GET', `GitHub ${method} response was interrupted; ${method === 'GET' ? 'retry the read' : 'read back the intended write'}.`, phase);
            }
            const joined = Buffer.concat(chunks);
            let text;
            try {
                text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(joined);
            }
            catch {
                fail('E_GITHUB_RESPONSE', 'GitHub response is not valid UTF-8.', phase);
            }
            return { status: response.status, headers: response.headers, text, bytes };
        }
    }
    /** Cleanup is only an optimization; it must not replace the provider outcome. */
    async discardBody(response) {
        try {
            await response.body?.cancel();
        }
        catch { /* A failed cleanup must not suppress a retry or typed HTTP error. */ }
    }
    retryDelay(headers, attempt, rateLimited) {
        const retry = headers.get('retry-after');
        if (retry !== null) {
            const value = /^\d+(?:\.\d+)?$/u.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - this.#now();
            if (Number.isFinite(value) && value >= 0 && value <= MAX_RETRY_DELAY_MS)
                return Math.ceil(value);
            fail(rateLimited ? 'E_GITHUB_RATE_LIMIT' : 'E_GITHUB_REQUEST', `GitHub requested a retry delay outside the five-minute operating budget; no early retry was made.`, 'source');
        }
        if (headers.get('x-ratelimit-remaining') === '0') {
            const reset = Number(headers.get('x-ratelimit-reset')) * 1000 - this.#now();
            if (Number.isFinite(reset) && reset >= 0 && reset <= MAX_RETRY_DELAY_MS)
                return Math.ceil(reset);
            fail('E_GITHUB_RATE_LIMIT', 'GitHub rate-limit reset is outside the five-minute operating budget; no early retry was made.', 'source');
        }
        const fallback = (rateLimited ? 60000 : 1000) * 2 ** attempt;
        if (!Number.isFinite(fallback) || fallback > MAX_RETRY_DELAY_MS)
            fail(rateLimited ? 'E_GITHUB_RATE_LIMIT' : 'E_GITHUB_REQUEST', 'GitHub retry backoff exceeds the five-minute operating budget; no early retry was made.', 'source');
        return fallback;
    }
    async json(route, options = {}) {
        const response = await this.request(route, options);
        if (response.status === 204)
            return null;
        try {
            return JSON.parse(response.text);
        }
        catch {
            return fail('E_GITHUB_RESPONSE', 'GitHub returned malformed JSON.', options.phase ?? 'source');
        }
    }
    /** Follow only same-endpoint, same-origin pagination. Never treat a provider URL as authority. */
    async list(route, options = {}) {
        const first = this.url(route), visited = new Set(), items = [];
        let next = first, bytes = 0;
        while (next) {
            if (visited.has(next.href))
                fail('E_GITHUB_PAGINATION', 'GitHub repeated a pagination link.', 'source');
            visited.add(next.href);
            const relative = '/' + next.href.slice(this.apiUrl.length);
            const page = await this.request(relative);
            bytes += page.bytes;
            if (bytes > this.responseBytes)
                fail('E_LIMIT', 'GitHub collection exceeds the selected response budget.', 'source');
            let rows;
            try {
                rows = JSON.parse(page.text);
            }
            catch {
                fail('E_GITHUB_RESPONSE', 'GitHub collection is not JSON.', 'source');
            }
            if (!Array.isArray(rows))
                fail('E_GITHUB_RESPONSE', 'Expected a GitHub collection array.', 'source');
            items.push(...rows);
            const links = [...(page.headers.get('link') ?? '').matchAll(/<([^>]+)>\s*;\s*rel="([^"]+)"/gu)];
            const target = links.find(match => match[2].split(/\s/u).includes('next'))?.[1];
            next = undefined;
            if (target) {
                let url;
                try {
                    url = new URL(target, first);
                }
                catch {
                    fail('E_GITHUB_PAGINATION', 'GitHub pagination URL is invalid.', 'source');
                }
                if (url.origin !== first.origin || url.pathname !== first.pathname || url.username || url.password || url.hash)
                    fail('E_GITHUB_PAGINATION', 'GitHub pagination escaped the selected endpoint.', 'source');
                for (const [key, value] of first.searchParams)
                    if (key !== 'page' && key !== 'per_page' && url.searchParams.get(key) !== value)
                        fail('E_GITHUB_PAGINATION', 'GitHub pagination changed the selected query.', 'source');
                for (const [key] of url.searchParams)
                    if (!first.searchParams.has(key) && key !== 'page' && key !== 'per_page')
                        fail('E_GITHUB_PAGINATION', 'GitHub pagination added an unexpected query.', 'source');
                next = url;
            }
            if (options.maximumItems !== undefined && items.length >= options.maximumItems)
                return { items: items.slice(0, options.maximumItems), truncated: Boolean(next) || items.length > options.maximumItems };
        }
        return { items, truncated: false };
    }
}
//# sourceMappingURL=client.js.map