#!/usr/bin/env node
import { Command, Option } from "commander";

import { gristDoc } from "./doc.ts";
import { resolveConfig } from "./cli/config.ts";
import { runGenerate } from "./cli/generate.ts";
import { createRequester } from "./request.ts";
import { listColumns, listTables } from "./cli/introspect.ts";

const program = new Command();
program
  .name("grist-kit")
  .description("Typesafe Grist JS library and CLI")
  .addOption(new Option("--doc-url <url>", "Grist base doc URL").env("GRIST_DOC_URL"))
  .addOption(new Option("--api-key <key>", "Grist API key").env("GRIST_API_KEY"))
  .option("--env-file <path>", "Path to .env file to load");

program
  .command("generate")
  .description("Generate a GristSchema type from a live doc")
  .option("--out <path>", "Output file path", "./grist-schema.ts")
  .option("--type-name <name>", "Exported type name", "GristSchema")
  .action(async (cmdOptions: { out: string; typeName: string }) => {
    const config = resolveConfig(program.opts());
    await runGenerate(config, cmdOptions);
    console.error(`Wrote ${cmdOptions.out}`);
  });

program
  .command("tables")
  .description("List tables in the doc")
  .action(async () => {
    const config = resolveConfig(program.opts());
    const requester = createRequester(config);
    const tables = await listTables(requester);
    for (const table of tables) {
      const columns = await listColumns(requester, table.id);
      console.log(table.id);
      for (const column of columns) {
        console.log(`  ${column.id} ${column.fields.type ?? "?"}`);
      }
    }
  });

program
  .command("records <table>")
  .description("Print records from a table as JSON")
  .option("--filter <spec...>", "Filter as key=value (repeatable)")
  .option("--limit <n>", "Max rows", (v) => Number(v))
  .option("--format <format>", "json | csv", "json")
  .action(
    async (
      table: string,
      cmdOptions: { filter?: string[]; limit?: number; format: "json" | "csv" },
    ) => {
      const config = resolveConfig(program.opts());
      const doc = gristDoc(config);
      const filter = parseFilter(cmdOptions.filter);
      const rows = await doc.table(table).list({ filter, limit: cmdOptions.limit });
      if (cmdOptions.format === "csv") printCsv(rows);
      else console.log(JSON.stringify(rows, null, 2));
    },
  );

program
  .command("sql <query>")
  .description("Run a SQL query (read-only)")
  .option("--format <format>", "json | csv", "json")
  .action(async (query: string, cmdOptions: { format: "json" | "csv" }) => {
    const config = resolveConfig(program.opts());
    const doc = gristDoc(config);
    const rows = await doc.sql(query);
    if (cmdOptions.format === "csv") printCsv(rows as Record<string, unknown>[]);
    else console.log(JSON.stringify(rows, null, 2));
  });

function parseFilter(spec: string[] | undefined): Record<string, unknown[]> | undefined {
  if (!spec || spec.length === 0) return undefined;
  const result: Record<string, unknown[]> = {};
  for (const entry of spec) {
    const eq = entry.indexOf("=");
    if (eq === -1) throw new Error(`Invalid --filter entry (expected key=value): ${entry}`);
    const key = entry.slice(0, eq);
    const value = entry.slice(eq + 1);
    (result[key] ??= []).push(coerce(value));
  }
  return result;
}

function coerce(value: string): unknown {
  if (value === "true") return true;
  if (value === "false") return false;
  if (value === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  return value;
}

function printCsv(rows: Record<string, unknown>[]): void {
  if (rows.length === 0) return;
  const keys = Array.from(
    rows.reduce((acc, row) => {
      for (const k of Object.keys(row)) acc.add(k);
      return acc;
    }, new Set<string>()),
  );
  console.log(keys.map(csvEscape).join(","));
  for (const row of rows) {
    console.log(keys.map((k) => csvEscape(row[k])).join(","));
  }
}

function csvEscape(value: unknown): string {
  if (value == null) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  console.error(`error: ${message}`);
  process.exit(1);
});
