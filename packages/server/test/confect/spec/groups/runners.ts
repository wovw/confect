import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { Schema } from "effect";

export const runners = GroupSpec.define("runners", {
  functions: {
    insertNoteViaRunner: FunctionSpec.publicAction({
      args: Schema.Struct({ text: Schema.String }),
      returns: GenericId.GenericId("notes"),
    }),
    getNumberViaRunner: FunctionSpec.publicAction({
      args: Schema.Struct({}),
      returns: Schema.Number,
    }),
    countNotesViaRunner: FunctionSpec.publicAction({
      args: Schema.Struct({}),
      returns: Schema.Number,
    }),
  },
});
