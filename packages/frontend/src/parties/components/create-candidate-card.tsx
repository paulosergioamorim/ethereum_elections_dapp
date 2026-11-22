import { valibotResolver } from "@hookform/resolvers/valibot";
import { Loader2Icon, UserRoundPlusIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import type { Address } from "viem";
import { FieldError } from "@/components/field-error";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appChain } from "@/lib/chain";
import { useWallet } from "@/wallet";
import { createCandidateSchema, type CreateCandidateValues } from "../forms";
import { useCreateCandidate } from "../hooks";

const emptyForm: CreateCandidateValues = { candidate: "", name: "" };

/** Criar um candidato do partido: só o presidente vê. A carteira do candidato é quem saca as doações dele. */
export function CreateCandidateCard({ party }: { party: Address }) {
  // react-hook-form: o React Compiler memoizaria `register` e o `reset` não limparia os campos (AD-001)
  "use no memo";

  const { isWrongChain } = useWallet();
  const createCandidate = useCreateCandidate(party);
  const { register, handleSubmit, reset, clearErrors, formState } = useForm({
    defaultValues: emptyForm,
    reValidateMode: "onSubmit",
    resolver: valibotResolver(createCandidateSchema),
  });
  const { errors } = formState;
  const reason = isWrongChain ? `Troque a carteira para a ${appChain.name}.` : undefined;

  const onSubmit = handleSubmit((input) => {
    if (reason) {
      return;
    }

    createCandidate.mutate(input, { onSuccess: () => reset() });
  });

  return (
    <SectionCard
      layout="stacked"
      icon={UserRoundPlusIcon}
      title="Criar candidato"
      description="Nome e carteira. Só a carteira do candidato saca as doações dele."
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="candidate-name">Nome do candidato</Label>
          <Input
            id="candidate-name"
            {...register("name", { onChange: () => clearErrors("name") })}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "candidate-name-error" : undefined}
          />
          <FieldError id="candidate-name-error" message={errors.name?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="candidate-wallet">Carteira do candidato</Label>
          <Input
            id="candidate-wallet"
            {...register("candidate", { onChange: () => clearErrors("candidate") })}
            placeholder="0x…"
            className="font-mono"
            aria-invalid={!!errors.candidate}
            aria-describedby={errors.candidate ? "candidate-wallet-error" : undefined}
          />
          <FieldError id="candidate-wallet-error" message={errors.candidate?.message} />
        </div>

        <Button type="submit" className="h-10 w-full" disabled={!!reason || createCandidate.isPending}>
          {createCandidate.isPending && <Loader2Icon className="animate-spin" />}
          Criar candidato
        </Button>

        {reason && <p className="text-center text-xs text-muted-foreground">{reason}</p>}
      </form>
    </SectionCard>
  );
}
