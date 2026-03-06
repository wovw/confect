import { NodeContext } from "@effect/platform-node";
import {
  actionGeneric,
  type DefaultFunctionArgs,
  internalActionGeneric,
} from "convex/server";
import type { Effect } from "effect";
import { Layer, Match, Schema } from "effect";
import type * as Api from "./Api";
import type * as DatabaseSchema from "./DatabaseSchema";
import * as RegisteredFunction from "./RegisteredFunction";
import type * as RegistryItem from "./RegistryItem";

export const make = <Api_ extends Api.AnyWithPropsWithRuntime<"Node">>(
  api: Api_,
  { function_, handler }: RegistryItem.AnyWithProps,
): RegisteredFunction.RegisteredFunction => {
  const effectiveReturnsSchema = function_.error
    ? Schema.Either({ left: function_.error, right: function_.returns })
    : function_.returns;

  const genericFunction = Match.value(function_.functionVisibility).pipe(
    Match.when("public", () => actionGeneric),
    Match.when("internal", () => internalActionGeneric),
    Match.exhaustive,
  );

  return genericFunction(
    nodeActionFunction(api.databaseSchema, {
      args: function_.args,
      returns: effectiveReturnsSchema,
      handler,
      error: function_.error,
    }),
  );
};

const nodeActionFunction = <
  DatabaseSchema_ extends DatabaseSchema.AnyWithProps,
  Args,
  ConvexArgs extends DefaultFunctionArgs,
  Returns,
  ConvexReturns,
  E,
>(
  databaseSchema: DatabaseSchema_,
  {
    args,
    returns,
    handler,
    error,
  }: {
    args: Schema.Schema<Args, ConvexArgs>;
    returns: Schema.Schema<Returns, ConvexReturns>;
    handler: (
      a: Args,
    ) => Effect.Effect<
      Returns,
      E,
      | RegisteredFunction.ActionServices<DatabaseSchema_>
      | NodeContext.NodeContext
    >;
    error: Schema.Schema.AnyNoContext | undefined;
  },
) =>
  RegisteredFunction.actionFunctionBase({
    args,
    returns,
    handler,
    error,
    createLayer: (ctx) =>
      Layer.mergeAll(
        RegisteredFunction.actionLayer(databaseSchema, ctx),
        NodeContext.layer,
      ),
  });
