import { SectionCard } from "@/components/section-card";
import type { Technology } from "../content";
import { DocLinks } from "./doc-links";

/** Uma das tecnologias centrais: o que ela faz neste projeto e onde ler mais. */
export function TechnologyCard({ technology }: { technology: Technology }) {
  return (
    <SectionCard
      id={technology.id}
      layout="stacked"
      icon={technology.icon}
      title={technology.title}
      description={technology.description}
      className="scroll-mt-6"
    >
      <ul className="space-y-3 text-sm leading-relaxed">
        {technology.points.map((point, index) => (
          <li key={index}>{point}</li>
        ))}
      </ul>

      <DocLinks links={technology.docs} className="mt-5 border-t border-dashed pt-4" />
    </SectionCard>
  );
}
