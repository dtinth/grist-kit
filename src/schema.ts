/**
 * Column type descriptors that codegen emits into a GristSchema.
 *
 * A GristSchema is a pure type literal — no runtime value is required.
 * The utility types {@link Read}, {@link Insert}, and {@link Update} derive
 * record shapes from it.
 */
export type GristColumnType =
  | { type: "Text" }
  | { type: "Numeric" }
  | { type: "Int" }
  | { type: "Bool" }
  | { type: "Date" }
  | { type: "DateTime" }
  | { type: "Choice"; choices?: readonly string[] }
  | { type: "ChoiceList"; choices?: readonly string[] }
  | { type: "Ref"; table?: string }
  | { type: "RefList"; table?: string }
  | { type: "Attachments" }
  | { type: "Any" };

export type GristColumn = GristColumnType & { isFormula?: boolean };

export type GristTableSchema = Record<string, GristColumn>;

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
export type Read<T extends GristTableSchema> = { id: number } & {
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
export type Update<T extends GristTableSchema> = { id: number } & Insert<T>;
