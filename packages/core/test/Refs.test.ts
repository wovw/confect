import { describe, expect, expectTypeOf, it } from "@effect/vitest";
import { Schema } from "effect";
import * as FunctionSpec from "../src/FunctionSpec";
import * as GroupSpec from "../src/GroupSpec";
import * as Ref from "../src/Ref";
import * as Refs from "../src/Refs";
import type * as RuntimeAndFunctionType from "../src/RuntimeAndFunctionType";
import * as Spec from "../src/Spec";

describe("make", () => {
  it("turns a spec into refs", () => {
    const FnArgs = Schema.Struct({});
    const FnReturns = Schema.Array(Schema.String);

    const list = FunctionSpec.publicQuery({
      args: FnArgs,
      returns: FnReturns,
    });

    const spec = Spec.define({
      notes: GroupSpec.define("notes", {
        functions: { list },
      }),
    });
    const refs = Refs.make(spec);

    const actualRef = refs.public.notes.list;
    const expectedRef = Ref.make("notes:list", list);

    expect(Ref.getConvexFunctionName(actualRef)).toStrictEqual(
      Ref.getConvexFunctionName(expectedRef),
    );
    expect(Ref.getFunction(actualRef)).toStrictEqual(
      Ref.getFunction(expectedRef),
    );
    expectTypeOf(actualRef).toEqualTypeOf(expectedRef);
  });

  it("throws an error if a group and function have the same name", () => {
    const spec = Spec.define({
      notes: GroupSpec.define("notes", {
        functions: {
          list: FunctionSpec.publicQuery({
            args: Schema.Struct({}),
            returns: Schema.Array(Schema.String),
          }),
        },
        groups: {
          list: GroupSpec.define("list", {}),
        },
      }),
    });
    expect(() => Refs.make(spec)).toThrowErrorMatchingInlineSnapshot(
      `[Error: Group and function at same level have same name ('notes:list')]`,
    );
  });

  it("filters internal refs to only internal functions", () => {
    const FnArgs = Schema.Struct({});
    const FnReturns = Schema.String;

    const spec = Spec.define({
      notes: GroupSpec.define("notes", {
        functions: {
          publicList: FunctionSpec.publicQuery({
            args: FnArgs,
            returns: FnReturns,
          }),
          internalList: FunctionSpec.internalQuery({
            args: FnArgs,
            returns: FnReturns,
          }),
        },
      }),
    });
    const refs = Refs.make(spec);

    expectTypeOf(refs.internal.notes.internalList).toEqualTypeOf<
      Ref.Ref<
        RuntimeAndFunctionType.ConvexQuery,
        "internal",
        typeof FnArgs,
        typeof FnReturns
      >
    >();

    void refs.internal.notes.publicList;
  });

  it("filters out groups with no matching functions", () => {
    const FnArgs = Schema.Struct({});
    const FnReturns = Schema.String;

    const spec = Spec.define({
      publicOnly: GroupSpec.define("publicOnly", {
        functions: {
          list: FunctionSpec.publicQuery({
            args: FnArgs,
            returns: FnReturns,
          }),
        },
      }),
      internalOnly: GroupSpec.define("internalOnly", {
        functions: {
          list: FunctionSpec.internalQuery({
            args: FnArgs,
            returns: FnReturns,
          }),
        },
      }),
    });

    const refs = Refs.make(spec);

    expectTypeOf(refs.internal.internalOnly.list).toEqualTypeOf<
      Ref.Ref<
        RuntimeAndFunctionType.ConvexQuery,
        "internal",
        typeof FnArgs,
        typeof FnReturns
      >
    >();

    void refs.internal.publicOnly;
  });

  it("filters public refs to only public functions", () => {
    const FnArgs = Schema.Struct({});
    const FnReturns = Schema.String;

    const spec = Spec.define({
      notes: GroupSpec.define("notes", {
        functions: {
          publicList: FunctionSpec.publicQuery({
            args: FnArgs,
            returns: FnReturns,
          }),
          internalList: FunctionSpec.internalQuery({
            args: FnArgs,
            returns: FnReturns,
          }),
        },
      }),
    });
    const refs = Refs.make(spec);

    expectTypeOf(refs.public.notes.publicList).toEqualTypeOf<
      Ref.Ref<
        RuntimeAndFunctionType.ConvexQuery,
        "public",
        typeof FnArgs,
        typeof FnReturns
      >
    >();

    void refs.public.notes.internalList;
  });
});
