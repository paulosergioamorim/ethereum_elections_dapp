import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Ícone num círculo índigo claro (cards de número e cabeçalhos de seção). */
export function IconBubble({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary",
        className,
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
