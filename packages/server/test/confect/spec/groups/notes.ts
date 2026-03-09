import { FunctionSpec, GenericId, GroupSpec } from "@confect/core";
import { Schema } from "effect";
import { Notes } from "../../tables/Notes";

export const notes = GroupSpec.define("notes", {
  functions: {
    insert: FunctionSpec.publicMutation({
      args: Schema.Struct({ text: Schema.String }),
      returns: GenericId.GenericId("notes"),
    }),
    list: FunctionSpec.publicQuery({
      args: Schema.Struct({}),
      returns: Schema.Array(Notes.Doc),
    }),
    delete_: FunctionSpec.publicMutation({
      args: Schema.Struct({ noteId: GenericId.GenericId("notes") }),
      returns: Schema.Null,
    }),
    getFirst: FunctionSpec.publicQuery({
      args: Schema.Struct({}),
      returns: Schema.Option(Notes.Doc),
    }),
    internalGetFirst: FunctionSpec.internalQuery({
      args: Schema.Struct({}),
      returns: Schema.Option(Notes.Doc),
    }),
  },
});
