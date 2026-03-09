import { Predicate } from "effect";
import * as GroupSpec from "./GroupSpec";
import type * as RuntimeAndFunctionType from "./RuntimeAndFunctionType";

export const TypeId = "@confect/core/Spec";
export type TypeId = typeof TypeId;

export const isSpec = (u: unknown): u is AnyWithProps =>
  Predicate.hasProperty(u, TypeId);

export const isConvexSpec = (
  u: unknown,
): u is AnyWithPropsWithRuntime<"Convex"> =>
  Predicate.hasProperty(u, TypeId) &&
  Predicate.hasProperty(u, "runtime") &&
  u.runtime === "Convex";

export const isNodeSpec = (u: unknown): u is AnyWithPropsWithRuntime<"Node"> =>
  Predicate.hasProperty(u, TypeId) &&
  Predicate.hasProperty(u, "runtime") &&
  u.runtime === "Node";

export interface Spec<
  Runtime extends RuntimeAndFunctionType.Runtime,
  Groups_ extends Readonly<
    Record<string, GroupSpec.AnyWithPropsWithRuntime<Runtime>>
  > = {},
> {
  readonly [TypeId]: TypeId;
  readonly runtime: Runtime;
  readonly groups: Groups_;
}

export interface Any {
  readonly [TypeId]: TypeId;
}

export interface AnyWithProps extends Spec<
  RuntimeAndFunctionType.Runtime,
  Readonly<Record<string, GroupSpec.AnyWithProps>>
> {}

export interface AnyWithPropsWithRuntime<
  Runtime extends RuntimeAndFunctionType.Runtime,
> extends Spec<
  Runtime,
  Readonly<Record<string, GroupSpec.AnyWithPropsWithRuntime<Runtime>>>
> {}

export type Groups<Spec_ extends AnyWithProps> =
  Spec_["groups"][keyof Spec_["groups"]];

const makeSpec = <
  Runtime extends RuntimeAndFunctionType.Runtime,
  Groups_ extends Readonly<
    Record<string, GroupSpec.AnyWithPropsWithRuntime<Runtime>>
  >,
>({
  runtime,
  groups,
}: {
  runtime: Runtime;
  groups: Groups_;
}): Spec<Runtime, Groups_> => ({
  [TypeId]: TypeId,
  runtime,
  groups,
});

/**
 * Define a spec using an object literal of groups.
 *
 * @example
 * ```ts
 * export default Spec.define({ env, notesAndRandom })
 * ```
 */
export const define = <
  const Groups_ extends Readonly<
    Record<string, GroupSpec.AnyWithPropsWithRuntime<"Convex">>
  >,
>(
  groups: Groups_,
): Spec<"Convex", Groups_> =>
  makeSpec({ runtime: "Convex", groups });

/**
 * Define a Node spec using an object literal of groups.
 * @see {@link define} for usage.
 */
export const defineNode = <
  const Groups_ extends Readonly<
    Record<string, GroupSpec.AnyWithPropsWithRuntime<"Node">>
  >,
>(
  groups: Groups_,
): Spec<"Node", Groups_> =>
  makeSpec({ runtime: "Node", groups });

/**
 * Merges a Convex spec with an optional Node spec for use with `Api.make`.
 * When `nodeSpec` is provided, its groups are merged under a "node" namespace,
 * mirroring the structure used by `Refs.make`.
 */
export const merge = <
  ConvexSpec extends AnyWithPropsWithRuntime<"Convex">,
  NodeSpec extends AnyWithPropsWithRuntime<"Node">,
>(
  convexSpec: ConvexSpec,
  nodeSpec?: NodeSpec,
): AnyWithProps => {
  const nodeGroup = nodeSpec
    ? GroupSpec.makeNode("node", nodeSpec.groups)
    : null;

  const groups = nodeGroup
    ? { ...convexSpec.groups, node: nodeGroup }
    : convexSpec.groups;

  return {
    [TypeId]: TypeId,
    runtime: "Convex" as RuntimeAndFunctionType.Runtime,
    groups,
  } as AnyWithProps;
};
