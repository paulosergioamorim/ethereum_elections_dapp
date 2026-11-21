import { useQueries } from "@tanstack/react-query";
import { WalletIcon } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { formatEth } from "@/lib/format";
import { candidacyQueryOptions, isSameAccount, WithdrawCard } from "@/parties";
import { useWallet } from "@/wallet";
import { useElectionCandidacies } from "../hooks";
import type { ElectionDetails } from "../queries";

/**
 * As candidaturas desta eleição cuja carteira é a conta ativa: o candidato saca o que recebeu. Vale
 * para a candidatura indicada e também para a que foi retirada, se ainda tem saldo.
 */
export function OwnCandidaciesCard({ election }: { election: ElectionDetails }) {
  const { account } = useWallet();
  const history = useElectionCandidacies(election);
  const addresses = [
    ...new Set([...election.candidates.map((nominee) => nominee.candidacy), ...(history.data ?? [])]),
  ];
  const candidacies = useQueries({ queries: addresses.map((address) => candidacyQueryOptions(address)) });
  const own = candidacies.flatMap((query) =>
    query.data && isSameAccount(account, query.data.owner) && (query.data.active || query.data.balance > 0n)
      ? [query.data]
      : [],
  );

  if (own.length === 0) {
    return null;
  }

  return (
    <SectionCard
      layout="stacked"
      icon={WalletIcon}
      title="Suas candidaturas com saldo"
      description="As doações recebidas por você nesta eleição. Só a sua carteira saca."
    >
      <div className="space-y-4">
        {own.map((candidacy) => (
          <div key={candidacy.address} className="space-y-2">
            <p className="text-sm font-medium">
              {election.candidates.find((nominee) => nominee.candidacy === candidacy.address)?.name ??
                "Indicação retirada"}
              <span className="ml-2 font-normal text-muted-foreground">{formatEth(candidacy.balance)}</span>
            </p>
            <WithdrawCard
              target={candidacy.address}
              owner={candidacy.owner}
              balance={candidacy.balance}
              holder="candidato"
              idPrefix={`withdraw-${candidacy.address}`}
            />
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
