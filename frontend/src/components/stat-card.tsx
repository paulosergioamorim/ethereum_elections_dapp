import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { IconBubble } from "@/components/icon-bubble";

/** Número em destaque. Sem `value`, mostra "—" (dado ainda indisponível). */
export function StatCard({
  icon,
  label,
  value,
  caption,
}: {
  icon: LucideIcon;
  label: string;
  value?: ReactNode;
  caption: string;
}) {
  return (
    <div role="group" aria-label={label} className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <IconBubble icon={icon} />
      </div>

      <p className="mt-1 text-3xl font-semibold tracking-tight">{value ?? "—"}</p>
      <p className="mt-3 text-xs text-muted-foreground">{caption}</p>
    </div>
  );
}
