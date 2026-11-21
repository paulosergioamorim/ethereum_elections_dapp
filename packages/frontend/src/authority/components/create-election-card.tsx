import { ArrowRightIcon, CalendarPlusIcon, Loader2Icon } from "lucide-react";
import { useState, type SubmitEvent } from "react";
import { Link } from "react-router";
import type { Address } from "viem";
import { Banner } from "@/components/banner";
import { InfoNote } from "@/components/info-note";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthority, useCreateElection } from "@/factory";
import { useFormState } from "@/lib/use-form-state";
import { defaultElectionForm, validateElectionForm, type ElectionFormValues } from "../election-form";

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  return message ? (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

/** Passo 3 da autoridade: criar a eleição, que congela os eleitores registrados até agora. */
export function CreateElectionCard({ registeredVoters }: { registeredVoters: number | undefined }) {
  const { reason } = useAuthority();
  const createElection = useCreateElection();
  // os padrões dependem do horário: `reset` usa os da renderização em que é chamado
  const { values, errors, setErrors, update, reset } = useFormState<ElectionFormValues>(defaultElectionForm());
  const [created, setCreated] = useState<Address | undefined>();

  const blockedReason =
    reason ??
    (registeredVoters === 0
      ? "Registre pelo menos um eleitor antes de criar a eleição."
      : undefined);

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    // validado no envio, com o horário de agora: a margem do início depende dele
    const nowSeconds = Math.floor(Date.now() / 1000);
    const { errors: found, input } = validateElectionForm(values, nowSeconds);
    setErrors(found);

    if (!input || blockedReason) {
      return;
    }

    createElection.mutate(input, {
      onSuccess: (address) => {
        setCreated(address);
        reset();
      },
    });
  }

  return (
    <SectionCard
      layout="stacked"
      icon={CalendarPlusIcon}
      title="Nova eleição"
      description="Título, prazo das indicações e período de votação."
    >
      {created && (
        <div className="mb-5">
          <Banner
            action={
              <Button asChild variant="outline" size="sm" className="bg-card">
                <Link to={`/elections/${created}`}>
                  Abrir eleição
                  <ArrowRightIcon />
                </Link>
              </Button>
            }
          >
            Eleição criada.
          </Banner>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="election-title">Título</Label>
          <Input
            id="election-title"
            value={values.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Representante da turma 2026"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "election-title-error" : undefined}
          />
          <FieldError id="election-title-error" message={errors.title} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="election-nomination-end">Fim das indicações</Label>
          <Input
            id="election-nomination-end"
            type="datetime-local"
            value={values.nominationEnd}
            onChange={(event) => update("nominationEnd", event.target.value)}
            aria-invalid={!!errors.nominationEnd}
            aria-describedby={errors.nominationEnd ? "election-nomination-end-error" : undefined}
          />
          <FieldError id="election-nomination-end-error" message={errors.nominationEnd} />
          <p className="text-xs text-muted-foreground">
            Até lá, o presidente de cada partido indica um candidato.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="election-start">Início da votação</Label>
          <Input
            id="election-start"
            type="datetime-local"
            value={values.votingStart}
            onChange={(event) => update("votingStart", event.target.value)}
            aria-invalid={!!errors.votingStart}
            aria-describedby={errors.votingStart ? "election-start-error" : undefined}
          />
          <FieldError id="election-start-error" message={errors.votingStart} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="election-end">Fim da votação</Label>
          <Input
            id="election-end"
            type="datetime-local"
            value={values.votingEnd}
            onChange={(event) => update("votingEnd", event.target.value)}
            aria-invalid={!!errors.votingEnd}
            aria-describedby={errors.votingEnd ? "election-end-error" : undefined}
          />
          <FieldError id="election-end-error" message={errors.votingEnd} />
          <p className="text-xs text-muted-foreground">Horário local deste navegador.</p>
        </div>

        <Button
          type="submit"
          className="h-10 w-full"
          disabled={!!blockedReason || createElection.isPending}
        >
          {createElection.isPending && <Loader2Icon className="animate-spin" />}
          Criar eleição
        </Button>

        {blockedReason && (
          <p className="text-center text-xs text-muted-foreground">{blockedReason}</p>
        )}
      </form>

      <InfoNote className="mt-6" title="Quem se registrar depois não vota.">
        Cada eleição usa a lista de eleitores registrados no momento em que foi criada.
      </InfoNote>
    </SectionCard>
  );
}
