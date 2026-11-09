import {
  DeploymentCard,
  LimitationsCard,
  SectionHeading,
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
        description={
          <div className="space-y-2">
            <p>
              Um dApp acadêmico de eleição, inspirado no sistema eleitoral brasileiro e sem vínculo
              com nenhum órgão eleitoral. Os contratos rodam na Sepolia, a rede de testes do
              Ethereum, e o navegador fala direto com a blockchain.
            </p>
            <p>Esta página explica cada peça e aponta a documentação oficial de cada uma.</p>
          </div>
        }
      />

      <VoteJourney />

      <section aria-labelledby="technologies-title" className="space-y-4">
        <SectionHeading
          id="technologies-title"
          title="Peça por peça"
          description="O que cada tecnologia faz neste projeto e onde ler mais sobre ela."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {technologies.map((technology) => (
            <TechnologyCard key={technology.id} technology={technology} />
          ))}
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <DeploymentCard />
        <LimitationsCard />
      </div>
    </div>
  );
}
