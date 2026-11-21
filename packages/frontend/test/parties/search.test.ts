import { describe, expect, it } from "vitest";
import { filterParties } from "@/parties/search";
import { alice, bob } from "../helpers/mock-wallet";

const parties = [
  { address: alice, name: "Alfa", owner: bob },
  { address: bob, name: "Partido Alfa", owner: alice },
  { address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" as const, name: "Beta", owner: bob },
];

describe("filterParties", () => {
  it("should keep everything for an empty or blank query", () => {
    expect(filterParties(parties, "")).toHaveLength(3);
    expect(filterParties(parties, "   ")).toHaveLength(3);
  });

  it("should match the name in the middle of the text, ignoring case", () => {
    expect(filterParties(parties, "alfa").map((party) => party.name)).toEqual(["Alfa", "Partido Alfa"]);
    expect(filterParties(parties, "ETA").map((party) => party.name)).toEqual(["Beta"]);
  });

  it("should match an address fragment", () => {
    expect(filterParties(parties, alice.slice(2, 10).toLowerCase()).map((party) => party.name)).toEqual(
      ["Alfa", "Partido Alfa"],
    );
  });

  it("should match the president address fragment", () => {
    // `bob` preside "Alfa" e "Beta"; o endereço de `bob` também é o do partido "Partido Alfa"
    expect(filterParties(parties, bob.slice(2, 12)).map((party) => party.name)).toEqual([
      "Alfa",
      "Partido Alfa",
      "Beta",
    ]);
    expect(filterParties(parties, "0x90F79bf6").map((party) => party.name)).toEqual(["Beta"]);
  });

  it("should return nothing when no field matches", () => {
    expect(filterParties(parties, "prefeito")).toEqual([]);
  });

  it("should still find a party whose data has not loaded by its address", () => {
    expect(filterParties([{ address: alice }], alice.slice(2, 8))).toHaveLength(1);
    expect(filterParties([{ address: alice }], "alfa")).toHaveLength(0);
  });
});
