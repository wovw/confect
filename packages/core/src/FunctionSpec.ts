import type {
  FunctionType,
  FunctionVisibility,
  RegisteredAction,
  RegisteredMutation,
  RegisteredQuery,
} from "convex/server";
import type { Schema } from "effect";
import { Predicate } from "effect";
import * as RuntimeAndFunctionType from "./RuntimeAndFunctionType";

export const TypeId = "@confect/core/FunctionSpec";
export type TypeId = typeof TypeId;

export const isFunctionSpec = (u: unknown): u is AnyWithProps =>
  Predicate.hasProperty(u, TypeId);

export interface FunctionSpec<
  RuntimeAndFunctionType_ extends RuntimeAndFunctionType.RuntimeAndFunctionType,
  FunctionVisibility_ extends FunctionVisibility,
  Args_ extends Schema.Schema.AnyNoContext,
  Returns_ extends Schema.Schema.AnyNoContext,
> {
  readonly [TypeId]: TypeId;
  readonly runtimeAndFunctionType: RuntimeAndFunctionType_;
  readonly functionVisibility: FunctionVisibility_;
  readonly args: Args_;
  readonly returns: Returns_;
}

export interface Any {
  readonly [TypeId]: TypeId;
}

export interface AnyWithProps extends FunctionSpec<
  RuntimeAndFunctionType.RuntimeAndFunctionType,
  FunctionVisibility,
  Schema.Schema.AnyNoContext,
  Schema.Schema.AnyNoContext
> {}

export interface AnyWithPropsWithRuntime<
  Runtime extends RuntimeAndFunctionType.Runtime,
> extends FunctionSpec<
  RuntimeAndFunctionType.WithRuntime<Runtime>,
  FunctionVisibility,
  Schema.Schema.AnyNoContext,
  Schema.Schema.AnyNoContext
> {}

export interface AnyWithPropsWithFunctionType<
  RuntimeAndFunctionType_ extends RuntimeAndFunctionType.RuntimeAndFunctionType,
> extends FunctionSpec<
  RuntimeAndFunctionType_,
  FunctionVisibility,
  Schema.Schema.AnyNoContext,
  Schema.Schema.AnyNoContext
> {}

export type GetRuntimeAndFunctionType<Function extends AnyWithProps> =
  Function["runtimeAndFunctionType"];

export type GetFunctionVisibility<Function extends AnyWithProps> =
  Function["functionVisibility"];

export type Args<Function extends AnyWithProps> = Function["args"];

export type Returns<Function extends AnyWithProps> = Function["returns"];

export type WithRuntimeAndFunctionType<
  Function extends AnyWithProps,
  RuntimeAndFunctionType_ extends RuntimeAndFunctionType.RuntimeAndFunctionType,
> = Extract<
  Function,
  { readonly runtimeAndFunctionType: RuntimeAndFunctionType_ }
>;

export type WithFunctionType<
  Function extends AnyWithProps,
  FunctionType_ extends FunctionType,
> = Extract<
  Function,
  { readonly runtimeAndFunctionType: { readonly functionType: FunctionType_ } }
>;

export type RegisteredFunction<Function extends AnyWithProps> =
  RuntimeAndFunctionType.GetFunctionType<
    Function["runtimeAndFunctionType"]
  > extends "query"
    ? RegisteredQuery<
        GetFunctionVisibility<Function>,
        Args<Function>["Encoded"],
        Promise<Returns<Function>["Encoded"]>
      >
    : RuntimeAndFunctionType.GetFunctionType<
          Function["runtimeAndFunctionType"]
        > extends "mutation"
      ? RegisteredMutation<
          GetFunctionVisibility<Function>,
          Args<Function>["Encoded"],
          Promise<Returns<Function>["Encoded"]>
        >
      : RuntimeAndFunctionType.GetFunctionType<
            Function["runtimeAndFunctionType"]
          > extends "action"
        ? RegisteredAction<
            GetFunctionVisibility<Function>,
            Args<Function>["Encoded"],
            Promise<Returns<Function>["Encoded"]>
          >
        : never;

const Proto = {
  [TypeId]: TypeId,
};

const make =
  <
    RuntimeAndFunctionType_ extends
      RuntimeAndFunctionType.RuntimeAndFunctionType,
    FunctionVisibility_ extends FunctionVisibility,
  >(
    runtimeAndFunctionType: RuntimeAndFunctionType_,
    functionVisibility: FunctionVisibility_,
  ) =>
  <
    Args_ extends Schema.Schema.AnyNoContext,
    Returns_ extends Schema.Schema.AnyNoContext,
  >({
    args,
    returns,
  }: {
    args: Args_;
    returns: Returns_;
  }): FunctionSpec<
    RuntimeAndFunctionType_,
    FunctionVisibility_,
    Args_,
    Returns_
  > => {
    return Object.assign(Object.create(Proto), {
      runtimeAndFunctionType,
      functionVisibility,
      args,
      returns,
    });
  };

export const publicQuery = make(RuntimeAndFunctionType.ConvexQuery, "public");
export const internalQuery = make(
  RuntimeAndFunctionType.ConvexQuery,
  "internal",
);
export const publicMutation = make(
  RuntimeAndFunctionType.ConvexMutation,
  "public",
);
export const internalMutation = make(
  RuntimeAndFunctionType.ConvexMutation,
  "internal",
);
export const publicAction = make(RuntimeAndFunctionType.ConvexAction, "public");
export const internalAction = make(
  RuntimeAndFunctionType.ConvexAction,
  "internal",
);

export const publicNodeAction = make(
  RuntimeAndFunctionType.NodeAction,
  "public",
);
export const internalNodeAction = make(
  RuntimeAndFunctionType.NodeAction,
  "internal",
);
