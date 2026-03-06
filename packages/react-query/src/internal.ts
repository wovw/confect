import type { Ref } from "@confect/core";
import type { QueryKey } from "@tanstack/react-query";
import { hashKey } from "@tanstack/react-query";
import type { Either } from "effect";
import { Schema } from "effect";

export const confectQueryPrefix = "confectQuery";

export type QueryData<Query extends Ref.AnyPublicQuery> =
  Ref.Error<Query> extends never
    ? Ref.Returns<Query>["Type"]
    : Either.Either<Ref.Returns<Query>["Type"], Ref.Error<Query>["Type"]>;

export type MutationData<Mutation extends Ref.AnyPublicMutation> =
  Ref.Error<Mutation> extends never
    ? Ref.Returns<Mutation>["Type"]
    : Either.Either<Ref.Returns<Mutation>["Type"], Ref.Error<Mutation>["Type"]>;

export type ConfectQueryKey =
  | readonly [typeof confectQueryPrefix, string, "skip"]
  | readonly [typeof confectQueryPrefix, string, unknown];

export const isConfectQueryKey = (queryKey: QueryKey): boolean =>
  Array.isArray(queryKey) && queryKey[0] === confectQueryPrefix;

export const isConfectQueryMeta = (
  meta: Record<string, unknown> | undefined,
): meta is Record<string, unknown> & { __confect: true } =>
  typeof meta === "object" && meta !== null && meta.__confect === true;

export const normalizeConfectHash = (queryKey: QueryKey): string => {
  if (!isConfectQueryKey(queryKey)) return hashKey(queryKey);
  return hashKey([
    confectQueryPrefix,
    `${(queryKey as readonly unknown[])[1] ?? ""}`,
    (queryKey as readonly unknown[])[2] ?? "skip",
  ]);
};

export const decodeFunctionResult = (
  function_: {
    error?: Schema.Schema.AnyNoContext;
    returns: Schema.Schema.AnyNoContext;
  },
  raw: unknown,
): unknown => {
  if (function_.error) {
    const eitherSchema = Schema.Either({
      left: function_.error as Schema.Schema.AnyNoContext,
      right: function_.returns as Schema.Schema.AnyNoContext,
    });
    return Schema.decodeUnknownSync(eitherSchema)(raw);
  }
  return Schema.decodeUnknownSync(function_.returns)(raw);
};
