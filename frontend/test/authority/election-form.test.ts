import { describe, expect, it } from "vitest";
import {
  defaultElectionForm,
  fromDateTimeLocal,
  MIN_START_DELAY_SECONDS,
  toDateTimeLocal,
  validateElectionForm,
  type ElectionFormValues,
} from "@/authority/election-form";

const now = new Date(2026, 10, 20, 14, 3);
const nowSeconds = Math.floor(now.getTime() / 1000);

function at(minutesFromNow: number) {
  return toDateTimeLocal(new Date(now.getTime() + minutesFromNow * 60_000));
}

const valid: ElectionFormValues = {
  title: "  Representante da turma  ",
  candidates: ["Ana", "", "Bruno"],
  votingStart: at(10),
  votingEnd: at(70),
};

describe("validateElectionForm", () => {
  it("should build the createElection input from valid values", () => {
    const { errors, input } = validateElectionForm(valid, nowSeconds);

    expect(errors).toEqual({});
    expect(input).toEqual({
      title: "Representante da turma",
      // linhas vazias saem; a ordem fica, porque o índice é a opção de voto
      candidates: ["Ana", "Bruno"],
      votingStart: BigInt(fromDateTimeLocal(valid.votingStart)!),
      votingEnd: BigInt(fromDateTimeLocal(valid.votingEnd)!),
    });
  });

  it("should require a title", () => {
    expect(validateElectionForm({ ...valid, title: "   " }, nowSeconds).errors.title).toBeDefined();
  });

  it("should require at least two candidates", () => {
    const { errors, input } = validateElectionForm({ ...valid, candidates: ["Ana", " "] }, nowSeconds);

    expect(errors.candidates).toBe("Informe pelo menos 2 candidatos.");
    expect(input).toBeUndefined();
  });

  it("should reject repeated candidates regardless of case", () => {
    const { errors } = validateElectionForm({ ...valid, candidates: ["Ana", "ana"] }, nowSeconds);

    expect(errors.candidates).toBe("Há candidatos repetidos.");
  });

  it("should require the start to leave time for the transaction to be mined", () => {
    const { errors } = validateElectionForm({ ...valid, votingStart: at(1) }, nowSeconds);

    expect(errors.votingStart).toMatch(/2 minutos/);
    expect(MIN_START_DELAY_SECONDS).toBe(120);
  });

  it("should require the end to be after the start", () => {
    const { errors } = validateElectionForm({ ...valid, votingEnd: valid.votingStart }, nowSeconds);

    expect(errors.votingEnd).toBe("O fim precisa ser depois do início.");
  });
});

describe("datetime-local", () => {
  it("should round-trip local dates to unix seconds", () => {
    expect(fromDateTimeLocal(toDateTimeLocal(now))).toBe(nowSeconds - now.getSeconds());
  });

  it("should treat an empty field as missing", () => {
    expect(fromDateTimeLocal("")).toBeUndefined();
  });

  it("should prefill a start at least 10 minutes ahead, on a multiple of 5 minutes", () => {
    const form = defaultElectionForm(now);
    const start = fromDateTimeLocal(form.votingStart)!;

    expect(start).toBeGreaterThanOrEqual(nowSeconds + 10 * 60 - 60);
    expect(new Date(start * 1000).getMinutes() % 5).toBe(0);
    expect(fromDateTimeLocal(form.votingEnd)! - start).toBe(60 * 60);
  });
});
