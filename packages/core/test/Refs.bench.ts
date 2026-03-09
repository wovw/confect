import { bench } from "@ark/attest";
import { Schema } from "effect";
import * as FunctionSpec from "../src/FunctionSpec";
import * as GroupSpec from "../src/GroupSpec";
import type * as Ref from "../src/Ref";
import type * as Refs from "../src/Refs";
import * as Spec from "../src/Spec";

const Args = Schema.Struct({});
const Returns = Schema.String;

// --- Small spec: 1 group, 2 functions ---
const SmallSpec = Spec.define({
  auth: GroupSpec.define("auth", {
    functions: {
      login: FunctionSpec.publicQuery({ args: Args, returns: Returns }),
      logout: FunctionSpec.publicMutation({ args: Args, returns: Returns }),
    },
  }),
});
type SmallSpec = typeof SmallSpec;

// --- Medium spec (original): 4 groups, 12 functions ---
const MediumSpec = Spec.define({
  users: GroupSpec.define("users", {
    functions: {
      list: FunctionSpec.publicQuery({ args: Args, returns: Returns }),
      getById: FunctionSpec.internalQuery({ args: Args, returns: Returns }),
      create: FunctionSpec.publicMutation({ args: Args, returns: Returns }),
      remove: FunctionSpec.internalMutation({ args: Args, returns: Returns }),
    },
  }),
  posts: GroupSpec.define("posts", {
    functions: {
      list: FunctionSpec.publicQuery({ args: Args, returns: Returns }),
      getById: FunctionSpec.publicQuery({ args: Args, returns: Returns }),
      archive: FunctionSpec.internalMutation({ args: Args, returns: Returns }),
    },
  }),
  comments: GroupSpec.define("comments", {
    functions: {
      list: FunctionSpec.publicQuery({ args: Args, returns: Returns }),
      create: FunctionSpec.publicMutation({ args: Args, returns: Returns }),
      flagged: FunctionSpec.internalQuery({ args: Args, returns: Returns }),
    },
  }),
  analytics: GroupSpec.define("analytics", {
    functions: {
      aggregate: FunctionSpec.internalQuery({ args: Args, returns: Returns }),
      exportData: FunctionSpec.internalAction({ args: Args, returns: Returns }),
    },
  }),
});

type MediumSpec = typeof MediumSpec;

// --- Large spec: 8 groups, 28 functions ---
const LargeSpec = Spec.define({
  users: GroupSpec.define("users", {
    functions: {
      list: FunctionSpec.publicQuery({ args: Args, returns: Returns }),
      getById: FunctionSpec.internalQuery({ args: Args, returns: Returns }),
      create: FunctionSpec.publicMutation({ args: Args, returns: Returns }),
      remove: FunctionSpec.internalMutation({ args: Args, returns: Returns }),
    },
  }),
  posts: GroupSpec.define("posts", {
    functions: {
      list: FunctionSpec.publicQuery({ args: Args, returns: Returns }),
      getById: FunctionSpec.publicQuery({ args: Args, returns: Returns }),
      archive: FunctionSpec.internalMutation({ args: Args, returns: Returns }),
    },
  }),
  comments: GroupSpec.define("comments", {
    functions: {
      list: FunctionSpec.publicQuery({ args: Args, returns: Returns }),
      create: FunctionSpec.publicMutation({ args: Args, returns: Returns }),
      flagged: FunctionSpec.internalQuery({ args: Args, returns: Returns }),
    },
  }),
  analytics: GroupSpec.define("analytics", {
    functions: {
      aggregate: FunctionSpec.internalQuery({ args: Args, returns: Returns }),
      exportData: FunctionSpec.internalAction({ args: Args, returns: Returns }),
    },
  }),
  products: GroupSpec.define("products", {
    functions: {
      list: FunctionSpec.publicQuery({ args: Args, returns: Returns }),
      getById: FunctionSpec.publicQuery({ args: Args, returns: Returns }),
      create: FunctionSpec.publicMutation({ args: Args, returns: Returns }),
      archive: FunctionSpec.internalMutation({ args: Args, returns: Returns }),
    },
  }),
  orders: GroupSpec.define("orders", {
    functions: {
      list: FunctionSpec.publicQuery({ args: Args, returns: Returns }),
      getById: FunctionSpec.publicQuery({ args: Args, returns: Returns }),
      create: FunctionSpec.publicMutation({ args: Args, returns: Returns }),
      cancel: FunctionSpec.internalMutation({ args: Args, returns: Returns }),
    },
  }),
  notifications: GroupSpec.define("notifications", {
    functions: {
      list: FunctionSpec.publicQuery({ args: Args, returns: Returns }),
      markRead: FunctionSpec.publicMutation({ args: Args, returns: Returns }),
      flagged: FunctionSpec.internalQuery({ args: Args, returns: Returns }),
    },
  }),
  settings: GroupSpec.define("settings", {
    functions: {
      get: FunctionSpec.publicQuery({ args: Args, returns: Returns }),
      update: FunctionSpec.publicMutation({ args: Args, returns: Returns }),
      reset: FunctionSpec.internalAction({ args: Args, returns: Returns }),
    },
  }),
});

type LargeSpec = typeof LargeSpec;

// Baseline expression: force the Refs module types to load so module-level
// instantiations are not counted in individual benchmarks.
void ({} as Refs.Refs<any>);

bench("Refs<Spec> (unfiltered)", () => {
  return {} as Refs.Refs<MediumSpec>;
}).types([2173, "instantiations"]);

bench("Refs<Spec, AnyPublic> (public-filtered)", () => {
  return {} as Refs.Refs<MediumSpec, never, Ref.AnyPublic>;
}).types([2100, "instantiations"]);

bench("Refs<Spec, AnyInternal> (internal-filtered)", () => {
  return {} as Refs.Refs<MediumSpec, never, Ref.AnyInternal>;
}).types([2124, "instantiations"]);

// Laziness: accessing one leaf should be cheaper than accessing all leaves.
// If the type were eagerly evaluated, both benchmarks would have the same
// instantiation count. The gap between them proves lazy evaluation.

bench("resolve one leaf", () => {
  return {} as Refs.Refs<MediumSpec, never, Ref.AnyPublic>["users"]["list"];
}).types([2207, "instantiations"]);

bench("resolve all leaves", () => {
  return [
    {} as Refs.Refs<MediumSpec, never, Ref.AnyPublic>["users"]["list"],
    {} as Refs.Refs<MediumSpec, never, Ref.AnyPublic>["users"]["create"],
    {} as Refs.Refs<MediumSpec, never, Ref.AnyPublic>["posts"]["list"],
    {} as Refs.Refs<MediumSpec, never, Ref.AnyPublic>["posts"]["getById"],
    {} as Refs.Refs<MediumSpec, never, Ref.AnyPublic>["comments"]["list"],
    {} as Refs.Refs<MediumSpec, never, Ref.AnyPublic>["comments"]["create"],
  ];
}).types([2513, "instantiations"]);

// --- Small spec (1 group, 2 functions) ---

bench("small: Refs (unfiltered)", () => {
  return {} as Refs.Refs<SmallSpec>;
}).types([758, "instantiations"]);

bench("small: Refs (public-filtered)", () => {
  return {} as Refs.Refs<SmallSpec, never, Ref.AnyPublic>;
}).types([758, "instantiations"]);

bench("small: Refs (internal-filtered)", () => {
  return {} as Refs.Refs<SmallSpec, never, Ref.AnyInternal>;
}).types([737, "instantiations"]);

bench("small: Refs (resolve one leaf)", () => {
  return {} as Refs.Refs<SmallSpec, never, Ref.AnyPublic>["auth"]["login"];
}).types([829, "instantiations"]);

bench("small: Refs (resolve all leaves)", () => {
  return [
    {} as Refs.Refs<SmallSpec, never, Ref.AnyPublic>["auth"]["login"],
    {} as Refs.Refs<SmallSpec, never, Ref.AnyPublic>["auth"]["logout"],
  ];
}).types([869, "instantiations"]);

// --- Large spec (8 groups, 28 functions) ---

bench("large: Refs (unfiltered)", () => {
  return {} as Refs.Refs<LargeSpec>;
}).types([4084, "instantiations"]);

bench("large: Refs (public-filtered)", () => {
  return {} as Refs.Refs<LargeSpec, never, Ref.AnyPublic>;
}).types([3959, "instantiations"]);

bench("large: Refs (internal-filtered)", () => {
  return {} as Refs.Refs<LargeSpec, never, Ref.AnyInternal>;
}).types([3972, "instantiations"]);

bench("large: Refs (resolve one leaf)", () => {
  return {} as Refs.Refs<LargeSpec, never, Ref.AnyPublic>["users"]["list"];
}).types([4092, "instantiations"]);

bench("large: Refs (resolve all leaves)", () => {
  type PublicRefs = Refs.Refs<LargeSpec, never, Ref.AnyPublic>;
  return [
    {} as PublicRefs["users"]["list"],
    {} as PublicRefs["users"]["create"],
    {} as PublicRefs["posts"]["list"],
    {} as PublicRefs["posts"]["getById"],
    {} as PublicRefs["comments"]["list"],
    {} as PublicRefs["comments"]["create"],
    {} as PublicRefs["products"]["list"],
    {} as PublicRefs["products"]["getById"],
    {} as PublicRefs["products"]["create"],
    {} as PublicRefs["orders"]["list"],
    {} as PublicRefs["orders"]["getById"],
    {} as PublicRefs["orders"]["create"],
    {} as PublicRefs["notifications"]["list"],
    {} as PublicRefs["notifications"]["markRead"],
    {} as PublicRefs["settings"]["get"],
    {} as PublicRefs["settings"]["update"],
  ];
}).types([5146, "instantiations"]);
