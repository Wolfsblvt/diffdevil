# GitHub adapter source evidence

## Meaning

This record preserves the primary-source API contracts used to implement the
first GitHub adapter on September 14, 2026. It supports pagination, source trust,
permission diagnostics, retries and metadata reconciliation. It does not report
live mutations or certify provider behavior beyond the consulted documentation.

## Sources and implemented consequences

- [Pull requests REST API](https://docs.github.com/en/rest/pulls/pulls): changed-file
  responses paginate with at most 100 entries per page and return no more than
  3,000 files. The adapter retains incomplete membership at that limit and checks
  PR revisions before and after acquisition.
- [Labels REST API](https://docs.github.com/en/rest/issues/labels): PR assignments
  use Issues endpoints; definitions and assignments have different operations.
  Label updates include an `archived` field, and archived labels are not available
  for new assignments. Current response examples do not settle every archive
  readback shape; that remains a live-provider evidence gap.
- [Issue comments REST API](https://docs.github.com/rest/issues/comments): comments
  can be listed, created and updated separately from labels. Product ownership
  is an author-plus-marker contract, not a permission inferred from body text.
- [Repository contents REST API](https://docs.github.com/en/rest/repos/contents):
  policy/template files are fetched at explicit immutable refs and validated as
  regular files. Returned download URLs are not followed with credentials.
- [REST API best practices](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api):
  serial requests, pagination, Retry-After and rate-reset handling inform the
  selected safe-read retry behavior. Write ambiguity is reconciled by readback.
- [REST API troubleshooting](https://docs.github.com/en/rest/using-the-rest-api/troubleshooting-the-rest-api):
  missing resources may reflect permissions rather than absence. Errors preserve
  status without echoing raw provider bodies or tokens.
- [Action metadata](https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax):
  the selected Action runtime is Node 24. Metadata documentation is not actual
  runtime qualification; no Node 24 binary was available in this execution cut.

The client uses `X-GitHub-Api-Version: 2026-03-10`, as in current REST examples.
Native fetch is the selected transport; the adapter does not add an SDK or a
second policy engine. Mocked responses and an installed npm consumer exercise
these contracts. No credentials or live GitHub mutations were used.
