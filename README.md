# grist-kit

Typesafe JavaScript library and CLI for [Grist](https://www.getgrist.com).

## Status

Pre-release. API unstable.

## Install

```bash
npm install grist-kit
```

## Tutorial

In this tutorial you'll connect to a real Grist doc, generate typesafe bindings, and build a script that finds low-stock products and places an incoming order to refill them.

We'll use the [Inventory Manager](https://www.getgrist.com/templates/inventory-manager/) template. It tracks products, incoming orders (refills from suppliers), and outgoing orders (sales). Stock is computed: `In_Stock = Received - Sold`, and a `Stock_Alert` column flags items as `"Low Stock"` or `"OUT OF STOCK"`.

Prerequisites: Node.js 24+ (for native TypeScript support) and pnpm.

### Part 1 — Connect to the public template

Create a project:

```bash
mkdir grist-inventory && cd grist-inventory
pnpm init --init-type module
pnpm add grist-kit
```

Open the [Inventory Manager template doc](https://templates.getgrist.com/sXsBGDTKau1F/Inventory-Manager). In the left sidebar, click **Settings**. Scroll to the **API** section, expand **Document ID**, and click the **Base doc URL** to copy it.

Create a `.env` file:

```
GRIST_DOC_URL=https://templates.getgrist.com/api/docs/sXsBGDTKau1F3fvxkCyoaJ
```

The template is public, so no API key is needed yet. Confirm the connection:

```bash
pnpm exec grist-kit tables
```

You should see tables including `All_Products`, `Incoming_Orders`, and `Incoming_Order_Line_Items`.

### Part 2 — Generate types

Generate a schema file from the live doc:

```bash
pnpm exec grist-kit generate --out grist-schema.ts
```

This writes a `GristSchema` type literal describing every table and column — including the literal choice values for `Choice` columns, which is what makes the filter calls in the next step typesafe.

> [!TIP]
> You'll re-run this whenever the doc's columns change. Save it as a `package.json` script so it's easy to remember:
>
> ```bash
> pnpm pkg set scripts.update-grist-schema="grist-kit generate --out grist-schema.ts"
> ```
>
> Then `pnpm update-grist-schema` regenerates the file. The `pnpm pkg` subcommand passes through to [`npm pkg`](https://docs.npmjs.com/cli/v7/commands/npm-pkg) (added to pnpm in [v7.17.1](https://github.com/pnpm/pnpm/releases/tag/v7.17.1)).

### Part 3 — Set up TypeScript

To get the type errors we promised, install TypeScript and the Node 24 base config:

```bash
pnpm add -D typescript @types/node @tsconfig/node24
```

Create `tsconfig.json`:

```json
{
  "extends": "@tsconfig/node24/tsconfig.json"
}
```

You can typecheck with `pnpm exec tsc --noEmit` at any point.

### Part 4 — Write the refill script

The goal: a script that finds products that are low or out of stock and places a single incoming order to refill them. We'll add a `--dry-run` flag so we can see what it would do before actually writing.

Create `refill.ts`:

```ts
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

console.log(`${needsRefill.length} products need a refill:\n`);
for (const p of needsRefill) {
  console.log(`  [${p.Stock_Alert}] ${p.SKU} — ${p.Product} (in stock: ${p.In_Stock})`);
}

if (needsRefill.length === 0 || values["dry-run"]) {
  if (values["dry-run"]) console.log("\n(dry run — no order created)");
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

console.log(`\nCreated order ${orderId} with ${needsRefill.length} line items.`);
```

A few things worth noticing:

- The `filter` argument is fully typed against the schema. Try misspelling `"OUT OF STOCK"` — TypeScript will reject it, because `Stock_Alert`'s allowed values are baked into the generated schema.
- `In_Stock` and `Stock_Alert` are formula columns. The schema marks them as such, so they don't appear in the `insert()` payload type — you can't accidentally try to write them.
- `Order_Date` is a Grist `Date`, which is encoded as epoch seconds.
- Every Grist row has a numeric `id` (the row id). `Order_Number` on the line items is a `Ref` to `Incoming_Orders`, so it expects that `id` — `orderId` from the previous insert, or `p.id` for the product reference on `SKU`.

Run it in dry-run mode against the public template:

```bash
node --env-file=.env refill.ts --dry-run
```

You'll see the list of low-stock items. Without an API key, the script can read but cannot write — which is fine for the dry run.

### Part 5 — Make your own copy and place the order

To actually create an order, you need a doc you own.

1. In the template doc, click **Save copy** (top-right). This creates a new document under your account.
2. In the new doc, open **Settings** → **API** → **Document ID** and copy the new **Base doc URL**.
3. Click your profile picture (top-right) → **Profile Settings** → scroll to **API** → create an API key. (See [Grist's authentication docs](https://support.getgrist.com/rest-api/#authentication) for the canonical walkthrough.)

Update `.env`:

```
GRIST_DOC_URL=https://<your-host>/api/docs/<your-new-doc-id>
GRIST_API_KEY=<your-api-key>
```

Re-generate the schema against your copy (it will be identical, but it's good practice):

```bash
pnpm exec grist-kit generate --out grist-schema.ts
```

Now run the script for real:

```bash
node --env-file=.env refill.ts
```

Open your doc — there's a new row in **Incoming Orders** with line items for each low-stock product. Once you flip its **Status** to `"Received"` in the Grist UI, the `In_Stock` column updates automatically and `Stock_Alert` clears.

That's the full loop: generate types from a live doc, read with typesafe filters, write with typesafe inserts.

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
