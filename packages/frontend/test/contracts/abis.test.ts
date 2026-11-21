import { describe, expect, it } from "vitest";
import { electionFactoryAbi, partyAbi } from "@/contracts";

function names(abi: readonly { type: string; name?: string }[], type: string) {
  return abi.filter((item) => item.type === type).map((item) => item.name);
}

describe("exported ABIs", () => {
  it("should give the factory createParty, parties, isParty and PartyCreated", () => {
    expect(names(electionFactoryAbi, "function")).toEqual(
      expect.arrayContaining(["createParty", "parties", "isParty"]),
    );
    expect(names(electionFactoryAbi, "event")).toContain("PartyCreated");
  });

  it("should export the Party ABI the pages call", () => {
    expect(names(partyAbi, "function")).toEqual(
      expect.arrayContaining(["donate", "withdraw", "donatedBy", "name", "owner", "pendingOwner", "transferOwnership", "acceptOwnership"]),
    );
  });
});
