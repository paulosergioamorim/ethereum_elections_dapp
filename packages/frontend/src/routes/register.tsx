import { PageHeader } from "@/components/page-header";
import { RegistrationCard, VoterStatusCard } from "@/registration";
import { ConnectWalletNotice } from "@/wallet";

export function Register() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Cadastro"
        title="Cadastro de eleitor"
        description="Registre sua identidade anônima uma vez: ela vale para todas as eleições criadas depois do cadastro."
      />

      <ConnectWalletNotice>
        Conecte a carteira autorizada pela autoridade para se cadastrar.
      </ConnectWalletNotice>

      <div className="grid items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <RegistrationCard />
        <VoterStatusCard />
      </div>
    </div>
  );
}
