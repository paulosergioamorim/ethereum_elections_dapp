import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Rótulo curto acima do título: ponto índigo e texto em caixa alta. */
function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-primary uppercase">
      <span aria-hidden className="size-1.5 rounded-full bg-primary" />
      {children}
    </p>
  );
}

/** Abertura da página. `hero` é a versão grande da página inicial. */
export function PageHeader({
  eyebrow,
  title,
  description,
  size = "page",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  size?: "hero" | "page";
}) {
  return (
    <div className="space-y-3">
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}

      <h1
        className={cn(
          "font-bold tracking-tight text-balance",
          size === "hero" ? "text-4xl leading-[1.1] sm:text-5xl" : "text-3xl",
        )}
      >
        {title}
      </h1>

      {description && (
        <div
          className={cn(
            "max-w-2xl text-pretty text-muted-foreground",
            size === "hero" ? "text-lg" : "text-base",
          )}
        >
          {description}
        </div>
      )}
    </div>
  );
}
