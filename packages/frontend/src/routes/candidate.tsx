import { CoinsIcon, HandHeartIcon, Loader2Icon, SearchXIcon, TriangleAlertIcon, UserIcon } from "lucide-react";
import { Link, useParams } from "react-router";
import { getAddress, isAddress } from "viem";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { formatEth, shortAddress } from "@/lib/format";
import {
  CandidateNotFoundError,
  DonateCard,
  isSameAccount,
  useCandidate,
  useDonated,
  useParty,
  WithdrawCard,
} from "@/parties";
import { ConnectWalletNotice, useWallet } from "@/wallet";

function CandidateMissing({ notFound }: { notFound: boolean }) {
  return (
    <div className="space-y-4 py-12 text-center">
      <EmptyState
        icon={notFound ? SearchXIcon : TriangleAlertIcon}
        title={notFound ? "Candidato não encontrado." : "Não foi possível ler o candidato."}
        description={
          notFound
            ? "Este endereço não é de um candidato criado por um partido desta factory."
            : "Confira a conexão com a rede e recarregue a página."
        }
      />
      <Button asChild variant="outline">
        <Link to="/parties">Voltar para os partidos</Link>
      </Button>
    </div>
  );
}

export function Candidate() {
  const { address: param } = useParams();
  const address = param && isAddress(param) ? getAddress(param) : undefined;
  const { account } = useWallet();
  const candidate = useCandidate(address);
  const party = useParty(candidate.data?.party);
  const donated = useDonated(address, account);

  if (!address) {
    return <CandidateMissing notFound />;
  }

  if (candidate.isPending) {
    return (
      <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Lendo o candidato na rede…
      </p>
    );
  }

  if (candidate.isError) {
    return <CandidateMissing notFound={candidate.error instanceof CandidateNotFoundError} />;
  }

  const data = candidate.data;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Candidato"
        title={data.name}
        description={
          <div className="space-y-1">
            <p className="font-mono text-xs break-all">{data.address}</p>
            <p className="text-sm">
              Partido:{" "}
              <Link to={`/parties/${data.party}`} className="underline underline-offset-4">
                {party.data?.name ?? shortAddress(data.party)}
              </Link>
            </p>
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={UserIcon}
          label="Carteira"
          value={<span className="font-mono text-2xl">{shortAddress(data.owner)}</span>}
          caption="Quem pode sacar as doações"
        />
        <StatCard icon={CoinsIcon} label="Saldo" value={formatEth(data.balance)} caption="Doações disponíveis" />
        <StatCard
          icon={HandHeartIcon}
          label="Você já doou"
          value={account && donated.data !== undefined ? formatEth(donated.data) : undefined}
          caption={account ? "Total doado pela conta ativa" : "Conecte a carteira para ver"}
        />
      </div>

      <ConnectWalletNotice>Conecte sua carteira para doar a este candidato.</ConnectWalletNotice>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <DonateCard
          target={data.address}
          description="O valor vai para o saldo do candidato; só a carteira dele saca."
        />
        {isSameAccount(account, data.owner) && (
          <WithdrawCard key={data.owner} target={data.address} owner={data.owner} balance={data.balance} holder="candidato" />
        )}
      </div>
    </div>
  );
}
