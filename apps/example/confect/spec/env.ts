import { FunctionSpec, GroupSpec } from "@confect/core";
import { Schema } from "effect";

export const env = GroupSpec.define("env", {
  functions: {
    readEnvVar: FunctionSpec.publicQuery({
      args: Schema.Struct({}),
      returns: Schema.String,
    }),
  },
});
