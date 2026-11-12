import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Abertura da página. `hero` é a versão grande da página inicial. */
export function PageHeader({
  title,
  description,
  size = "page",
}: {
  title: ReactNode;
  description?: ReactNode;
  size?: "hero" | "page";
}) {
  return (
    <div className={size === "hero" ? "space-y-5" : "space-y-3"}>
      <h1
        className={cn(
          "font-display text-balance",
          size === "hero"
            ? "text-[2.5rem] leading-[0.98] sm:text-6xl"
            : "text-3xl leading-[1.05] sm:text-4xl",
        )}
      >
        {title}
      </h1>

      {description && (
        <div
          className={cn(
            "max-w-[62ch] text-pretty text-muted-foreground",
            size === "hero" ? "text-lg" : "text-base",
          )}
        >
          {description}
        </div>
      )}
    </div>
  );
}
