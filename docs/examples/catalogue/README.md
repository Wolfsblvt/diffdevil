# Example catalogue

## Meaning

This is diffdevil's one lesson-led example catalogue. The website and Playground
consume its selected sources, policies, guide, and snapshots; no page-specific
measurement or second example list is authoritative.

Real pull requests are captured deliberately into `snapshots/` through
`node tools/examples.mjs capture <id>`. The capture keeps a normalized diffdevil
report and provenance rather than vendoring raw third-party patches. Controlled
inputs are repository-owned fixtures and saved reports. `audit` distinguishes a
moved upstream reference from a changed engine, policy, report, or measurement
identity; `verify` proves the offline catalogue can replay every variant.

No command polls, rewrites snapshots automatically, executes third-party code, or
writes to an upstream provider.
