import { WalletIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Banner } from "@/components/banner";
import { useWallet } from "../hooks";
import { ConnectWalletButton } from "./connect-wallet-button";

/**
 * Convite para conectar, nas páginas que assinam ou enviam transações. A página continua visível:
 * os controles que precisam de carteira se desabilitam sozinhos (via `useWallet`).
 * Some quando há conta conectada; a rede errada tem o seu próprio aviso no layout.
 */
export function ConnectWalletNotice({ children }: { children: ReactNode }) {
  const { status } = useWallet();

  if (status !== "disconnected") {
    return null;
  }

  return (
    <Banner
      icon={WalletIcon}
      action={<ConnectWalletButton variant="outline" size="sm" className="bg-card" arrow />}
    >
      {children}
    </Banner>
  );
}
