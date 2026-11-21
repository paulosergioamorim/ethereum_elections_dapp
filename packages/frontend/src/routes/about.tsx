import {
  ContractsList,
  DeploymentCard,
  LimitationsCard,
  SupportingTools,
  technologies,
  TechnologyCard,
  VoteJourney,
} from "@/about";
import { PageHeader } from "@/components/page-header";

export function About() {
  return (
    <div className="space-y-12">
      <PageHeader
        eyebrow="Sobre"
        title="As tecnologias por trás do voto"
        description="Um dApp acadêmico de eleição, inspirado no sistema eleitoral brasileiro e sem vínculo com nenhum órgão eleitoral. Duas tecnologias sustentam o projeto: o Ethereum guarda as regras e a contagem, e o Semaphore mantém o voto anônimo."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {technologies.map((technology) => (
          <TechnologyCard key={technology.id} technology={technology} />
        ))}
      </div>

      <ContractsList />

      <VoteJourney />

      <SupportingTools />

      <div className="grid items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <DeploymentCard />
        <LimitationsCard />
      </div>
    </div>
  );
}
