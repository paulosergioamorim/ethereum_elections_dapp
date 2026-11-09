import { KeyRoundIcon, Loader2Icon } from "lucide-react";
import { InfoNote } from "@/components/info-note";
import { SectionCard } from "@/components/section-card";
import { Steps } from "@/components/steps";
import { Button } from "@/components/ui/button";
import { useRegisterIdentity, useVoterStatus, type RegisterStep } from "@/factory";
import { appChain } from "@/lib/chain";
import { useWallet } from "@/wallet";

const stepLabels: Record<RegisterStep, string> = {
  signing: "Assine a mensagem na carteira…",
  sending: "Confirme a transação na carteira…",
  confirming: "Cadastrando…",
};

/** Cadastro da conta ativa: assinatura, derivação da identidade e registro do compromisso. */
export function RegistrationCard() {
  const { status, account, isWrongChain } = useWallet();
  const voter = useVoterStatus(account);
  const register = useRegisterIdentity();

  let blockedReason: string | undefined;

  if (status !== "connected") {
    // a faixa do topo da página já explica qual carteira conectar
    blockedReason = "Conecte sua carteira para continuar.";
  } else if (isWrongChain) {
    blockedReason = `Troque a carteira para a ${appChain.name}.`;
  } else if (!voter.data) {
    blockedReason = voter.isError
      ? "Não foi possível consultar a situação da conta."
      : "Consultando a situação da conta…";
  } else if (voter.data.commitment !== 0n) {
    blockedReason = "Esta conta já está cadastrada.";
  } else if (!voter.data.isAuthorized) {
    blockedReason = "Esta conta não está autorizada pela autoridade.";
  }

  return (
    <SectionCard
      layout="stacked"
      icon={KeyRoundIcon}
      title="Sua identidade de eleitor"
      description="Gerada a partir de uma assinatura da sua carteira."
    >
      <Steps
        steps={[
          {
            title: "Assinar a mensagem",
            description: "A carteira assina um texto fixo. Nada vai para a blockchain nesse passo.",
          },
          {
            title: "Gerar a identidade",
            description: "O navegador deriva a identidade Semaphore da assinatura.",
          },
          {
            title: "Registrar",
            description: "Só o compromisso público da identidade vai para o contrato.",
          },
        ]}
      />

      <Button
        className="mt-6 h-10 w-full"
        onClick={() => register.mutate()}
        disabled={!!blockedReason || register.isPending}
      >
        {register.isPending && <Loader2Icon className="animate-spin" />}
        {register.step ? stepLabels[register.step] : "Gerar identidade e cadastrar"}
      </Button>

      {blockedReason && !register.isPending && (
        <p className="mt-3 text-center text-xs text-muted-foreground">{blockedReason}</p>
      )}

      <InfoNote className="mt-6" title="Nada fica salvo no navegador.">
        A mesma carteira gera sempre a mesma identidade, então dá para votar de qualquer
        computador.
      </InfoNote>
    </SectionCard>
  );
}
