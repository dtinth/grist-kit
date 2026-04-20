# grist-kit

Typesafe JavaScript library and CLI for [Grist](https://www.getgrist.com).

## Status

Pre-release. API unstable.

## Install

```bash
npm install grist-kit
```

## Library usage

```ts
import { gristDoc } from "grist-kit";
import type { GristSchema } from "./grist-schema.ts";

const doc = gristDoc<GristSchema>({
  baseDocUrl: process.env.GRIST_DOC_URL!,
  apiKey: process.env.GRIST_API_KEY!,
});

const customers = await doc.table("Customers").list({ limit: 10 });
```

## CLI

```bash
# Generate types from a live doc
grist-kit generate --out ./grist-schema.ts

# Inspect
grist-kit tables
grist-kit records Customers --limit 5
grist-kit sql "SELECT * FROM Customers WHERE Tier = 'pro'"
```

CLI config via env (`.env` auto-loaded):

- `GRIST_DOC_URL` — e.g. `https://grist.example.com/api/docs/xxxx`
- `GRIST_API_KEY`

Flags `--doc-url`, `--api-key`, `--env-file` override env.
