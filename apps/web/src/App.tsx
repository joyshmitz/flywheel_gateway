import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { useThemeEffect } from "./hooks/useThemeEffect";
import { WebSocketProvider } from "./lib/websocket-context";
import { router } from "./router";

/**
 * TanStack Query client configuration.
 *
 * NOTE: The current custom hooks (useFleet, useDCG, etc.) use their own
 * fetch/state pattern with mock mode support. This QueryClient is configured
 * with optimal defaults for when those hooks are migrated to TanStack Query.
 *
 * Data classification for gcTime:
 * - Hot paths (dashboard, agents): 10 min - frequently updated via WebSocket
 * - Warm paths (fleet, pipelines): 20 min - moderate update frequency
 * - Cold paths (settings, accounts): 30 min - rarely changes
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: Data is fresh for 30 seconds before refetch on access
      staleTime: 30_000,

      // GC time: Keep unused data in cache for 20 minutes
      // Adjust per-query for hot (10min) vs cold (30min) paths
      gcTime: 20 * 60 * 1000,

      // Retry with exponential backoff: 1s, 2s, 4s
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 8000),

      // Don't refetch on window focus (WebSocket handles updates)
      refetchOnWindowFocus: false,

      // Don't refetch on reconnect (WebSocket handles state sync)
      refetchOnReconnect: false,

      // Network mode: offlineFirst for WebSocket-updated queries
      // Individual queries can override with networkMode: 'always' if needed
      networkMode: "offlineFirst",
    },
    mutations: {
      // Retry mutations once with backoff
      retry: 1,
      retryDelay: 1000,
    },
  },
});

export function App() {
  useThemeEffect();

  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <RouterProvider router={router} />
      </WebSocketProvider>
    </QueryClientProvider>
  );
}
