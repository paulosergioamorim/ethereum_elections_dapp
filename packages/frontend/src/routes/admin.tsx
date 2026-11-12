import {
  AuthorityGuard,
  AuthorizeVotersCard,
  CreateElectionCard,
  VotersCard,
} from "@/authority";
import { PageHeader } from "@/components/page-header";
import { StatCard, StatRow } from "@/components/stat-card";
import { useElections } from "@/elections";
import { useVoters } from "@/factory";

/** A aba só aparece para a conta dona da factory; para as outras, a tela do `AuthorityGuard`. */
export function Admin() {
  return (
    <AuthorityGuard>
      <AuthorityPanel />
    </AuthorityGuard>
  );
}

function AuthorityPanel() {
  const voters = useVoters();
  const elections = useElections();
  const registered = voters.data?.filter((voter) => voter.commitment !== 0n).length;

  return (
    <div className="space-y-10">
      <PageHeader
        title="Autoridade eleitoral"
        description="Autorize carteiras, acompanhe os registros e crie eleições."
      />

      <StatRow>
        <StatCard
          label="Carteiras autorizadas"
          value={voters.data?.length}
          caption="Podem se registrar como eleitoras"
        />
        <StatCard
          label="Eleitores registrados"
          value={registered}
          caption="Entram nas próximas eleições"
        />
        <StatCard
          label="Eleições"
          value={elections.data?.length}
          caption="Criadas por esta factory"
        />
      </StatRow>

      <div className="grid grid-cols-1 items-start gap-x-12 gap-y-10 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <AuthorizeVotersCard authorized={voters.data?.map((voter) => voter.address)} />
          <CreateElectionCard registeredVoters={registered} />
        </div>

        <VotersCard />
      </div>
    </div>
  );
}
