import { useQueryClient } from "@tanstack/react-query";
import { RefreshCwIcon, SearchXIcon, UsersIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { IconBubble } from "@/components/icon-bubble";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { formatEth, shortAddress } from "@/lib/format";
import { useCandidacy } from "@/parties";
import { electionKeys } from "../keys";
import type { ElectionDetails, Nominee } from "../queries";

function NomineeRow({ nominee, number }: { nominee: Nominee; number: number }) {
  const candidacy = useCandidacy(nominee.candidacy);

  return (
    <li className="flex items-center gap-3 rounded-xl border p-3">
      <IconBubble icon={UsersIcon} />

      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">
          {number}. {nominee.name}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {nominee.partyName} · carteira{" "}
          <span className="font-mono">{shortAddress(nominee.owner)}</span>
        </span>
      </span>

      <span className="text-sm font-medium" aria-label={`Saldo de ${nominee.name}`}>
        {candidacy.data ? formatEth(candidacy.data.balance) : "…"}
      </span>
    </li>
  );
}

/** Os candidatos indicados pelos partidos, na ordem do voto, com o saldo de doações de cada candidatura. */
export function NomineesCard({ election }: { election: ElectionDetails }) {
  const queryClient = useQueryClient();

  return (
    <SectionCard
      layout="stacked"
      icon={UsersIcon}
      title="Candidatos"
      description="Um candidato por partido, indicado pelo presidente durante a fase de indicação."
      action={
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Atualizar candidatos"
          onClick={() =>
            void queryClient.invalidateQueries({ queryKey: electionKeys.detail(election.address) })
          }
        >
          <RefreshCwIcon />
        </Button>
      }
    >
      {election.candidates.length === 0 ? (
        <EmptyState
          icon={SearchXIcon}
          title="Nenhum candidato indicado ainda."
          description="Quando o presidente de um partido indicar um candidato, ele aparece aqui."
        />
      ) : (
        <ul className="space-y-2" aria-label="Candidatos indicados">
          {election.candidates.map((nominee, index) => (
            <NomineeRow key={nominee.candidacy} nominee={nominee} number={index + 1} />
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
