import { Loader2Icon, SearchXIcon, TriangleAlertIcon } from "lucide-react";
import { Link, useParams } from "react-router";
import { getAddress, isAddress } from "viem";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import {
  BallotsCard,
  ElectionNotFoundError,
  ElectionStats,
  formatTimestamp,
  ResultsCard,
  useElection,
  useElectionEvents,
  VoteCard,
} from "@/elections";
import { NotFound } from "@/routes/not-found";
import { ConnectWalletNotice } from "@/wallet";

export function Election() {
  const { address: param } = useParams();
  const address = param && isAddress(param) ? getAddress(param) : undefined;
  const election = useElection(address);
  // contagem e cédulas ao vivo, por eventos (só depois de confirmar que o endereço é uma eleição)
  useElectionEvents(election.data?.address);

  if (!address) {
    return <NotFound />;
  }

  if (election.isPending) {
    return (
      <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Lendo a eleição na rede…
      </p>
    );
  }

  if (election.isError) {
    const notFound = election.error instanceof ElectionNotFoundError;

    return (
      <div className="space-y-4 py-12 text-center">
        <EmptyState
          icon={notFound ? SearchXIcon : TriangleAlertIcon}
          title={notFound ? "Eleição não encontrada." : "Não foi possível ler a eleição."}
          description={
            notFound
              ? "Este endereço não é de uma eleição criada por esta factory."
              : "Confira a conexão com a rede e recarregue a página."
          }
        />
        <Button asChild variant="outline">
          <Link to="/">Voltar para as eleições</Link>
        </Button>
      </div>
    );
  }

  const data = election.data;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Eleição"
        title={data.title}
        description={
          <div className="space-y-1">
            <p>
              Votação de {formatTimestamp(data.votingStart)} até {formatTimestamp(data.votingEnd)}.
            </p>
            <p className="font-mono text-xs break-all">{data.address}</p>
          </div>
        }
      />

      <ElectionStats election={data} />

      <ConnectWalletNotice>Conecte sua carteira para votar nesta eleição.</ConnectWalletNotice>

      <div className="grid items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <VoteCard election={data} />
        <ResultsCard election={data} />
      </div>

      <BallotsCard election={data} />
    </div>
  );
}
