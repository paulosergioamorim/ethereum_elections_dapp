import { useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
import { RefreshCwIcon, SearchXIcon, UsersIcon } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { IconBubble } from "@/components/icon-bubble";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import type { Address } from "viem";
import { Label } from "@/components/ui/label";
import { formatEth, shortAddress } from "@/lib/format";
import { DonateCard, useCandidacy, useDonated } from "@/parties";
import { useWallet } from "@/wallet";
import { electionKeys } from "../keys";
import type { ElectionDetails, Nominee } from "../queries";

function NomineeRow({ nominee, number }: { nominee: Nominee; number: number }) {
  const { account } = useWallet();
  const candidacy = useCandidacy(nominee.candidacy);
  const donated = useDonated(nominee.candidacy, account);

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

      <span className="text-right">
        <span className="block text-sm font-medium" aria-label={`Saldo de ${nominee.name}`}>
          {candidacy.data ? formatEth(candidacy.data.balance) : "…"}
        </span>
        {account && (
          <span
            className="block text-xs text-muted-foreground"
            aria-label={`Você já doou a ${nominee.name}`}
          >
            Você já doou {donated.data === undefined ? "…" : formatEth(donated.data)}
          </span>
        )}
      </span>
    </li>
  );
}

/** Escolhe a candidatura que vai receber a doação e mostra o formulário de doar. */
function DonateToNominee({ nominees }: { nominees: readonly Nominee[] }) {
  const selectId = useId();
  const [chosen, setChosen] = useState<Address>();
  const target = nominees.find((nominee) => nominee.candidacy === chosen) ?? nominees[0];

  return (
    <div className="mt-6 space-y-3">
      {nominees.length > 1 && (
        <div className="space-y-2">
          <Label htmlFor={selectId}>Doar para</Label>
          <select
            id={selectId}
            value={target.candidacy}
            onChange={(event) => setChosen(event.target.value as Address)}
            className="h-9 w-full rounded-lg border bg-transparent px-3 text-sm"
          >
            {nominees.map((nominee) => (
              <option key={nominee.candidacy} value={nominee.candidacy}>
                {nominee.name} ({nominee.partyName})
              </option>
            ))}
          </select>
        </div>
      )}

      <DonateCard
        key={target.candidacy}
        idPrefix="nominee-donate"
        target={target.candidacy}
        description={`O valor vai para a candidatura de ${target.name} nesta eleição; só a carteira do candidato saca.`}
      />
    </div>
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

      {election.candidates.length > 0 && <DonateToNominee nominees={election.candidates} />}
    </SectionCard>
  );
}
