import { Ref } from "@confect/core";
import type { DataTag, DefaultError } from "@tanstack/react-query";
import {
  type UndefinedInitialDataOptions,
  queryOptions,
} from "@tanstack/react-query";
import {
  type ConfectQueryKey,
  type QueryData,
  confectQueryPrefix,
} from "./internal";

/**
 * The return type of `confectQuery` — an `UndefinedInitialDataOptions` with
 * a `DataTag`-branded `queryKey`. This ensures `useQuery(confectQuery(...))`
 * infers the correct `TData` type.
 */
export type ConfectQueryOptions<TData> = UndefinedInitialDataOptions<
  TData,
  DefaultError,
  TData,
  ConfectQueryKey
> & {
  queryKey: DataTag<ConfectQueryKey, TData, DefaultError>;
};

export const confectQuery = <Query extends Ref.AnyPublicQuery>(
  ref: Query,
  args: Ref.Args<Query>["Type"] | "skip",
): ConfectQueryOptions<QueryData<Query>> => {
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

  return queryOptions<
    QueryData<Query>,
    DefaultError,
    QueryData<Query>,
    ConfectQueryKey
  >({
    queryKey,
    staleTime: Number.POSITIVE_INFINITY,
    meta,
    enabled: args !== "skip",
  }) as ConfectQueryOptions<QueryData<Query>>;
};
