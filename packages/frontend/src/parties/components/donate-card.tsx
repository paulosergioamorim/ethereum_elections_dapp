import { HandCoinsIcon, Loader2Icon } from "lucide-react";
import { useState, type SubmitEvent } from "react";
import type { Address } from "viem";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appChain } from "@/lib/chain";
import { useWallet } from "@/wallet";
import { parseEthAmount } from "../amount";
import { useDonate } from "../hooks";

/** Doar ETH a um contrato de doações (partido ou candidato). Sem carteira (ou na rede errada), o botão se desabilita com o motivo. */
export function DonateCard({
  target,
  description = "O valor vai para o saldo do partido; só o presidente saca.",
}: {
  target: Address;
  description?: string;
}) {
  const { status, isWrongChain } = useWallet();
  const donate = useDonate(target);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string>();

  const reason =
    status !== "connected"
      ? "Conecte a carteira para doar."
      : isWrongChain
        ? `Troque a carteira para a ${appChain.name}.`
        : undefined;

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseEthAmount(amount);
    setError("error" in parsed ? parsed.error : undefined);

    if ("error" in parsed || reason) {
      return;
    }

    donate.mutate(parsed.wei, { onSuccess: () => setAmount("") });
  }

  return (
    <SectionCard
      layout="stacked"
      icon={HandCoinsIcon}
      title="Doar"
      description={description}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="donate-amount">Valor em ETH</Label>
          <Input
            id="donate-amount"
            inputMode="decimal"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              setError(undefined);
            }}
            placeholder="0,1"
            aria-invalid={!!error}
            aria-describedby={error ? "donate-amount-error" : undefined}
          />
          {error && (
            <p id="donate-amount-error" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <Button type="submit" className="h-10 w-full" disabled={!!reason || donate.isPending}>
          {donate.isPending && <Loader2Icon className="animate-spin" />}
          Doar
        </Button>

        {reason && <p className="text-center text-xs text-muted-foreground">{reason}</p>}
      </form>
    </SectionCard>
  );
}
