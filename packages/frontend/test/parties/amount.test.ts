import { describe, expect, it } from "vitest";
import { parseEthAmount } from "@/parties/amount";

describe("parseEthAmount", () => {
  it("should read a decimal amount in ETH", () => {
    expect(parseEthAmount("0.5")).toEqual({ wei: 500_000_000_000_000_000n });
    expect(parseEthAmount("2")).toEqual({ wei: 2_000_000_000_000_000_000n });
  });

  it("should accept a comma as the decimal separator", () => {
    expect(parseEthAmount("1,5")).toEqual({ wei: 1_500_000_000_000_000_000n });
  });

  it("should ignore spaces around the amount", () => {
    expect(parseEthAmount("  0.1 ")).toEqual({ wei: 100_000_000_000_000_000n });
  });

  it("should accept exactly 1 wei, with 18 decimals", () => {
    expect(parseEthAmount("0.000000000000000001")).toEqual({ wei: 1n });
  });

  it.each(["", "   ", "abc", "-1", "1e3", "1.", ".5", "1,2,3", "0x10", "1 2"])(
    "should reject %j as not a decimal number",
    (text) => {
      expect(parseEthAmount(text)).toHaveProperty("error");
    },
  );

  it.each(["0", "0.0", "0,000"])("should reject the zero amount %j", (text) => {
    expect(parseEthAmount(text)).toEqual({ error: "O valor precisa ser maior que zero." });
  });

  it("should reject more than 18 decimals", () => {
    expect(parseEthAmount("0.0000000000000000001")).toEqual({
      error: "O ETH tem no máximo 18 casas decimais.",
    });
  });
});
