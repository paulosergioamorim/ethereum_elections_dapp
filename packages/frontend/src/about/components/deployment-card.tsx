import { NetworkIcon } from "lucide-react";
import type { ReactNode } from "react";
import type { Address } from "viem";
import { SectionCard } from "@/components/section-card";
import { factoryAddress } from "@/contracts";
import { useFactoryInfo, type FactoryInfo } from "@/factory";
import { appChain, explorerAddressUrl, liveEvents } from "@/lib/chain";
import { REPOSITORY_URL } from "@/lib/project";

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1 py-3 first:pt-0 last:pb-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  );
}

/** Endereço completo (para copiar e conferir), com link para o explorador quando a rede tem um. */
function AddressValue({ address }: { address: Address }) {
  const url = explorerAddressUrl(address);
  const text = <span className="font-mono text-xs break-all">{address}</span>;

  if (!url) {
    return text;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline-offset-4 hover:underline"
    >
      {text}
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

/** Os contratos e serviços reais por trás desta página, lidos da factory configurada no app. */
export function DeploymentCard() {
  const factory = useFactoryInfo();

  function fromFactory(render: (info: FactoryInfo) => ReactNode) {
    if (factory.data) {
      return render(factory.data);
    }

    return (
      <span className="text-muted-foreground">
        {factory.isError ? "Não foi possível ler a factory." : "Lendo a factory…"}
      </span>
    );
  }

  return (
    <SectionCard
      icon={NetworkIcon}
      title="Nesta implantação"
      description="Os endereços reais, para conferir no explorador de blocos."
    >
      <dl className="divide-y">
        <Row label="Rede">
          {appChain.name} · chain ID {appChain.id}
        </Row>
        <Row label="ElectionFactory">
          <AddressValue address={factoryAddress} />
        </Row>
        <Row label="Autoridade eleitoral (dona da factory)">
          {fromFactory((info) => (
            <AddressValue address={info.owner} />
          ))}
        </Row>
        <Row label="Semaphore v4">
          {fromFactory((info) => (
            <AddressValue address={info.semaphore} />
          ))}
        </Row>
        <Row label="Grupo de eleitores">
          {fromFactory((info) => `Grupo nº ${info.groupId.toString()} do Semaphore`)}
        </Row>
        <Row label="drand">quicknet, da League of Entropy: uma rodada a cada {"3\u00a0s"}</Row>
        <Row label="Eventos ao vivo">
          {liveEvents
            ? "Ativos, por WebSocket (eth_subscribe)."
            : "Desligados: este site não tem WebSocket configurado. As listas se atualizam depois das suas transações e pelo botão de atualizar."}
        </Row>
        <Row label="Código-fonte">
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noreferrer"
            className="break-words text-primary underline-offset-4 hover:underline"
          >
            {/* "dono/repositório": o endereço inteiro não cabe numa linha do card */}
            {new URL(REPOSITORY_URL).pathname.slice(1)}
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
        </Row>
      </dl>
    </SectionCard>
  );
}
