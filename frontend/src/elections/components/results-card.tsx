import { useQueryClient } from "@tanstack/react-query";
import { LockIcon, RefreshCwIcon, TrophyIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { refreshTally, useElectionResults } from "../hooks";
import { formatTimestamp, phaseAt } from "../phase";
import type { ElectionDetails } from "../queries";
import { ResultRow } from "./result-row";
import { RevealPanel } from "./reveal-panel";

/**
 * Contagem pública, lida direto do contrato e atualizada pelos eventos da eleição. Fechada até o fim
 * da votação; depois, qualquer pessoa abre as cédulas e publica a apuração.
 */
export function ResultsCard({ election }: { election: ElectionDetails }) {
  const phase = phaseAt(useNow() / 1000, election);
  const results = useElectionResults(election.address);
  const queryClient = useQueryClient();

  let body;

  if (phase !== "tally") {
    body = (
      <EmptyState
        icon={LockIcon}
        title="O resultado aparece por aqui."
        description={`As cédulas só podem ser abertas depois do fim da votação, em ${formatTimestamp(election.votingEnd)}.`}
      />
    );
  } else if (!results.data) {
    body = (
      <p className="py-14 text-center text-sm text-muted-foreground">
        {results.isError ? "Não foi possível ler o resultado." : "Lendo o resultado…"}
      </p>
    );
  } else {
    const { tally, nullVotes, unrevealed, revealed } = results.data;

    body = (
      <>
        <ul className="space-y-4" aria-label="Resultado publicado">
          {election.candidates.map((candidate, index) => (
            <ResultRow
              key={index}
              label={candidate}
              votes={tally[index] ?? 0n}
              base={revealed}
            />
          ))}
          <ResultRow label="Nulos" votes={nullVotes} base={revealed} />
        </ul>

        <p className="mt-5 text-xs text-muted-foreground">
          {unrevealed === 0n
            ? "Todas as cédulas foram apuradas."
            : `${unrevealed.toString()} cédula(s) ainda fechada(s): os percentuais consideram só as abertas.`}
        </p>

        {unrevealed > 0n && (
          <div className="mt-5 border-t pt-5">
            <RevealPanel election={election} />
          </div>
        )}
      </>
    );
  }

  return (
    <SectionCard
      icon={TrophyIcon}
      title="Apuração"
      description="Resultado verificável por qualquer pessoa, direto da blockchain."
      action={
        // rede de segurança se o WebSocket cair (ou se não houver WebSocket configurado)
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Atualizar apuração"
          onClick={() => void refreshTally(queryClient, election.address)}
          disabled={results.isFetching}
        >
          <RefreshCwIcon className={cn(results.isFetching && "animate-spin")} />
        </Button>
      }
    >
      {body}
    </SectionCard>
  );
}
