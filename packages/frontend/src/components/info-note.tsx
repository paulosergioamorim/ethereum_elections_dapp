import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Caixa cinza com uma explicação curta, no pé dos cards de ação. */
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
    <div className={cn("space-y-1.5 rounded-xl bg-muted p-4 text-sm", className)}>
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}
