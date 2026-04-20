import type { GristTableSchema, Insert, Read, Update } from "./schema.ts";
import type { GristRequester } from "./request.ts";

type SortSpec<T extends GristTableSchema> = `${"" | "-"}${(keyof T & string) | "id"}`;

/** Options for listing records from a Grist table. */
export interface ListOptions<T extends GristTableSchema> {
  /** Equality-style filters keyed by column name. */
  filter?: Partial<{
    [K in keyof T]: Read<T>[K] extends infer V ? Exclude<V, null>[] : never;
  }>;
  /** Sort fields, prefixing a field with `-` for descending order. */
  sort?: SortSpec<T> | SortSpec<T>[];
  /** Maximum number of rows to return. */
  limit?: number;
  /** Include hidden columns in the response. */
  hidden?: boolean;
}

/** One upsert candidate containing match criteria and fields to write. */
export interface UpsertRecord<T extends GristTableSchema> {
  /** Fields that must match existing rows before updating them. */
  require: Partial<Insert<T>>;
  /** Field values to create or update. */
  fields: Insert<T>;
}

/** Options that control Grist upsert behavior. */
export interface UpsertOptions {
  /** Behavior when multiple rows match the `require` criteria. */
  onMany?: "first" | "none" | "all";
  /** Prevent creating new rows when no match is found. */
  noCreate?: boolean;
  /** Prevent updating existing rows when a match is found. */
  noUpdate?: boolean;
  /** Allow empty `require` criteria in upsert requests. */
  allowEmptyRequire?: boolean;
}

/** Typed record operations for a single Grist table. */
export interface GristTable<T extends GristTableSchema> {
  /** Table name as it appears in the Grist document. */
  readonly name: string;
  /** Lists table rows that match the provided query options. */
  list(options?: ListOptions<T>): Promise<Read<T>[]>;
  /** Inserts one or more rows and returns their row IDs. */
  insert(records: Insert<T>[]): Promise<number[]>;
  /** Updates one or more existing rows by ID. */
  update(records: Update<T>[]): Promise<void>;
  /** Creates or updates rows using Grist's upsert endpoint. */
  upsert(records: UpsertRecord<T>[], options?: UpsertOptions): Promise<void>;
  /** Deletes rows by Grist row ID. */
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
