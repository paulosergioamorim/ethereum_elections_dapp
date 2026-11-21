import { describe, expect, it } from "vitest";
import { candidateAbi, electionFactoryAbi, partyAbi } from "@/contracts";

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

  it("should give the Party createCandidate, candidates, isCandidate and CandidateCreated", () => {
    expect(names(partyAbi, "function")).toEqual(
      expect.arrayContaining(["createCandidate", "candidates", "isCandidate"]),
    );
    expect(names(partyAbi, "event")).toContain("CandidateCreated");
  });

  it("should export the Candidate ABI the pages call", () => {
    expect(names(candidateAbi, "function")).toEqual(
      expect.arrayContaining(["donate", "withdraw", "donatedBy", "name", "owner", "party"]),
    );
  });
});
