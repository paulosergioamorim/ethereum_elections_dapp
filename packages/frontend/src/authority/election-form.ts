import * as v from "valibot";
import type { CreateElectionInput } from "@/factory";
import { addFieldIssue, parseForm } from "@/lib/schema";

/** Valores do formulário; as datas no formato do `<input type="datetime-local">` (horário local). */
const electionFields = v.object({
  title: v.string(),
  nominationEnd: v.string(),
  votingStart: v.string(),
  votingEnd: v.string(),
});

export type ElectionFormValues = v.InferInput<typeof electionFields>;

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

/** Formulário em branco: indicações até daqui a ~10 min (múltiplo de 5), votação 5 min depois e 1 hora de votação. */
export function defaultElectionForm(now = new Date()): ElectionFormValues {
  const nominationEnd = new Date(now.getTime() + 10 * 60_000);
  nominationEnd.setSeconds(0, 0);
  nominationEnd.setMinutes(Math.ceil(nominationEnd.getMinutes() / 5) * 5);
  const start = new Date(nominationEnd.getTime() + 5 * 60_000);
  const end = new Date(start.getTime() + 60 * 60_000);

  return {
    title: "",
    nominationEnd: toDateTimeLocal(nominationEnd),
    votingStart: toDateTimeLocal(start),
    votingEnd: toDateTimeLocal(end),
  };
}

/**
 * As mesmas regras do `initialize` do Election, mais o título obrigatório e a margem no fim das
 * indicações e no início da votação. Os candidatos não entram aqui: os partidos os indicam depois.
 * O schema depende do horário (`nowSeconds`), então é montado a cada envio.
 */
export function electionFormSchema(nowSeconds: number) {
  return v.pipe(
    electionFields,
    v.rawTransform(({ dataset, addIssue, NEVER }): CreateElectionInput => {
      const values = dataset.value;
      const issue = (key: keyof ElectionFormValues, message: string) =>
        addFieldIssue(addIssue, values, key, message);
      const title = values.title.trim();
      const nominationEnd = fromDateTimeLocal(values.nominationEnd);
      const start = fromDateTimeLocal(values.votingStart);
      const end = fromDateTimeLocal(values.votingEnd);
      let failed = false;

      if (!title) {
        issue("title", "Dê um título à eleição.");
        failed = true;
      }

      if (nominationEnd === undefined) {
        issue("nominationEnd", "Informe quando as indicações terminam.");
        failed = true;
      } else if (nominationEnd < nowSeconds + MIN_START_DELAY_SECONDS) {
        issue(
          "nominationEnd",
          "O fim das indicações precisa estar pelo menos 2 minutos no futuro, para dar tempo de a transação ser confirmada.",
        );
        failed = true;
      } else if (start !== undefined && nominationEnd > start) {
        issue("nominationEnd", "O fim das indicações não pode ser depois do início da votação.");
        failed = true;
      }

      if (start === undefined) {
        issue("votingStart", "Informe quando a votação começa.");
        failed = true;
      } else if (start < nowSeconds + MIN_START_DELAY_SECONDS) {
        issue(
          "votingStart",
          "O início precisa estar pelo menos 2 minutos no futuro, para dar tempo de a transação ser confirmada.",
        );
        failed = true;
      }

      if (end === undefined) {
        issue("votingEnd", "Informe quando a votação termina.");
        failed = true;
      } else if (start !== undefined && end <= start) {
        issue("votingEnd", "O fim precisa ser depois do início.");
        failed = true;
      }

      if (failed || nominationEnd === undefined || start === undefined || end === undefined) {
        return NEVER;
      }

      return {
        title,
        nominationEnd: BigInt(nominationEnd),
        votingStart: BigInt(start),
        votingEnd: BigInt(end),
      };
    }),
  );
}

export function validateElectionForm(values: ElectionFormValues, nowSeconds: number) {
  return parseForm(electionFormSchema(nowSeconds), values);
}
