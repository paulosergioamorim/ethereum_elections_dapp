import type { ReactNode } from "react";

/** Faixa de números da página: uma linha de registro, entre duas réguas, com um dado por coluna. */
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <div className="grid border-y-2 border-foreground max-md:divide-y md:grid-cols-3 md:divide-x">
      {children}
    </div>
  );
}

/** Um dado da faixa. Sem `value`, mostra "—" (dado ainda indisponível). */
export function StatCard({
  label,
  value,
  caption,
}: {
  label: string;
  value?: ReactNode;
  caption: string;
}) {
  return (
    <div role="group" aria-label={label} className="py-3.5 md:px-6 md:py-4 md:first:pl-0 md:last:pr-0">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl leading-tight">{value ?? "—"}</p>
      <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}
