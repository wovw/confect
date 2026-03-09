import { GroupSpec } from "@confect/core";
import { notes } from "./groups/notes";
import { random } from "./groups/random";
import { runners } from "./groups/runners";

export const groups = GroupSpec.define("groups", {
  groups: { notes, random, runners },
});
