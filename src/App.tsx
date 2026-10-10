/**
 * Providers around the router: the query client and the router itself. A language change
 * remounts the tree (`key`), so every `t()` reads the new catalog.
 */

import { type QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { setLocale } from "./i18n";
import type { createAppRouter } from "./routes/router";
import { useSettings } from "./store/settings";

export function App({
  router,
  queryClient,
}: {
  router: ReturnType<typeof createAppRouter>;
  queryClient: QueryClient;
}) {
  const locale = useSettings((s) => s.settings.locale);
  setLocale(locale);
  return (
    <QueryClientProvider client={queryClient} key={locale}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
