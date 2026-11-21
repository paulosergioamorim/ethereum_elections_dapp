import { Loader2Icon, UserRoundPlusIcon } from "lucide-react";
import type { SubmitEvent } from "react";
import type { Address } from "viem";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { appChain } from "@/lib/chain";
import { useFormState } from "@/lib/use-form-state";
import { useWallet } from "@/wallet";
import { validateCreateCandidateForm, type CreateCandidateValues } from "../forms";
import { useCreateCandidate } from "../hooks";

const emptyForm: CreateCandidateValues = { candidate: "", name: "" };

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  return message ? (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

/** Criar um candidato do partido: só o presidente vê. A carteira do candidato é quem saca as doações dele. */
export function CreateCandidateCard({ party }: { party: Address }) {
  const { isWrongChain } = useWallet();
  const createCandidate = useCreateCandidate(party);
  const { values, errors, setErrors, update, reset } = useFormState<CreateCandidateValues>(emptyForm);
  const reason = isWrongChain ? `Troque a carteira para a ${appChain.name}.` : undefined;

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const { errors: found, input } = validateCreateCandidateForm(values);
    setErrors(found);

    if (!input || reason) {
      return;
    }

    createCandidate.mutate(input, { onSuccess: reset });
  }

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
            value={values.name}
            onChange={(event) => update("name", event.target.value)}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "candidate-name-error" : undefined}
          />
          <FieldError id="candidate-name-error" message={errors.name} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="candidate-wallet">Carteira do candidato</Label>
          <Input
            id="candidate-wallet"
            value={values.candidate}
            onChange={(event) => update("candidate", event.target.value)}
            placeholder="0x…"
            className="font-mono"
            aria-invalid={!!errors.candidate}
            aria-describedby={errors.candidate ? "candidate-wallet-error" : undefined}
          />
          <FieldError id="candidate-wallet-error" message={errors.candidate} />
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
