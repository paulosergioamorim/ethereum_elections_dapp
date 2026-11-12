import { PageHeader } from "@/components/page-header";
import { RegistrationCard, VoterStatusCard } from "@/registration";
import { ConnectWalletNotice } from "@/wallet";

export function Register() {
  return (
    <div className="space-y-10">
      <PageHeader
        title="Registro de eleitor"
        description="Registre sua identidade anônima uma vez: ela vale para todas as eleições criadas depois do registro."
      />

      <ConnectWalletNotice>
        Conecte a carteira autorizada pela autoridade para se registrar.
      </ConnectWalletNotice>

      <div className="grid grid-cols-1 items-start gap-x-12 gap-y-10 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <RegistrationCard />
        <VoterStatusCard />
      </div>
    </div>
  );
}
