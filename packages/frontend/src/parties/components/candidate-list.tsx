import { useQueries } from "@tanstack/react-query";
import { ArrowRightIcon, SearchXIcon, TriangleAlertIcon, UserRoundIcon } from "lucide-react";
import { Link } from "react-router";
import type { Address } from "viem";
import { EmptyState } from "@/components/empty-state";
import { IconBubble } from "@/components/icon-bubble";
import { Button } from "@/components/ui/button";
import { formatEth, shortAddress } from "@/lib/format";
import { usePartyCandidates } from "../hooks";
import { candidateQueryOptions } from "../queries";

/** Candidatos do partido, do mais recente para o mais antigo: nome, carteira e saldo, com link para a página. */
export function CandidateList({ party }: { party: Address }) {
  const candidates = usePartyCandidates(party);
  // dados de cada candidato, os mesmos (e no mesmo cache) da página dele
  const details = useQueries({
    queries: (candidates.data ?? []).map((address) => candidateQueryOptions(address)),
  });

  if (candidates.isError) {
    return (
      <div className="flex flex-col items-center gap-2">
        <EmptyState
          icon={TriangleAlertIcon}
          title="Não foi possível carregar os candidatos."
          description="Confira a conexão com a rede e tente de novo."
        />
        <Button variant="outline" onClick={() => void candidates.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  if (candidates.isPending) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>;
  }

  if (candidates.data.length === 0) {
    return (
      <EmptyState
        icon={SearchXIcon}
        title="Nenhum candidato criado ainda."
        description="Quando o presidente criar um candidato, ele aparece aqui."
      />
    );
  }

  const rows = candidates.data
    .map((address, index) => ({ address, number: index + 1, candidate: details[index]?.data }))
    .reverse();

  return (
    <ul className="space-y-2">
      {rows.map(({ address, number, candidate }) => (
        <li key={address}>
          <Link
            to={`/candidates/${address}`}
            className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted"
          >
            <IconBubble icon={UserRoundIcon} />

            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{candidate?.name ?? `Candidato #${number}`}</span>
              <span className="block truncate text-xs text-muted-foreground">
                Carteira <span className="font-mono">{candidate ? shortAddress(candidate.owner) : "…"}</span>
              </span>
            </span>

            <span className="text-sm font-medium">{candidate ? formatEth(candidate.balance) : "…"}</span>

            <ArrowRightIcon className="size-4 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
