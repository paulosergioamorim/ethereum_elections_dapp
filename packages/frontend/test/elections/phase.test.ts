import { describe, expect, it } from "vitest";
import { formatCountdown, phaseAt } from "@/elections/phase";

const election = { votingStart: 1_000n, votingEnd: 2_000n };

describe("phaseAt", () => {
  // mesma regra de Election.phase(): o início é inclusivo e o fim já é apuração
  it("should be scheduled before the start", () => {
    expect(phaseAt(999, election)).toBe("scheduled");
  });

  it("should be voting from the start, inclusive", () => {
    expect(phaseAt(1_000, election)).toBe("voting");
    expect(phaseAt(1_999.9, election)).toBe("voting");
  });

  it("should be tally from the end, inclusive", () => {
    expect(phaseAt(2_000, election)).toBe("tally");
  });
});

describe("formatCountdown", () => {
  it("should use the two largest units", () => {
    expect(formatCountdown(2 * 86_400 + 4 * 3_600 + 59)).toBe("2 d 4 h");
    expect(formatCountdown(3 * 3_600 + 12 * 60 + 30)).toBe("3 h 12 min");
    expect(formatCountdown(8 * 60 + 5)).toBe("8 min 5 s");
    expect(formatCountdown(42.9)).toBe("42 s");
  });

  it("should never go below zero", () => {
    expect(formatCountdown(-5)).toBe("0 s");
  });
});
