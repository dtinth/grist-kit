---
"grist-kit": minor
---

Initial preview release of grist-kit: a typesafe JavaScript library and CLI for Grist.

- `gristDoc<GristSchema>({ baseDocUrl, apiKey })` — doc-scoped client built on ofetch.
- Table API: `list`, `insert`, `update`, `upsert`, `delete` with filter/sort/limit typed from the schema; choice values narrow to literal unions.
- `doc.sql()`, `doc.attachments` (upload/get/download/downloadStream), and `doc.request()` raw passthrough.
- `GristApiError` (status/body/url/method, wraps the underlying ofetch `FetchError` via `cause`) and `GristNetworkError`.
- `GristSchema` + `Read` / `Insert` / `Update` utility types; columns uniformly nullable.
- CLI (`grist-kit`): `generate`, `tables`, `records`, `sql`. Reads `GRIST_DOC_URL` / `GRIST_API_KEY` with dotenv and `--env-file` support.
