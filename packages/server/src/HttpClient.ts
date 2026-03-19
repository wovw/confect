import * as Ref from "@confect/core/Ref";
import { ConvexHttpClient as ConvexHttpClient_ } from "convex/browser";
import type { ParseResult } from "effect";
import { Context, Effect, Layer, Match, Schema } from "effect";

export class HttpClientError extends Schema.TaggedError<HttpClientError>()(
  "HttpClientError",
  {
    cause: Schema.Unknown,
  },
) {}

const make = (
  address: string,
  options?: ConstructorParameters<typeof ConvexHttpClient_>[1],
) => {
  const client = new ConvexHttpClient_(address, options);

  const setAuth = (token: string) =>
    Effect.sync(() => {
      client.setAuth(token);
    });

  const clearAuth = () =>
    Effect.sync(() => {
      client.clearAuth();
    });

  const query = <Query extends Ref.AnyQuery>(
    ref: Query,
    args: Ref.Args<Query>,
  ): Effect.Effect<
    Ref.Returns<Query>,
    HttpClientError | ParseResult.ParseError
  > =>
    Effect.gen(function* () {
      const function_ = Ref.getFunctionSpec(ref);
      const functionName = Ref.getConvexFunctionName(ref);

      return yield* Match.value(function_.functionProvenance).pipe(
        Match.tag("Confect", (confectFunctionSpec) =>
          Effect.gen(function* () {
            const encodedArgs = yield* Schema.encode(confectFunctionSpec.args)(
              args,
            );

            const encodedResult = yield* Effect.tryPromise({
              try: () => client.query(functionName as any, encodedArgs),
              catch: (cause) => new HttpClientError({ cause }),
            });

            return yield* Schema.decode(confectFunctionSpec.returns)(
              encodedResult,
            );
          }),
        ),
        Match.tag("Convex", () =>
          Effect.tryPromise({
            try: () => client.query(functionName as any, args as any),
            catch: (cause) => new HttpClientError({ cause }),
          }),
        ),
        Match.exhaustive,
      );
    });

  const mutation = <Mutation extends Ref.AnyMutation>(
    ref: Mutation,
    args: Ref.Args<Mutation>,
  ): Effect.Effect<
    Ref.Returns<Mutation>,
    HttpClientError | ParseResult.ParseError
  > =>
    Effect.gen(function* () {
      const function_ = Ref.getFunctionSpec(ref);
      const functionName = Ref.getConvexFunctionName(ref);

      return yield* Match.value(function_.functionProvenance).pipe(
        Match.tag("Confect", (confectFunctionSpec) =>
          Effect.gen(function* () {
            const encodedArgs = yield* Schema.encode(confectFunctionSpec.args)(
              args,
            );

            const encodedResult = yield* Effect.tryPromise({
              try: () => client.mutation(functionName as any, encodedArgs),
              catch: (cause) => new HttpClientError({ cause }),
            });

            return yield* Schema.decode(confectFunctionSpec.returns)(
              encodedResult,
            );
          }),
        ),
        Match.tag("Convex", () =>
          Effect.tryPromise({
            try: () => client.mutation(functionName as any, args as any),
            catch: (cause) => new HttpClientError({ cause }),
          }),
        ),
        Match.exhaustive,
      );
    });

  const action = <Action extends Ref.AnyAction>(
    ref: Action,
    args: Ref.Args<Action>,
  ): Effect.Effect<
    Ref.Returns<Action>,
    HttpClientError | ParseResult.ParseError
  > =>
    Effect.gen(function* () {
      const function_ = Ref.getFunctionSpec(ref);
      const functionName = Ref.getConvexFunctionName(ref);

      return yield* Match.value(function_.functionProvenance).pipe(
        Match.tag("Confect", (confectFunctionSpec) =>
          Effect.gen(function* () {
            const encodedArgs = yield* Schema.encode(confectFunctionSpec.args)(
              args,
            );

            const encodedResult = yield* Effect.tryPromise({
              try: () => client.action(functionName as any, encodedArgs),
              catch: (cause) => new HttpClientError({ cause }),
            });

            return yield* Schema.decode(confectFunctionSpec.returns)(
              encodedResult,
            );
          }),
        ),
        Match.tag("Convex", () =>
          Effect.tryPromise({
            try: () => client.action(functionName as any, args as any),
            catch: (cause) => new HttpClientError({ cause }),
          }),
        ),
        Match.exhaustive,
      );
    });

  return {
    setAuth,
    clearAuth,
    query,
    mutation,
    action,
  };
};

/**
 * Effect-based [ConvexHttpClient](https://docs.convex.dev/api/classes/browser.ConvexHttpClient)
 */
export const HttpClient = Context.GenericTag<ReturnType<typeof make>>(
  "@confect/server/HttpClient",
);

export type HttpClient = typeof HttpClient.Identifier;

export const layer = (
  address: string,
  options?: ConstructorParameters<typeof ConvexHttpClient_>[1],
) =>
  Layer.effect(
    HttpClient,
    Effect.sync(() => make(address, options)),
  );
