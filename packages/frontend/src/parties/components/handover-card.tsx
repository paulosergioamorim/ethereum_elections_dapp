import { valibotResolver } from "@hookform/resolvers/valibot";
import { KeyRoundIcon, Loader2Icon } from "lucide-react";
import { useForm } from "react-hook-form";
import type { Address } from "viem";
import { FieldError } from "@/components/field-error";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appChain } from "@/lib/chain";
import { useWallet } from "@/wallet";
import { handoverSchema } from "../forms";
import { useAcceptPresidency, useTransferPresidency } from "../hooks";

/** Passar a presidência: o presidente indica o sucessor, que ainda precisa aceitar. */
export function HandoverCard({ party }: { party: Address }) {
  // react-hook-form: o React Compiler memoizaria `register` e o `reset` não limparia os campos (AD-001)
  "use no memo";

  const { isWrongChain } = useWallet();
  const transfer = useTransferPresidency(party);
  const { register, handleSubmit, reset, clearErrors, formState } = useForm({
    defaultValues: { successor: "" },
    resolver: valibotResolver(handoverSchema),
    reValidateMode: "onSubmit",
  });
  const { errors } = formState;
  const reason = isWrongChain ? `Troque a carteira para a ${appChain.name}.` : undefined;

  const onSubmit = handleSubmit(({ successor }) => {
    if (reason) {
      return;
    }

    transfer.mutate(successor, { onSuccess: () => reset() });
  });

  return (
    <SectionCard
      layout="stacked"
      icon={KeyRoundIcon}
      title="Passar a presidência"
      description="Você continua presidente até o sucessor aceitar."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="handover-successor">Endereço do novo presidente</Label>
          <Input
            id="handover-successor"
            {...register("successor", { onChange: () => clearErrors("successor") })}
            placeholder="0x…"
            className="font-mono"
            aria-invalid={!!errors.successor}
            aria-describedby={errors.successor ? "handover-successor-error" : undefined}
          />
          <FieldError id="handover-successor-error" message={errors.successor?.message} />
        </div>

        <Button type="submit" className="h-10 w-full" disabled={!!reason || transfer.isPending}>
          {transfer.isPending && <Loader2Icon className="animate-spin" />}
          Passar a presidência
        </Button>

        {reason && <p className="text-center text-xs text-muted-foreground">{reason}</p>}
      </form>
    </SectionCard>
  );
}

/** Aceitar a presidência: só aparece para a conta indicada pelo presidente. */
export function AcceptCard({ party }: { party: Address }) {
  const { isWrongChain } = useWallet();
  const accept = useAcceptPresidency(party);
  const reason = isWrongChain ? `Troque a carteira para a ${appChain.name}.` : undefined;

  return (
    <SectionCard
      layout="stacked"
      icon={KeyRoundIcon}
      title="Você foi indicado presidente"
      description="Aceite para assumir o partido e poder sacar as doações."
    >
      <Button
        className="h-10 w-full"
        disabled={!!reason || accept.isPending}
        onClick={() => accept.mutate()}
      >
        {accept.isPending && <Loader2Icon className="animate-spin" />}
        Aceitar a presidência
      </Button>

      {reason && <p className="mt-3 text-center text-xs text-muted-foreground">{reason}</p>}
    </SectionCard>
  );
}
