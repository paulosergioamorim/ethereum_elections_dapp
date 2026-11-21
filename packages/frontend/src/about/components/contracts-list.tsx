import { contracts } from "../content";
import { Code } from "./code";
import { SectionHeading } from "./section-heading";

/** Os contratos Solidity do projeto, um por linha: quem cria cada um e o que ele faz. */
export function ContractsList() {
  return (
    <section aria-labelledby="contracts-title" className="space-y-4">
      <SectionHeading
        id="contracts-title"
        title="Os contratos"
        description="Cinco contratos em Solidity. Todos, menos a factory, são clones baratos (EIP-1167), um por eleição, partido, candidato e candidatura."
      />

      <ul className="divide-y rounded-2xl border bg-card px-5">
        {contracts.map((contract) => (
          <li
            key={contract.name}
            className="grid gap-x-6 gap-y-1 py-4 text-sm sm:grid-cols-[11rem_minmax(0,1fr)]"
          >
            <div className="space-y-0.5">
              <p>
                <Code>{contract.name}</Code>
              </p>
              <p className="text-xs text-muted-foreground">{contract.origin}</p>
            </div>
            <p className="leading-relaxed text-muted-foreground">{contract.description}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
