import { ScaleIcon } from "lucide-react";
import { SectionCard } from "@/components/section-card";
import { limitations } from "../content";
import { ExternalDocLink } from "./doc-links";

/** O que o sigilo não cobre hoje, em poucas linhas. */
export function LimitationsCard() {
  return (
    <SectionCard
      icon={ScaleIcon}
      title="Premissas e limitações"
      description="O que o sigilo ainda não cobre."
    >
      <ul className="-mt-4 divide-y">
        {limitations.map((item) => (
          <li key={item.title} className="space-y-1 py-3.5 text-sm">
            <p className="font-semibold">{item.title}</p>
            <p className="leading-relaxed text-muted-foreground">
              {item.description}
              {item.doc && (
                <>
                  {" "}
                  Veja o <ExternalDocLink link={item.doc} />.
                </>
              )}
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
