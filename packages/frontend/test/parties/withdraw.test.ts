import { describe, expect, it } from "vitest";
import { isSameAccount } from "@/parties";
import { validateWithdrawForm } from "@/parties/withdraw";
import { alice, bob } from "../helpers/mock-wallet";

const ETH = 10n ** 18n;
const zero = "0x0000000000000000000000000000000000000000";

describe("validateWithdrawForm", () => {
  it("should build the withdraw(to, amount) input", () => {
    expect(validateWithdrawForm({ to: alice, amount: "0,5" }, ETH)).toEqual({
      errors: {},
      input: { to: alice, amount: ETH / 2n },
    });
  });

  it("should accept withdrawing exactly the balance, but not one wei more", () => {
    const balance = 1_234_567_800_000_000_000n;

    expect(validateWithdrawForm({ to: alice, amount: "1.2345678" }, balance).input?.amount).toBe(balance);
    expect(validateWithdrawForm({ to: alice, amount: "1.234567800000000001" }, balance)).toEqual({
      errors: { amount: "O valor é maior que o saldo do partido." },
    });
  });

  it.each(["", "abc", "0", "-1"])("should reject the amount %j", (amount) => {
    const { errors, input } = validateWithdrawForm({ to: alice, amount }, ETH);

    expect(errors.amount).toBeDefined();
    expect(errors.to).toBeUndefined();
    expect(input).toBeUndefined();
  });

  it.each(["", "0x123", "bob", zero])("should reject the destination %j", (to) => {
    const { errors, input } = validateWithdrawForm({ to, amount: "0.1" }, ETH);

    expect(errors.to).toBeDefined();
    expect(errors.amount).toBeUndefined();
    expect(input).toBeUndefined();
  });

  it("should reject any amount when the balance is zero", () => {
    expect(validateWithdrawForm({ to: alice, amount: "0.1" }, 0n).errors.amount).toBeDefined();
  });

  it("should report both fields at once", () => {
    const { errors } = validateWithdrawForm({ to: "x", amount: "y" }, ETH);

    expect(Object.keys(errors).sort()).toEqual(["amount", "to"]);
  });
});

describe("isSameAccount", () => {
  it("should compare addresses ignoring case", () => {
    expect(isSameAccount(alice.toLowerCase() as typeof alice, alice)).toBe(true);
  });

  it("should be false for different accounts or when one is missing", () => {
    expect(isSameAccount(alice, bob)).toBe(false);
    expect(isSameAccount(undefined, alice)).toBe(false);
    expect(isSameAccount(alice, undefined)).toBe(false);
    expect(isSameAccount(undefined, undefined)).toBe(false);
  });
});
