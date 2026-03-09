import { pipe, Record } from "effect";
import type * as FunctionSpec from "./FunctionSpec";
import * as GroupSpec from "./GroupSpec";
import * as Ref from "./Ref";
import type * as Spec from "./Spec";

type FilteredFunctions<
  Functions extends Readonly<
    Record<string, FunctionSpec.AnyWithProps>
  >,
  Predicate extends Ref.Any,
> = {
  [K in keyof Functions as Ref.FromFunctionSpec<Functions[K]> extends Predicate
    ? K
    : never]: Ref.FromFunctionSpec<Functions[K]>;
};

type GroupRefs<
  Group extends GroupSpec.AnyWithProps,
  Predicate extends Ref.Any,
> = RefsFromGroups<Group["groups"], Predicate> &
  FilteredFunctions<Group["functions"], Predicate>;

type RefsFromGroups<
  Groups extends Readonly<Record<string, GroupSpec.AnyWithProps>>,
  Predicate extends Ref.Any,
> = {
  [K in keyof Groups]: GroupRefs<Groups[K], Predicate>;
};

type NodeRoot<
  NodeSpec extends Spec.AnyWithPropsWithRuntime<"Node">,
> = GroupSpec.GroupSpec<"Node", "node", {}, NodeSpec["groups"]>;

export type Refs<
  ConvexSpec extends Spec.AnyWithPropsWithRuntime<"Convex">,
  NodeSpec extends Spec.AnyWithPropsWithRuntime<"Node"> = never,
  Predicate extends Ref.Any = Ref.Any,
> = RefsFromGroups<
  ConvexSpec["groups"] &
    ([NodeSpec] extends [never]
      ? {}
      : { readonly node: NodeRoot<NodeSpec> }),
  Predicate
>;

type Any =
  | {
      readonly [key: string]: Any;
    }
  | Ref.Any;

export const make = <
  ConvexSpec extends Spec.AnyWithPropsWithRuntime<"Convex">,
  NodeSpec extends Spec.AnyWithPropsWithRuntime<"Node"> = never,
>(
  convexSpec: ConvexSpec,
  nodeSpec?: NodeSpec,
): {
  public: Refs<ConvexSpec, NodeSpec, Ref.AnyPublic>;
  internal: Refs<ConvexSpec, NodeSpec, Ref.AnyInternal>;
} => {
  const nodeGroup = nodeSpec
    ? GroupSpec.makeNode("node", nodeSpec.groups)
    : null;

  const groups = nodeGroup
    ? { ...convexSpec.groups, node: nodeGroup }
    : convexSpec.groups;
  const refs = makeHelper(groups);
  return {
    public: refs as Refs<ConvexSpec, NodeSpec, Ref.AnyPublic>,
    internal: refs as Refs<ConvexSpec, NodeSpec, Ref.AnyInternal>,
  };
};

const makeHelper = (
  groups: Record.ReadonlyRecord<string, GroupSpec.Any>,
  groupPath: string | null = null,
): Any =>
  pipe(
    groups as Record.ReadonlyRecord<string, GroupSpec.AnyWithProps>,
    Record.map((group) => {
      const currentGroupPath = groupPath
        ? `${groupPath}/${group.name}`
        : group.name;

      return Record.union(
        makeHelper(group.groups, currentGroupPath),
        Record.map(group.functions, (function_, functionName) =>
          Ref.make(`${currentGroupPath}:${functionName}`, function_),
        ),
        (_subGroup, _function) => {
          throw new Error(
            `Group and function at same level have same name ('${Ref.getConvexFunctionName(_function)}')`,
          );
        },
      );
    }),
  );
