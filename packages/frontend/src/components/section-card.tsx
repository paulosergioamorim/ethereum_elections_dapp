import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { IconBubble } from "@/components/icon-bubble";
import { cn } from "@/lib/utils";

/**
 * Card de seção com cabeçalho e corpo separados por uma linha.
 * - `stacked`: ícone em bolha acima do título (cards de ação, como "Como votar");
 * - `inline`: ícone ao lado do título (cards de lista, como "Eleições").
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
  /** Controles abaixo da descrição, antes da linha (ex.: busca). */
  toolbar?: ReactNode;
  layout?: "stacked" | "inline";
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn("flex flex-col rounded-2xl border bg-card", className)}>
      <div className="space-y-4 p-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1 space-y-1">
            {layout === "stacked" ? (
              <>
                <IconBubble icon={Icon} className="mb-3" />
                <h2 className="text-lg font-semibold">{title}</h2>
              </>
            ) : (
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Icon className="size-5 text-primary" />
                {title}
              </h2>
            )}

            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>

          {action}
        </div>

        {toolbar}
      </div>

      <div className="flex-1 border-t p-5">{children}</div>
    </section>
  );
}
