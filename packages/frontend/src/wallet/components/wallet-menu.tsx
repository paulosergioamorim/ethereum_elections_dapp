import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "../hooks";
import { AccountSwitcher } from "./account-switcher";
import { ConnectWalletButton } from "./connect-wallet-button";

/**
 * Canto da carteira na navegação: conectar ou mostrar a conta ativa.
 * A rede errada é avisada numa faixa abaixo do cabeçalho (`StatusBanners`).
 */
export function WalletMenu({ className }: { className?: string }) {
  const { status } = useWallet();

  if (status === "reconnecting") {
    return (
      <Button variant="outline" className={className} disabled>
        <Loader2Icon className="animate-spin" />
        Reconectando…
      </Button>
    );
  }

  if (status === "disconnected") {
    return <ConnectWalletButton className={className} />;
  }

  return <AccountSwitcher className={className} />;
}
