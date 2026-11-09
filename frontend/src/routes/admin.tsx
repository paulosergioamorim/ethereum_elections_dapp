import { UserCheckIcon, UsersIcon, VoteIcon } from "lucide-react";
import {
  AuthorityNotice,
  AuthorizeVotersCard,
  CreateElectionCard,
  VotersCard,
} from "@/authority";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { useElections } from "@/elections";
import { useVoters } from "@/factory";
import { ConnectWalletNotice } from "@/wallet";

export function Admin() {
  const voters = useVoters();
  const elections = useElections();
  const registered = voters.data?.filter((voter) => voter.commitment !== 0n).length;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Autoridade"
        title="Autoridade eleitoral"
        description="Autorize carteiras, acompanhe os cadastros e crie eleições. Só a conta dona da factory pode administrar; os dados são públicos."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={UsersIcon}
          label="Carteiras autorizadas"
          value={voters.data?.length}
          caption="Podem se cadastrar como eleitoras"
        />
        <StatCard
          icon={UserCheckIcon}
          label="Eleitores cadastrados"
          value={registered}
          caption="Entram nas próximas eleições"
        />
        <StatCard
          icon={VoteIcon}
          label="Eleições"
          value={elections.data?.length}
          caption="Criadas por esta factory"
        />
      </div>

      <ConnectWalletNotice>Conecte a carteira dona da factory para administrar.</ConnectWalletNotice>
      <AuthorityNotice />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <AuthorizeVotersCard authorized={voters.data?.map((voter) => voter.address)} />
          <CreateElectionCard registeredVoters={registered} />
        </div>

        <VotersCard />
      </div>
    </div>
  );
}
