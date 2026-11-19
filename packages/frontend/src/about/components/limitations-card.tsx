import { ScaleIcon, TriangleAlertIcon } from "lucide-react";
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
    </SectionCard>
  );
}
