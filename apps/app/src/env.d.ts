// SPDX-License-Identifier: AGPL-3.0-only WITH AdditionRef-diffdevil-premium-interface-exception-1.0
/// <reference types="astro/client" />

interface Env {
  APP_DB: D1Database;
  APP_ORIGIN: string;
  SITE_ORIGIN?: string;
  APP_SESSION_DAYS?: string;
  APP_SEAL_KEY: string;
  GITHUB_OAUTH_CLIENT_ID: string;
  GITHUB_OAUTH_CLIENT_SECRET: string;
  GITHUB_API_BASE?: string;
  GITHUB_OAUTH_BASE?: string;
  APP_ENTITLEMENT_FIXTURE?: string;
  APP_PARTICIPATION_CAMPAIGN?: string;
  APP_QUEUE?: Queue;
  GITHUB_WEBHOOK_SECRET?: string;
  GITHUB_APP_ID?: string;
  GITHUB_APP_PRIVATE_KEY?: string;
  WIRT_SIGNING_KEY_CURRENT?: string;
  WIRT_SIGNING_KEY_PREVIOUS?: string;
  WIRT_ACTIVE_KEY_ID?: string;
  WIRT_ORIGIN?: string;
  WIRT_OAUTH_CLIENT_ID?: string;
  WIRT_LINK_CALLBACK_URL?: string;
  WIRT_LINK_CONTINUATION_URL?: string;
  GITHUB_APP_BOT_LOGIN?: string;
}

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    /** The composed services for this request; absent when the Worker is not configured. */
    app: any;
    /** Why the runtime could not be composed, when it could not. Never carries a value. */
    configurationProblem?: string | undefined;
    /** The authenticated session: bound provider reads and the acting GitHub user. Absent on public routes. */
    session?: { reads: any; actor: { userId: number; returnContext: string }; session: string; worksLinkBinding?: string | undefined };
    /** The resolved viewer: profile, namespaces and authorised repositories. Absent on public routes. */
    viewer?: any;
    /** Original analytical URL, set only after authenticating a rewrite in middleware. */
    analyticalUrl?: string;
    /** Analytical documents acquire optional chrome independently of their population. */
    deferChrome?: boolean;
    deferPremium?: boolean;
  }
}
