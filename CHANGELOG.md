# grist-kit

## 0.1.1

### Patch Changes

- 13f5cd8: Add API documentation comments for the public TypeScript surface.

## 0.1.0

### Minor Changes

- 6bca155: Initial preview release of grist-kit: a typesafe JavaScript library and CLI for Grist.
  - `gristDoc<GristSchema>({ baseDocUrl, apiKey })` — doc-scoped client built on ofetch.
  - Table API: `list`, `insert`, `update`, `upsert`, `delete` with filter/sort/limit typed from the schema; choice values narrow to literal unions.
  - `doc.sql()`, `doc.attachments` (upload/get/download/downloadStream), and `doc.request()` raw passthrough.
  - `GristApiError` (status/body/url/method, wraps the underlying ofetch `FetchError` via `cause`) and `GristNetworkError`.
  - `GristSchema` + `Read` / `Insert` / `Update` utility types; columns uniformly nullable.
  - CLI (`grist-kit`): `generate`, `tables`, `records`, `sql`. Reads `GRIST_DOC_URL` / `GRIST_API_KEY` with dotenv and `--env-file` support.
