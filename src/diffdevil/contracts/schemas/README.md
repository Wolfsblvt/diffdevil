# Public structural schemas

## Meaning

These Draft 2020-12 schemas define the selected configuration, report, query-result, and plan shapes. They supply the static validator build and editor-facing structural contracts. They do not replace expression parsing, type checking, metric graph analysis, evidence validation, or provider trust checks.

- [Policy](policy-v1.schema.json)
- [Report](report-v1.schema.json)
- [Query result](query-result-v1.schema.json)
- [Plan](plan-v1.schema.json)

The schemas keep evidence states explicit and permit extension where a runtime reader can validate richer meaning. Production readers still enforce semantic invariants such as finite numeric domains, correlation families, policy graph validity, plan provenance, and provider freshness.

Application-specific machine contracts remain with their application and licence boundary:

- [Playground response](../../../../apps/playground/contracts/response-v1.schema.json): application-specific public HTTP success/error envelope and bounded analysis projection; it remains with the AGPL application rather than entering the MIT validator bundle.

The build compiles the reusable schemas into standalone validators under `dist/lib/validation/`. `validateSchema` exposes those four reusable schema kinds through the package API; application contract tests compile their application schema directly with the reusable schemas they reference.
