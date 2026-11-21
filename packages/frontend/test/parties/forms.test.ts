import { describe, expect, it } from "vitest";
import { validateCreatePartyForm } from "@/parties";
import { alice } from "../helpers/mock-wallet";

describe("validateCreatePartyForm", () => {
  it("should build the createParty input, trimming the name", () => {
    expect(validateCreatePartyForm({ president: alice, name: "  Partido Verde " })).toEqual({
      errors: {},
      input: { president: alice, name: "Partido Verde" },
    });
  });

  it("should flag an invalid president address", () => {
    const { errors, input } = validateCreatePartyForm({ president: "0xabc", name: "PT" });

    expect(errors.president).toBeDefined();
    expect(errors.name).toBeUndefined();
    expect(input).toBeUndefined();
  });

  it("should accept a lowercase president address and normalise it", () => {
    expect(validateCreatePartyForm({ president: ` ${alice.toLowerCase()} `, name: "PT" }).input?.president).toBe(
      alice,
    );
  });

  it.each(["", "0x1234", "alice", "0x0000000000000000000000000000000000000000"])(
    "should reject %j as the president",
    (president) => {
      const { errors, input } = validateCreatePartyForm({ president, name: "PT" });

      expect(errors.president).toBeDefined();
      expect(input).toBeUndefined();
    },
  );

  it("should flag an empty or whitespace name", () => {
    expect(validateCreatePartyForm({ president: alice, name: "" }).errors.name).toBe(
      "Informe o nome do partido.",
    );
    expect(validateCreatePartyForm({ president: alice, name: "   " }).errors.name).toBe(
      "Informe o nome do partido.",
    );
  });
});
