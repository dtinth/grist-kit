export interface HelpTopic {
  /** Stable identifier, used as `grist-kit help <id>` and as the docs-site page name. */
  id: string;
  title: string;
  /** One-line description shown in topic listings. */
  summary: string;
  /** Topic content as terminal-friendly CommonMark. */
  body: string;
}

export interface HelpSection {
  title: string;
  topics: HelpTopic[];
}

export const overview = `
grist-kit is a CLI and type-safe client library for [Grist](https://www.getgrist.com), written in TypeScript. It provides:

- An agent-friendly **CLI** for inspecting and querying Grist documents from the shell: list tables, fetch records, run SQL queries.
- A **type-safe client library**: generate a TypeScript schema from a live doc, then read and write records with column names, filter values, and write payloads checked at compile time.
`.trim();

export const sections: HelpSection[] = [
  {
    title: "CLI",
    topics: [
      {
        id: "quickstart",
        title: "Quick Start",
        summary: "Try the CLI against a public Grist document",
        body: `
You can query any public Grist document with just \`--doc-url\` — no configuration needed. The examples below use the public [Inventory Manager](https://templates.getgrist.com/sXsBGDTKau1F/Inventory-Manager) template.

List the tables and their columns:

\`\`\`bash
npx -y grist-kit --doc-url https://templates.getgrist.com/api/docs/sXsBGDTKau1F3fvxkCyoaJ tables
\`\`\`

Fetch records as CSV:

\`\`\`bash
npx -y grist-kit --doc-url https://templates.getgrist.com/api/docs/sXsBGDTKau1F3fvxkCyoaJ \\
  records All_Products --limit 3 --format csv
\`\`\`

\`\`\`
id,SKU,Product,In_Stock,Stock_Alert,...
1,VEG-BLCK-28,Men's Stretch Five-Pocket Pants,8,In Stock,...
2,VEG-BLCK-30,Men's Stretch Five-Pocket Pants,8,In Stock,...
3,VEG-BLCK-32,Men's Stretch Five-Pocket Pants,9,In Stock,...
\`\`\`

Filter by a column value:

\`\`\`bash
npx -y grist-kit --doc-url https://templates.getgrist.com/api/docs/sXsBGDTKau1F3fvxkCyoaJ \\
  records All_Products --filter Stock_Alert="Low Stock" --format csv
\`\`\`

\`\`\`
id,SKU,Product,In_Stock,Stock_Alert,...
5,VEG-BLCK-36,Men's Stretch Five-Pocket Pants,2,Low Stock,...
6,VEG-BLCK-38,Men's Stretch Five-Pocket Pants,2,Low Stock,...
...
\`\`\`

For private documents, set up credentials — see \`grist-kit help configuration\`.
`,
      },
      {
        id: "configuration",
        title: "Configuration",
        summary: "Doc URL, credentials, environment variables, and .env files",
        body: `
All CLI commands require a Grist document URL. Credentials are read from environment variables or flags.

## Environment variables

- \`GRIST_DOC_URL\` — base doc URL, e.g. \`https://grist.example.com/api/docs/xxxx\`. Required for all commands. Find it in Grist under **Settings** → **API** → **Document ID** → **Base doc URL**.
- \`GRIST_API_KEY\` / \`GRIST_ACCESS_TOKEN\` — provide one (not both). Neither is needed for public documents. See \`grist-kit help authentication\` for the difference.

The CLI reads from environment variables. It also supports loading a \`.env\` file, though real environment variables take precedence.

## Flags

These flags are accepted by every command and override the corresponding environment variable.

- \`--doc-url <url>\` — overrides \`GRIST_DOC_URL\`.
- \`--api-key <key>\` — overrides \`GRIST_API_KEY\`.
- \`--access-token <token>\` — overrides \`GRIST_ACCESS_TOKEN\`.
- \`--env-file <path>\` — load a specific \`.env\` file instead of the default.
`,
      },
      {
        id: "tables",
        title: "Listing Tables",
        summary: "List tables and their columns",
        body: `
The \`tables\` command lists all tables in a Grist document, along with their columns and types.

\`\`\`bash
grist-kit tables [options]
\`\`\`

Options:

- \`--format <text|json>\` — output format. Defaults to \`text\`.

## Text output

\`\`\`bash
grist-kit tables
\`\`\`

\`\`\`
All_Products
  SKU Text
  Product Text
  Size Choice
  In_Stock Numeric
  Stock_Alert Choice
  Brand Ref:Add_Products
  Color Ref:Color
  ...
Incoming_Orders
  Order_Date Date
  Status Choice
  Total Numeric
  ...
\`\`\`

## JSON output

Use \`--format json\` to get the full column metadata from the Grist API, including labels, formulas, and widget options. Useful for inspecting the document schema.

\`\`\`bash
grist-kit tables --format json
\`\`\`

\`\`\`
[
  {
    "id": "All_Products",
    "fields": { "tableRef": 1, "primaryViewId": 1, ... },
    "columns": [
      {
        "id": "SKU",
        "fields": {
          "label": "SKU",
          "type": "Text",
          "isFormula": false,
          "formula": "",
          ...
        }
      },
      ...
    ]
  },
  ...
]
\`\`\`
`,
      },
      {
        id: "records",
        title: "Fetching Records",
        summary: "Fetch records from a table as JSON or CSV",
        body: `
The \`records\` command fetches rows from a table and prints them as JSON (default) or CSV.

\`\`\`bash
grist-kit records <table> [options]
\`\`\`

Options:

- \`--filter <key=value>\` — filter rows by column value. Repeatable; repeating the same key matches rows where the column equals any of the given values. Values \`true\`, \`false\`, \`null\`, and numbers are coerced to their JSON types; everything else is treated as a string.
- \`--limit <n>\` — maximum number of rows to return.
- \`--format <json|csv>\` — output format. Defaults to \`json\`.

Examples:

\`\`\`bash
grist-kit records All_Products --limit 2
\`\`\`

\`\`\`
[
  {
    "id": 1,
    "SKU": "VEG-BLCK-28",
    "Product": "Men's Stretch Five-Pocket Pants",
    "In_Stock": 8,
    "Stock_Alert": "In Stock"
  },
  ...
]
\`\`\`

\`\`\`bash
grist-kit records All_Products --filter Stock_Alert="Low Stock" --format csv
\`\`\`

For anything beyond equality filters, use SQL — see \`grist-kit help sql\`.
`,
      },
      {
        id: "sql",
        title: "Running SQL Queries",
        summary: "Run read-only SQL queries against a document",
        body: `
The \`sql\` command runs a read-only SQL query against the document and prints the results.

\`\`\`bash
grist-kit sql "<query>" [options]
\`\`\`

Options:

- \`--format <json|csv>\` — output format. Defaults to \`json\`.

Example:

\`\`\`bash
grist-kit sql "SELECT SKU, In_Stock FROM All_Products ORDER BY In_Stock LIMIT 3" --format csv
\`\`\`

\`\`\`
SKU,In_Stock
VEG-BLCK-34,0
SEW-LTBL-36,0
SEW-LTBL-28,0
\`\`\`
`,
      },
      {
        id: "generate",
        title: "Generating a Type Definition File",
        summary: "Generate a TypeScript schema from a live doc",
        body: `
Before using the type-safe client library, generate a TypeScript type definition file from your live Grist document. This file describes your tables and columns, and is passed as a type parameter to \`gristDoc\` to enable typesafe column access, filters, and inserts.

The \`generate\` command reads the document schema via the Grist API and writes the type definition file. See \`grist-kit help configuration\` for how to configure the document URL and API key.

\`\`\`bash
grist-kit generate [options]
\`\`\`

Options:

- \`--out <path>\` — output file path. Defaults to \`./grist-schema.ts\`.
- \`--type-name <name>\` — name of the exported TypeScript type. Defaults to \`GristSchema\`.

Example:

\`\`\`bash
npx grist-kit generate --out grist-schema.ts
\`\`\`

Re-run this command whenever the document's columns change.

> **Tip:** Save it as a \`package.json\` script so it's easy to remember:
>
> \`\`\`bash
> pnpm pkg set scripts.update-schema="grist-kit generate --out grist-schema.ts"
> \`\`\`
`,
      },
    ],
  },
  {
    title: "Client library",
    topics: [
      {
        id: "library",
        title: "Using the Client Library",
        summary: "Install the library and create a typed client",
        body: `
The grist-kit client library lets you query and manipulate Grist documents from TypeScript with full type safety. Column names, filter values, and write payloads are all checked against a generated schema at compile time.

## Installation

\`\`\`bash
npm install grist-kit
\`\`\`

## Prerequisites

Before using the client, generate a schema file from your live doc:

\`\`\`bash
npx grist-kit generate --out grist-schema.ts
\`\`\`

See \`grist-kit help generate\` for details.

## Creating a client

\`\`\`ts
import { gristDoc } from "grist-kit";
import type { GristSchema } from "./grist-schema.ts";

const doc = gristDoc<GristSchema>({
  baseDocUrl: process.env.GRIST_DOC_URL!,
  apiKey: process.env.GRIST_API_KEY,
});
\`\`\`

Pass the generated schema as the type parameter to enable type inference across all table and column operations.

Options:

- \`baseDocUrl\` — base URL of the Grist document. Required.
- \`apiKey\` / \`accessToken\` — one of these is required unless the document is public. See \`grist-kit help authentication\` for the difference and security checklist.
- \`fetchOptions\` — additional options forwarded to the underlying \`ofetch\` client — useful for custom headers or timeouts.

Next steps:

- Read and write rows — see \`grist-kit help crud\`.
- Work with attachments — see \`grist-kit help attachments\`.

## API reference

- [gristDoc](https://apiref-site.vercel.app/package/grist-kit/gristDoc) — factory function
- [GristDoc](https://apiref-site.vercel.app/package/grist-kit/GristDoc) — document client
`,
      },
      {
        id: "authentication",
        title: "Authentication",
        summary: "API keys vs access tokens",
        body: `
grist-kit supports two ways to authenticate against a Grist document: an API key, or a Grist access token. They differ in lifetime, scope, and how they are sent on the wire. Pick the one that matches your use case.

## API key

\`\`\`ts
import { gristDoc } from "grist-kit";

const doc = gristDoc({
  baseDocUrl: process.env.GRIST_DOC_URL!,
  apiKey: process.env.GRIST_API_KEY,
});
\`\`\`

API keys are long-lived credentials tied to a single Grist user. They are sent as \`Authorization: Bearer <key>\` on every request. Generate one in Grist's **Profile Settings → API**. Use this when you have a stable server-to-server trust relationship with Grist.

## Access token

\`\`\`ts
import { gristDoc } from "grist-kit";

const doc = gristDoc({
  baseDocUrl: tokenInfo.baseUrl,
  accessToken: tokenInfo.token,
});
\`\`\`

Access tokens are short-lived (15-minute default TTL), document-scoped JWTs. They are sent as a \`?auth=<token>\` query parameter on every request. They are the auth mechanism used by Grist's custom-widget plugin API (\`grist.docApi.getAccessToken()\`).

A function is also accepted, invoked **per request**:

\`\`\`ts
const doc = gristDoc({
  baseDocUrl: tokenInfo.baseUrl,
  accessToken: () => tokenInfo.token,
});
\`\`\`

Use a function when the token may need to be refreshed (e.g., a widget whose user keeps the tab open for more than 15 minutes). Use a plain string when the token arrives from outside grist-kit (e.g., a backend that receives it in a request from a widget) and is used for a single short-lived operation.

## Mutual exclusion

You may not set both \`apiKey\` and \`accessToken\` at the same time. \`createRequester\` throws:

\`\`\`
Specify either apiKey or accessToken, not both.
\`\`\`

An empty string for either field is treated as "not set", so \`apiKey: ""\` + \`accessToken: "tok"\` is valid (only the access token is used).

## Unauthenticated

If neither field is set, requests are sent without any auth header or query parameter. This works for public Grist documents.
`,
      },
      {
        id: "crud",
        title: "Reading and Writing Records",
        summary: "List, insert, update, upsert, and delete rows",
        body: `
Access a table via \`doc.table("TableName")\`. All methods are typed against the generated schema.

## list

Fetches rows matching the given options.

\`\`\`ts
const products = await doc.table("All_Products").list({
  filter: { Stock_Alert: ["Low Stock", "OUT OF STOCK"] },
  sort: "-In_Stock",
  limit: 100,
});
\`\`\`

- \`filter\` — equality-style filters keyed by column name. Each value is an array of allowed values.
- \`sort\` — column name to sort by. Prefix with \`-\` for descending order. Accepts a single value or an array.
- \`limit\` — maximum number of rows to return.
- \`hidden\` — include hidden columns in the response.

## insert

Inserts one or more rows and returns their row IDs.

\`\`\`ts
const [orderId] = await doc
  .table("Incoming_Orders")
  .insert([{ Order_Date: Math.floor(Date.now() / 1000), Status: "Order Placed" }]);
\`\`\`

Formula columns are excluded from the insert payload type automatically.

## update

Updates existing rows by ID.

\`\`\`ts
await doc.table("Incoming_Orders").update([{ id: orderId, Status: "Received" }]);
\`\`\`

## upsert

Creates or updates rows using Grist's upsert endpoint. Each record specifies \`require\` (match criteria) and \`fields\` (values to write).

\`\`\`ts
await doc
  .table("Customers")
  .upsert([{ require: { Email: "alice@example.com" }, fields: { Name: "Alice", Tier: "pro" } }]);
\`\`\`

- \`onMany\` — behavior when multiple rows match: \`"first"\`, \`"none"\`, or \`"all"\`.
- \`noCreate\` — do not create a new row when no match is found.
- \`noUpdate\` — do not update an existing row when a match is found.

## delete

Deletes rows by row ID.

\`\`\`ts
await doc.table("Incoming_Orders").delete([orderId]);
\`\`\`

## API reference

- [GristTable](https://apiref-site.vercel.app/package/grist-kit/GristTable) — table client
- [GristTable.list](https://apiref-site.vercel.app/package/grist-kit/GristTable/list)
`,
      },
      {
        id: "attachments",
        title: "Working with Attachments",
        summary: "Upload and download attachments",
        body: `
Attachment operations are available via \`doc.attachments\`.

## upload

Uploads one or more files and returns their attachment IDs. These IDs can be stored in \`Attachments\`-typed columns.

\`\`\`ts
const [id] = await doc.attachments.upload([
  { filename: "report.pdf", data: pdfBuffer, type: "application/pdf" },
]);
\`\`\`

Accepts \`File\`, \`Blob\`, or an object with \`filename\`, \`data\` (a \`Blob\`, \`Uint8Array\`, or \`ArrayBuffer\`), and an optional \`type\`.

## get

Retrieves metadata for an attachment by ID.

\`\`\`ts
const meta = await doc.attachments.get(id);
console.log(meta.fileName, meta.fileSize, meta.timeUploaded);
\`\`\`

## download

Downloads an attachment as a \`Blob\`.

\`\`\`ts
const blob = await doc.attachments.download(id);
\`\`\`

## downloadStream

Downloads an attachment as a readable byte stream.

\`\`\`ts
const stream = await doc.attachments.downloadStream(id);
\`\`\`

## API reference

- [GristAttachments](https://apiref-site.vercel.app/package/grist-kit/GristAttachments) — attachment client
`,
      },
    ],
  },
  {
    title: "Tutorial",
    topics: [
      {
        id: "example",
        title: "Full Example",
        summary: "End-to-end script: read low stock, place a refill order",
        body: `
This example shows a complete script that connects to a Grist doc, reads low-stock products, and places a refill order. It uses the [Inventory Manager](https://www.getgrist.com/templates/inventory-manager/) template and covers the full workflow: setup, type generation, and a typesafe read/write script.

Prerequisites: [Node.js 24+](https://nodejs.org/docs/latest/api/typescript.html) and [pnpm](https://pnpm.io/).

## Setup

Create a project and install grist-kit:

\`\`\`bash
mkdir grist-inventory && cd grist-inventory
pnpm init --init-type module
pnpm add grist-kit
pnpm add -D typescript @types/node @tsconfig/node24
\`\`\`

Create \`tsconfig.json\`:

\`\`\`json
{
  "extends": "@tsconfig/node24/tsconfig.json"
}
\`\`\`

Open the [Inventory Manager template doc](https://templates.getgrist.com/sXsBGDTKau1F/Inventory-Manager). In the left sidebar, click **Settings** → **API** → expand **Document ID** → copy the **Base doc URL**.

Create \`.env\`:

\`\`\`
GRIST_DOC_URL=https://templates.getgrist.com/api/docs/sXsBGDTKau1F3fvxkCyoaJ
\`\`\`

Generate types from the live doc:

\`\`\`bash
pnpm exec grist-kit generate --out grist-schema.ts
\`\`\`

## The script

Create \`refill.ts\`:

\`\`\`ts
import { parseArgs } from "node:util";
import { gristDoc } from "grist-kit";
import type { GristSchema } from "./grist-schema.ts";

const { values } = parseArgs({
  options: { "dry-run": { type: "boolean", default: false } },
});

const doc = gristDoc<GristSchema>({
  baseDocUrl: process.env.GRIST_DOC_URL!,
  apiKey: process.env.GRIST_API_KEY,
});

const needsRefill = await doc.table("All_Products").list({
  filter: { Stock_Alert: ["Low Stock", "OUT OF STOCK"] },
});

console.log(\`\${needsRefill.length} products need a refill:\\n\`);
for (const p of needsRefill) {
  console.log(\`  [\${p.Stock_Alert}] \${p.SKU} — \${p.Product} (in stock: \${p.In_Stock})\`);
}

if (needsRefill.length === 0 || values["dry-run"]) {
  if (values["dry-run"]) console.log("\\n(dry run — no order created)");
  process.exit(0);
}

const [orderId] = await doc
  .table("Incoming_Orders")
  .insert([{ Order_Date: Math.floor(Date.now() / 1000), Status: "Order Placed" }]);

await doc.table("Incoming_Order_Line_Items").insert(
  needsRefill.map((p) => ({
    Order_Number: orderId,
    SKU: p.id,
    Qty: 10,
  })),
);

console.log(\`\\nCreated order \${orderId} with \${needsRefill.length} line items.\`);
\`\`\`

A few things worth noticing:

- The \`filter\` argument is fully typed against the schema. Try misspelling \`"OUT OF STOCK"\` — TypeScript will reject it, because \`Stock_Alert\`'s allowed values are baked into the generated schema.
- \`In_Stock\` and \`Stock_Alert\` are formula columns. The schema marks them as such, so they don't appear in the \`insert()\` payload type — you can't accidentally try to write them.
- \`Order_Date\` is a Grist \`Date\`, encoded as epoch seconds.
- Every Grist row has a numeric \`id\`. \`Order_Number\` is a \`Ref\` to \`Incoming_Orders\`, so it expects that row id.

## Run it

Test against the public template (read-only, no API key needed):

\`\`\`bash
node --env-file=.env refill.ts --dry-run
\`\`\`

To actually place the order, make a copy of the template doc under your own account, generate an API key in **Profile Settings** → **API**, and update \`.env\`:

\`\`\`
GRIST_DOC_URL=https://<your-host>/api/docs/<your-doc-id>
GRIST_API_KEY=<your-api-key>
\`\`\`

Then run:

\`\`\`bash
node --env-file=.env refill.ts
\`\`\`

Open your doc — there's a new row in **Incoming Orders** with line items for each low-stock product.
`,
      },
    ],
  },
];

export function allTopics(): HelpTopic[] {
  return sections.flatMap((section) => section.topics);
}

export function findTopic(id: string): HelpTopic | undefined {
  return allTopics().find((topic) => topic.id === id);
}
