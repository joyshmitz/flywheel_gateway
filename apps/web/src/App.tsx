import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { router } from "./router";
import { RouterProvider } from "@tanstack/react-router";
import { WebSocketProvider } from "./lib/websocket-context";
import { useThemeEffect } from "./hooks/useThemeEffect";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,
      retry: 1,
      refetchOnWindowFocus: false,
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
