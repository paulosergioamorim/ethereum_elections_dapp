import { XIcon } from "lucide-react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

/** O quadrinho marcado da cédula: o indicador da página ativa na navegação. */
export function BallotMark({ marked = true, className }: { marked?: boolean; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-xs border-2",
        marked ? "border-primary bg-primary text-primary-foreground" : "border-foreground/30",
        className,
      )}
    >
      {marked && <XIcon className="size-full" strokeWidth={3.5} />}
    </span>
  );
}

/**
 * Marca do app: a urna com o voto conferido do ícone antigo, redesenhada em bloco:
 * cantos vivos, traço grosso e pontas retas, sobre um quadrado verde.
 */
function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("size-8 shrink-0", className)}>
      <rect width="24" height="24" className="fill-primary" />
      <g
        fill="none"
        strokeWidth="2.25"
        strokeLinecap="square"
        strokeLinejoin="miter"
        className="stroke-primary-foreground"
      >
        {/* a urna, o pé dela e o voto conferido */}
        <path d="M6.5 17.5v-11h11v11" />
        <path d="M4 17.5h16" />
        <path d="m9.5 11.5 2 2 3.5-3.5" />
      </g>
    </svg>
  );
}

export function BrandLink() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Eleições, página inicial">
      <BrandMark />
      <span className="font-display text-xl">eleições</span>
    </Link>
  );
}
