/** Providers around the router: the query client and the router itself. */

import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import type { createAppRouter } from "./routes/router";

export function App({
  router,
  queryClient,
}: {
  router: ReturnType<typeof createAppRouter>;
  queryClient: QueryClient;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
