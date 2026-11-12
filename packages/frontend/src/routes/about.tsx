import {
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
        title="As tecnologias por trás do voto"
        description="Um dApp acadêmico de eleição, inspirado no sistema eleitoral brasileiro e sem vínculo com nenhum órgão eleitoral. Duas tecnologias sustentam o projeto: o Ethereum guarda as regras e a contagem, e o Semaphore mantém o voto anônimo."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {technologies.map((technology) => (
          <TechnologyCard key={technology.id} technology={technology} />
        ))}
      </div>

      <VoteJourney />

      <SupportingTools />

      <div className="grid grid-cols-1 items-start gap-x-12 gap-y-10 lg:grid-cols-2">
        <DeploymentCard />
        <LimitationsCard />
      </div>
    </div>
  );
}
