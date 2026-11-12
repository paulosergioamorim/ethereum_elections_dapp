import { RefreshCwIcon, VoteIcon } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { InfoNote } from "@/components/info-note";
import { PageHeader } from "@/components/page-header";
import { SearchInput } from "@/components/search-input";
import { SectionCard } from "@/components/section-card";
import { StatCard, StatRow } from "@/components/stat-card";
import { Steps } from "@/components/steps";
import { Button } from "@/components/ui/button";
import { ElectionList, useElections } from "@/elections";
import { useVoterStatus, type VoterStatus } from "@/factory";
import { cn } from "@/lib/utils";
import { ConnectWalletNotice, useWallet } from "@/wallet";

/** O que a coluna "Sua situação" mostra para a conta ativa. */
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
    return { value: "Registrado", caption: "Vota nas eleições criadas depois do registro" };
  }

  if (voter.isAuthorized) {
    return { value: "Pendente", caption: "Autorizado: falta o registro, na aba Registro" };
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
    <div className="space-y-10">
      <PageHeader
        size="hero"
        title={
          <>
            Seu voto em segredo,
            <br />a apuração à vista.
          </>
        }
        description="Cada eleitor vota uma única vez, com uma prova de conhecimento zero, e as cédulas só podem ser abertas depois do fim da votação. Qualquer pessoa confere a contagem na blockchain."
      />

      {/* "—" enquanto o dado não estiver disponível */}
      <StatRow>
        <StatCard
          label="Eleições"
          value={elections.data?.length}
          caption="Criadas pela autoridade eleitoral"
        />
        <StatCard label="Eleitores registrados" caption="Identidades anônimas registradas" />
        <StatCard label="Sua situação" value={situation.value} caption={situation.caption} />
      </StatRow>

      <ConnectWalletNotice>Conecte sua carteira para se registrar e votar.</ConnectWalletNotice>

      <div className="grid grid-cols-1 items-start gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
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

        <section aria-labelledby="how-to-vote-title" className="space-y-5">
          <div className="space-y-1">
            <h2 id="how-to-vote-title" className="font-display text-lg">
              Como votar
            </h2>
            <p className="text-sm text-muted-foreground">Do registro ao resultado, em três passos.</p>
          </div>

          <Steps
            steps={[
              {
                title: "Registre-se",
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

          <Button asChild className="h-10 w-full">
            <Link to="/register">Fazer meu registro</Link>
          </Button>

          <InfoNote title="Seu voto fica em segredo até o fim.">
            As cédulas são cifradas para o instante do encerramento: ninguém consegue abri-las antes,
            nem a autoridade.
          </InfoNote>
        </section>
      </div>
    </div>
  );
}
