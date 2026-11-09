import {
  ArrowRightIcon,
  BadgeCheckIcon,
  ListOrderedIcon,
  RefreshCwIcon,
  UsersIcon,
  VoteIcon,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { InfoNote } from "@/components/info-note";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { SectionCard } from "@/components/section-card";
import { StatCard } from "@/components/stat-card";
import { Steps } from "@/components/steps";
import { Button } from "@/components/ui/button";
import { ElectionList, useElections } from "@/elections";
import { useVoterStatus, type VoterStatus } from "@/factory";
import { cn } from "@/lib/utils";
import { ConnectWalletNotice, useWallet } from "@/wallet";

/** O que o card "Sua situação" mostra para a conta ativa. */
function voterSituation(
  connected: boolean,
  voter: VoterStatus | undefined,
): { value?: string; caption: string } {
  if (!connected) {
    return { caption: "Conecte sua carteira para ver" };
  }

  if (!voter) {
    return { caption: "Consultando a factory…" };
  }

  if (voter.commitment !== 0n) {
    return { value: "Cadastrado", caption: "Vota nas eleições criadas depois do cadastro" };
  }

  if (voter.isAuthorized) {
    return { value: "Pendente", caption: "Autorizado: falta o cadastro, na aba Cadastro" };
  }

  return { value: "Sem autorização", caption: "Peça à autoridade para autorizar esta carteira" };
}

export function Elections() {
  const { status, account } = useWallet();
  const elections = useElections();
  const [query, setQuery] = useState("");
  const voter = useVoterStatus(account);
  const situation = voterSituation(status === "connected", voter.data);

  return (
    <div className="space-y-8">
      <PageHeader
        size="hero"
        eyebrow="Eleições na blockchain"
        title={
          <>
            Seu voto em segredo,
            <br />a apuração <span className="text-primary">à vista.</span>
          </>
        }
        description="Cada eleitor vota uma única vez, com uma prova de conhecimento zero, e as cédulas só podem ser abertas depois do fim da votação. Qualquer pessoa confere a contagem na blockchain."
      />

      {/* "—" enquanto o dado não estiver disponível */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={VoteIcon}
          label="Eleições"
          value={elections.data?.length}
          caption="Criadas pela autoridade eleitoral"
        />
        <StatCard
          icon={UsersIcon}
          label="Eleitores cadastrados"
          caption="Identidades anônimas registradas"
        />
        <StatCard
          icon={BadgeCheckIcon}
          label="Sua situação"
          value={situation.value}
          caption={situation.caption}
        />
      </div>

      <ConnectWalletNotice>Conecte sua carteira para se cadastrar e votar.</ConnectWalletNotice>

      <div className="grid items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <SectionCard
          layout="stacked"
          icon={ListOrderedIcon}
          title="Como votar"
          description="Do cadastro ao resultado, em três passos."
        >
          <Steps
            steps={[
              {
                title: "Cadastre-se",
                description:
                  "Com a carteira autorizada pela autoridade, registre sua identidade anônima.",
              },
              {
                title: "Vote",
                description:
                  "Escolha o candidato: a cédula vai selada, com uma prova de que você pode votar.",
              },
              {
                title: "Acompanhe a apuração",
                description:
                  "No fim da votação, qualquer pessoa abre as cédulas e confere a contagem.",
              },
            ]}
          />

          <Button asChild className="mt-6 h-10 w-full">
            <Link to="/register">
              Fazer meu cadastro
              <ArrowRightIcon />
            </Link>
          </Button>

          <InfoNote className="mt-6" title="Seu voto fica em segredo até o fim.">
            As cédulas são cifradas para o instante do encerramento: ninguém consegue abri-las antes,
            nem a autoridade.
          </InfoNote>
        </SectionCard>

        <SectionCard
          icon={VoteIcon}
          title="Eleições"
          description="Acompanhe as eleições e os resultados, sem precisar de carteira."
          action={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Atualizar eleições"
              onClick={() => void elections.refetch()}
              disabled={elections.isFetching}
            >
              <RefreshCwIcon className={cn(elections.isFetching && "animate-spin")} />
            </Button>
          }
          toolbar={
            <SearchInput
              placeholder="Buscar por título, endereço ou número…"
              aria-label="Buscar eleição"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              disabled={!elections.data?.length}
            />
          }
        >
          <ElectionList elections={elections.data} isError={elections.isError} query={query} />
        </SectionCard>
      </div>
    </div>
  );
}
