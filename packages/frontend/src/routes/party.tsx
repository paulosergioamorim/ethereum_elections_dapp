import { CoinsIcon, HandHeartIcon, Loader2Icon, SearchXIcon, TriangleAlertIcon, UserIcon } from "lucide-react";
import { Link, useParams } from "react-router";
import { getAddress, isAddress, zeroAddress } from "viem";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { formatEth, shortAddress } from "@/lib/format";
import {
  AcceptCard,
  DonateCard,
  HandoverCard,
  isSameAccount,
  PartyNotFoundError,
  useDonated,
  useParty,
  WithdrawCard,
} from "@/parties";
import { ConnectWalletNotice, useWallet } from "@/wallet";

function PartyMissing({ notFound }: { notFound: boolean }) {
  return (
    <div className="space-y-4 py-12 text-center">
      <EmptyState
        icon={notFound ? SearchXIcon : TriangleAlertIcon}
        title={notFound ? "Partido não encontrado." : "Não foi possível ler o partido."}
        description={
          notFound
            ? "Este endereço não é de um partido criado por esta factory."
            : "Confira a conexão com a rede e recarregue a página."
        }
      />
      <Button asChild variant="outline">
        <Link to="/parties">Voltar para os partidos</Link>
      </Button>
    </div>
  );
}

export function Party() {
  const { address: param } = useParams();
  const address = param && isAddress(param) ? getAddress(param) : undefined;
  const { account } = useWallet();
  const party = useParty(address);
  const donated = useDonated(address, account);

  if (!address) {
    return <PartyMissing notFound />;
  }

  if (party.isPending) {
    return (
      <p className="flex items-center justify-center gap-2 py-24 text-sm text-muted-foreground">
        <Loader2Icon className="size-4 animate-spin" />
        Lendo o partido na rede…
      </p>
    );
  }

  if (party.isError) {
    return <PartyMissing notFound={party.error instanceof PartyNotFoundError} />;
  }

  const data = party.data;
  const isPresident = isSameAccount(account, data.owner);
  const hasPending = data.pendingOwner !== zeroAddress;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Partido"
        title={data.name}
        description={
          <div className="space-y-1">
            <p className="font-mono text-xs break-all">{data.address}</p>
            {hasPending && (
              <p className="text-sm">
                Presidente pendente: <span className="font-mono break-all">{data.pendingOwner}</span>
              </p>
            )}
          </div>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={UserIcon}
          label="Presidente"
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

      <ConnectWalletNotice>Conecte sua carteira para doar a este partido.</ConnectWalletNotice>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <DonateCard party={data.address} />
        {isPresident && (
          <>
            <WithdrawCard
              key={data.owner}
              party={data.address}
              president={data.owner}
              balance={data.balance}
            />
            <HandoverCard party={data.address} />
          </>
        )}
        {hasPending && isSameAccount(account, data.pendingOwner) && <AcceptCard party={data.address} />}
      </div>
    </div>
  );
}
