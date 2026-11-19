import { Badge } from "@/components/ui/badge";

/** Uma linha do resultado: nome, votos, percentual sobre `base` e a barra. */
export function ResultRow({
  label,
  votes,
  base,
  elected = false,
  dimmed = false,
}: {
  label: string;
  votes: bigint;
  base: bigint;
  /** Marca o candidato eleito. */
  elected?: boolean;
  /** Barra apagada: as outras linhas, quando já há um eleito. */
  dimmed?: boolean;
}) {
  const percent = base > 0n ? Number((votes * 1000n) / base) / 10 : 0;

  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="flex items-center gap-2 font-medium">
          {label}
          {elected && <Badge>Eleito</Badge>}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {votes.toString()} · {percent.toLocaleString("pt-BR")}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={dimmed ? "h-full rounded-full bg-muted-foreground/40" : "h-full rounded-full bg-primary"}
          style={{ width: `${percent}%` }}
        />
      </div>
    </li>
  );
}
