import { useQueries } from "@tanstack/react-query";
import { ArrowRightIcon, FlagIcon, SearchXIcon, TriangleAlertIcon } from "lucide-react";
import { Link } from "react-router";
import type { Address } from "viem";
import { EmptyState } from "@/components/empty-state";
import { IconBubble } from "@/components/icon-bubble";
import { Button } from "@/components/ui/button";
import { formatEth, shortAddress } from "@/lib/format";
import { cn } from "@/lib/utils";
import { filterParties } from "../search";
import { partyQueryOptions } from "../queries";

/** Partidos do mais recente para o mais antigo: nome, presidente e saldo, com link para a página. */
export function PartyList({
  parties,
  isError,
  isPending,
  onRetry,
  query = "",
  layout = "list",
}: {
  parties: readonly Address[] | undefined;
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
  query?: string;
  /** `grid`: um card por partido, em 1, 2 ou 3 colunas conforme a largura. */
  layout?: "list" | "grid";
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

  const grid = layout === "grid";

  return (
    <ul className={grid ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" : "space-y-2"}>
      {visible.map(({ address, number, name, owner, balance }) => (
        <li key={address}>
          <Link
            to={`/parties/${address}`}
            className={cn(
              "transition-colors hover:bg-muted",
              grid
                ? "flex h-full flex-col gap-4 rounded-2xl border bg-card p-5"
                : "flex items-center gap-3 rounded-xl border p-3",
            )}
          >
            {grid ? (
              <span className="flex items-center justify-between">
                <IconBubble icon={FlagIcon} />
                <ArrowRightIcon className="size-4 text-muted-foreground" />
              </span>
            ) : (
              <IconBubble icon={FlagIcon} />
            )}

            <span className="min-w-0 flex-1">
              <span className={cn("block truncate font-medium", grid && "text-lg font-semibold")}>
                {name ?? `Partido #${number}`}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Presidente{" "}
                <span className="font-mono">{owner ? shortAddress(owner) : "…"}</span>
              </span>
            </span>

            <span className={cn("text-sm font-medium", grid && "text-xl font-semibold")}>
              {balance === undefined ? "…" : formatEth(balance)}
            </span>

            {!grid && <ArrowRightIcon className="size-4 text-muted-foreground" />}
          </Link>
        </li>
      ))}
    </ul>
  );
}
