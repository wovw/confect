import {
  QueryClient,
  QueryClientProvider,
  type QueryClientConfig,
} from "@tanstack/react-query";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { type JSX, useEffect, useMemo, type ReactNode } from "react";
import { ConfectQueryClient } from "./ConfectQueryClient";

export type ConfectQueryProviderProps = {
  readonly children: ReactNode;
  readonly url: string;
  readonly convexClient?: ConvexReactClient;
  readonly queryClient?: QueryClient;
  readonly queryClientConfig?: QueryClientConfig;
};

export const ConfectQueryProvider = ({
  children,
  url,
  convexClient: providedConvexClient,
  queryClient: providedQueryClient,
  queryClientConfig,
}: ConfectQueryProviderProps): JSX.Element => {
  const convexClient = useMemo(
    () => providedConvexClient ?? new ConvexReactClient(url),
    [providedConvexClient, url],
  );

  const confectQueryClient = useMemo(
    () => new ConfectQueryClient(convexClient),
    [convexClient],
  );

  const queryClient = useMemo(() => {
    if (providedQueryClient) {
      const defaults = providedQueryClient.getDefaultOptions();
      providedQueryClient.setDefaultOptions({
        ...defaults,
        queries: {
          ...defaults.queries,
          queryKeyHashFn: confectQueryClient.hashFn(),
          queryFn: confectQueryClient.queryFn(defaults.queries?.queryFn as any),
        },
      });

      return providedQueryClient;
    }

    return new QueryClient({
      ...queryClientConfig,
      defaultOptions: {
        ...queryClientConfig?.defaultOptions,
        queries: {
          ...queryClientConfig?.defaultOptions?.queries,
          queryKeyHashFn: confectQueryClient.hashFn(),
          queryFn: confectQueryClient.queryFn(
            queryClientConfig?.defaultOptions?.queries?.queryFn as any,
          ),
        },
      },
    });
  }, [providedQueryClient, queryClientConfig, confectQueryClient]);

  useEffect(() => {
    return confectQueryClient.connect(queryClient);
  }, [confectQueryClient, queryClient]);

  return (
    <ConvexProvider client={convexClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ConvexProvider>
  );
};
