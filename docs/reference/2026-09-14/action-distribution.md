# Action distribution evidence — September 14, 2026

## Meaning

This dated record preserves the platform facts and local observations behind the
first recoverable four-entry-point diffdevil Action distribution. Native-ESM
packaging supplies its dependencies without workflow installation; actual Node 24
execution is new evidence in this cut, not evidence from the lost historical
Action attempt or the earlier GitHub-adapter-only return.

## Primary-source facts consulted

[GitHub's metadata reference](https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax)
documents `node24`, a metadata-selected main file, and uppercase `INPUT_*`
names with hyphens preserved. It also notes that metadata `required: true` does
not automatically enforce required values. Runtime validation is therefore
explicit. Outputs have a per-job limit approximated in UTF-16; diffdevil uses a
smaller 512 KiB per-invocation budget for its complete output command batch.

[GitHub's JavaScript-Action guide](https://docs.github.com/en/actions/tutorials/create-actions/create-a-javascript-action)
requires dependency-complete distribution. It warns against casually committing
`node_modules` and offers bundling as an alternative. The selected native-ESM
closure is deliberate: exact production packages, preserved notices and no
consumer install; it is not described as GitHub's preferred packaging recipe.

[GitHub's workflow-command reference](https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-commands)
defines output/environment-file delimiter syntax and a separate step-summary
file. The runner generates collision-checked random delimiters, writes full
reports/plans to files, and escapes markup in summaries. Local tests parse the
actual output file independently; no hosted rendering was observed.

## Local evidence and rationale

The Node 24.11.1 binary already present with the container's Playwright driver was
used directly. Nothing was installed or downloaded to obtain it. Node 22.16.0
remained available as the default runtime. Both executed the actual distributed
paths outside the checkout, and Node 24 also passed ordinary source verification.
Exact final results belong to the current `docs/QUALIFICATION.md` and private
execution logs; this record does not freeze a test count as a product requirement.

No bundler or Action toolkit was added. The 15-package development lock restored
offline, and its 12 runtime packages were copied into a separately bounded,
committed runtime. Current packages contain JavaScript/data rather than native
addons. Package notices and metadata identify Apache-2.0, MIT, BSD-3-Clause and
ISC components; no project licence was selected and no independent audit is claimed.

A manifest comparison against staged Git blobs confirmed that source and shipped
bytes agree. Runtime text normalization was disabled so original vendor line
endings are not changed after hashing. A large generated file count is a known
trade-off for native resolution and no new transform/toolchain dependency.

Root labeling, explicit comments and definitions were tested only against an
in-memory HTTP provider. No real token, label, comment, public repository, remote,
release, package publication or Marketplace listing was created. The earlier
`github-api.md` record's lack of Node 24 evidence was true of that earlier cut;
this record adds the later observation without rewriting history.
