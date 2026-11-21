import { useQueries } from "@tanstack/react-query";
import { Loader2Icon, UserRoundCheckIcon } from "lucide-react";
import { Link } from "react-router";
import type { Address } from "viem";
import { SectionCard } from "@/components/section-card";
import { Button } from "@/components/ui/button";
import { appChain } from "@/lib/chain";
import { shortAddress } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { isSameAccount, partyQueryOptions, useCandidate, useParties, usePartyCandidates } from "@/parties";
import { useWallet } from "@/wallet";
import { phaseAt } from "../phase";
import { useCandidateHold, useNominate, useWithdrawNomination } from "../hooks";
import type { ElectionDetails } from "../queries";

function CandidateRow({
  election,
  candidate,
  isNominee,
  party,
}: {
  election: ElectionDetails;
  candidate: Address;
  isNominee: boolean;
  party: Address;
}) {
  const now = useNow() / 1000;
  const details = useCandidate(candidate);
  const hold = useCandidateHold(candidate);
  const nominate = useNominate(election.address);
  const withdraw = useWithdrawNomination(election.address);
  const name = details.data?.name ?? "…";
  const busy =
    !!hold.data && hold.data.election !== election.address && Number(hold.data.votingEnd) > now;
  const pending = nominate.isPending || withdraw.isPending;

  return (
    <li className="flex items-center gap-3 rounded-xl border p-3">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{name}</span>
        <span className="block truncate text-xs text-muted-foreground">
          Carteira{" "}
          <span className="font-mono">{details.data ? shortAddress(details.data.owner) : "…"}</span>
          {isNominee && " · indicado nesta eleição"}
          {busy && " · Já concorre em outra eleição."}
        </span>
      </span>

      {isNominee ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => withdraw.mutate(party)}
          aria-label={`Retirar indicação de ${name}`}
        >
          {withdraw.isPending && <Loader2Icon className="animate-spin" />}
          Retirar indicação
        </Button>
      ) : (
        <Button
          size="sm"
          disabled={busy || pending || !details.data}
          onClick={() => nominate.mutate({ candidate, name })}
          aria-label={`Indicar ${name}`}
        >
          {nominate.isPending && <Loader2Icon className="animate-spin" />}
          Indicar
        </Button>
      )}
    </li>
  );
}

function PartyNominations({
  election,
  party,
  name,
}: {
  election: ElectionDetails;
  party: Address;
  name: string;
}) {
  const candidates = usePartyCandidates(party);
  const nominee = election.candidates.find((entry) => entry.party === party)?.candidate;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">{name}</h3>

      {candidates.isPending && <p className="text-sm text-muted-foreground">Carregando…</p>}

      {candidates.isError && (
        <p className="text-sm text-muted-foreground">
          Não foi possível carregar os candidatos.{" "}
          <button
            type="button"
            className="font-medium text-foreground underline underline-offset-4"
            onClick={() => void candidates.refetch()}
          >
            Tentar de novo
          </button>
        </p>
      )}

      {candidates.data?.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Este partido ainda não tem candidatos.{" "}
          <Link to={`/parties/${party}`} className="font-medium text-foreground underline underline-offset-4">
            Criar candidato
          </Link>
        </p>
      )}

      {!!candidates.data?.length && (
        <ul className="space-y-2" aria-label={`Candidatos de ${name}`}>
          {candidates.data.map((candidate) => (
            <CandidateRow
              key={candidate}
              election={election}
              candidate={candidate}
              isNominee={candidate === nominee}
              party={party}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Indicar o candidato do partido na eleição: só o presidente de algum partido vê, e só durante a
 * fase de indicação. Indicar outro candidato do mesmo partido troca o indicado.
 */
export function NominateCard({ election }: { election: ElectionDetails }) {
  const { account, isWrongChain } = useWallet();
  const phase = phaseAt(useNow() / 1000, election);
  const parties = useParties();
  const details = useQueries({
    queries: (parties.data ?? []).map((address) => partyQueryOptions(address)),
  });
  const presided = details.flatMap((query) =>
    query.data && isSameAccount(account, query.data.owner) ? [query.data] : [],
  );

  if (phase !== "nomination" || presided.length === 0) {
    return null;
  }

  return (
    <SectionCard
      layout="stacked"
      icon={UserRoundCheckIcon}
      title="Indicar candidato"
      description="Cada partido indica um candidato. Você pode trocar ou retirar até o fim das indicações."
    >
      <div className="space-y-6">
        {presided.map((party) => (
          <PartyNominations key={party.address} election={election} party={party.address} name={party.name} />
        ))}
      </div>

      {isWrongChain && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Troque a carteira para a {appChain.name}.
        </p>
      )}
    </SectionCard>
  );
}
