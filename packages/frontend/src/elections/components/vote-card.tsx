import { CircleCheckIcon, Loader2Icon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router";
import { Banner } from "@/components/banner";
import { InfoNote } from "@/components/info-note";
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
  "not-registered": "Esta conta ainda não se registrou como eleitora.",
  "registered-after":
    "Esta conta se registrou depois da criação desta eleição, então não está na lista de eleitores dela.",
};

/** Uma linha da cédula: o número em tecla, o nome e o quadrinho para marcar. */
function Option({ value, number, label }: { value: string; number?: number; label: string }) {
  const id = `vote-option-${value}`;

  return (
    <label
      htmlFor={id}
      className="group flex cursor-pointer items-center gap-4 px-5 py-3 transition-colors hover:bg-muted has-[[data-state=checked]]:bg-secondary has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
    >
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-xs border-2 border-foreground font-numeral text-2xl leading-none group-has-[[data-state=checked]]:border-primary group-has-[[data-state=checked]]:bg-primary group-has-[[data-state=checked]]:text-primary-foreground"
      >
        {number === undefined ? "–" : String(number).padStart(2, "0")}
      </span>
      <span className={cn("flex-1 font-semibold", number === undefined && "text-muted-foreground")}>
        {label}
      </span>
      <RadioGroupItem value={value} id={id} />
    </label>
  );
}

/** A folha da cédula, com uma segunda folha aparecendo por baixo. */
function BallotSheet({ description, children }: { description: string; children: ReactNode }) {
  return (
    <section aria-labelledby="ballot-title" className="relative isolate">
      <span
        aria-hidden
        className="absolute inset-0 -z-10 translate-x-1.5 translate-y-1.5 rotate-[0.8deg] rounded border bg-card"
      />

      <div className="rounded border bg-card">
        <div className="space-y-1 px-5 pt-5 pb-4">
          <h2 id="ballot-title" className="font-display text-2xl">
            Seu voto
          </h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="perforation" />

        {children}
      </div>
    </section>
  );
}

/** A cédula: escolha do candidato (ou voto nulo) e envio do voto selado e anônimo. */
export function VoteCard({ election }: { election: ElectionDetails }) {
  const now = useNow() / 1000;
  const phase = phaseAt(now, election);
  const { isWrongChain } = useWallet();
  const { eligibility, retry } = useVoteEligibility(election);
  const vote = useVote(election);
  const [choice, setChoice] = useState<string>();
  const [castIndex, setCastIndex] = useState<bigint | null>();

  if (castIndex !== undefined) {
    return (
      <BallotSheet description="Voto registrado.">
        <div className="p-5">
          <Banner icon={CircleCheckIcon}>
            {castIndex === null ? "Sua cédula foi registrada." : `Sua cédula é a nº ${castIndex + 1n}.`}{" "}
            Ela fica cifrada até {formatTimestamp(election.votingEnd)}, quando começa a apuração.
          </Banner>
        </div>
      </BallotSheet>
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
    <BallotSheet description="Escolha um candidato. A cédula fica cifrada até o fim da votação.">
      {eligibility === "eligible" && phase === "voting" && (
        <p className="flex items-center gap-2 px-5 pt-4 text-sm font-medium text-primary">
          <CircleCheckIcon className="size-4 shrink-0" />
          Sua conta está na lista de eleitores desta eleição.
        </p>
      )}

      {phase !== "tally" && (
        <>
          <RadioGroup
            value={choice ?? ""}
            onValueChange={setChoice}
            disabled={phase !== "voting" || vote.isPending}
            aria-label="Candidatos"
            className="gap-0 divide-y py-2"
          >
            {election.candidates.map((candidate, index) => (
              <Option key={index} value={String(index)} number={index + 1} label={candidate} />
            ))}
            <Option value={NULL_VOTE} label="Votar nulo" />
          </RadioGroup>

          <div className="perforation" />
        </>
      )}

      <div className="space-y-4 p-5">
        {phase !== "tally" && (
          <Button
            className="h-12 w-full text-base"
            onClick={submit}
            disabled={!!blockedReason || vote.isPending}
          >
            {vote.isPending && <Loader2Icon className="animate-spin" />}
            {vote.step ? stepLabels[vote.step] : "Votar"}
          </Button>
        )}

        {blockedReason && !vote.isPending && (
          <p className="text-sm text-muted-foreground">
            {blockedReason}
            {eligibility === "error" && phase === "voting" && (
            <>
              {" "}
              <button
                type="button"
                className="font-medium text-foreground underline underline-offset-4"
                onClick={retry}
              >
                Tentar de novo
              </button>
            </>
          )}
          {eligibility === "not-registered" && phase === "voting" && (
              <>
                {" "}
                <Link to="/register" className="font-medium text-foreground underline underline-offset-4">
                  Fazer o registro
                </Link>
              </>
            )}
          </p>
        )}

        <InfoNote title="Um voto por eleitor, em segredo até o fim.">
          A prova de conhecimento zero impede votar duas vezes. A cédula vai cifrada: até o fim da
          votação, ninguém consegue ver em quem você votou.
        </InfoNote>
      </div>
    </BallotSheet>
  );
}
