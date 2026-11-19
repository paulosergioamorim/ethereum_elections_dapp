import { cva, type VariantProps } from "class-variance-authority";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

const bannerVariants = cva(
  "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border px-4 py-3 text-sm",
  {
    variants: {
      variant: {
        info: "border-primary/15 bg-primary/5 text-foreground",
        warning:
          "border-amber-300/70 bg-amber-50 text-amber-950 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-100",
        danger:
          "border-rose-300/70 bg-rose-50 text-rose-900 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-100",
      },
    },
    defaultVariants: { variant: "info" },
  },
);

/** Faixa de aviso com ação à direita: rede errada, falha de conexão, carteira desconectada. */
export function Banner({
  variant,
  icon: Icon,
  action,
  children,
}: VariantProps<typeof bannerVariants> & {
  icon?: LucideIcon;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div role={variant === "info" || !variant ? "status" : "alert"} className={bannerVariants({ variant })}>
      {Icon && <Icon className="size-4 shrink-0" />}
      <p className="min-w-0 flex-1">{children}</p>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
