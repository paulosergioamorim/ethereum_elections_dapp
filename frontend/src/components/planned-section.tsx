import { CircleDashedIcon, ConstructionIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Marca o que falta construir num card do esboço. Sai quando a funcionalidade existir. */
export function PlannedSection({ items, className }: { items: string[]; className?: string }) {
  return (
    <div className={cn("space-y-3 text-sm", className)}>
      <p className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        <ConstructionIcon className="size-3.5" />
        Em construção
      </p>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-muted-foreground">
            <CircleDashedIcon className="mt-0.5 size-4 shrink-0 text-primary/50" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
