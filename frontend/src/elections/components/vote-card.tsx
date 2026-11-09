import { CircleCheckIcon, Loader2Icon, VoteIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Banner } from "@/components/banner";
import { InfoNote } from "@/components/info-note";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { appChain } from "@/lib/chain";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { useWallet } from "@/wallet";
import { useVote, useVoteEligibility, type VoteEligibility, type VoteStep } from "../hooks";
import { formatCountdown, formatTimestamp, phaseAt } from "../phase";
import type { ElectionDetails } from "../queries";

const NULL_VOTE = "nulo";

const stepLabels: Record<VoteStep, string> = {
  identity: "Assine a mensagem na carteira…",
  proving: "Gerando a prova de voto…",
  sending: "Confirme o voto na carteira…",
  confirming: "Registrando o voto…",
};

const eligibilityMessages: Partial<Record<VoteEligibility, string>> = {
  disconnected: "Conecte sua carteira para votar.",
  loading: "Conferindo se sua conta está na lista desta eleição…",
  error: "Não foi possível carregar a lista de eleitores desta eleição.",
  "not-registered": "Esta conta ainda não se cadastrou como eleitora.",
  "registered-after":
    "Esta conta se cadastrou depois da criação desta eleição, então não está na lista de eleitores dela.",
};

function Option({ value, number, label }: { value: string; number?: number; label: string }) {
  const id = `vote-option-${value}`;

  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
    >
      <RadioGroupItem value={value} id={id} />
      {number !== undefined && (
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          {number}
        </span>
      )}
      <span className={cn("text-sm font-medium", number === undefined && "text-muted-foreground")}>
        {label}
      </span>
    </label>
  );
}

/** A cédula: escolha do candidato (ou voto nulo) e envio do voto selado e anônimo. */
export function VoteCard({ election }: { election: ElectionDetails }) {
  const now = useNow() / 1000;
  const phase = phaseAt(now, election);
  const { isWrongChain } = useWallet();
  const eligibility = useVoteEligibility(election);
  const vote = useVote(election);
  const [choice, setChoice] = useState<string>();
  const [castIndex, setCastIndex] = useState<bigint | null>();

  if (castIndex !== undefined) {
    return (
      <SectionCard layout="stacked" icon={VoteIcon} title="Seu voto" description="Voto registrado.">
        <Banner icon={CircleCheckIcon}>
          {castIndex === null ? "Sua cédula foi registrada." : `Sua cédula é a nº ${castIndex + 1n}.`} Ela
          fica cifrada até {formatTimestamp(election.votingEnd)}, quando começa a apuração.
        </Banner>
      </SectionCard>
    );
  }

  let blockedReason: string | undefined;

  if (phase === "scheduled") {
    blockedReason = `A votação começa em ${formatCountdown(Number(election.votingStart) - now)}.`;
  } else if (phase === "tally") {
    blockedReason = "A votação terminou.";
  } else if (isWrongChain) {
    blockedReason = `Troque a carteira para a ${appChain.name}.`;
  } else if (eligibility !== "eligible") {
    blockedReason = eligibilityMessages[eligibility];
  } else if (choice === undefined) {
    blockedReason = "Escolha um candidato ou o voto nulo.";
  }

  function submit() {
    if (choice === undefined) {
      return;
    }

    // fora da lista de candidatos, o contrato conta como voto nulo
    const option = choice === NULL_VOTE ? BigInt(election.candidates.length) : BigInt(choice);
    vote.mutate(option, { onSuccess: ({ index }) => setCastIndex(index ?? null) });
  }

  return (
    <SectionCard
      layout="stacked"
      icon={VoteIcon}
      title="Seu voto"
      description="Escolha um candidato. A cédula fica cifrada até o fim da votação."
    >
      {eligibility === "eligible" && phase === "voting" && (
        <p className="mb-4 flex items-center gap-2 text-sm text-primary">
          <CircleCheckIcon className="size-4" />
          Sua conta está na lista de eleitores desta eleição.
        </p>
      )}

      {phase !== "tally" && (
        <RadioGroup
          value={choice ?? ""}
          onValueChange={setChoice}
          disabled={phase !== "voting" || vote.isPending}
          aria-label="Candidatos"
          className="gap-2"
        >
          {election.candidates.map((candidate, index) => (
            <Option key={index} value={String(index)} number={index + 1} label={candidate} />
          ))}
          <Option value={NULL_VOTE} label="Votar nulo" />
        </RadioGroup>
      )}

      {phase !== "tally" && (
        <Button
          className="mt-6 h-10 w-full"
          onClick={submit}
          disabled={!!blockedReason || vote.isPending}
        >
          {vote.isPending && <Loader2Icon className="animate-spin" />}
          {vote.step ? stepLabels[vote.step] : "Votar"}
        </Button>
      )}

      {blockedReason && !vote.isPending && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {blockedReason}
          {eligibility === "not-registered" && phase === "voting" && (
            <>
              {" "}
              <Link to="/register" className="font-medium text-foreground underline underline-offset-4">
                Fazer o cadastro
              </Link>
            </>
          )}
        </p>
      )}

      <InfoNote className="mt-6" title="Um voto por eleitor, em segredo até o fim.">
        A prova de conhecimento zero impede votar duas vezes. A cédula vai cifrada: até o fim da
        votação, ninguém consegue ver em quem você votou.
      </InfoNote>
    </SectionCard>
  );
}
