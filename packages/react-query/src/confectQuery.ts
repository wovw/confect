import { Ref } from "@confect/core";
import { queryOptions } from "@tanstack/react-query";
import { type ConfectQueryKey, confectQueryPrefix } from "./internal";

export const confectQuery = <Query extends Ref.AnyPublicQuery>(
  ref: Query,
  args: Ref.Args<Query>["Type"] | "skip",
) => {
  const function_ = Ref.getFunction(ref);
  const queryKey: ConfectQueryKey = [
    confectQueryPrefix,
    Ref.getConvexFunctionName(ref),
    args,
  ];

  const meta = {
    __confect: true as const,
    function_,
    ref,
  };

  return queryOptions({
    queryKey,
    staleTime: Number.POSITIVE_INFINITY,
    meta,
    ...(args === "skip" ? { enabled: false } : {}),
  });
};
