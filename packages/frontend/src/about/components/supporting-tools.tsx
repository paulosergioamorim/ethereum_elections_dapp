import { supportingTools } from "../content";
import { ExternalDocLink } from "./doc-links";
import { SectionHeading } from "./section-heading";

/** O resto da pilha, sem entrar em detalhes: uma linha por ferramenta. */
export function SupportingTools() {
  return (
    <section aria-labelledby="supporting-title" className="space-y-4">
      <SectionHeading
        id="supporting-title"
        title="Também no projeto"
        description="As outras peças, em uma linha cada."
      />

      <ul className="divide-y border-t-2 border-foreground">
        {supportingTools.map((tool) => (
          <li
            key={tool.title}
            className="grid gap-x-6 gap-y-1 py-3.5 text-sm sm:grid-cols-[9rem_minmax(0,1fr)]"
          >
            <p className="font-semibold">{tool.title}</p>
            <div className="space-y-1">
              <p className="text-muted-foreground">{tool.description}</p>
              <p>
                <ExternalDocLink link={tool.doc} />
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
