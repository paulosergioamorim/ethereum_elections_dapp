import { ArrowRightIcon, CalendarPlusIcon, Loader2Icon, PlusIcon, XIcon } from "lucide-react";
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
import {
  defaultElectionForm,
  validateElectionForm,
  type ElectionFormErrors,
  type ElectionFormValues,
} from "../election-form";

function FieldError({ id, message }: { id: string; message: string | undefined }) {
  return message ? (
    <p id={id} className="text-xs text-destructive">
      {message}
    </p>
  ) : null;
}

/** Passo 3 da autoridade: criar a eleição, que congela os eleitores cadastrados até agora. */
export function CreateElectionCard({ registeredVoters }: { registeredVoters: number | undefined }) {
  const { reason } = useAuthority();
  const createElection = useCreateElection();
  const [values, setValues] = useState<ElectionFormValues>(() => defaultElectionForm());
  const [errors, setErrors] = useState<ElectionFormErrors>({});
  const [created, setCreated] = useState<Address | undefined>();

  const blockedReason =
    reason ??
    (registeredVoters === 0
      ? "Cadastre pelo menos um eleitor antes de criar a eleição."
      : undefined);

  function update<Field extends keyof ElectionFormValues>(
    field: Field,
    value: ElectionFormValues[Field],
  ) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function updateCandidate(index: number, name: string) {
    update(
      "candidates",
      values.candidates.map((candidate, position) => (position === index ? name : candidate)),
    );
  }

  function onSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    // validado no envio, com o horário de agora: a margem do início depende dele
    const { errors: found, input } = validateElectionForm(values, Math.floor(Date.now() / 1000));
    setErrors(found);

    if (!input || blockedReason) {
      return;
    }

    createElection.mutate(input, {
      onSuccess: (address) => {
        setCreated(address);
        setValues(defaultElectionForm());
      },
    });
  }

  return (
    <SectionCard
      layout="stacked"
      icon={CalendarPlusIcon}
      title="Nova eleição"
      description="Título, candidatos e período de votação."
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

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Candidatos</legend>

          {values.candidates.map((candidate, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-right text-xs text-muted-foreground">
                {index + 1}
              </span>
              <Input
                value={candidate}
                onChange={(event) => updateCandidate(index, event.target.value)}
                placeholder={`Candidato ${index + 1}`}
                aria-label={`Candidato ${index + 1}`}
                aria-invalid={!!errors.candidates}
              />
              {values.candidates.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Remover candidato ${index + 1}`}
                  onClick={() =>
                    update(
                      "candidates",
                      values.candidates.filter((_, position) => position !== index),
                    )
                  }
                >
                  <XIcon />
                </Button>
              )}
            </div>
          ))}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => update("candidates", [...values.candidates, ""])}
          >
            <PlusIcon />
            Adicionar candidato
          </Button>

          <FieldError id="election-candidates-error" message={errors.candidates} />
        </fieldset>

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

      <InfoNote className="mt-6" title="Quem se cadastrar depois não vota.">
        Cada eleição usa a lista de eleitores cadastrados no momento em que foi criada.
      </InfoNote>
    </SectionCard>
  );
}
