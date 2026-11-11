import { IconBubble } from "@/components/icon-bubble";
import { journey } from "../content";
import { SectionHeading } from "./section-heading";

/** As quatro etapas de uma eleição, cada uma com atalhos para os cards que a explicam. */
export function VoteJourney() {
  return (
    <section aria-labelledby="journey-title" className="space-y-4">
      <SectionHeading
        id="journey-title"
        title="O caminho de um voto"
        description="Do cadastro à apuração, cada etapa usa uma peça diferente; os atalhos levam à explicação de cada uma."
      />

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {journey.map((step, index) => (
          <li key={step.title} className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-3">
              <IconBubble icon={step.icon} />
              <span className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
                Etapa {index + 1}
              </span>
            </div>

            <h3 className="font-semibold">{step.title}</h3>
            <p className="flex-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>

            <ul aria-label={`Tecnologias da etapa ${step.title}`} className="flex flex-wrap gap-1.5">
              {step.topics.map((topic) => (
                <li key={topic.label}>
                  <a
                    href={`#${topic.target}`}
                    className="inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                  >
                    {topic.label}
                  </a>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
