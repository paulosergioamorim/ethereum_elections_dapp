import { Outlet } from "react-router";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { StatusBanners } from "@/components/layout/status-banners";

export function RootLayout() {
  return (
    <div className="min-h-svh lg:pl-60">
      <AppHeader />

      {/* no celular, o pé da página fica acima da navegação fixa */}
      <div className="mx-auto flex min-h-svh max-w-5xl flex-col px-5 pb-24 lg:px-12 lg:pb-0">
        <main className="flex-1 space-y-10 py-8 lg:py-14">
          <StatusBanners />
          <Outlet />
        </main>

        <AppFooter />
      </div>
    </div>
  );
}
