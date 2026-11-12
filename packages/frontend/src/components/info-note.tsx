import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Nota de rodapé de uma seção: uma explicação curta, separada por uma linha tracejada. */
export function InfoNote({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-1 border-t border-dashed pt-4 text-sm", className)}>
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}
