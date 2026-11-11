import { ClockIcon, InboxIcon, LockOpenIcon } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { useNow } from "@/lib/use-now";
import { useElectionResults } from "../hooks";
import { formatCountdown, formatTimestamp, phaseAt, phaseLabels } from "../phase";
import type { ElectionDetails } from "../queries";

export function ElectionStats({ election }: { election: ElectionDetails }) {
  const now = useNow() / 1000;
  const phase = phaseAt(now, election);
  const results = useElectionResults(election.address);

  const phaseCaption = {
    scheduled: `Começa em ${formatCountdown(Number(election.votingStart) - now)}`,
    voting: `Termina em ${formatCountdown(Number(election.votingEnd) - now)}`,
    tally: `Votação encerrada em ${formatTimestamp(election.votingEnd)}`,
  }[phase];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <StatCard icon={ClockIcon} label="Fase" value={phaseLabels[phase]} caption={phaseCaption} />
      <StatCard
        icon={InboxIcon}
        label="Cédulas registradas"
        value={results.data?.total.toString()}
        caption={
          results.data
            ? `Na blockchain; ${results.data.unrevealed.toString()} ainda selada(s)`
            : "Votos registrados na blockchain"
        }
      />
      <StatCard
        icon={LockOpenIcon}
        label="Cédulas abertas"
        value={results.data?.revealed.toString()}
        caption="Reveladas na apuração"
      />
    </div>
  );
}
