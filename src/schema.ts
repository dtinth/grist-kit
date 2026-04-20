/**
 * Column type descriptors that codegen emits into a GristSchema.
 *
 * A GristSchema is a pure type literal — no runtime value is required.
 * The utility types {@link Read}, {@link Insert}, and {@link Update} derive
 * record shapes from it.
 */
export type GristColumnType =
  | {
      /** Grist column kind. */
      type: "Text";
    }
  | {
      /** Grist column kind. */
      type: "Numeric";
    }
  | {
      /** Grist column kind. */
      type: "Int";
    }
  | {
      /** Grist column kind. */
      type: "Bool";
    }
  | {
      /** Grist column kind. */
      type: "Date";
    }
  | {
      /** Grist column kind. */
      type: "DateTime";
    }
  | {
      /** Grist column kind. */
      type: "Choice";
      /** Allowed choice values, when the set is known ahead of time. */
      choices?: readonly string[];
    }
  | {
      /** Grist column kind. */
      type: "ChoiceList";
      /** Allowed choice values, when the set is known ahead of time. */
      choices?: readonly string[];
    }
  | {
      /** Grist column kind. */
      type: "Ref";
      /** Referenced table name, when known. */
      table?: string;
    }
  | {
      /** Grist column kind. */
      type: "RefList";
      /** Referenced table name, when known. */
      table?: string;
    }
  | {
      /** Grist column kind. */
      type: "Attachments";
    }
  | {
      /** Grist column kind. */
      type: "Any";
    };

/** Full Grist column descriptor, including whether the column is formula-backed. */
export type GristColumn = GristColumnType & {
  /** Whether Grist computes this column from a formula instead of user input. */
  isFormula?: boolean;
};

/** Schema definition for a single Grist table keyed by column name. */
export type GristTableSchema = Record<string, GristColumn>;

/** Schema definition for a full Grist document keyed by table name. */
export type GristSchema = Record<string, GristTableSchema>;

type CellValue<C extends GristColumn> = C extends { type: "Text" }
  ? string
  : C extends { type: "Numeric" } | { type: "Int" }
    ? number
    : C extends { type: "Bool" }
      ? boolean
      : C extends { type: "Date" } | { type: "DateTime" }
        ? number
        : C extends { type: "Choice"; choices: readonly (infer V extends string)[] }
          ? V
          : C extends { type: "Choice" }
            ? string
            : C extends { type: "ChoiceList"; choices: readonly (infer V extends string)[] }
              ? V[]
              : C extends { type: "ChoiceList" }
                ? string[]
                : C extends { type: "Ref" }
                  ? number
                  : C extends { type: "RefList" }
                    ? number[]
                    : C extends { type: "Attachments" }
                      ? number[]
                      : unknown;

/** Row shape as returned by the REST `/records` endpoint. All columns nullable. */
export type Read<T extends GristTableSchema> = {
  /** Stable Grist row identifier. */
  id: number;
} & {
  [K in keyof T]: CellValue<T[K]> | null;
};

type NonFormulaKeys<T extends GristTableSchema> = {
  [K in keyof T]: T[K] extends { isFormula: true } ? never : K;
}[keyof T];

/** Payload shape for inserts. Formulas excluded; all fields optional; no id. */
export type Insert<T extends GristTableSchema> = {
  [K in NonFormulaKeys<T>]?: CellValue<T[K]> | null;
};

/** Payload shape for updates/upserts. Formulas excluded; id required. */
export type Update<T extends GristTableSchema> = {
  /** Stable Grist row identifier. */
  id: number;
} & Insert<T>;
