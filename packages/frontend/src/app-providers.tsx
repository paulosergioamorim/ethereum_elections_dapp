import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "@/components/ui/sonner";
import { createQueryClient } from "@/lib/query-client";
import { WalletProvider } from "@/wallet";

const queryClient = createQueryClient();

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>{children}</WalletProvider>
        <Toaster />
        {/* só aparece em desenvolvimento: o build de produção troca por um componente vazio */}
        <ReactQueryDevtools buttonPosition="bottom-left" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
