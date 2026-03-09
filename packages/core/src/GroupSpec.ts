import { Predicate } from "effect";
import type * as FunctionSpec from "./FunctionSpec";
import type * as RuntimeAndFunctionType from "./RuntimeAndFunctionType";
import { validateConfectFunctionIdentifier } from "./internal/utils";

export const TypeId = "@confect/core/GroupSpec";
export type TypeId = typeof TypeId;

export const isGroupSpec = (u: unknown): u is Any =>
  Predicate.hasProperty(u, TypeId);

export interface GroupSpec<
  Runtime extends RuntimeAndFunctionType.Runtime,
  Name_ extends string,
  Functions_ extends Readonly<
    Record<string, FunctionSpec.AnyWithPropsWithRuntime<Runtime>>
  > = {},
  Groups_ extends Readonly<
    Record<string, AnyWithPropsWithRuntime<Runtime>>
  > = {},
> {
  readonly [TypeId]: TypeId;
  readonly runtime: Runtime;
  readonly name: Name_;
  readonly functions: Functions_;
  readonly groups: Groups_;
}

export interface Any {
  readonly [TypeId]: TypeId;
}

export interface AnyWithProps extends GroupSpec<
  RuntimeAndFunctionType.Runtime,
  string,
  Readonly<Record<string, FunctionSpec.AnyWithProps>>,
  Readonly<Record<string, AnyWithProps>>
> {}

export interface AnyWithPropsWithRuntime<
  Runtime extends RuntimeAndFunctionType.Runtime,
> extends GroupSpec<
  Runtime,
  string,
  Readonly<Record<string, FunctionSpec.AnyWithPropsWithRuntime<Runtime>>>,
  Readonly<Record<string, AnyWithPropsWithRuntime<Runtime>>>
> {}

export type Name<Group extends AnyWithProps> = Group["name"];

export type Groups<Group extends AnyWithProps> =
  Group["groups"][keyof Group["groups"]];

export type WithName<
  Group extends AnyWithProps,
  Name_ extends Name<Group>,
> = Extract<Group, { readonly name: Name_ }>;

const makeProto = <
  Runtime extends RuntimeAndFunctionType.Runtime,
  Name_ extends string,
  Functions_ extends Readonly<
    Record<string, FunctionSpec.AnyWithPropsWithRuntime<Runtime>>
  >,
  Groups_ extends Readonly<
    Record<string, AnyWithPropsWithRuntime<Runtime>>
  >,
>({
  runtime,
  name,
  functions,
  groups,
}: {
  runtime: Runtime;
  name: Name_;
  functions: Functions_;
  groups: Groups_;
}): GroupSpec<Runtime, Name_, Functions_, Groups_> => ({
  [TypeId]: TypeId,
  runtime,
  name,
  functions,
  groups,
});

export const makeNode = <
  const Name_ extends string,
  Groups_ extends Readonly<
    Record<string, AnyWithPropsWithRuntime<"Node">>
  > = {},
>(
  name: Name_,
  groups?: Groups_,
): GroupSpec<"Node", Name_, {}, Groups_> =>
  makeProto({
    runtime: "Node",
    name,
    functions: {} as Readonly<
      Record<string, FunctionSpec.AnyWithPropsWithRuntime<"Node">>
    >,
    groups: groups ?? ({} as Groups_),
  });

/**
 * Define a group using object literals for functions and/or subgroups.
 *
 * @example
 * ```ts
 * export const notes = GroupSpec.define("notes", {
 *   functions: {
 *     insert: FunctionSpec.publicMutation({ ... }),
 *     list: FunctionSpec.publicQuery({ ... }),
 *   },
 * })
 *
 * export const notesAndRandom = GroupSpec.define("notesAndRandom", {
 *   groups: { notes, random },
 * })
 * ```
 */
export const define: {
  <
    const Name_ extends string,
    const Functions_ extends Readonly<
      Record<string, FunctionSpec.AnyWithPropsWithRuntime<"Convex">>
    >,
    const Groups_ extends Readonly<
      Record<string, AnyWithPropsWithRuntime<"Convex">>
    >,
  >(
    name: Name_,
    config: { functions?: Functions_; groups?: Groups_ },
  ): GroupSpec<"Convex", Name_, Functions_, Groups_>;

  <
    const Name_ extends string,
    const Functions_ extends Readonly<
      Record<string, FunctionSpec.AnyWithPropsWithRuntime<"Convex">>
    >,
  >(
    name: Name_,
    config: { functions: Functions_ },
  ): GroupSpec<"Convex", Name_, Functions_, {}>;

  <
    const Name_ extends string,
    const Groups_ extends Readonly<
      Record<string, AnyWithPropsWithRuntime<"Convex">>
    >,
  >(
    name: Name_,
    config: { groups: Groups_ },
  ): GroupSpec<"Convex", Name_, {}, Groups_>;
} = <
  const Name_ extends string,
  const Functions_ extends Readonly<
    Record<string, FunctionSpec.AnyWithPropsWithRuntime<"Convex">>
  >,
  const Groups_ extends Readonly<
    Record<string, AnyWithPropsWithRuntime<"Convex">>
  >,
>(
  name: Name_,
  config: { functions?: Functions_; groups?: Groups_ },
): GroupSpec<"Convex", Name_, Functions_, Groups_> => {
  validateConfectFunctionIdentifier(name);

  const functions = config.functions ?? ({} as Functions_);
  const groups = config.groups ?? ({} as Groups_);

  for (const key of Object.keys(functions)) {
    validateConfectFunctionIdentifier(key);
  }

  return makeProto({
    runtime: "Convex",
    name,
    functions,
    groups,
  });
};

/**
 * Define a Node group using object literals.
 * @see {@link define} for usage.
 */
export const defineNode: {
  <
    const Name_ extends string,
    const Functions_ extends Readonly<
      Record<string, FunctionSpec.AnyWithPropsWithRuntime<"Node">>
    >,
    const Groups_ extends Readonly<
      Record<string, AnyWithPropsWithRuntime<"Node">>
    >,
  >(
    name: Name_,
    config: { functions?: Functions_; groups?: Groups_ },
  ): GroupSpec<"Node", Name_, Functions_, Groups_>;

  <
    const Name_ extends string,
    const Functions_ extends Readonly<
      Record<string, FunctionSpec.AnyWithPropsWithRuntime<"Node">>
    >,
  >(
    name: Name_,
    config: { functions: Functions_ },
  ): GroupSpec<"Node", Name_, Functions_, {}>;

  <
    const Name_ extends string,
    const Groups_ extends Readonly<
      Record<string, AnyWithPropsWithRuntime<"Node">>
    >,
  >(
    name: Name_,
    config: { groups: Groups_ },
  ): GroupSpec<"Node", Name_, {}, Groups_>;
} = <
  const Name_ extends string,
  const Functions_ extends Readonly<
    Record<string, FunctionSpec.AnyWithPropsWithRuntime<"Node">>
  >,
  const Groups_ extends Readonly<
    Record<string, AnyWithPropsWithRuntime<"Node">>
  >,
>(
  name: Name_,
  config: { functions?: Functions_; groups?: Groups_ },
): GroupSpec<"Node", Name_, Functions_, Groups_> => {
  validateConfectFunctionIdentifier(name);

  const functions = config.functions ?? ({} as Functions_);
  const groups = config.groups ?? ({} as Groups_);

  for (const key of Object.keys(functions)) {
    validateConfectFunctionIdentifier(key);
  }

  return makeProto({
    runtime: "Node",
    name,
    functions,
    groups,
  });
};
