import { FunctionSpec, GroupSpec } from "@confect/core";
import { Schema } from "effect";

export const random = GroupSpec.define("random", {
  functions: {
    getNumber: FunctionSpec.publicAction({
      args: Schema.Struct({}),
      returns: Schema.Number,
    }),
  },
});
