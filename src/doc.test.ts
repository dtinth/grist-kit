import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test";

import { gristDoc } from "./doc.ts";
import { createRequester } from "./request.ts";

// Populated by src/test-setup.ts (globalSetup).
const baseDocUrl = process.env.GRIST_TEST_DOC_URL;
const apiKey = process.env.GRIST_TEST_API_KEY;

describe("gristDoc (live)", () => {
  const tableId = `KitTest_${Math.random().toString(36).slice(2, 10)}`;

  interface Schema {
    [k: string]: {
      Name: { type: "Text" };
      Age: { type: "Int" };
      Tier: { type: "Choice"; choices: ["free", "pro"] };
    };
  }

  const doc = gristDoc<Schema>({
    baseDocUrl: baseDocUrl ?? "",
    apiKey,
  });
  const requester = createRequester({ baseDocUrl: baseDocUrl ?? "", apiKey });

  beforeAll(async () => {
    await requester.request("/tables", {
      method: "POST",
      body: {
        tables: [
          {
            id: tableId,
            columns: [
              { id: "Name", fields: { type: "Text" } },
              { id: "Age", fields: { type: "Int" } },
              {
                id: "Tier",
                fields: {
                  type: "Choice",
                  widgetOptions: JSON.stringify({ choices: ["free", "pro"] }),
                },
              },
            ],
          },
        ],
      },
    });
  });

  afterAll(async () => {
    await requester
      .request("/apply", {
        method: "POST",
        body: [["RemoveTable", tableId]],
      })
      .catch(() => undefined);
  });

  test("insert, list, update, delete", async () => {
    const table = doc.table(tableId);

    const ids = await table.insert([
      { Name: "Alice", Age: 30, Tier: "pro" },
      { Name: "Bob", Age: 25, Tier: "free" },
    ]);
    expect(ids).toHaveLength(2);

    const rows = await table.list({ sort: "Age" });
    expect(rows.map((r) => r.Name)).toEqual(["Bob", "Alice"]);
    expect(rows[0]!.Tier).toBe("free");

    await table.update([{ id: ids[0]!, Tier: "free" }]);
    const filtered = await table.list({ filter: { Tier: ["free"] } });
    expect(filtered.map((r) => r.Name).sort((a, b) => (a ?? "").localeCompare(b ?? ""))).toEqual([
      "Alice",
      "Bob",
    ]);

    await table.delete(ids);
    const afterDelete = await table.list();
    expect(afterDelete).toHaveLength(0);
  });

  test("upsert creates and then updates by require-match", async () => {
    const table = doc.table(tableId);

    await table.upsert([
      {
        require: { Name: "Carol" },
        fields: { Name: "Carol", Age: 40, Tier: "pro" },
      },
    ]);
    let rows = await table.list({ filter: { Name: ["Carol"] } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.Age).toBe(40);

    await table.upsert([
      {
        require: { Name: "Carol" },
        fields: { Name: "Carol", Age: 41, Tier: "pro" },
      },
    ]);
    rows = await table.list({ filter: { Name: ["Carol"] } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.Age).toBe(41);

    await table.delete(rows.map((r) => r.id));
  });

  test("sql pass-through returns typed-by-caller rows", async () => {
    const table = doc.table(tableId);
    await table.insert([{ Name: "Dan", Age: 50, Tier: "pro" }]);

    const result = await doc.sql<{ Name: string; Age: number }>(
      `SELECT Name, Age FROM ${tableId} WHERE Name = 'Dan'`,
    );
    expect(result).toEqual([{ Name: "Dan", Age: 50 }]);

    const row = await table.list({ filter: { Name: ["Dan"] } });
    await table.delete(row.map((r) => r.id));
  });

  test("GristApiError on 404", async () => {
    await expect(doc.table("DoesNotExist_xyz").list()).rejects.toMatchObject({
      name: "GristApiError",
      status: 404,
    });
  });
});
