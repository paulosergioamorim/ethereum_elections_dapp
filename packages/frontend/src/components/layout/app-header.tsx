import { MenuIcon } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuthority } from "@/factory";
import { cn } from "@/lib/utils";
import { WalletMenu } from "@/wallet";
import { BrandLink } from "./brand";
import { NetworkStatus } from "./network-status";

const links = [
  { to: "/", label: "Eleições", end: true },
  { to: "/parties", label: "Partidos", end: false },
  { to: "/register", label: "Registro", end: false },
  { to: "/about", label: "Sobre", end: false },
];

/** Só para a conta dona da factory: as outras nem veem a aba (e a rota mostra o `AuthorityGuard`). */
const authorityLink = { to: "/admin", label: "Autoridade", end: false };

const linkClassName = ({ isActive }: { isActive: boolean }) =>
  cn("font-medium transition-colors", isActive ? "text-primary" : "text-muted-foreground hover:text-foreground");

/** Marca e rede à esquerda, navegação no centro, carteira à direita (abaixo de `lg`, tudo vai para o menu lateral). */
export function AppHeader() {
  const { isAuthority } = useAuthority();
  const visibleLinks = isAuthority ? [...links, authorityLink] : links;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="border-b">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:gap-6">
        <div className="flex min-w-0 items-center gap-3 lg:shrink-0">
          <BrandLink />
          <div className="hidden sm:block">
            <NetworkStatus />
          </div>
        </div>

        <nav aria-label="Principal" className="hidden items-center justify-center gap-6 text-sm lg:flex lg:flex-1">
          {visibleLinks.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClassName}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:block lg:shrink-0">
          <WalletMenu />
        </div>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Abrir menu">
              <MenuIcon />
            </Button>
          </SheetTrigger>

          <SheetContent side="right" className="w-72 max-w-[85vw]">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
              <SheetDescription className="sr-only">Navegação e carteira</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-6 px-4 pb-6">
              <nav aria-label="Principal" className="flex flex-col gap-4 text-base">
                {visibleLinks.map(({ to, label, end }) => (
                  <NavLink key={to} to={to} end={end} className={linkClassName} onClick={() => setMenuOpen(false)}>
                    {label}
                  </NavLink>
                ))}
              </nav>

              <WalletMenu />
              <div className="sm:hidden">
                <NetworkStatus />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
