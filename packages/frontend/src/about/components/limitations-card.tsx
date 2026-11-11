import { ScaleIcon, TriangleAlertIcon } from "lucide-react";
import { InfoNote } from "@/components/info-note";
import { SectionCard } from "@/components/section-card";
import { limitations } from "../content";
import { ExternalDocLink } from "./doc-links";

/** O que o sigilo cobre hoje, em que ele confia e o que fica para depois. */
export function LimitationsCard() {
  return (
    <SectionCard
      icon={ScaleIcon}
      title="Premissas e limitações"
      description="O que o sigilo cobre hoje e em que ele confia."
    >
      <ul className="space-y-4">
        {limitations.map((item) => (
          <li key={item.title} className="flex gap-3">
            <TriangleAlertIcon
              aria-hidden
              className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
            />
            <div className="min-w-0 space-y-1 text-sm">
              <p className="font-medium">{item.title}</p>
              <p className="leading-relaxed text-muted-foreground">{item.description}</p>
              {item.doc && (
                <p>
                  <ExternalDocLink link={item.doc} />
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>

      <InfoNote className="mt-6" title="Próximos passos">
        Um relayer, ou um paymaster ERC-4337 que pague o gás de quem apresenta uma prova Semaphore
        válida, tiraria a carteira do eleitor da transação de voto. O MACI traria a resistência à
        coerção.
      </InfoNote>
    </SectionCard>
  );
}
