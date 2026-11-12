import { useQueries } from "@tanstack/react-query";
import { SearchXIcon, TriangleAlertIcon, VoteIcon } from "lucide-react";
import { Link } from "react-router";
import type { Address } from "viem";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { shortAddress } from "@/lib/format";
import { useNow } from "@/lib/use-now";
import { phaseAt, phaseLabels } from "../phase";
import { electionQueryOptions } from "../queries";

/** Minúsculas e sem acentos: "eleição" encontra "Eleição" e "eleicao". */
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

/**
 * Eleições da mais recente para a mais antiga, com título e fase. `query` filtra por título, endereço
 * (4+ dígitos hex) ou número ("2" ou "#2"; com "#", só o número). Enquanto o título de uma eleição
 * carrega, a busca só a encontra pelo endereço ou pelo número.
 */
export function ElectionList({
  elections,
  isError,
  query = "",
}: {
  elections: readonly Address[] | undefined;
  isError: boolean;
  query?: string;
}) {
  const now = useNow() / 1000;
  // dados fixos de cada eleição, os mesmos (e no mesmo cache) da página dela
  const details = useQueries({
    queries: (elections ?? []).map((address) => electionQueryOptions(address)),
  });

  if (isError) {
    return (
      <EmptyState
        icon={TriangleAlertIcon}
        title="Não foi possível carregar as eleições."
        description="Confira a conexão com a rede e tente atualizar."
      />
    );
  }

  if (!elections || elections.length === 0) {
    return (
      <EmptyState
        icon={VoteIcon}
        title="As eleições aparecem por aqui."
        description="Assim que a autoridade criar uma eleição, ela aparece nesta lista."
      />
    );
  }

  const search = normalize(query);
  // "#2" busca só o número; pelo endereço, só com 4+ dígitos hex, senão "2" bateria em quase todos
  const byNumberOnly = search.startsWith("#");
  const term = search.replace(/^#/, "");
  const hex = term.replace(/^0x/, "");
  const byAddress = !byNumberOnly && /^[0-9a-f]{4,}$/.test(hex);

  // a factory guarda na ordem de criação; o número de cada eleição segue essa ordem
  const newestFirst = elections
    .map((address, index) => ({ address, number: index + 1, election: details[index]?.data }))
    .reverse()
    .filter(
      ({ address, number, election }) =>
        term === "" ||
        String(number) === term ||
        (byAddress && address.toLowerCase().includes(hex)) ||
        (!byNumberOnly && election !== undefined && normalize(election.title).includes(term)),
    );

  if (newestFirst.length === 0) {
    return (
      <EmptyState
        icon={SearchXIcon}
        title="Nenhuma eleição encontrada."
        description="Busque pelo título, pelo endereço ou pelo número da eleição."
      />
    );
  }

  return (
    <ul className="-mt-4 divide-y">
      {newestFirst.map(({ address, number, election }) => (
        <li key={address}>
          <Link
            to={`/elections/${address}`}
            className="group flex items-center gap-4 py-4 outline-none focus-visible:bg-secondary"
          >
            <span
              aria-hidden
              className="w-10 shrink-0 font-numeral text-4xl leading-none text-foreground/25 transition-colors group-hover:text-primary"
            >
              {String(number).padStart(2, "0")}
            </span>

            <span className="min-w-0 flex-1 space-y-0.5">
              <span className="block truncate text-base font-semibold underline-offset-4 group-hover:underline">
                {election?.title ?? `Eleição #${number}`}
              </span>
              <span className="block font-mono text-xs text-muted-foreground">
                #{number} · {shortAddress(address)}
              </span>
            </span>

            {election && (
              <Badge variant={phaseAt(now, election) === "voting" ? "default" : "outline"}>
                {phaseLabels[phaseAt(now, election)]}
              </Badge>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
