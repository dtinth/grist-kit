import { expectTypeOf, test } from "vite-plus/test";

import type { GristSchema, Insert, Read, Update } from "./schema.ts";

type Fixture = {
  Customers: {
    Name: { type: "Text" };
    Age: { type: "Int" };
    Tier: { type: "Choice"; choices: ["free", "pro", "ent"] };
    Tags: { type: "ChoiceList"; choices: ["a", "b"] };
    Owner: { type: "Ref"; table: "Users" };
    Collaborators: { type: "RefList"; table: "Users" };
    Photos: { type: "Attachments" };
    FullName: { type: "Text"; isFormula: true };
  };
};

test("GristSchema accepts fixture shape", () => {
  expectTypeOf<Fixture>().toMatchTypeOf<GristSchema>();
});

test("Read maps cell types, keeps formulas, adds id, allows null", () => {
  type R = Read<Fixture["Customers"]>;
  expectTypeOf<R["id"]>().toEqualTypeOf<number>();
  expectTypeOf<R["Name"]>().toEqualTypeOf<string | null>();
  expectTypeOf<R["Age"]>().toEqualTypeOf<number | null>();
  expectTypeOf<R["Tier"]>().toEqualTypeOf<"free" | "pro" | "ent" | null>();
  expectTypeOf<R["Tags"]>().toEqualTypeOf<("a" | "b")[] | null>();
  expectTypeOf<R["Owner"]>().toEqualTypeOf<number | null>();
  expectTypeOf<R["Collaborators"]>().toEqualTypeOf<number[] | null>();
  expectTypeOf<R["Photos"]>().toEqualTypeOf<number[] | null>();
  expectTypeOf<R["FullName"]>().toEqualTypeOf<string | null>();
});

test("Insert excludes formulas, excludes id, makes everything optional", () => {
  type I = Insert<Fixture["Customers"]>;
  expectTypeOf<I>().not.toHaveProperty("id");
  expectTypeOf<I>().not.toHaveProperty("FullName");
  const payload: I = {};
  payload.Name = "Alice";
  payload.Tier = "pro";
});

test("Update excludes formulas, requires id", () => {
  type U = Update<Fixture["Customers"]>;
  expectTypeOf<U["id"]>().toEqualTypeOf<number>();
  expectTypeOf<U>().not.toHaveProperty("FullName");
  const payload: U = { id: 1 };
  payload.Tier = "ent";
});
