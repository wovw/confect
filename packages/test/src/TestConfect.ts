import { Ref } from "@confect/core";
import type { DatabaseSchema, DataModel } from "@confect/server";
import { RegisteredConvexFunction } from "@confect/server";
import type {
  TestConvexForDataModel,
  TestConvexForDataModelAndIdentity,
} from "convex-test";
import { convexTest } from "convex-test";
import type { GenericMutationCtx, UserIdentity } from "convex/server";
import type { Value } from "convex/values";
import type { ParseResult } from "effect";
import { Context, Effect, Either, Layer, Schema } from "effect";

type RefReturn<Ref_ extends Ref.Any> =
  Ref.Error<Ref_> extends never
    ? Ref.Returns<Ref_>["Type"]
    : Either.Either<Ref.Returns<Ref_>["Type"], Ref.Error<Ref_>["Type"]>;

export type TestConfectWithoutIdentity<
  ConfectSchema extends DatabaseSchema.AnyWithProps,
> = {
  query: <QueryRef extends Ref.AnyQuery>(
    queryRef: QueryRef,
    args: Ref.Args<QueryRef>["Type"],
  ) => Effect.Effect<RefReturn<QueryRef>, ParseResult.ParseError>;
  mutation: <MutationRef extends Ref.AnyMutation>(
    mutationRef: MutationRef,
    args: Ref.Args<MutationRef>["Type"],
  ) => Effect.Effect<RefReturn<MutationRef>, ParseResult.ParseError>;
  action: <ActionRef extends Ref.AnyAction>(
    actionRef: ActionRef,
    args: Ref.Args<ActionRef>["Type"],
  ) => Effect.Effect<RefReturn<ActionRef>, ParseResult.ParseError>;
  run: {
    <E>(
      handler: Effect.Effect<
        void,
        E,
        RegisteredConvexFunction.MutationServices<ConfectSchema>
      >,
    ): Effect.Effect<void>;
    <A, B extends Value, E>(
      handler: Effect.Effect<
        A,
        E,
        RegisteredConvexFunction.MutationServices<ConfectSchema>
      >,
      returns: Schema.Schema<A, B>,
    ): Effect.Effect<A, ParseResult.ParseError>;
  };
  fetch: (
    pathQueryFragment: string,
    init?: RequestInit,
  ) => Effect.Effect<Response>;
  finishInProgressScheduledFunctions: () => Effect.Effect<void>;
  finishAllScheduledFunctions: (
    advanceTimers: () => void,
  ) => Effect.Effect<void>;
};

export type TestConfect<ConfectSchema extends DatabaseSchema.AnyWithProps> = {
  withIdentity: (
    userIdentity: Partial<UserIdentity>,
  ) => TestConfectWithoutIdentity<ConfectSchema>;
} & TestConfectWithoutIdentity<ConfectSchema>;

export const TestConfect = <
  ConfectSchema extends DatabaseSchema.AnyWithProps,
>() =>
  Context.GenericTag<TestConfect<ConfectSchema>>("@confect/test/TestConfect");

class TestConfectImplWithoutIdentity<
  ConfectSchema extends DatabaseSchema.AnyWithProps,
> implements TestConfectWithoutIdentity<ConfectSchema> {
  constructor(
    private confectSchema: ConfectSchema,
    private testConvex: TestConvexForDataModel<
      DataModel.ToConvex<DataModel.FromSchema<ConfectSchema>>
    >,
  ) {}

  readonly query = <QueryRef extends Ref.AnyQuery>(
    queryRef: QueryRef,
    args: Ref.Args<QueryRef>["Type"],
  ): Effect.Effect<RefReturn<QueryRef>, ParseResult.ParseError> =>
    Effect.gen(this, function* () {
      const query = Ref.getFunction(queryRef);
      const queryName = Ref.getConvexFunctionName(queryRef);

      const encodedArgs = yield* Schema.encode(query.args)(args);

      const encodedReturns = yield* Effect.promise(() =>
        this.testConvex.query(queryName as any, encodedArgs),
      );

      if (query.error) {
        const eitherSchema = Schema.Either({
          left: query.error as Schema.Schema.AnyNoContext,
          right: query.returns as Schema.Schema.AnyNoContext,
        });

        return (yield* Schema.decodeUnknown(eitherSchema)(
          encodedReturns,
        )) as RefReturn<QueryRef>;
      }

      return (yield* Schema.decodeUnknown(query.returns)(
        encodedReturns,
      )) as RefReturn<QueryRef>;
    });

  readonly mutation = <MutationRef extends Ref.AnyMutation>(
    mutationRef: MutationRef,
    args: Ref.Args<MutationRef>["Type"],
  ): Effect.Effect<RefReturn<MutationRef>, ParseResult.ParseError> =>
    Effect.gen(this, function* () {
      const mutation = Ref.getFunction(mutationRef);
      const mutationName = Ref.getConvexFunctionName(mutationRef);

      const encodedArgs = yield* Schema.encode(mutation.args)(args);

      const encodedReturns = yield* Effect.promise(() =>
        this.testConvex.mutation(mutationName as any, encodedArgs),
      );

      if (mutation.error) {
        const eitherSchema = Schema.Either({
          left: mutation.error as Schema.Schema.AnyNoContext,
          right: mutation.returns as Schema.Schema.AnyNoContext,
        });

        return (yield* Schema.decodeUnknown(eitherSchema)(
          encodedReturns,
        )) as RefReturn<MutationRef>;
      }

      return (yield* Schema.decodeUnknown(mutation.returns)(
        encodedReturns,
      )) as RefReturn<MutationRef>;
    });

  readonly action = <ActionRef extends Ref.AnyAction>(
    actionRef: ActionRef,
    args: Ref.Args<ActionRef>["Type"],
  ): Effect.Effect<RefReturn<ActionRef>, ParseResult.ParseError> =>
    Effect.gen(this, function* () {
      const action = Ref.getFunction(actionRef);
      const actionName = Ref.getConvexFunctionName(actionRef);

      const encodedArgs = yield* Schema.encode(action.args)(args);

      const encodedReturns = yield* Effect.promise(() =>
        this.testConvex.action(actionName as any, encodedArgs),
      );

      if (action.error) {
        const eitherSchema = Schema.Either({
          left: action.error as Schema.Schema.AnyNoContext,
          right: action.returns as Schema.Schema.AnyNoContext,
        });

        return (yield* Schema.decodeUnknown(eitherSchema)(
          encodedReturns,
        )) as RefReturn<ActionRef>;
      }

      return (yield* Schema.decodeUnknown(action.returns)(
        encodedReturns,
      )) as RefReturn<ActionRef>;
    });

  readonly run: TestConfectWithoutIdentity<ConfectSchema>["run"] = (<
    A,
    B extends Value,
    E,
  >(
    handler: Effect.Effect<
      A,
      E,
      RegisteredConvexFunction.MutationServices<ConfectSchema>
    >,
    returns?: Schema.Schema<A, B>,
  ): Effect.Effect<void> | Effect.Effect<A, ParseResult.ParseError> => {
    const makeMutationLayer = (
      mutationCtx: GenericMutationCtx<
        DataModel.ToConvex<DataModel.FromSchema<ConfectSchema>>
      >,
    ): Layer.Layer<RegisteredConvexFunction.MutationServices<ConfectSchema>> =>
      RegisteredConvexFunction.mutationLayer(
        this.confectSchema,
        mutationCtx,
      ) as Layer.Layer<
        RegisteredConvexFunction.MutationServices<ConfectSchema>
      >;

    return returns === undefined
      ? Effect.promise(() =>
          this.testConvex.run((mutationCtx) =>
            Effect.runPromise(
              handler.pipe(
                Effect.asVoid,
                Effect.provide(makeMutationLayer(mutationCtx)),
              ),
            ),
          ),
        )
      : Effect.promise(() =>
          this.testConvex.run((mutationCtx) =>
            Effect.runPromise(
              handler.pipe(
                Effect.andThen(Schema.encode(returns)),
                Effect.provide(makeMutationLayer(mutationCtx)),
              ),
            ),
          ),
        ).pipe(Effect.andThen(Schema.decode(returns)));
  }) as TestConfectWithoutIdentity<ConfectSchema>["run"];

  readonly fetch = <PathQueryFragment extends string>(
    pathQueryFragment: PathQueryFragment,
    init?: RequestInit,
  ) => Effect.promise(() => this.testConvex.fetch(pathQueryFragment, init));

  readonly finishInProgressScheduledFunctions = () =>
    Effect.promise(() => this.testConvex.finishInProgressScheduledFunctions());

  readonly finishAllScheduledFunctions = (advanceTimers: () => void) =>
    Effect.promise(() =>
      this.testConvex.finishAllScheduledFunctions(advanceTimers),
    );
}

class TestConfectImpl<
  ConfectSchema extends DatabaseSchema.AnyWithProps,
> implements TestConfect<ConfectSchema> {
  private readonly testConfectImplWithoutIdentity: TestConfectImplWithoutIdentity<ConfectSchema>;

  constructor(
    private confectSchema: ConfectSchema,
    private testConvex: TestConvexForDataModelAndIdentity<
      DataModel.ToConvex<DataModel.FromSchema<ConfectSchema>>
    >,
  ) {
    this.testConvex = testConvex;
    this.testConfectImplWithoutIdentity = new TestConfectImplWithoutIdentity(
      confectSchema,
      testConvex,
    );
  }

  readonly withIdentity = (userIdentity: Partial<UserIdentity>) =>
    new TestConfectImplWithoutIdentity(
      this.confectSchema,
      this.testConvex.withIdentity(userIdentity),
    );

  readonly query = <QueryRef extends Ref.AnyQuery>(
    queryRef: QueryRef,
    args: Ref.Args<QueryRef>["Type"],
  ) => this.testConfectImplWithoutIdentity.query(queryRef, args);

  readonly mutation = <MutationRef extends Ref.AnyMutation>(
    mutationRef: MutationRef,
    args: Ref.Args<MutationRef>["Type"],
  ) => this.testConfectImplWithoutIdentity.mutation(mutationRef, args);

  readonly action = <ActionRef extends Ref.AnyAction>(
    actionRef: ActionRef,
    args: Ref.Args<ActionRef>["Type"],
  ) => this.testConfectImplWithoutIdentity.action(actionRef, args);

  readonly run: TestConfect<ConfectSchema>["run"] = ((
    handler: any,
    returns?: any,
  ) =>
    this.testConfectImplWithoutIdentity.run(
      handler,
      returns,
    )) as TestConfect<ConfectSchema>["run"];

  readonly fetch = <PathQueryFragment extends string>(
    pathQueryFragment: PathQueryFragment,
    init?: RequestInit,
  ) => this.testConfectImplWithoutIdentity.fetch(pathQueryFragment, init);

  readonly finishInProgressScheduledFunctions = () =>
    this.testConfectImplWithoutIdentity.finishInProgressScheduledFunctions();

  readonly finishAllScheduledFunctions = (advanceTimers: () => void) =>
    this.testConfectImplWithoutIdentity.finishAllScheduledFunctions(
      advanceTimers,
    );
}

export const layer =
  <DatabaseSchema_ extends DatabaseSchema.AnyWithProps>(
    databaseSchema: DatabaseSchema_,
    modules: Record<string, () => Promise<any>>,
  ) =>
  (): Layer.Layer<TestConfect<DatabaseSchema_>> =>
    Layer.sync(
      TestConfect<DatabaseSchema_>(),
      () =>
        new TestConfectImpl(
          databaseSchema,
          convexTest(
            databaseSchema.convexSchemaDefinition,
            modules,
          ) as unknown as TestConvexForDataModelAndIdentity<
            DataModel.ToConvex<DataModel.FromSchema<DatabaseSchema_>>
          >,
        ),
    );
