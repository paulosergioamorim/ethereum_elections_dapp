import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Seção de uma página, em duas formas:
 * - `stacked`: formulário. Folha branca com uma faixa verde no topo, como o cabeçalho de um impresso;
 * - `inline`: registro. Sem caixa: título sobre o papel, uma régua e as linhas da lista.
 */
export function SectionCard({
  id,
  icon: Icon,
  title,
  description,
  action,
  toolbar,
  layout = "inline",
  className,
  children,
}: {
  /** Âncora para links dentro da página (`#id`). */
  id?: string;
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Botão no canto do cabeçalho (ex.: atualizar). */
  action?: ReactNode;
  /** Controles abaixo da descrição, antes da régua (ex.: busca). */
  toolbar?: ReactNode;
  layout?: "stacked" | "inline";
  className?: string;
  children: ReactNode;
}) {
  if (layout === "stacked") {
    return (
      <section id={id} className={cn("overflow-hidden rounded border bg-card", className)}>
        <div className="flex items-start gap-3 bg-primary px-5 py-4 text-primary-foreground">
          <div className="min-w-0 flex-1 space-y-0.5">
            <h2 className="flex items-center gap-2 font-display text-lg">
              <Icon aria-hidden className="size-[1.1rem] shrink-0" />
              {title}
            </h2>
            {description && <p className="text-sm text-primary-foreground/85">{description}</p>}
          </div>

          {action}
        </div>

        {toolbar && <div className="border-b p-5">{toolbar}</div>}

        <div className="p-5">{children}</div>
      </section>
    );
  }

  return (
    <section id={id} className={cn("flex flex-col", className)}>
      <div className="space-y-4 pb-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="font-display text-2xl leading-tight">{title}</h2>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>

          {action}
        </div>

        {toolbar}
      </div>

      <div className="flex-1 border-t-2 border-foreground pt-4">{children}</div>
    </section>
  );
}
