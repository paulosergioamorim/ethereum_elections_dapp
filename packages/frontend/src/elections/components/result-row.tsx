/** Uma linha do resultado: nome, votos, percentual sobre `base` e a barra. */
export function ResultRow({ label, votes, base }: { label: string; votes: bigint; base: bigint }) {
  const percent = base > 0n ? Number((votes * 1000n) / base) / 10 : 0;

  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {votes.toString()} · {percent.toLocaleString("pt-BR")}%
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </li>
  );
}
