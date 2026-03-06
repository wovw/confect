# Confect + TanStack Query Integration Plan

## Goal

Add typed domain error support to confect via `Either<DomainError, SuccessValue>`, and build a `@confect/react-query` package that bridges confect with TanStack Query — putting domain errors in `data` and unhandled errors in TanStack's `error` channel.

## Design Decisions (Settled)

- **Either over Exit** — simpler serialization, no `Cause` complexity
- **Optional `error` field on FunctionSpec** — accepts any `Schema.Schema.AnyNoContext` (single `Schema.TaggedError` or `Schema.Union(...)` of them)
- **No `error` → return `A` directly** (no Either wrapping, full backward compat)
- **With `error` → wire format is `Schema.Either` encoded** (`{ _tag: "Right", right: ... } | { _tag: "Left", left: ... }`)
- **Domain errors use `Schema.TaggedError`** — encodes as `{ _tag: "ErrorName", ...fields }`, discriminated by `_tag`
- **Server wraps success/failure into Either** — the library handles this, not the developer
- **Handler error channel opens up** — `Effect.Effect<Returns, E, R>` when `error` is defined
- **Args encoding deferred to fetch** — query key holds decoded (user-facing) args
- **`@confect/react` also returns Either** — consistent with `@confect/react-query`
- **`@confect/react-query` is a new package** — mirrors `@convex-dev/react-query` pattern
- **Rewrite approach** — build `ConfectQueryClient` using `ConvexReactClient` directly, decoded data in cache

## Wire Format

```
// Function WITHOUT error schema (backward compatible):
returns value → encode(returns, value) → wire → decode(returns, encoded) → value

// Function WITH error schema:
// Success path:
returns value → Schema.Either(error, returns).encode(Either.right(value)) → wire
// Error path:
Effect.fail(domainError) → Schema.Either(error, returns).encode(Either.left(domainError)) → wire
// Client:
wire → Schema.Either(error, returns).decode(encoded) → Either<DomainError, SuccessValue>
```

Encoded wire shapes:

```json
// Success: { "_tag": "Right", "right": <encodedReturnsValue> }
// Failure: { "_tag": "Left", "left": { "_tag": "NotFoundError", "id": "abc" } }
```

---

## Phase 1: Core — Add `error` to FunctionSpec and Ref

### 1.1 `FunctionSpec` — add optional `error` type parameter and field

**File**: `packages/core/src/FunctionSpec.ts`

- Add a 6th type parameter `Error_` to `FunctionSpec` interface, defaulting to `never`
- Add `readonly error: Error_` field (holds the error schema, or `never` when absent)
- Add `Error` type extractor (like `Args` and `Returns`)
- Update `AnyWithProps` and other utility types to include the error parameter
- Update the `make` function to accept an optional `error` in the config object
  - When `error` is omitted, store `undefined` at runtime (typed as `never` at type level)
- Update all builder functions (`publicQuery`, `publicMutation`, etc.) — no signature change needed since `make` handles the optional field
- Add a `HasError` type predicate: `FunctionSpec["error"] extends never ? false : true`

### 1.2 `Ref` — carry error type parameter

**File**: `packages/core/src/Ref.ts`

- Add `_Error` type parameter to `Ref` interface (defaulting to `never`)
- Add `Error` type extractor
- Update `FromFunctionSpec` to pipe through the error type
- Update `AnyPublicQuery`, `AnyPublicMutation`, `AnyPublicAction` etc.
- Update `make` to store the error schema alongside the function
- Add `getError` accessor (returns the error schema or `undefined`)

### 1.3 `Refs` — propagate error through type mapping

**File**: `packages/core/src/Refs.ts`

- `FilteredFunctions` and `GroupRefs` derive `Ref` types from `FunctionSpec` via `Ref.FromFunctionSpec` — this should propagate automatically once `FromFunctionSpec` includes the error type
- Verify no explicit type narrowing drops the error parameter

### 1.4 `GroupSpec` — no changes expected

`GroupSpec` stores `FunctionSpec.AnyWithPropsWithRuntime<Runtime>` — the union type naturally includes functions with or without errors. Verify `addFunction` works with error-carrying specs.

### 1.5 Verification

- Existing tests pass unchanged (no error = `never` = backward compatible)
- Type-level test: a FunctionSpec with `error` produces a Ref that carries the error type
- Type-level test: `Ref.Error<ref>` extracts the correct error schema type

---

## Phase 2: Server — wrap handler errors into Either wire format

### 2.1 `Handler` — open up the error channel

**File**: `packages/server/src/Handler.ts`

Current (`Handler.ts` line 107-109):

```ts
type Base<FunctionSpec_ extends FunctionSpec.AnyWithProps, R> = (
  args: FunctionSpec.Args<FunctionSpec_>["Type"],
) => Effect.Effect<FunctionSpec.Returns<FunctionSpec_>["Type"], never, R>;
```

Change to conditionally allow errors:

```ts
type Base<FunctionSpec_ extends FunctionSpec.AnyWithProps, R> = (
  args: FunctionSpec.Args<FunctionSpec_>["Type"],
) => Effect.Effect<
  FunctionSpec.Returns<FunctionSpec_>["Type"],
  FunctionSpec.Error<FunctionSpec_> extends never
    ? never
    : FunctionSpec.Error<FunctionSpec_>["Type"],
  R
>;
```

This means:

- Functions without `error` → handler must return `Effect.Effect<Returns, never, R>` (unchanged)
- Functions with `error` → handler can return `Effect.Effect<Returns, E, R>` where `E` matches the error schema's `Type`

### 2.2 `RegisteredConvexFunction` — catch errors, encode as Either

**File**: `packages/server/src/RegisteredConvexFunction.ts`

In `queryFunction`, `mutationFunction`, and `convexActionFunction`:

**When `error` is NOT defined** (backward compatible path):

```ts
// Unchanged:
handler(decodedArgs)
  |> Effect.andThen(value => Schema.encodeUnknown(returns)(value))
  |> Effect.runPromise
```

**When `error` IS defined**:

```ts
// New path:
const eitherSchema = Schema.Either({
  left: function_.error,
  right: function_.returns,
});

handler(decodedArgs)
  |> Effect.matchEffect({
    onSuccess: (value) =>
      Schema.encodeUnknown(eitherSchema)(Either.right(value)),
    onFailure: (cause) => {
      const failOption = Cause.failureOption(cause);
      if (Option.isSome(failOption)) {
        return Schema.encodeUnknown(eitherSchema)(Either.left(failOption.value));
      }
      return Effect.failCause(cause); // defects propagate as Convex errors
    },
  })
  |> Effect.runPromise
```

Key: `Effect.runPromise` rejects on defects → Convex treats those as server errors → TanStack `error` channel. Domain errors get encoded as `Either.left` → TanStack `data` channel.

### 2.3 `SchemaToValidator` — compile Either-shaped validator

**File**: `packages/server/src/SchemaToValidator.ts`

When a function has an `error` schema, the Convex return validator must match the Either wire format:

```ts
v.union(
  v.object({ _tag: v.literal("Right"), right: <compiledReturnsValidator> }),
  v.object({ _tag: v.literal("Left"),  left: <compiledErrorValidator> }),
)
```

Options:

- **Option A**: Build a `compileEitherReturnsSchema` that constructs this validator from the `returns` and `error` schemas directly
- **Option B**: Construct a `Schema.Either({ left: error, right: returns })`, get its encoded schema, and compile that through the existing `compileReturnsSchema`

**Option B is preferred** — it reuses the existing compiler and guarantees the validator matches the actual encoded shape.

In `RegisteredConvexFunction.make`, before passing to `queryFunction`/`mutationFunction`:

```ts
const effectiveReturnsSchema = function_.error
  ? Schema.Either({ left: function_.error, right: function_.returns })
  : function_.returns;
```

And pass `effectiveReturnsSchema` as the `returns` to the inner function builders. The validator and the encode/decode are now consistent.

### 2.4 `RegisteredConvexFunction.make` — branch on error presence

**File**: `packages/server/src/RegisteredConvexFunction.ts`

Update the top-level `make` function to check `function_.error` and pass the appropriate schemas/handlers to `queryFunction`/`mutationFunction`/`convexActionFunction`.

### 2.5 `FunctionImpl.make` — no handler signature changes needed

The handler type is derived from `Handler.WithName<...>`, which already derives from the `Base` type. Once `Base` conditionally allows errors, `FunctionImpl.make`'s type inference picks it up automatically.

### 2.6 Verification

- Existing functions (no `error`) — compile and behave identically
- New function with `error`:
  - Handler can `Effect.fail(new MyDomainError(...))`
  - Server encodes `Either.left({ _tag: "MyDomainError", ... })` over the wire
  - Handler success encodes `Either.right(encodedValue)` over the wire
  - Defects (unexpected errors) reject the promise → Convex server error
- Unit test: `SchemaToValidator` correctly compiles an Either-shaped return validator
- Integration test: round-trip encode/decode of Either values through Convex

---

## Phase 3: React — unwrap Either in vanilla hooks

### 3.1 `@confect/react` — update `useQuery` and `useMutation`

**File**: `packages/react/src/index.ts`

For `useQuery`:

```ts
// When Ref has no error → return A | undefined (unchanged)
// When Ref has error → return Either<DomainError, A> | undefined

export const useQuery = <Query extends Ref.AnyPublicQuery>(
  ref: Query,
  args: Ref.Args<Query>["Type"],
): UseQueryReturn<Query> => {
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
    // Has error schema — wire format is Either, decode as Either
    const eitherSchema = Schema.Either({
      left: function_.error,
      right: function_.returns,
    });
    return Schema.decodeSync(eitherSchema)(encodedReturnsOrUndefined);
  } else {
    // No error schema — wire format is plain value
    return Schema.decodeSync(function_.returns)(encodedReturnsOrUndefined);
  }
};
```

Return type needs a conditional type:

```ts
type UseQueryReturn<Query extends Ref.AnyPublicQuery> =
  Ref.Error<Query> extends never
    ? Ref.Returns<Query>["Type"] | undefined
    : Either<Ref.Error<Query>["Type"], Ref.Returns<Query>["Type"]> | undefined;
```

Similar changes for `useMutation` — decode the mutation result as Either when error is present.

### 3.2 Verification

- Existing usage unchanged (no `error` → returns `A | undefined`)
- New usage with `error` → returns `Either<E, A> | undefined`

---

## Phase 4: `@confect/react-query` — new package

### 4.1 Package scaffolding

Create `packages/react-query/` mirroring `packages/react/`:

- `package.json` — peer deps: `@confect/core`, `convex`, `effect`, `react`, `@tanstack/react-query`
- `tsconfig.json`
- `tsdown.config.ts`
- `src/index.ts`

### 4.2 `ConfectQueryClient` — bridge Convex subscriptions to TanStack

**File**: `packages/react-query/src/ConfectQueryClient.ts`

This mirrors `ConvexQueryClient` from `@convex-dev/react-query` but adds Schema decode.

Core responsibilities:

1. **Subscription management** — listen to TanStack `QueryCache` events (`added`, `removed`), create/destroy Convex `watchQuery` subscriptions
2. **Data push** — when `watch.onUpdate` fires, read `watch.localQueryResult()`, decode through the confect schema (including Either unwrapping), and call `queryClient.setQueryData`
3. **Initial fetch** — `queryFn` calls `convexClient.query()` for bootstrap, decodes the result
4. **Custom hash function** — `hashFn()` that handles confect query keys

Query key shape:

```ts
["confectQuery", convexFunctionName: string, decodedArgs: unknown, refIdentity: string]
```

The `refIdentity` distinguishes confect queries from raw Convex queries and enables looking up the schema for decode.

### 4.3 Schema registry — mapping query keys to schemas

The `ConfectQueryClient` needs access to the Effect schemas to decode data pushed from subscriptions. Two approaches:

- **Option A**: Store the schema in a WeakMap keyed by ref, look it up from the query key
- **Option B**: `confectQuery()` stashes the ref's schemas into a registry on `ConfectQueryClient` at call time

**Option B is simpler** — `confectQuery` receives the `ConfectQueryClient` instance (or a registry ref) and registers the schemas. The subscription handler looks them up by query hash.

Actually, the simplest approach: **embed the schema decode function in the query key metadata**. Since TanStack Query supports `queryKey` as any serializable array, but the hash function controls identity, we can attach a non-serialized `meta` object:

```ts
// confectQuery returns:
{
  queryKey: ["confectQuery", functionName, encodedArgs],
  meta: { decode: (raw: unknown) => decodedValue, ref },
  staleTime: Infinity,
}
```

But TanStack's `meta` is on the query options, not the key. The `ConfectQueryClient` can read `query.meta` in the cache subscription handler. This is the cleanest approach.

### 4.4 `confectQuery()` — query options factory

**File**: `packages/react-query/src/confectQuery.ts`

```ts
export const confectQuery = <Query extends Ref.AnyPublicQuery>(
  ref: Query,
  args: Ref.Args<Query>["Type"] | "skip",
) => {
  const function_ = Ref.getFunction(ref);
  const functionName = Ref.getConvexFunctionName(ref);
  const finalArgs = args === "skip" ? "skip" : args;

  return {
    queryKey: [
      "confectQuery",
      functionName,
      finalArgs === "skip" ? "skip" : finalArgs,
    ],
    staleTime: Infinity,
    ...(finalArgs === "skip" ? { enabled: false } : {}),
    meta: {
      __confect: true,
      function_,
      ref,
    },
  };
};
```

Return type:

```ts
// When no error: data is A
// When error: data is Either<E, A>
```

### 4.5 `useConfectMutation()` — mutation wrapper

**File**: `packages/react-query/src/useConfectMutation.ts`

Wraps a confect Ref into a function compatible with TanStack `useMutation`'s `mutationFn`:

```ts
export const useConfectMutation = <Mutation extends Ref.AnyPublicMutation>(
  ref: Mutation,
) => {
  const function_ = Ref.getFunction(ref);
  const functionName = Ref.getConvexFunctionName(ref);
  const actualMutation = useConvexMutation(functionName as any);

  return async (
    args: Ref.Args<Mutation>["Type"],
  ): Promise<MutationReturn<Mutation>> => {
    const encodedArgs = Schema.encodeSync(function_.args)(args);
    const rawResult = await actualMutation(encodedArgs);

    if (function_.error) {
      const eitherSchema = Schema.Either({
        left: function_.error,
        right: function_.returns,
      });
      return Schema.decodeSync(eitherSchema)(rawResult);
    } else {
      return Schema.decodeSync(function_.returns)(rawResult);
    }
  };
};
```

### 4.6 Provider setup

**File**: `packages/react-query/src/ConfectQueryProvider.tsx` (optional convenience)

Or document manual setup:

```tsx
const convex = new ConvexReactClient(url);
const confectQueryClient = new ConfectQueryClient(convex);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: confectQueryClient.hashFn(),
      queryFn: confectQueryClient.queryFn(),
    },
  },
});
confectQueryClient.connect(queryClient);
```

### 4.7 Verification

- `confectQuery` with no-error function → `data: A | undefined`
- `confectQuery` with error function → `data: Either<E, A> | undefined`
- Unhandled errors (server crash, schema decode failure) → `error: Error`
- Subscription updates decode correctly and update cache
- Subscription lifecycle (add/remove) managed correctly
- Skip pattern works (`confectQuery(ref, "skip")`)
- `useConfectMutation` encodes args and decodes results correctly

---

## Phase 5: Example app + docs

### 5.1 Add example domain error

```ts
// apps/example/confect/errors.ts
import { Schema } from "effect";

export class NoteNotFoundError extends Schema.TaggedError<NoteNotFoundError>()(
  "NoteNotFoundError",
  { noteId: Schema.String },
) {}
```

### 5.2 Add example function with error

```ts
// In spec:
FunctionSpec.publicQuery({
  name: "getById",
  args: Schema.Struct({ noteId: GenericId.GenericId("notes") }),
  returns: Notes.Doc,
  error: NoteNotFoundError,
});

// In impl:
FunctionImpl.make(api, "notesAndRandom.notes", "getById", ({ noteId }) =>
  Effect.gen(function* () {
    const reader = yield* DatabaseReader;
    const note = yield* reader.table("notes").get(noteId);
    if (Option.isNone(note)) {
      return yield* Effect.fail(new NoteNotFoundError({ noteId }));
    }
    return note.value;
  }),
);
```

### 5.3 Frontend usage with TanStack Query

```tsx
const { data, error } = useQuery(
  confectQuery(api.public.notesAndRandom.notes.getById, { noteId }),
);

if (error) {
  // Unhandled error — network failure, schema mismatch, server crash
  return <div>Something went wrong: {error.message}</div>;
}

if (data) {
  Either.match(data, {
    onLeft: (err) => {
      // Typed domain error
      return <div>Note {err.noteId} not found</div>;
    },
    onRight: (note) => {
      return <div>{note.text}</div>;
    },
  });
}
```

---

## Implementation Order

```
Phase 1 (core)     → Phase 2 (server)     → Phase 3 (react)
                                            → Phase 4 (react-query)  [parallel with Phase 3]
                                            → Phase 5 (example + docs)
```

Phase 3 and 4 can be developed in parallel since they only depend on Phases 1-2. Phase 5 depends on all prior phases.

---

## Test Impact Analysis and New Test Cases

### Existing Tests — Impact Assessment

#### `packages/core/test/FunctionSpec.test.ts`

**Impact: None — existing tests pass unchanged.**
All existing tests create FunctionSpecs without `error`. Since `error` is optional and defaults to `never`/`undefined`, no existing test needs modification.

**New tests to add (same file, same style):**

```ts
describe("make", () => {
  // ... existing tests ...

  it("creates a function spec with an error schema", () => {
    class MyError extends Schema.TaggedError<MyError>()("MyError", {
      message: Schema.String,
    }) {}

    const functionSpec = FunctionSpec.publicQuery({
      name: "myFunction",
      args: Schema.Struct({}),
      returns: Schema.String,
      error: MyError,
    });

    expect(FunctionSpec.isFunctionSpec(functionSpec)).toStrictEqual(true);
  });

  it("creates a function spec with a union error schema", () => {
    class ErrorA extends Schema.TaggedError<ErrorA>()("ErrorA", {}) {}
    class ErrorB extends Schema.TaggedError<ErrorB>()("ErrorB", {
      code: Schema.Number,
    }) {}

    const functionSpec = FunctionSpec.publicQuery({
      name: "myFunction",
      args: Schema.Struct({}),
      returns: Schema.String,
      error: Schema.Union(ErrorA, ErrorB),
    });

    expect(FunctionSpec.isFunctionSpec(functionSpec)).toStrictEqual(true);
  });

  it("creates a function spec without error (backward compat)", () => {
    const functionSpec = FunctionSpec.publicQuery({
      name: "myFunction",
      args: Schema.Struct({}),
      returns: Schema.String,
    });

    // error should be undefined at runtime when not provided
    expect((functionSpec as any).error).toBeUndefined();
  });
});
```

#### `packages/core/test/Refs.test.ts`

**Impact: Moderate — `expectTypeOf` assertions need updating.**
The existing type assertions like `expectTypeOf(actualRef).toEqualTypeOf(expectedRef)` and `expectTypeOf(refs.internal.notes.internalList).toEqualTypeOf<Ref.Ref<..., ..., ..., ...>>()` hardcode 4 type parameters for `Ref`. Once `Ref` gains a 5th type parameter (`Error_`), these type assertions must include the error parameter (as `never` for functions without error).

**Changes to existing tests:**

- Update `Ref.Ref<RuntimeAndFunctionType.ConvexQuery, "internal", typeof FnArgs, typeof FnReturns>` → `Ref.Ref<RuntimeAndFunctionType.ConvexQuery, "internal", typeof FnArgs, typeof FnReturns, never>` (or ensure the default type parameter covers this)
- If `Error_` has a default of `never`, existing 4-param `Ref.Ref<...>` usage may still compile — verify this

**New tests to add (same file, same style):**

```ts
it("turns a spec with error into refs that carry the error type", () => {
  class MyError extends Schema.TaggedError<MyError>()("MyError", {
    message: Schema.String,
  }) {}

  const FnArgs = Schema.Struct({ id: Schema.String });
  const FnReturns = Schema.String;

  const spec = Spec.make().add(
    GroupSpec.make("notes").addFunction(
      FunctionSpec.publicQuery({
        name: "get",
        args: FnArgs,
        returns: FnReturns,
        error: MyError,
      }),
    ),
  );
  const refs = Refs.make(spec);

  const actualRef = refs.public.notes.get;
  // Verify the error type is carried through
  expectTypeOf<Ref.Error<typeof actualRef>>().toEqualTypeOf<typeof MyError>();
});

it("refs without error have never as error type", () => {
  const FnArgs = Schema.Struct({});
  const FnReturns = Schema.String;

  const spec = Spec.make().add(
    GroupSpec.make("notes").addFunction(
      FunctionSpec.publicQuery({
        name: "list",
        args: FnArgs,
        returns: FnReturns,
      }),
    ),
  );
  const refs = Refs.make(spec);

  expectTypeOf<
    Ref.Error<typeof refs.public.notes.list>
  >().toEqualTypeOf<never>();
});
```

#### `packages/core/test/GroupSpec.test.ts`

**Impact: None.** GroupSpec doesn't interact with the error field directly.

#### `packages/core/test/Spec.test.ts`

**Impact: None.** Spec just contains GroupSpecs.

#### `packages/server/test/SchemaToValidator.test.ts`

**Impact: None for existing tests — but new tests needed.**
The existing `compileAst`, `compileReturnsSchema`, `compileArgsSchema` tests all use schemas without the Either wrapper. They pass unchanged.

**New tests to add (same file, same style):**

```ts
describe("Either return schema compilation", () => {
  effect("compiles Schema.Either as a union of Right and Left objects", () =>
    Effect.gen(function* () {
      class MyError extends Schema.TaggedError<MyError>()("MyError", {
        message: Schema.String,
      }) {}

      const eitherSchema = Schema.Either({
        left: MyError,
        right: Schema.String,
      });

      const compiledValidator = compileReturnsSchema(eitherSchema);

      const expectedValidator = v.union(
        v.object({
          _tag: v.literal("Left"),
          left: v.object({
            _tag: v.literal("MyError"),
            message: v.string(),
          }),
        }),
        v.object({
          _tag: v.literal("Right"),
          right: v.string(),
        }),
      );

      expect(compiledValidator).toStrictEqual(expectedValidator);
    }),
  );

  effect("compiles Schema.Either with union error", () =>
    Effect.gen(function* () {
      class ErrorA extends Schema.TaggedError<ErrorA>()("ErrorA", {}) {}
      class ErrorB extends Schema.TaggedError<ErrorB>()("ErrorB", {
        code: Schema.Number,
      }) {}

      const eitherSchema = Schema.Either({
        left: Schema.Union(ErrorA, ErrorB),
        right: Schema.Struct({ id: Schema.String }),
      });

      const compiledValidator = compileReturnsSchema(eitherSchema);

      // Should compile to a union of Right and Left variants
      // Left variant itself is a union of ErrorA and ErrorB shapes
      expect(compiledValidator).toBeDefined();
    }),
  );
});
```

**Note**: This test block validates open question #2 — whether `Schema.Either` (a `Transformation` AST) compiles correctly. The test may initially fail, confirming that `compileAst` needs to handle `Transformation` by compiling its encoded side.

#### `packages/server/test/RegisteredFunctions.test.ts`

**Impact: None for existing tests.**
Existing tests check that registered functions have the correct Convex `RegisteredQuery<"public", ...>` types. Functions without `error` produce the same validator shape as before.

**New tests to add:**

```ts
it("types functions with error as RegisteredQuery with union return validator", () => {
  // Once a test function with error is added to the test confect spec,
  // verify its registered type is still RegisteredQuery<"public", ...>
  expectTypeOf(registeredFunctions.groups.notes.getByIdOrError).toExtend<
    RegisteredQuery<"public", Record<string, unknown>, unknown>
  >();
});
```

#### `packages/server/test/integration.test.ts`

**Impact: None for existing tests.**
All existing integration tests use functions without `error` and call `c.query`/`c.mutation` which return plain values. Unchanged.

**New integration tests to add (same file, same style):**

```ts
describe("Domain errors", () => {
  it.effect("returns Either.right on success for functions with error", () =>
    Effect.gen(function* () {
      const c = yield* TestConfect.TestConfect;

      // Insert a note first
      const noteId = yield* c.mutation(refs.public.groups.notes.insert, {
        text: "test",
      });

      // Query with error schema should return Either.right on success
      const result = yield* c.query(
        refs.public.groups.notes.getByIdOrError,
        { noteId },
      );

      expect(Either.isRight(result)).toBe(true);
    }).pipe(Effect.provide(TestConfect.layer())),
  );

  it.effect("returns Either.left on domain error", () =>
    Effect.gen(function* () {
      const c = yield* TestConfect.TestConfect;

      // Query with a non-existent ID should return Either.left
      const fakeId = /* construct a fake noteId */;
      const result = yield* c.query(
        refs.public.groups.notes.getByIdOrError,
        { noteId: fakeId },
      );

      expect(Either.isLeft(result)).toBe(true);
      if (Either.isLeft(result)) {
        expect(result.left._tag).toBe("NoteNotFoundError");
      }
    }).pipe(Effect.provide(TestConfect.layer())),
  );
});
```

### New Test Fixtures Needed

To support the new integration tests, the test confect setup needs a function with `error`:

#### `packages/server/test/confect/errors.ts` (new file)

```ts
import { Schema } from "effect";

export class NoteNotFoundError extends Schema.TaggedError<NoteNotFoundError>()(
  "NoteNotFoundError",
  { noteId: Schema.String },
) {}
```

#### Update `packages/server/test/confect/spec/groups/notes.ts`

Add a new function with error to the existing notes group:

```ts
.addFunction(
  FunctionSpec.publicQuery({
    name: "getByIdOrError",
    args: Schema.Struct({ noteId: GenericId.GenericId("notes") }),
    returns: Notes.Doc,
    error: NoteNotFoundError,
  }),
)
```

#### Update `packages/server/test/confect/impl/groups/notes.ts`

Add the handler implementation:

```ts
const getByIdOrError = FunctionImpl.make(
  api,
  "groups.notes",
  "getByIdOrError",
  ({ noteId }) =>
    Effect.gen(function* () {
      const reader = yield* DatabaseReader;
      const note = yield* reader.table("notes").get(noteId);
      return yield* Option.match(note, {
        onNone: () => Effect.fail(new NoteNotFoundError({ noteId })),
        onSome: Effect.succeed,
      });
    }),
);
```

Note: This handler does NOT use `.pipe(Effect.orDie)` — it allows the `NoteNotFoundError` to flow through the error channel, which the server wrapper catches and encodes as `Either.left`.

### Test Summary Table

| Test File                                 | Existing Tests | Impact                                | New Tests                              |
| ----------------------------------------- | -------------- | ------------------------------------- | -------------------------------------- |
| `core/test/FunctionSpec.test.ts`          | 3 tests        | ✅ None                               | +3 (error schema creation)             |
| `core/test/Refs.test.ts`                  | 5 tests        | ⚠️ Type assertions may need 5th param | +2 (error type propagation)            |
| `core/test/GroupSpec.test.ts`             | 3 tests        | ✅ None                               | None                                   |
| `core/test/Spec.test.ts`                  | 1 test         | ✅ None                               | None                                   |
| `server/test/SchemaToValidator.test.ts`   | ~50 tests      | ✅ None                               | +2 (Either validator compilation)      |
| `server/test/RegisteredFunctions.test.ts` | 2 tests        | ✅ None                               | +1 (error function registration type)  |
| `server/test/integration.test.ts`         | 4 tests        | ✅ None                               | +2 (Either success/failure round-trip) |
| New test fixtures                         | —              | —                                     | errors.ts, spec update, impl update    |

### Phase 4 Tests (`@confect/react-query`)

Since this is a new package, all tests are new. Follow the same `@effect/vitest` style:

```ts
// packages/react-query/test/confectQuery.test.ts
describe("confectQuery", () => {
  it("returns query options with confect query key", () => { ... });
  it("sets staleTime to Infinity", () => { ... });
  it("disables query when args is 'skip'", () => { ... });
  it("attaches function metadata for schema lookup", () => { ... });
});

// packages/react-query/test/ConfectQueryClient.test.ts
describe("ConfectQueryClient", () => {
  it("hashFn produces stable hashes for confect queries", () => { ... });
  it("hashFn delegates to default for non-confect queries", () => { ... });
});
```

React hook tests (`useQuery`, `useConfectMutation`) would require a React testing setup (e.g., `@testing-library/react`) — follow whatever pattern `@confect/react` uses (currently no tests exist for that package).

---

1. **Schema.Either field names**: Verify Effect's `Schema.Either` uses `{ left, right }` vs `{ _tag, left/right }` — the exact encoded shape determines the Convex validator structure.
2. **`compileReturnsSchema` for Transformation ASTs**: `Schema.Either` produces a `Transformation` AST node. The current `SchemaToValidator` compiler rejects `Transformation` (line 372-376). This needs to be handled — likely by compiling the encoded side of the transformation (which is a plain `Union` of two `TypeLiteral`s).
3. **`ConvexReactClient.watchQuery` API**: Verify the exact API surface — `watchQuery`, `localQueryResult`, `onUpdate` — and whether they're public/stable.
4. **Error schema accepts any `Schema.Schema.AnyNoContext`** (resolved): The `error` field accepts any Effect Schema — `Schema.TaggedError`, a `Schema.Union` of them, `Schema.Class`, `Schema.Struct`, etc. This matches Effect's model where `Effect.fail` accepts any value as a typed domain error, while `Effect.die` and uncaught exceptions are for unrecoverable defects. Defects bypass the error schema entirely — they reject `Effect.runPromise` → become Convex server errors → land in TanStack's `error` channel. No validation of the error schema shape is needed at registration time; the developer is responsible for ensuring `Effect.fail` values match their declared schema.
