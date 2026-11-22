import { CalendarPlusIcon, FlagIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useSearchParams } from "react-router";
import { SectionCard } from "@/components/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ElectionList, useElections } from "@/elections";
import { useVoters } from "@/factory";
import { PartyList, useParties } from "@/parties";
import { parseAdminTab } from "../admin-tab";
import { AuthorizeVotersCard } from "./authorize-voters-card";
import { CreateElectionCard } from "./create-election-card";
import { CreatePartyCard } from "./create-party-card";
import { VotersCard } from "./voters-card";

function TwoColumns({ children }: { children: ReactNode }) {
  return <div className="grid items-start gap-6 lg:grid-cols-2">{children}</div>;
}

/** Uma aba por assunto da autoridade; a aba aberta vive na URL (`?aba=`). */
export function AdminTabs() {
  const [params, setParams] = useSearchParams();
  const tab = parseAdminTab(params.get("aba"));
  const voters = useVoters();
  const elections = useElections();
  const parties = useParties();
  const registered = voters.data?.filter((voter) => voter.commitment !== 0n).length;

  return (
    <Tabs value={tab} onValueChange={(next) => setParams({ aba: next })}>
      <TabsList aria-label="Assuntos da autoridade">
        <TabsTrigger value="eleitores">Eleitores</TabsTrigger>
        <TabsTrigger value="eleicoes">Eleições</TabsTrigger>
        <TabsTrigger value="partidos">Partidos</TabsTrigger>
      </TabsList>

      <TabsContent value="eleitores">
        <TwoColumns>
          <AuthorizeVotersCard authorized={voters.data?.map((voter) => voter.address)} />
          <VotersCard />
        </TwoColumns>
      </TabsContent>

      <TabsContent value="eleicoes">
        <TwoColumns>
          <CreateElectionCard registeredVoters={registered} />
          <SectionCard icon={CalendarPlusIcon} title="Eleições criadas" description="Da mais recente para a mais antiga.">
            <ElectionList elections={elections.data} isError={elections.isError} />
          </SectionCard>
        </TwoColumns>
      </TabsContent>

      <TabsContent value="partidos">
        <TwoColumns>
          <CreatePartyCard />
          <SectionCard icon={FlagIcon} title="Partidos criados" description="Nome, presidente e saldo de cada partido.">
            <PartyList
              parties={parties.data}
              isError={parties.isError}
              isPending={parties.isPending}
              onRetry={() => void parties.refetch()}
            />
          </SectionCard>
        </TwoColumns>
      </TabsContent>
    </Tabs>
  );
}

