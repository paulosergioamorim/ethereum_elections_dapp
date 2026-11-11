import { ArrowUpRightIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSwitchChain } from "../hooks";

/** Leva a carteira para a rede do app. Fica no aviso de rede errada. */
export function SwitchChainButton() {
  const switchChain = useSwitchChain();

  return (
    <Button
      variant="outline"
      size="sm"
      className="bg-card"
      onClick={() => switchChain.mutate()}
      disabled={switchChain.isPending}
    >
      {switchChain.isPending && <Loader2Icon className="animate-spin" />}
      Trocar rede
      {!switchChain.isPending && <ArrowUpRightIcon />}
    </Button>
  );
}
