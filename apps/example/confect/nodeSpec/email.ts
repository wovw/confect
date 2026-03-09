import { FunctionSpec, GroupSpec } from "@confect/core";
import { Schema } from "effect";

export const email = GroupSpec.defineNode("email", {
  functions: {
    send: FunctionSpec.publicNodeAction({
      args: Schema.Struct({
        to: Schema.String,
        subject: Schema.String,
        body: Schema.String,
      }),
      returns: Schema.Null,
    }),
    getInbox: FunctionSpec.publicNodeAction({
      args: Schema.Struct({}),
      returns: Schema.Array(
        Schema.Struct({
          to: Schema.String,
          subject: Schema.String,
          body: Schema.String,
        }),
      ),
    }),
  },
});
