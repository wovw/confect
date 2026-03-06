import type {
  QueryClient,
  QueryFunction,
  QueryKey,
} from "@tanstack/react-query";
import type { ConvexReactClient } from "convex/react";
import { Schema } from "effect";
import {
  decodeFunctionResult,
  isConfectQueryKey,
  isConfectQueryMeta,
  normalizeConfectHash,
} from "./internal";

type Subscription = {
  readonly unsubscribeWatch: () => void;
};

type QueryDescriptor = {
  readonly queryKey: QueryKey;
  readonly functionName: string;
  readonly args: unknown;
  readonly meta: Record<string, unknown> & { __confect: true };
};

export class ConfectQueryClient {
  private readonly subscriptions = new Map<string, Subscription>();
  private queryCacheUnsubscribe: (() => void) | undefined;

  constructor(readonly convexClient: ConvexReactClient) {}

  hashFn(): (queryKey: QueryKey) => string {
    return (queryKey) => normalizeConfectHash(queryKey);
  }

  queryFn(
    fallbackQueryFn?: QueryFunction<unknown, QueryKey>,
  ): QueryFunction<unknown, QueryKey> {
    return async (context) => {
      const descriptor = this.getDescriptor(context.queryKey, context.meta);
      if (descriptor === undefined) {
        if (fallbackQueryFn) return fallbackQueryFn(context);
        throw new Error(
          "ConfectQueryClient.queryFn received a non-confect query.",
        );
      }
      if (descriptor.args === "skip") return;

      const encodedArgs = Schema.encodeSync(
        (descriptor.meta as any).function_.args,
      )(descriptor.args);
      const rawResult = await (this.convexClient as any).query(
        descriptor.functionName,
        encodedArgs,
      );
      return decodeFunctionResult(
        (descriptor.meta as any).function_,
        rawResult,
      );
    };
  }

  connect(queryClient: QueryClient): () => void {
    this.disconnect();

    this.queryCacheUnsubscribe = queryClient
      .getQueryCache()
      .subscribe((event) => {
        if (event?.type === "removed") {
          this.teardownSubscription(event.query?.queryHash);
          return;
        }

        const query = event?.query;
        if (query === undefined) return;

        if ((query.getObserversCount?.() ?? 0) <= 0) {
          this.teardownSubscription(query.queryHash);
          return;
        }

        this.ensureSubscription(queryClient, query);
      });

    for (const query of queryClient.getQueryCache().getAll()) {
      this.ensureSubscription(queryClient, query);
    }

    return () => this.disconnect();
  }

  disconnect(): void {
    this.queryCacheUnsubscribe?.();
    this.queryCacheUnsubscribe = undefined;

    for (const [hash, subscription] of this.subscriptions.entries()) {
      this.subscriptions.delete(hash);
      subscription.unsubscribeWatch();
    }
  }

  private ensureSubscription(
    queryClient: QueryClient,
    query: {
      queryKey: QueryKey;
      queryHash: string;
      meta?: Record<string, unknown> | undefined;
    },
  ): void {
    if (this.subscriptions.has(query.queryHash)) return;

    const descriptor = this.getDescriptor(query.queryKey, query.meta);
    if (descriptor === undefined || descriptor.args === "skip") return;

    const encodedArgs = Schema.encodeSync(
      (descriptor.meta as any).function_.args,
    )(descriptor.args);

    const watch = (this.convexClient as any).watchQuery(
      descriptor.functionName,
      encodedArgs,
    );

    const unsubscribeWatch = watch.onUpdate(() => {
      try {
        const local = watch.localQueryResult();
        if (local === undefined) return;
        const decoded = decodeFunctionResult(
          (descriptor.meta as any).function_,
          local,
        );
        queryClient.setQueryData(descriptor.queryKey, decoded);
      } catch {
        queryClient.invalidateQueries({ queryKey: descriptor.queryKey });
      }
    });

    this.subscriptions.set(query.queryHash, { unsubscribeWatch });
  }

  private teardownSubscription(queryHash: string | undefined): void {
    if (queryHash === undefined) return;
    const subscription = this.subscriptions.get(queryHash);
    if (subscription === undefined) return;
    this.subscriptions.delete(queryHash);
    subscription.unsubscribeWatch();
  }

  private getDescriptor(
    queryKey: QueryKey,
    meta: Record<string, unknown> | undefined,
  ): QueryDescriptor | undefined {
    if (!isConfectQueryKey(queryKey) || !isConfectQueryMeta(meta)) return;
    return {
      queryKey,
      functionName: `${(queryKey as readonly unknown[])[1]}`,
      args: (queryKey as readonly unknown[])[2],
      meta,
    };
  }
}
