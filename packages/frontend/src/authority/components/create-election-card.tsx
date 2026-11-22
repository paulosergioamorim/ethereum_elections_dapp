import { valibotResolver } from "@hookform/resolvers/valibot";
import { ArrowRightIcon, CalendarPlusIcon, Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { Link } from "react-router";
import type { Address } from "viem";
import { Banner } from "@/components/banner";
import { FieldError } from "@/components/field-error";
import { InfoNote } from "@/components/info-note";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthority, useCreateElection, type CreateElectionInput } from "@/factory";
import { defaultElectionForm, electionFormSchema, type ElectionFormValues } from "../election-form";

/** O schema depende do horário: é montado com o de agora a cada validação. */
const electionResolver: Resolver<ElectionFormValues, unknown, CreateElectionInput> = (values, context, options) =>
  valibotResolver(electionFormSchema(Math.floor(Date.now() / 1000)))(values, context, options);

/** Passo 3 da autoridade: criar a eleição, que congela os eleitores registrados até agora. */
export function CreateElectionCard({ registeredVoters }: { registeredVoters: number | undefined }) {
  // react-hook-form: o React Compiler memoizaria `register` e o `reset` não limparia os campos (AD-001)
  "use no memo";

  const { reason } = useAuthority();
  const createElection = useCreateElection();
  const { register, handleSubmit, reset, clearErrors, formState } = useForm<ElectionFormValues, unknown, CreateElectionInput>({
    // os padrões dependem do horário: `reset` abaixo usa os do momento em que é chamado
    defaultValues: defaultElectionForm(),
    resolver: electionResolver,
    reValidateMode: "onSubmit",
  });
  const { errors } = formState;
  const [created, setCreated] = useState<Address | undefined>();

  const blockedReason =
    reason ??
    (registeredVoters === 0
      ? "Registre pelo menos um eleitor antes de criar a eleição."
      : undefined);

  const onSubmit = handleSubmit((input) => {
    if (blockedReason) {
      return;
    }

    createElection.mutate(input, {
      onSuccess: (address) => {
        setCreated(address);
        reset(defaultElectionForm());
      },
    });
  });

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
            {...register("title", { onChange: () => clearErrors("title") })}
            placeholder="Representante da turma 2026"
            aria-invalid={!!errors.title}
            aria-describedby={errors.title ? "election-title-error" : undefined}
          />
          <FieldError id="election-title-error" message={errors.title?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="election-nomination-end">Fim das indicações</Label>
          <Input
            id="election-nomination-end"
            type="datetime-local"
            {...register("nominationEnd", { onChange: () => clearErrors("nominationEnd") })}
            aria-invalid={!!errors.nominationEnd}
            aria-describedby={errors.nominationEnd ? "election-nomination-end-error" : undefined}
          />
          <FieldError id="election-nomination-end-error" message={errors.nominationEnd?.message} />
          <p className="text-xs text-muted-foreground">
            Até lá, o presidente de cada partido indica um candidato.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="election-start">Início da votação</Label>
          <Input
            id="election-start"
            type="datetime-local"
            {...register("votingStart", { onChange: () => clearErrors("votingStart") })}
            aria-invalid={!!errors.votingStart}
            aria-describedby={errors.votingStart ? "election-start-error" : undefined}
          />
          <FieldError id="election-start-error" message={errors.votingStart?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="election-end">Fim da votação</Label>
          <Input
            id="election-end"
            type="datetime-local"
            {...register("votingEnd", { onChange: () => clearErrors("votingEnd") })}
            aria-invalid={!!errors.votingEnd}
            aria-describedby={errors.votingEnd ? "election-end-error" : undefined}
          />
          <FieldError id="election-end-error" message={errors.votingEnd?.message} />
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
