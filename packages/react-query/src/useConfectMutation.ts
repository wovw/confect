import { Ref } from "@confect/core";
import { useMutation } from "convex/react";
import { Schema } from "effect";
import { decodeFunctionResult, type MutationData } from "./internal";

export const useConfectMutation = <Mutation extends Ref.AnyPublicMutation>(
  ref: Mutation,
) => {
  const function_ = Ref.getFunction(ref);
  const actualMutation = useMutation(Ref.getConvexFunctionName(ref) as any);

  return async (
    args: Ref.Args<Mutation>["Type"],
  ): Promise<MutationData<Mutation>> => {
    const encodedArgs = Schema.encodeSync(function_.args)(args);
    const rawResult = await actualMutation(encodedArgs);
    return decodeFunctionResult(function_, rawResult) as MutationData<Mutation>;
  };
};
