/** Fase da eleição, pela mesma regra de `Election.phase()`. */
export type ElectionPhase = "scheduled" | "voting" | "tally";

export const phaseLabels: Record<ElectionPhase, string> = {
  scheduled: "Agendada",
  voting: "Em votação",
  tally: "Em apuração",
};

/** Antes do início: agendada. Do início até antes do fim: votação. A partir do fim: apuração. */
export function phaseAt(
  nowSeconds: number,
  { votingStart, votingEnd }: { votingStart: bigint; votingEnd: bigint },
): ElectionPhase {
  const now = BigInt(Math.floor(nowSeconds));

  if (now < votingStart) {
    return "scheduled";
  }

  if (now < votingEnd) {
    return "voting";
  }

  return "tally";
}

/** Tempo restante em linguagem curta: "2 d 4 h", "3 h 12 min", "8 min 5 s", "42 s". */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const rest = seconds % 60;

  if (days > 0) {
    return `${days} d ${hours} h`;
  }

  if (hours > 0) {
    return `${hours} h ${minutes} min`;
  }

  if (minutes > 0) {
    return `${minutes} min ${rest} s`;
  }

  return `${rest} s`;
}

const dateTime = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** Timestamp Unix (segundos) no horário local: "20/11/2026, 14:30". */
export function formatTimestamp(seconds: bigint): string {
  return dateTime.format(new Date(Number(seconds) * 1000));
}
