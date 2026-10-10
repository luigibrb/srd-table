/**
 * Providers around the router: the query client and the router itself. A language change
 * remounts the tree (`key`, once `applyLocale` has switched the engine and the app), so every
 * `t()` reads the new catalog.
 */

import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import type { createAppRouter } from "./routes/router";
import { useLocale } from "./store/locale";

export function App({
  router,
  queryClient,
}: {
  router: ReturnType<typeof createAppRouter>;
  queryClient: QueryClient;
}) {
  const locale = useLocale((s) => s.applied);
  return (
    <QueryClientProvider client={queryClient} key={locale}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
