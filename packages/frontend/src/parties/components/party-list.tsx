import { useQueries } from "@tanstack/react-query";
import { ArrowRightIcon, FlagIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react";
import { Link } from "react-router";
import type { Address } from "viem";
import { EmptyState } from "@/components/empty-state";
import { IconBubble } from "@/components/icon-bubble";
import { Button } from "@/components/ui/button";
import { formatEth, shortAddress } from "@/lib/format";
import { filterParties } from "../search";
import { partyQueryOptions } from "../queries";

/** Partidos do mais recente para o mais antigo: nome, presidente e saldo, com link para a página. */
export function PartyList({
  parties,
  isError,
  isPending,
  onRetry,
  query = "",
}: {
  parties: readonly Address[] | undefined;
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
  query?: string;
}) {
  // dados de cada partido, os mesmos (e no mesmo cache) da página dele
  const details = useQueries({
    queries: (parties ?? []).map((address) => partyQueryOptions(address)),
  });

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-2">
        <EmptyState
          icon={TriangleAlertIcon}
          title="Não foi possível carregar os partidos."
          description="Confira a conexão com a rede e tente de novo."
        />
        <Button variant="outline" onClick={onRetry}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  if (isPending) {
    return <p className="py-14 text-center text-sm text-muted-foreground">Carregando…</p>;
  }

  if (!parties || parties.length === 0) {
    return (
      <EmptyState
        icon={FlagIcon}
        title="Nenhum partido criado ainda."
        description="Assim que a autoridade criar um partido, ele aparece nesta lista."
      />
    );
  }

  const rows = parties
    .map((address, index) => {
      const party = details[index]?.data;

      return { address, number: index + 1, name: party?.name, owner: party?.owner, balance: party?.balance };
    })
    .reverse();
  const visible = filterParties(rows, query);

  if (visible.length === 0) {
    return (
      <EmptyState
        icon={SearchXIcon}
        title="Nenhum partido encontrado."
        description="Busque pelo nome, pelo endereço ou pelo presidente."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {visible.map(({ address, number, name, owner, balance }) => (
        <li key={address}>
          <Link
            to={`/parties/${address}`}
            className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted"
          >
            <IconBubble icon={FlagIcon} />

            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{name ?? `Partido #${number}`}</span>
              <span className="block truncate text-xs text-muted-foreground">
                Presidente{" "}
                <span className="font-mono">{owner ? shortAddress(owner) : "…"}</span>
              </span>
            </span>

            <span className="text-sm font-medium">{balance === undefined ? "…" : formatEth(balance)}</span>

            <ArrowRightIcon className="size-4 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
