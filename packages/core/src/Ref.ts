import type { FunctionVisibility } from "convex/server";
import type { Schema } from "effect";
import type * as FunctionSpec from "./FunctionSpec";
import type * as RuntimeAndFunctionType from "./RuntimeAndFunctionType";

export interface Ref<
  _RuntimeAndFunctionType extends RuntimeAndFunctionType.RuntimeAndFunctionType,
  _FunctionVisibility extends FunctionVisibility,
  _Args extends Schema.Schema.AnyNoContext,
  _Returns extends Schema.Schema.AnyNoContext,
  _Error extends Schema.Schema.AnyNoContext | never = never,
> {
  readonly _types: {
    readonly runtimeAndFunctionType: _RuntimeAndFunctionType;
    readonly functionVisibility: _FunctionVisibility;
    readonly args: _Args;
    readonly returns: _Returns;
    readonly error: _Error;
  };
}

export interface Any extends Ref<any, any, any, any, any> {}

export interface AnyInternal extends Ref<any, "internal", any, any, any> {}

export interface AnyPublic extends Ref<any, "public", any, any, any> {}

export interface AnyQuery extends Ref<
  RuntimeAndFunctionType.AnyQuery,
  FunctionVisibility,
  Schema.Schema.AnyNoContext,
  Schema.Schema.AnyNoContext,
  Schema.Schema.AnyNoContext | never
> {}

export interface AnyMutation extends Ref<
  RuntimeAndFunctionType.AnyMutation,
  FunctionVisibility,
  Schema.Schema.AnyNoContext,
  Schema.Schema.AnyNoContext,
  Schema.Schema.AnyNoContext | never
> {}

export interface AnyAction extends Ref<
  RuntimeAndFunctionType.AnyAction,
  FunctionVisibility,
  Schema.Schema.AnyNoContext,
  Schema.Schema.AnyNoContext,
  Schema.Schema.AnyNoContext | never
> {}

export interface AnyPublicQuery extends Ref<
  RuntimeAndFunctionType.AnyQuery,
  "public",
  Schema.Schema.AnyNoContext,
  Schema.Schema.AnyNoContext,
  Schema.Schema.AnyNoContext | never
> {}

export interface AnyPublicMutation extends Ref<
  RuntimeAndFunctionType.AnyMutation,
  "public",
  Schema.Schema.AnyNoContext,
  Schema.Schema.AnyNoContext,
  Schema.Schema.AnyNoContext | never
> {}

export interface AnyPublicAction extends Ref<
  RuntimeAndFunctionType.AnyAction,
  "public",
  Schema.Schema.AnyNoContext,
  Schema.Schema.AnyNoContext,
  Schema.Schema.AnyNoContext | never
> {}

export type GetRuntimeAndFunctionType<Ref_ extends Any> =
  Ref_["_types"]["runtimeAndFunctionType"];

export type GetRuntime<Ref_ extends Any> = RuntimeAndFunctionType.GetRuntime<
  Ref_["_types"]["runtimeAndFunctionType"]
>;

export type GetFunctionType<Ref_ extends Any> =
  RuntimeAndFunctionType.GetFunctionType<
    Ref_["_types"]["runtimeAndFunctionType"]
  >;

export type GetFunctionVisibility<Ref_ extends Any> =
  Ref_["_types"]["functionVisibility"];

export type Args<Ref_ extends Any> = Ref_["_types"]["args"];

export type Returns<Ref_ extends Any> = Ref_["_types"]["returns"];

export type Error<Ref_ extends Any> = Ref_["_types"]["error"];

export type HasError<Ref_ extends Any> = [Ref_["_types"]["error"]] extends [
  never,
]
  ? false
  : true;

export type FromFunctionSpec<F extends FunctionSpec.AnyWithProps> = Ref<
  FunctionSpec.GetRuntimeAndFunctionType<F>,
  FunctionSpec.GetFunctionVisibility<F>,
  FunctionSpec.Args<F>,
  FunctionSpec.Returns<F>,
  FunctionSpec.Error<F>
>;

export const make = <
  RuntimeAndFunctionType_ extends RuntimeAndFunctionType.RuntimeAndFunctionType,
  FunctionVisibility_ extends FunctionVisibility,
  Args_ extends Schema.Schema.AnyNoContext,
  Returns_ extends Schema.Schema.AnyNoContext,
  Error_ extends Schema.Schema.AnyNoContext | never = never,
>(
  /**
   * This is a Convex "function name" of the format "myGroupDir/myGroupMod:myFunc".
   */
  convexFunctionName: string,
  function_: FunctionSpec.FunctionSpec<
    RuntimeAndFunctionType_,
    FunctionVisibility_,
    string,
    Args_,
    Returns_,
    Error_
  >,
): Ref<RuntimeAndFunctionType_, FunctionVisibility_, Args_, Returns_, Error_> =>
  ({
    [HiddenFunctionKey]: function_,
    [HiddenConvexFunctionNameKey]: convexFunctionName,
  }) as unknown as Ref<
    RuntimeAndFunctionType_,
    FunctionVisibility_,
    Args_,
    Returns_,
    Error_
  >;

const HiddenFunctionKey = "@confect/core/api/HiddenFunctionKey";
type HiddenFunctionKey = typeof HiddenFunctionKey;
type HiddenFunction<Ref_ extends Any> = FunctionSpec.FunctionSpec<
  GetRuntimeAndFunctionType<Ref_>,
  GetFunctionVisibility<Ref_>,
  string,
  Args<Ref_>,
  Returns<Ref_>,
  Error<Ref_>
>;

export const getFunction = <Ref_ extends Any>(
  ref: Ref_,
): HiddenFunction<Ref_> => (ref as any)[HiddenFunctionKey];

export const getError = <Ref_ extends Any>(
  ref: Ref_,
): Error<Ref_> | undefined => getFunction(ref).error as Error<Ref_> | undefined;

const HiddenConvexFunctionNameKey =
  "@confect/core/api/HiddenConvexFunctionNameKey";
type HiddenConvexFunctionNameKey = typeof HiddenConvexFunctionNameKey;
type HiddenConvexFunctionName = string;

export const getConvexFunctionName = <Ref_ extends Any>(
  ref: Ref_,
): HiddenConvexFunctionName => (ref as any)[HiddenConvexFunctionNameKey];
