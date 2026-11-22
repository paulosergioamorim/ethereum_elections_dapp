import { valibotResolver } from "@hookform/resolvers/valibot";
import { BanknoteArrowDownIcon, Loader2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import { formatEther, type Address } from "viem";
import { FieldError } from "@/components/field-error";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appChain } from "@/lib/chain";
import { useWallet } from "@/wallet";
import { useWithdraw } from "../hooks";
import { withdrawSchema, type WithdrawInput, type WithdrawValues } from "../withdraw";

/** Sacar de um contrato de doações (partido ou candidato): só o `owner` vê. O destino começa no endereço dele. */
export function WithdrawCard({
  target,
  owner,
  balance,
  holder = "partido",
  idPrefix = "withdraw",
}: {
  target: Address;
  /** Quem saca: o presidente do partido ou a carteira do candidato. */
  owner: Address;
  /** Saldo em wei. */
  balance: bigint;
  holder?: "partido" | "candidato";
  /** Prefixo dos ids dos campos: precisa ser único quando há mais de um formulário na página. */
  idPrefix?: string;
}) {
  // react-hook-form: o React Compiler memoizaria `register` e o `reset` não limparia os campos (AD-001)
  "use no memo";

  const { isWrongChain } = useWallet();
  const withdraw = useWithdraw(target);
  const { register, handleSubmit, setValue, resetField, clearErrors, formState } = useForm<WithdrawValues, unknown, WithdrawInput>({
    defaultValues: { to: owner, amount: "" },
    // o saldo muda: o schema é montado com o de agora
    resolver: valibotResolver(withdrawSchema(balance, holder)),
    reValidateMode: "onSubmit",
  });
  const { errors } = formState;
  const reason = isWrongChain ? `Troque a carteira para a ${appChain.name}.` : undefined;

  const onSubmit = handleSubmit((input) => {
    if (reason) {
      return;
    }

    withdraw.mutate(input, { onSuccess: () => resetField("amount", { defaultValue: "" }) });
  });

  return (
    <SectionCard
      layout="stacked"
      icon={BanknoteArrowDownIcon}
      title="Sacar"
      description={`Só ${holder === "partido" ? "o presidente" : "a carteira do candidato"} saca. Confira o destino: a transação não tem volta.`}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-to`}>Destino</Label>
          <Input
            id={`${idPrefix}-to`}
            {...register("to", { onChange: () => clearErrors("to") })}
            className="font-mono"
            aria-invalid={!!errors.to}
            aria-describedby={errors.to ? `${idPrefix}-to-error` : undefined}
          />
          <FieldError id={`${idPrefix}-to-error`} message={errors.to?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-amount`}>Valor em ETH</Label>
          <div className="flex gap-2">
            <Input
              id={`${idPrefix}-amount`}
              inputMode="decimal"
              {...register("amount", { onChange: () => clearErrors("amount") })}
              placeholder="0,1"
              aria-invalid={!!errors.amount}
              aria-describedby={errors.amount ? `${idPrefix}-amount-error` : undefined}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setValue("amount", formatEther(balance));
                clearErrors("amount");
              }}
            >
              Sacar tudo
            </Button>
          </div>
          <FieldError id={`${idPrefix}-amount-error`} message={errors.amount?.message} />
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
