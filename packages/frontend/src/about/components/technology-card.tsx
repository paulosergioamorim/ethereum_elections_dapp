import { SectionCard } from "@/components/section-card";
import type { Technology } from "../content";
import { DocLinks } from "./doc-links";

/** Uma tecnologia: o que ela faz neste projeto e onde ler mais. */
export function TechnologyCard({ technology }: { technology: Technology }) {
  return (
    <SectionCard
      id={technology.id}
      icon={technology.icon}
      title={technology.title}
      description={technology.description}
      className="scroll-mt-6"
    >
      <ul className="space-y-3 text-sm leading-relaxed">
        {technology.points.map((point, index) => (
          <li key={index} className="flex gap-2.5">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/60" />
            <span className="min-w-0">{point}</span>
          </li>
        ))}
      </ul>

      <DocLinks links={technology.docs} className="mt-5 border-t pt-4" />
    </SectionCard>
  );
}
