import { NavLink, useLocation } from "react-router";
import { useAuthority } from "@/factory";
import { cn } from "@/lib/utils";
import { WalletMenu } from "@/wallet";
import { BallotMark, BrandLink } from "./brand";
import { NetworkStatus } from "./network-status";

const links = [
  { to: "/", label: "Eleições", end: true },
  { to: "/register", label: "Registro", end: false },
  { to: "/about", label: "Sobre", end: false },
];

/** Só para a conta dona da factory: as outras nem veem a aba (e a rota mostra o `AuthorityGuard`). */
const authorityLink = { to: "/admin", label: "Autoridade", end: false };

/**
 * No computador, uma coluna fixa à esquerda: marca, navegação e, no pé, rede e carteira.
 * No celular, vira uma barra no topo (marca e carteira) e a navegação desce para o pé da tela.
 */
export function AppHeader() {
  const { isAuthority } = useAuthority();
  const visibleLinks = isAuthority ? [...links, authorityLink] : links;
  // a página de uma eleição também pertence a "Eleições"
  const onElection = useLocation().pathname.startsWith("/elections/");

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b bg-background px-5 py-3 lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:flex-col lg:items-stretch lg:justify-start lg:gap-10 lg:border-r lg:border-b-0 lg:px-6 lg:py-8">
      <BrandLink />

      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-background lg:static lg:flex-col lg:gap-1 lg:border-t-0"
      >
        {visibleLinks.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1.5 px-2 pt-2.5 pb-3 text-xs font-medium transition-colors lg:-mx-2 lg:flex-none lg:flex-row lg:gap-3 lg:rounded lg:px-2 lg:py-2 lg:text-[0.95rem]",
                isActive || (end && onElection)
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <BallotMark marked={isActive || (end && onElection)} className="size-4" />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-4 lg:mt-auto lg:flex-col lg:items-stretch">
        <NetworkStatus className="hidden sm:flex" />
        <WalletMenu className="lg:w-full lg:justify-start" />
      </div>
    </header>
  );
}
