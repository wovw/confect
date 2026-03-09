import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { Schema } from "effect";
import { Notes } from "../tables/Notes";

export const databaseReader = GroupSpec.define("databaseReader", {
  functions: {
    getNote: FunctionSpec.publicQuery({
      args: Schema.Struct({ noteId: GenericId.GenericId("notes") }),
      returns: Notes.Doc,
    }),
    listNotes: FunctionSpec.publicQuery({
      args: Schema.Struct({}),
      returns: Schema.Array(Notes.Doc),
    }),
  },
});
