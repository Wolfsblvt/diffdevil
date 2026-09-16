# Playground machine contracts

## Meaning

Application contract files in this directory are AGPL-3.0-only. This directory owns the versioned public JSON contract exposed by the playground HTTP API. It reuses the core report and evidence schemas where their meaning is unchanged, while keeping application-specific transport and projection terms under the AGPL application boundary.

- [`response-v1.schema.json`](response-v1.schema.json) defines successful analysis and public error envelopes for the playground API.

The health endpoint remains a small operator readback rather than part of the analysis-response contract. Contract tests compile this schema together with the core report/value schemas and validate real projected responses.
