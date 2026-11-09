import { ArrowRightIcon, TriangleAlertIcon, VoteIcon } from "lucide-react";
import { Link } from "react-router";
import type { Address } from "viem";
import { EmptyState } from "@/components/empty-state";
import { IconBubble } from "@/components/icon-bubble";
import { shortAddress } from "@/lib/format";

/**
 * Eleições da mais recente para a mais antiga. Por enquanto só o endereço;
 * título e fase entram quando a leitura de cada eleição existir.
 */
export function ElectionList({
  elections,
  isError,
}: {
  elections: readonly Address[] | undefined;
  isError: boolean;
}) {
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

  // a factory guarda na ordem de criação; o número de cada eleição segue essa ordem
  const newestFirst = elections.map((address, index) => ({ address, number: index + 1 })).reverse();

  return (
    <ul className="space-y-2">
      {newestFirst.map(({ address, number }) => (
        <li key={address}>
          <Link
            to={`/elections/${address}`}
            className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:bg-muted"
          >
            <IconBubble icon={VoteIcon} />

            <span className="min-w-0 flex-1">
              <span className="block font-medium">Eleição #{number}</span>
              <span className="block font-mono text-xs text-muted-foreground">
                {shortAddress(address)}
              </span>
            </span>

            <ArrowRightIcon className="size-4 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
