import { Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "../hooks";
import { AccountSwitcher } from "./account-switcher";
import { ConnectWalletButton } from "./connect-wallet-button";

/**
 * Canto da carteira no cabeçalho: conectar ou mostrar a conta ativa.
 * A rede errada é avisada numa faixa abaixo do cabeçalho (`StatusBanners`).
 */
export function WalletMenu() {
  const { status } = useWallet();

  if (status === "reconnecting") {
    return (
      <Button variant="outline" disabled>
        <Loader2Icon className="animate-spin" />
        Reconectando…
      </Button>
    );
  }

  if (status === "disconnected") {
    return <ConnectWalletButton />;
  }

  return <AccountSwitcher />;
}
