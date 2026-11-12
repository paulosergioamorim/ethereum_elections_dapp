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

      <ol className="grid border-y-2 border-foreground max-sm:divide-y sm:grid-cols-2 lg:grid-cols-4 lg:divide-x">
        {journey.map((step, index) => (
          <li key={step.title} className="space-y-1.5 py-4 lg:px-5 lg:first:pl-0 lg:last:pr-0">
            <span aria-hidden className="block font-numeral text-4xl leading-none text-primary">
              {index + 1}
            </span>
            <h3 className="font-semibold">{step.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
