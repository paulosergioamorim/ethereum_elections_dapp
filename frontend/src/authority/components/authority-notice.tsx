import { ShieldAlertIcon } from "lucide-react";
import { Banner } from "@/components/banner";
import { Button } from "@/components/ui/button";
import { useAuthority } from "@/factory";
import { shortAddress } from "@/lib/format";
import { useWallet } from "@/wallet";

/**
 * Avisa quando a conta ativa não é a dona da factory. Se a conta da autoridade já estiver entre as
 * autorizadas na carteira, oferece trocar para ela ali mesmo, sem abrir a carteira.
 */
export function AuthorityNotice() {
  const { status, isWrongChain, accounts, selectAccount } = useWallet();
  const { owner, isAuthority } = useAuthority();

  if (status !== "connected" || isWrongChain || !owner || isAuthority) {
    return null;
  }

  const ownerAccount = accounts.find((account) => account.toLowerCase() === owner.toLowerCase());

  return (
    <Banner
      variant="warning"
      icon={ShieldAlertIcon}
      action={
        ownerAccount && (
          <Button
            variant="outline"
            size="sm"
            className="bg-card"
            onClick={() => selectAccount(ownerAccount)}
          >
            Usar a conta da autoridade
          </Button>
        )
      }
    >
      A conta ativa não é a autoridade desta factory. Para administrar, use a conta{" "}
      <span className="font-mono">{shortAddress(owner)}</span>.
    </Banner>
  );
}
