import type { FetchOptions } from "ofetch";

import { createAttachments, type GristAttachments } from "./attachments.ts";
import { createRequester, type GristRequestConfig } from "./request.ts";
import type { GristSchema } from "./schema.ts";
import { createTable, type GristTable } from "./table.ts";

export interface GristDoc<S extends GristSchema> {
  table<K extends keyof S & string>(name: K): GristTable<S[K]>;
  sql<T = unknown>(query: string, params?: unknown[]): Promise<T[]>;
  attachments: GristAttachments;
  /** Raw request against the doc base URL. Throws GristApiError on non-2xx. */
  request<T = unknown>(path: string, options?: FetchOptions): Promise<T>;
}

export function gristDoc<S extends GristSchema = GristSchema>(
  config: GristRequestConfig,
): GristDoc<S> {
  const requester = createRequester(config);
  const attachments = createAttachments(requester);

  return {
    table<K extends keyof S & string>(name: K) {
      return createTable<S[K]>(requester, name);
    },
    async sql<T = unknown>(query: string, params?: unknown[]) {
      const response = await requester.request<{
        records: { fields: T }[];
      }>("/sql", {
        method: "POST",
        body: { sql: query, args: params },
      });
      return response.records.map((record) => record.fields);
    },
    attachments,
    request: requester.request,
  };
}
