import { LockIcon, RefreshCwIcon, TrophyIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PlannedSection } from "@/components/planned-section";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { useElectionResults } from "../hooks";
import { formatTimestamp, phaseAt } from "../phase";
import type { ElectionDetails } from "../queries";

function ResultRow({ label, votes, revealed }: { label: string; votes: bigint; revealed: bigint }) {
  const percent = revealed > 0n ? Number((votes * 1000n) / revealed) / 10 : 0;

  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {votes.toString()} · {percent.toLocaleString("pt-BR")}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </li>
  );
}

/** Contagem pública, lida direto do contrato. Fechada até o fim da votação. */
export function ResultsCard({ election }: { election: ElectionDetails }) {
  const phase = phaseAt(useNow() / 1000, election);
  const results = useElectionResults(election.address);

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
        <ul className="space-y-4">
          {election.candidates.map((candidate, index) => (
            <ResultRow
              key={index}
              label={candidate}
              votes={tally[index] ?? 0n}
              revealed={revealed}
            />
          ))}
          <ResultRow label="Nulos" votes={nullVotes} revealed={revealed} />
        </ul>

        <p className="mt-5 text-xs text-muted-foreground">
          {unrevealed === 0n
            ? "Todas as cédulas foram apuradas."
            : `${unrevealed.toString()} cédula(s) ainda fechada(s): os percentuais consideram só as abertas.`}
        </p>

        {unrevealed > 0n && (
          <PlannedSection
            className="mt-5 border-t pt-5"
            items={["Abrir as cédulas com tlock e revelá-las em lote (qualquer pessoa)"]}
          />
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
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Atualizar apuração"
          onClick={() => void results.refetch()}
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
