import { InboxIcon, ListChecksIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { SectionCard } from "@/components/section-card";
import { Badge } from "@/components/ui/badge";
import type { CastBallot, OpenedBallot } from "../ballots";
import { useOpenedBallots } from "../hooks";
import { formatTimestamp } from "../phase";
import type { ElectionDetails } from "../queries";

function optionLabel(election: ElectionDetails, option: bigint): string {
  return option < BigInt(election.candidates.length)
    ? election.candidates[Number(option)]
    : "Nulo";
}

function BallotStatus({
  election,
  ballot,
  opened,
}: {
  election: ElectionDetails;
  ballot: CastBallot;
  opened: OpenedBallot | undefined;
}) {
  if (ballot.revealedOption !== undefined) {
    return <Badge>Apurada: {optionLabel(election, ballot.revealedOption)}</Badge>;
  }

  switch (opened?.status) {
    case "opened":
      return <Badge variant="secondary">Aberta aqui: {optionLabel(election, opened.option)}</Badge>;
    case "invalid":
      return <Badge variant="destructive">Inválida</Badge>;
    case "too-early":
      return <Badge variant="outline">Aguardando o drand</Badge>;
    default:
      return <Badge variant="outline">Selada</Badge>;
  }
}

/**
 * Auditoria: cada cédula registrada, com o compromisso on-chain e a situação na apuração.
 * Antes do fim, todas aparecem seladas: o conteúdo só abre com a rodada do drand de `votingEnd`.
 */
export function BallotsCard({ election }: { election: ElectionDetails }) {
  const { ballots, opened } = useOpenedBallots(election);
  const openedByIndex = new Map(opened.data?.map((ballot) => [ballot.index, ballot]));

  let body;

  if (!ballots.data) {
    body = (
      <p className="py-6 text-sm text-muted-foreground">
        {ballots.isError ? "Não foi possível ler as cédulas." : "Lendo as cédulas…"}
      </p>
    );
  } else if (ballots.data.length === 0) {
    body = (
      <EmptyState
        icon={InboxIcon}
        title="Nenhuma cédula registrada."
        description="Cada voto aparece aqui assim que entra na blockchain."
      />
    );
  } else {
    body = (
      <ul className="-mt-4 max-h-96 divide-y overflow-y-auto" aria-label="Cédulas">
        {ballots.data.map((ballot) => (
          <li
            key={ballot.index.toString()}
            className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="w-12 font-numeral text-lg leading-none">nº {(ballot.index + 1n).toString()}</span>
              <span className="truncate font-mono text-xs text-muted-foreground" title={ballot.commitment}>
                {ballot.commitment.slice(0, 10)}…{ballot.commitment.slice(-8)}
              </span>
            </span>
            <BallotStatus
              election={election}
              ballot={ballot}
              opened={openedByIndex.get(ballot.index)}
            />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <SectionCard
      icon={ListChecksIcon}
      title="Cédulas"
      description={`Compromissos registrados na blockchain. O conteúdo fica selado até ${formatTimestamp(election.votingEnd)}.`}
    >
      {body}
    </SectionCard>
  );
}
