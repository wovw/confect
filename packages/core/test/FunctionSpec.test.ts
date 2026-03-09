import { describe, expect, it } from "@effect/vitest";
import { Schema } from "effect";
import * as FunctionSpec from "../src/FunctionSpec";

describe("isFunctionSpec", () => {
  it("checks whether a value is a function spec", () => {
    const functionSpec: unknown = FunctionSpec.publicQuery({
      args: Schema.Struct({}),
      returns: Schema.String,
    });

    expect(FunctionSpec.isFunctionSpec(functionSpec)).toStrictEqual(true);
  });
});
