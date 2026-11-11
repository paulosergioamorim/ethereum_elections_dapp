import type { CreateElectionInput } from "@/factory";

/** Valores do formulário; as datas no formato do `<input type="datetime-local">` (horário local). */
export type ElectionFormValues = {
  title: string;
  candidates: string[];
  votingStart: string;
  votingEnd: string;
};

export type ElectionFormErrors = Partial<Record<keyof ElectionFormValues, string>>;

/**
 * O contrato exige `votingStart >= block.timestamp` no bloco em que a transação entra.
 * A margem cobre o tempo entre clicar, assinar e a transação ser minerada.
 */
export const MIN_START_DELAY_SECONDS = 120;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** `Date` → `YYYY-MM-DDTHH:mm` no horário local, o formato do `datetime-local`. */
export function toDateTimeLocal(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `YYYY-MM-DDTHH:mm` (horário local) → timestamp Unix em segundos. */
export function fromDateTimeLocal(value: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const milliseconds = new Date(value).getTime();

  return Number.isNaN(milliseconds) ? undefined : Math.floor(milliseconds / 1000);
}

/** Formulário em branco: início daqui a ~10 min (múltiplo de 5) e 1 hora de votação. */
export function defaultElectionForm(now = new Date()): ElectionFormValues {
  const start = new Date(now.getTime() + 10 * 60_000);
  start.setSeconds(0, 0);
  start.setMinutes(Math.ceil(start.getMinutes() / 5) * 5);
  const end = new Date(start.getTime() + 60 * 60_000);

  return {
    title: "",
    candidates: ["", ""],
    votingStart: toDateTimeLocal(start),
    votingEnd: toDateTimeLocal(end),
  };
}

/**
 * As mesmas regras do `initialize` do Election, mais o título obrigatório, candidatos sem repetição
 * e a margem no início. A ordem dos candidatos é mantida: o índice de cada um é a opção de voto.
 */
export function validateElectionForm(
  values: ElectionFormValues,
  nowSeconds: number,
): { errors: ElectionFormErrors; input?: CreateElectionInput } {
  const errors: ElectionFormErrors = {};
  const title = values.title.trim();
  const candidates = values.candidates.map((candidate) => candidate.trim()).filter(Boolean);
  const start = fromDateTimeLocal(values.votingStart);
  const end = fromDateTimeLocal(values.votingEnd);

  if (!title) {
    errors.title = "Dê um título à eleição.";
  }

  if (candidates.length < 2) {
    errors.candidates = "Informe pelo menos 2 candidatos.";
  } else if (
    new Set(candidates.map((candidate) => candidate.toLocaleLowerCase("pt-BR"))).size !==
    candidates.length
  ) {
    errors.candidates = "Há candidatos repetidos.";
  }

  if (start === undefined) {
    errors.votingStart = "Informe quando a votação começa.";
  } else if (start < nowSeconds + MIN_START_DELAY_SECONDS) {
    errors.votingStart =
      "O início precisa estar pelo menos 2 minutos no futuro, para dar tempo de a transação ser confirmada.";
  }

  if (end === undefined) {
    errors.votingEnd = "Informe quando a votação termina.";
  } else if (start !== undefined && end <= start) {
    errors.votingEnd = "O fim precisa ser depois do início.";
  }

  if (Object.keys(errors).length > 0 || start === undefined || end === undefined) {
    return { errors };
  }

  return {
    errors,
    input: { title, candidates, votingStart: BigInt(start), votingEnd: BigInt(end) },
  };
}
