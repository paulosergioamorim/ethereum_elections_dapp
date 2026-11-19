import { Outlet } from "react-router";
import { AppFooter } from "@/components/layout/app-footer";
import { AppHeader } from "@/components/layout/app-header";
import { StatusBanners } from "@/components/layout/status-banners";

export function RootLayout() {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 px-6 py-10">
        <StatusBanners />
        <Outlet />
      </main>

      <AppFooter />
    </div>
  );
}
