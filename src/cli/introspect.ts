import type { GristRequester } from "../request.ts";

export interface RawTable {
  id: string;
  fields: Record<string, unknown>;
}

export interface RawColumn {
  id: string;
  fields: {
    type: string;
    isFormula?: boolean;
    formula?: string;
    widgetOptions?: string;
    [key: string]: unknown;
  };
}

export async function listTables(requester: GristRequester): Promise<RawTable[]> {
  const response = await requester.request<{ tables: RawTable[] }>("/tables");
  return response.tables;
}

export async function listColumns(
  requester: GristRequester,
  tableId: string,
): Promise<RawColumn[]> {
  const response = await requester.request<{ columns: RawColumn[] }>(
    `/tables/${encodeURIComponent(tableId)}/columns`,
  );
  return response.columns;
}
