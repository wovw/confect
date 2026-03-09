import type * as FunctionSpec from "@confect/core/FunctionSpec";
import type * as GroupSpec from "@confect/core/GroupSpec";
import type * as Spec from "@confect/core/Spec";
import type { Layer } from "effect";
import { Effect, Match, Ref, type Types } from "effect";
import type * as Api from "./Api";
import * as Impl from "./Impl";
import { mapLeaves } from "./internal/utils";
import type * as RegisteredFunction from "./RegisteredFunction";
import * as Registry from "./Registry";
import * as RegistryItem from "./RegistryItem";

export type RegisteredFunctions<Spec_ extends Spec.AnyWithProps> =
  Types.Simplify<RegisteredFunctionsFromGroups<Spec_["groups"]>>;

type RegisteredFunctionsFromGroup<Group extends GroupSpec.AnyWithProps> =
  RegisteredFunctionsFromGroups<Group["groups"]> & {
    [K in keyof Group["functions"]]: FunctionSpec.RegisteredFunction<Group["functions"][K]>;
  };

type RegisteredFunctionsFromGroups<
  Groups extends Readonly<Record<string, GroupSpec.AnyWithProps>>,
> = {
  [K in keyof Groups]: RegisteredFunctionsFromGroup<Groups[K]>;
};

export interface AnyWithProps {
  readonly [key: string]: RegisteredFunction.RegisteredFunction | AnyWithProps;
}

export const make = <Api_ extends Api.AnyWithProps>(
  impl: Layer.Layer<Impl.Impl<Api_, "Finalized">>,
  makeRegisteredFunction: (
    api: Api_,
    registryItem: RegistryItem.AnyWithProps,
  ) => RegisteredFunction.RegisteredFunction,
) =>
  Effect.gen(function* () {
    const registry = yield* Registry.Registry;
    const functionImplItems = yield* Ref.get(registry);
    const { api, finalizationStatus } = yield* Impl.Impl<Api_, "Finalized">();

    return yield* Match.value(
      finalizationStatus as Impl.FinalizationStatus,
    ).pipe(
      Match.withReturnType<Effect.Effect<RegisteredFunctions<Api_["spec"]>>>(),
      Match.when("Unfinalized", () =>
        Effect.dieMessage("Impl is not finalized"),
      ),
      Match.when("Finalized", () =>
        Effect.succeed(
          mapLeaves<
            RegistryItem.AnyWithProps,
            RegisteredFunction.RegisteredFunction
          >(functionImplItems, RegistryItem.isRegistryItem, (registryItem) =>
            makeRegisteredFunction(api, registryItem),
          ) as RegisteredFunctions<Api_["spec"]>,
        ),
      ),
      Match.exhaustive,
    );
  }).pipe(Effect.provide(impl), Effect.runSync);
