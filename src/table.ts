import type { GristTableSchema, Insert, Read, Update } from "./schema.ts";
import type { GristRequester } from "./request.ts";

type SortSpec<T extends GristTableSchema> = `${"" | "-"}${(keyof T & string) | "id"}`;

export interface ListOptions<T extends GristTableSchema> {
  filter?: Partial<{
    [K in keyof T]: Read<T>[K] extends infer V ? Exclude<V, null>[] : never;
  }>;
  sort?: SortSpec<T> | SortSpec<T>[];
  limit?: number;
  /** Include hidden columns in the response. */
  hidden?: boolean;
}

export interface UpsertRecord<T extends GristTableSchema> {
  require: Partial<Insert<T>>;
  fields: Insert<T>;
}

export interface UpsertOptions {
  onMany?: "first" | "none" | "all";
  noCreate?: boolean;
  noUpdate?: boolean;
  allowEmptyRequire?: boolean;
}

export interface GristTable<T extends GristTableSchema> {
  readonly name: string;
  list(options?: ListOptions<T>): Promise<Read<T>[]>;
  insert(records: Insert<T>[]): Promise<number[]>;
  update(records: Update<T>[]): Promise<void>;
  upsert(records: UpsertRecord<T>[], options?: UpsertOptions): Promise<void>;
  delete(rowIds: number[]): Promise<void>;
}

export function createTable<T extends GristTableSchema>(
  requester: GristRequester,
  name: string,
): GristTable<T> {
  const path = `/tables/${encodeURIComponent(name)}/records`;

  return {
    name,

    async list(options = {}) {
      const query: Record<string, string> = {};
      if (options.filter) query.filter = JSON.stringify(options.filter);
      if (options.sort) {
        query.sort = Array.isArray(options.sort) ? options.sort.join(",") : options.sort;
      }
      if (options.limit != null) query.limit = String(options.limit);
      if (options.hidden) query.hidden = "true";

      const response = await requester.request<{
        records: { id: number; fields: Record<string, unknown> }[];
      }>(path, { query });

      return response.records.map((record) => ({ id: record.id, ...record.fields }) as Read<T>);
    },

    async insert(records) {
      const response = await requester.request<{ records: { id: number }[] }>(path, {
        method: "POST",
        body: { records: records.map((fields) => ({ fields })) },
      });
      return response.records.map((record) => record.id);
    },

    async update(records) {
      await requester.request(path, {
        method: "PATCH",
        body: {
          records: records.map(({ id, ...fields }) => ({ id, fields })),
        },
      });
    },

    async upsert(records, options = {}) {
      const query: Record<string, string> = {};
      if (options.onMany) query.onmany = options.onMany;
      if (options.noCreate) query.noadd = "true";
      if (options.noUpdate) query.noupdate = "true";
      if (options.allowEmptyRequire) query.allow_empty_require = "true";

      await requester.request(path, {
        method: "PUT",
        query,
        body: { records },
      });
    },

    async delete(rowIds) {
      await requester.request(`/tables/${encodeURIComponent(name)}/data/delete`, {
        method: "POST",
        body: rowIds,
      });
    },
  };
}
