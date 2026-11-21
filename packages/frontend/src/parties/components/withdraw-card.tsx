import { BanknoteArrowDownIcon, Loader2Icon } from "lucide-react";
import { useState, type SubmitEvent } from "react";
import { formatEther, type Address } from "viem";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appChain } from "@/lib/chain";
import { useWallet } from "@/wallet";
import { useWithdraw } from "../hooks";
import { validateWithdrawForm, type WithdrawErrors } from "../withdraw";

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  return message ? (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

/** Sacar de um contrato de doações (partido ou candidato): só o `owner` vê. O destino começa no endereço dele. */
export function WithdrawCard({
  target,
  owner,
  balance,
  holder = "partido",
}: {
  target: Address;
  /** Quem saca: o presidente do partido ou a carteira do candidato. */
  owner: Address;
  /** Saldo em wei. */
  balance: bigint;
  holder?: "partido" | "candidato";
}) {
  const { isWrongChain } = useWallet();
  const withdraw = useWithdraw(target);
  const [values, setValues] = useState({ to: owner as string, amount: "" });
  const [errors, setErrors] = useState<WithdrawErrors>({});
  const reason = isWrongChain ? `Troque a carteira para a ${appChain.name}.` : undefined;

  function update(field: "to" | "amount", value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const { errors: found, input } = validateWithdrawForm(values, balance, holder);
    setErrors(found);

    if (!input || reason) {
      return;
    }

    withdraw.mutate(input, { onSuccess: () => update("amount", "") });
  }

  return (
    <SectionCard
      layout="stacked"
      icon={BanknoteArrowDownIcon}
      title="Sacar"
      description={`Só ${holder === "partido" ? "o presidente" : "a carteira do candidato"} saca. Confira o destino: a transação não tem volta.`}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="withdraw-to">Destino</Label>
          <Input
            id="withdraw-to"
            value={values.to}
            onChange={(event) => update("to", event.target.value)}
            className="font-mono"
            aria-invalid={!!errors.to}
            aria-describedby={errors.to ? "withdraw-to-error" : undefined}
          />
          <FieldError id="withdraw-to-error" message={errors.to} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="withdraw-amount">Valor em ETH</Label>
          <div className="flex gap-2">
            <Input
              id="withdraw-amount"
              inputMode="decimal"
              value={values.amount}
              onChange={(event) => update("amount", event.target.value)}
              placeholder="0,1"
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? "withdraw-amount-error" : undefined}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => update("amount", formatEther(balance))}
            >
              Sacar tudo
            </Button>
          </div>
          <FieldError id="withdraw-amount-error" message={errors.amount} />
        </div>

        <Button type="submit" className="h-10 w-full" disabled={!!reason || withdraw.isPending}>
          {withdraw.isPending && <Loader2Icon className="animate-spin" />}
          Sacar
        </Button>

        {reason && <p className="text-center text-xs text-muted-foreground">{reason}</p>}
      </form>
    </SectionCard>
  );
}
