import { GroupSpec } from "@confect/core";
import { notes } from "./notesAndRandom/notes";
import { random } from "./notesAndRandom/random";

export const notesAndRandom = GroupSpec.define("notesAndRandom", {
  groups: { notes, random },
});
