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
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
      <Icon className="mb-1 size-8 text-muted-foreground/60" />
      <p className="font-medium">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
