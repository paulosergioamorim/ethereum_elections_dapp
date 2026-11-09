import { Loader2Icon } from "lucide-react";
import { Banner } from "@/components/banner";
import { Button } from "@/components/ui/button";
import { appChain } from "@/lib/chain";
import { useBlockNumber } from "@/lib/use-block-number";
import { SwitchChainButton, useWallet } from "@/wallet";

/** Avisos que valem para qualquer página: carteira na rede errada e RPC fora do ar. */
export function StatusBanners() {
  const { isWrongChain } = useWallet();
  const blockNumber = useBlockNumber();

  if (!isWrongChain && !blockNumber.isError) {
    return null;
  }

  return (
    <div className="space-y-3">
      {isWrongChain && (
        <Banner variant="warning" action={<SwitchChainButton />}>
          Sua carteira está em outra rede. Troque para a {appChain.name} (ID {appChain.id}) para
          continuar.
        </Banner>
      )}

      {blockNumber.isError && (
        <Banner
          variant="danger"
          action={
            <Button
              variant="outline"
              size="sm"
              className="bg-card"
              onClick={() => void blockNumber.refetch()}
              disabled={blockNumber.isFetching}
            >
              {blockNumber.isFetching && <Loader2Icon className="animate-spin" />}
              Tentar novamente
            </Button>
          }
        >
          Não foi possível falar com a rede {appChain.name}. As informações podem estar
          desatualizadas.
        </Banner>
      )}
    </div>
  );
}
