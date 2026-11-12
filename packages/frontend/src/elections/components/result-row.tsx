import { Badge } from "@/components/ui/badge";

/** Uma linha do boletim: nome, pontilhado até os votos, percentual sobre `base` e a barra. */
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
  /** Barra em cinza: as outras linhas, quando já há um eleito. */
  dimmed?: boolean;
}) {
  const percent = base > 0n ? Number((votes * 1000n) / base) / 10 : 0;

  return (
    <li className="space-y-2">
      <div className="flex items-baseline gap-2">
        <span className="font-semibold">{label}</span>
        {elected && <Badge className="self-center">Eleito</Badge>}
        <span aria-hidden className="min-w-4 flex-1 border-b-2 border-dotted border-foreground/25" />
        <span className="font-numeral text-xl leading-none [word-spacing:0.12em]">
          {votes.toString()} · {percent.toLocaleString("pt-BR")}%
        </span>
      </div>
      <div className="h-2.5 bg-foreground/8">
        <div
          className={dimmed ? "h-full bg-foreground/35" : "h-full bg-primary"}
          style={{ width: `${percent}%` }}
        />
      </div>
    </li>
  );
}
