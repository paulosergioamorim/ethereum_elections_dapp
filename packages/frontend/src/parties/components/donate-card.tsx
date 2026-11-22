import { valibotResolver } from "@hookform/resolvers/valibot";
import { HandCoinsIcon, Loader2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import type { Address } from "viem";
import { FieldError } from "@/components/field-error";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appChain } from "@/lib/chain";
import { useWallet } from "@/wallet";
import { donateSchema } from "../amount";
import { useDonate } from "../hooks";

/** Doar ETH a um contrato de doações (partido ou candidato). Sem carteira (ou na rede errada), o botão se desabilita com o motivo. */
export function DonateCard({
  target,
  description = "O valor vai para o saldo do partido; só o presidente saca.",
  idPrefix = "donate",
}: {
  target: Address;
  description?: string;
  /** Prefixo dos ids dos campos: precisa ser único quando há mais de um formulário na página. */
  idPrefix?: string;
}) {
  // react-hook-form: o React Compiler memoizaria `register` e o `reset` não limparia os campos (AD-001)
  "use no memo";

  const { status, isWrongChain } = useWallet();
  const donate = useDonate(target);
  const { register, handleSubmit, reset, clearErrors, formState } = useForm({
    defaultValues: { amount: "" },
    resolver: valibotResolver(donateSchema),
    reValidateMode: "onSubmit",
  });
  const { errors } = formState;

  const reason =
    status !== "connected"
      ? "Conecte a carteira para doar."
      : isWrongChain
        ? `Troque a carteira para a ${appChain.name}.`
        : undefined;

  const onSubmit = handleSubmit(({ amount }) => {
    if (reason) {
      return;
    }

    donate.mutate(amount, { onSuccess: () => reset() });
  });

  return (
    <SectionCard
      layout="stacked"
      icon={HandCoinsIcon}
      title="Doar"
      description={description}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-amount`}>Valor em ETH</Label>
          <Input
            id={`${idPrefix}-amount`}
            inputMode="decimal"
            {...register("amount", { onChange: () => clearErrors("amount") })}
            placeholder="0,1"
            aria-invalid={!!errors.amount}
            aria-describedby={errors.amount ? `${idPrefix}-amount-error` : undefined}
          />
          <FieldError id={`${idPrefix}-amount-error`} message={errors.amount?.message} />
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
