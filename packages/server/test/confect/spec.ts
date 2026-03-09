import { Spec } from "@confect/core";
import { databaseReader } from "./spec/databaseReader";
import { groups } from "./spec/groups";

export default Spec.define({ groups, databaseReader });
