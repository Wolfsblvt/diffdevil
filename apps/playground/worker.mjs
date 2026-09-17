// SPDX-License-Identifier: AGPL-3.0-only

import { handlePlaygroundRequest, unexpectedServerFailureResponse } from './app.mjs';

/**
 * Cloudflare adapter for the existing public playground contract.
 * Static paths are normally served directly by the assets binding; this
 * fallback also gives unknown static paths Cloudflare's ordinary asset 404.
 */
export function createPlaygroundWorker(options = {}) {
  const reportError = options.onError ?? (error => console.error('diffdevil playground request failed:', error));
  return {
    async fetch(request, env) {
      try {
        const response = await handlePlaygroundRequest(request, options);
        return response ?? env.ASSETS.fetch(request);
      } catch (error) {
        reportError(error);
        return unexpectedServerFailureResponse(request.method);
      }
    }
  }
}

export default createPlaygroundWorker();
