import type { LucideIcon } from "lucide-react";

/** Lugar reservado para uma lista ou resultado que ainda não tem conteúdo. */
export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-start gap-1.5 rounded border border-dashed px-5 py-8">
      <Icon className="mb-2 size-6 text-primary" />
      <p className="font-semibold">{title}</p>
      <p className="max-w-md text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
