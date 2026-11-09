import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { createQueryClient } from "@/lib/query-client";
import { routes } from "@/router";
import { WalletProvider } from "@/wallet";

/** Providers do app com um QueryClient novo (cache isolado por teste e sem novas tentativas). */
export function createWrapper() {
  const queryClient = createQueryClient({ queries: { retry: false } });

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <WalletProvider>{children}</WalletProvider>
      </QueryClientProvider>
    );
  };
}

/** Renderiza as rotas reais do app num router em memória, começando em `path`. */
export function renderRoute(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });

  return render(<RouterProvider router={router} />, { wrapper: createWrapper() });
}
