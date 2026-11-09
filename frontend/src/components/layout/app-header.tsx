import { NavLink } from "react-router";
import { cn } from "@/lib/utils";
import { WalletMenu } from "@/wallet";
import { BrandLink } from "./brand";
import { NetworkStatus } from "./network-status";

const links = [
  { to: "/", label: "Eleições", end: true },
  { to: "/register", label: "Cadastro", end: false },
  { to: "/admin", label: "Autoridade", end: false },
];

/** Marca e rede à esquerda, navegação no centro, carteira à direita (no celular, a navegação desce). */
export function AppHeader() {
  return (
    <header className="border-b">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-x-6 gap-y-3 px-6 py-4 md:grid-cols-[1fr_auto_1fr]">
        <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3">
          <BrandLink />
          <NetworkStatus />
        </div>

        <nav
          aria-label="Principal"
          className="col-span-2 row-start-2 flex items-center justify-center gap-6 text-sm md:col-span-1 md:col-start-2 md:row-start-1"
        >
          {links.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="col-start-2 row-start-1 justify-self-end md:col-start-3">
          <WalletMenu />
        </div>
      </div>
    </header>
  );
}
