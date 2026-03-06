import { Ref } from "@confect/core";
import {
  useAction as useConvexAction,
  useMutation as useConvexMutation,
  useQuery as useConvexQuery,
} from "convex/react";
import { Either, Schema } from "effect";

type QueryReturn<Query extends Ref.AnyPublicQuery> =
  Ref.Error<Query> extends never
    ? Ref.Returns<Query>["Type"]
    : Either.Either<Ref.Returns<Query>["Type"], Ref.Error<Query>["Type"]>;

type MutationReturn<Mutation extends Ref.AnyPublicMutation> =
  Ref.Error<Mutation> extends never
    ? Ref.Returns<Mutation>["Type"]
    : Either.Either<Ref.Returns<Mutation>["Type"], Ref.Error<Mutation>["Type"]>;

type ActionReturn<Action extends Ref.AnyPublicAction> =
  Ref.Error<Action> extends never
    ? Ref.Returns<Action>["Type"]
    : Either.Either<Ref.Returns<Action>["Type"], Ref.Error<Action>["Type"]>;

export const useQuery = <Query extends Ref.AnyPublicQuery>(
  ref: Query,
  args: Ref.Args<Query>["Type"],
): QueryReturn<Query> | undefined => {
  const function_ = Ref.getFunction(ref);
  const functionName = Ref.getConvexFunctionName(ref);

  const encodedArgs = Schema.encodeSync(function_.args)(args);

  const encodedReturnsOrUndefined = useConvexQuery(
    functionName as any,
    encodedArgs,
  );

  if (encodedReturnsOrUndefined === undefined) {
    return undefined;
  }

  if (function_.error) {
    const eitherSchema = Schema.Either({
      left: function_.error as Schema.Schema.AnyNoContext,
      right: function_.returns as Schema.Schema.AnyNoContext,
    });

    return Schema.decodeUnknownSync(eitherSchema)(
      encodedReturnsOrUndefined,
    ) as QueryReturn<Query>;
  } else {
    return Schema.decodeUnknownSync(function_.returns)(
      encodedReturnsOrUndefined,
    ) as QueryReturn<Query>;
  }
};

export const useMutation = <Mutation extends Ref.AnyPublicMutation>(
  ref: Mutation,
) => {
  const function_ = Ref.getFunction(ref);
  const functionName = Ref.getConvexFunctionName(ref);
  const actualMutation = useConvexMutation(functionName as any);

  return async (
    args: Ref.Args<Mutation>["Type"],
  ): Promise<MutationReturn<Mutation>> => {
    const encodedArgs = Schema.encodeSync(function_.args)(args);
    const actualReturns = await actualMutation(encodedArgs);

    if (function_.error) {
      const eitherSchema = Schema.Either({
        left: function_.error as Schema.Schema.AnyNoContext,
        right: function_.returns as Schema.Schema.AnyNoContext,
      });

      return Schema.decodeUnknownSync(eitherSchema)(
        actualReturns,
      ) as MutationReturn<Mutation>;
    }

    return Schema.decodeUnknownSync(function_.returns)(
      actualReturns,
    ) as MutationReturn<Mutation>;
  };
};

export const useAction = <Action extends Ref.AnyPublicAction>(ref: Action) => {
  const function_ = Ref.getFunction(ref);
  const functionName = Ref.getConvexFunctionName(ref);
  const actualAction = useConvexAction(functionName as any);

  return async (
    args: Ref.Args<Action>["Type"],
  ): Promise<ActionReturn<Action>> => {
    const encodedArgs = Schema.encodeSync(function_.args)(args);
    const actualReturns = await actualAction(encodedArgs);

    if (function_.error) {
      const eitherSchema = Schema.Either({
        left: function_.error as Schema.Schema.AnyNoContext,
        right: function_.returns as Schema.Schema.AnyNoContext,
      });

      return Schema.decodeUnknownSync(eitherSchema)(
        actualReturns,
      ) as ActionReturn<Action>;
    }

    return Schema.decodeUnknownSync(function_.returns)(
      actualReturns,
    ) as ActionReturn<Action>;
  };
};
