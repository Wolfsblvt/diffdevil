# Managed App runtime source

## Meaning

This is the source-owned Cloudflare Worker, Queue, and D1 adapter for the optional managed diffdevil GitHub App. It admits verified webhooks, serializes selected repository execution, calls the shared diffdevil engine, owns one App check lifecycle, and retains only the selected recovery and opt-in history projections. It is not an App registration, deployment, dashboard, or live-service claim.

## Boundary

`worker.mjs` is the small provider entry point. `app.mjs` carries admission and execution use cases; `storage.mjs` is the D1-only lease/recovery/history adapter; `contracts.mjs` defines the minimized queue and history shapes; `crypto.mjs` keeps webhook authentication and short-lived App-JWT minting at the secret boundary. The common engine remains in `src/diffdevil/`.

The queue holds only delivery/event/action, installation ID, numeric repository ID, PR/check reference, and receipt time. It never carries the raw webhook body, repository name, source, paths, author data, prose, tokens, or secrets. Current repository names, PR revisions, and trusted base policy are reacquired transiently after the execution lease is claimed.

## Local route

Build first, then run the Worker locally with bindings that are safe to recreate:

```sh
npm run build
node tools/run-wrangler.mjs dev --local --config apps/github-app/wrangler.jsonc
```

Use a local fixture secret for `GITHUB_WEBHOOK_SECRET`. The App ID/private key, Queue, and D1 binding are operational inputs; do not put any value in source, fixtures, or terminal output. This local route does not prove a GitHub App registration, provider permissions, deployed Queue/D1 behavior, deletion, or cost.

## Migrations, recovery, and data handling

`migrations/0001_initial.sql` establishes installation/repository state, atomic delivery and per-PR leases, owned-check handles, seven-day operational records, opted-in numeric history, and restore-resistant deletion tombstones. Before a real adapter is operated, run D1 migrations against a deliberately selected binding and use a disposable fixture to exercise duplicate delivery, lease recovery, DLQ, and export/import. The exact `database_id` in `wrangler.jsonc` is a non-operational placeholder: an operator must replace it only after creating or selecting the target D1 database and read back the binding.

Operational results are minimized and intended for seven-day recovery. Opted-in history is an explicit repository setting and stores an allowlisted numeric projection only; paths, previous paths, people, prose, raw reports, source, queues, errors, templates, and secrets are excluded. History retention/offboarding, independent administrator grace, export, deletion, and tombstone reapplication remain governed by [the privacy contract](../../docs/PRIVACY-AND-DATA.md).

## Operator posture

The selected adapter requires separate Worker/Queue/D1 resources, webhook secret, GitHub App ID, and App private key. Registration, installation permissions, deployment, DNS, history collection, paid entitlement, and production data effects are deliberately outside this source contribution. The intended App permissions are Contents read, Pull requests write, and Checks write; do not broaden them for convenience.

The Worker retries non-terminal work through its configured Queue retry/DLQ path. Confirmed revoked access becomes terminal and does not attempt cleanup writes. A lost or active per-PR lease retries instead of issuing a competing effect. Live readback, deleted-installation reconciliation, restore behavior, and provider token boundaries still need real provider qualification.
