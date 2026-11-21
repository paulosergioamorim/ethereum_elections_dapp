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
  nominationEnd: at(10),
  votingStart: at(15),
  votingEnd: at(75),
};

describe("validateElectionForm", () => {
  it("should build the createElection input from valid values", () => {
    const { errors, input } = validateElectionForm(valid, nowSeconds);

    expect(errors).toEqual({});
    expect(input).toEqual({
      title: "Representante da turma",
      nominationEnd: BigInt(fromDateTimeLocal(valid.nominationEnd)!),
      votingStart: BigInt(fromDateTimeLocal(valid.votingStart)!),
      votingEnd: BigInt(fromDateTimeLocal(valid.votingEnd)!),
    });
  });

  it("should require a title", () => {
    expect(validateElectionForm({ ...valid, title: "   " }, nowSeconds).errors.title).toBeDefined();
  });

  it("should not ask for candidates: the parties nominate them", () => {
    const { input } = validateElectionForm(valid, nowSeconds);

    expect(input).not.toHaveProperty("candidates");
  });

  it("should require the end of the nominations", () => {
    const { errors, input } = validateElectionForm({ ...valid, nominationEnd: "" }, nowSeconds);

    expect(errors.nominationEnd).toBe("Informe quando as indicações terminam.");
    expect(input).toBeUndefined();
  });

  it("should require the nominations to end in the future with the transaction margin", () => {
    const { errors } = validateElectionForm({ ...valid, nominationEnd: at(1) }, nowSeconds);

    expect(errors.nominationEnd).toMatch(/2 minutos/);
  });

  it("should not let the nominations end after the voting starts", () => {
    const { errors } = validateElectionForm({ ...valid, nominationEnd: at(16) }, nowSeconds);

    expect(errors.nominationEnd).toBe("O fim das indicações não pode ser depois do início da votação.");
  });

  it("should accept nominations ending exactly when the voting starts", () => {
    const { errors } = validateElectionForm({ ...valid, nominationEnd: valid.votingStart }, nowSeconds);

    expect(errors.nominationEnd).toBeUndefined();
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

  it("should prefill nominations closing in ~10 minutes and the voting 5 minutes later, on multiples of 5 minutes", () => {
    const form = defaultElectionForm(now);
    const nominationEnd = fromDateTimeLocal(form.nominationEnd)!;
    const start = fromDateTimeLocal(form.votingStart)!;

    expect(nominationEnd).toBeGreaterThanOrEqual(nowSeconds + 10 * 60 - 60);
    expect(new Date(nominationEnd * 1000).getMinutes() % 5).toBe(0);
    expect(start - nominationEnd).toBe(5 * 60);
    expect(fromDateTimeLocal(form.votingEnd)! - start).toBe(60 * 60);
  });
});
