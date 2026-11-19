import { journey } from "../content";
import { SectionHeading } from "./section-heading";

/** As quatro etapas de uma eleição, em ordem. */
export function VoteJourney() {
  return (
    <section aria-labelledby="journey-title" className="space-y-4">
      <SectionHeading
        id="journey-title"
        title="O caminho de um voto"
        description="Do registro à apuração, em quatro etapas."
      />

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {journey.map((step, index) => (
          <li key={step.title} className="flex flex-col gap-3 rounded-2xl border bg-card p-5">
            <span className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">
              Etapa {index + 1}
            </span>
            <h3 className="font-semibold">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
