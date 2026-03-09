import { FunctionSpec, GroupSpec, Spec } from "@confect/core";
import { describe, expect, test } from "@effect/vitest";
import { Equal, HashSet, Schema } from "effect";

import * as FunctionPath from "../src/FunctionPath";
import * as FunctionPaths from "../src/FunctionPaths";
import * as GroupPath from "../src/GroupPath";

/**
 * Helper to create a FunctionPath from group path segments and function name.
 */
const makeFunctionPath = (
  groupSegments: readonly [string, ...string[]],
  name: string,
): FunctionPath.FunctionPath =>
  FunctionPath.FunctionPath.make({
    groupPath: GroupPath.make(groupSegments),
    name,
  });

describe("FunctionPaths.make", () => {
  test("empty spec", () => {
    const spec = Spec.define({});

    const result = FunctionPaths.make(spec);

    expect(Equal.equals(result, HashSet.empty())).toBe(true);
  });

  test("spec with one group with no functions", () => {
    const spec = Spec.define({
      myGroup: GroupSpec.define("myGroup", {}),
    });

    const result = FunctionPaths.make(spec);

    expect(Equal.equals(result, HashSet.empty())).toBe(true);
  });

  test("spec with one group with one function", () => {
    const spec = Spec.define({
      myGroup: GroupSpec.define("myGroup", {
        functions: {
          myQuery: FunctionSpec.publicQuery({
            args: Schema.Struct({}),
            returns: Schema.Null,
          }),
        },
      }),
    });

    const result = FunctionPaths.make(spec);

    expect(
      Equal.equals(
        result,
        HashSet.make(makeFunctionPath(["myGroup"], "myQuery")),
      ),
    ).toBe(true);
  });

  test("spec with one group with multiple functions", () => {
    const spec = Spec.define({
      myGroup: GroupSpec.define("myGroup", {
        functions: {
          list: FunctionSpec.publicQuery({
            args: Schema.Struct({}),
            returns: Schema.Array(Schema.String),
          }),
          insert: FunctionSpec.publicMutation({
            args: Schema.Struct({ text: Schema.String }),
            returns: Schema.String,
          }),
          doSomething: FunctionSpec.publicAction({
            args: Schema.Struct({}),
            returns: Schema.Void,
          }),
        },
      }),
    });

    const result = FunctionPaths.make(spec);

    expect(
      Equal.equals(
        result,
        HashSet.make(
          makeFunctionPath(["myGroup"], "list"),
          makeFunctionPath(["myGroup"], "insert"),
          makeFunctionPath(["myGroup"], "doSomething"),
        ),
      ),
    ).toBe(true);
  });

  test("spec with multiple top-level groups", () => {
    const spec = Spec.define({
      users: GroupSpec.define("users", {
        functions: {
          getById: FunctionSpec.publicQuery({
            args: Schema.Struct({ id: Schema.String }),
            returns: Schema.Unknown,
          }),
        },
      }),
      posts: GroupSpec.define("posts", {
        functions: {
          list: FunctionSpec.publicQuery({
            args: Schema.Struct({}),
            returns: Schema.Array(Schema.Unknown),
          }),
        },
      }),
    });

    const result = FunctionPaths.make(spec);

    expect(
      Equal.equals(
        result,
        HashSet.make(
          makeFunctionPath(["users"], "getById"),
          makeFunctionPath(["posts"], "list"),
        ),
      ),
    ).toBe(true);
  });

  test("spec with nested groups", () => {
    const innerGroup = GroupSpec.define("inner", {
      functions: {
        innerQuery: FunctionSpec.publicQuery({
          args: Schema.Struct({}),
          returns: Schema.Null,
        }),
      },
    });

    const outerGroup = GroupSpec.define("outer", {
      functions: {
        outerMutation: FunctionSpec.publicMutation({
          args: Schema.Struct({}),
          returns: Schema.Null,
        }),
      },
      groups: { inner: innerGroup },
    });

    const spec = Spec.define({ outer: outerGroup });

    const result = FunctionPaths.make(spec);

    expect(
      Equal.equals(
        result,
        HashSet.make(
          makeFunctionPath(["outer"], "outerMutation"),
          makeFunctionPath(["outer", "inner"], "innerQuery"),
        ),
      ),
    ).toBe(true);
  });

  test("spec with deeply nested groups", () => {
    const level3 = GroupSpec.define("level3", {
      functions: {
        deepQuery: FunctionSpec.publicQuery({
          args: Schema.Struct({}),
          returns: Schema.Number,
        }),
      },
    });

    const level2 = GroupSpec.define("level2", { groups: { level3 } });

    const level1 = GroupSpec.define("level1", { groups: { level2 } });

    const spec = Spec.define({ level1 });

    const result = FunctionPaths.make(spec);

    expect(
      Equal.equals(
        result,
        HashSet.make(
          makeFunctionPath(["level1", "level2", "level3"], "deepQuery"),
        ),
      ),
    ).toBe(true);
  });

  test("spec with multiple nested groups at same level", () => {
    const notes = GroupSpec.define("notes", {
      functions: {
        insert: FunctionSpec.publicMutation({
          args: Schema.Struct({ text: Schema.String }),
          returns: Schema.String,
        }),
        list: FunctionSpec.publicQuery({
          args: Schema.Struct({}),
          returns: Schema.Array(Schema.String),
        }),
      },
    });

    const random = GroupSpec.define("random", {
      functions: {
        getNumber: FunctionSpec.publicAction({
          args: Schema.Struct({}),
          returns: Schema.Number,
        }),
      },
    });

    const notesAndRandom = GroupSpec.define("notesAndRandom", {
      groups: { notes, random },
    });

    const spec = Spec.define({ notesAndRandom });

    const result = FunctionPaths.make(spec);

    expect(
      Equal.equals(
        result,
        HashSet.make(
          makeFunctionPath(["notesAndRandom", "notes"], "insert"),
          makeFunctionPath(["notesAndRandom", "notes"], "list"),
          makeFunctionPath(["notesAndRandom", "random"], "getNumber"),
        ),
      ),
    ).toBe(true);
  });

  test("includes all function types (query, mutation, action)", () => {
    const spec = Spec.define({
      api: GroupSpec.define("api", {
        functions: {
          publicQuery: FunctionSpec.publicQuery({
            args: Schema.Struct({}),
            returns: Schema.Null,
          }),
          internalQuery: FunctionSpec.internalQuery({
            args: Schema.Struct({}),
            returns: Schema.Null,
          }),
          publicMutation: FunctionSpec.publicMutation({
            args: Schema.Struct({}),
            returns: Schema.Null,
          }),
          internalMutation: FunctionSpec.internalMutation({
            args: Schema.Struct({}),
            returns: Schema.Null,
          }),
          publicAction: FunctionSpec.publicAction({
            args: Schema.Struct({}),
            returns: Schema.Null,
          }),
          internalAction: FunctionSpec.internalAction({
            args: Schema.Struct({}),
            returns: Schema.Null,
          }),
        },
      }),
    });

    const result = FunctionPaths.make(spec);

    expect(
      Equal.equals(
        result,
        HashSet.make(
          makeFunctionPath(["api"], "publicQuery"),
          makeFunctionPath(["api"], "internalQuery"),
          makeFunctionPath(["api"], "publicMutation"),
          makeFunctionPath(["api"], "internalMutation"),
          makeFunctionPath(["api"], "publicAction"),
          makeFunctionPath(["api"], "internalAction"),
        ),
      ),
    ).toBe(true);
  });
});
