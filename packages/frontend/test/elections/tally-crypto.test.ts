import { commitBallot } from "@elections/shared/ballot";
import { openBallot, roundTimeMs } from "@elections/shared/timelock";
import { describe, expect, it, vi } from "vitest";
import type { CastBallot } from "@/elections/ballots";
import { openBallots } from "@/elections/tally-crypto";

// o drand de verdade é coberto em test/integration/tally.test.ts (Hardhat); aqui, só a classificação
vi.mock("@elections/shared/timelock", () => ({
  quicknetClient: vi.fn(() => ({})),
  openBallot: vi.fn(),
  roundTimeMs: vi.fn(),
}));

const ballot = { option: 1n, salt: `0x${"00".repeat(31)}07` } as const;

function cast(index: bigint, overrides: Partial<CastBallot> = {}): CastBallot {
  return { index, commitment: commitBallot(ballot), ciphertext: "0xc1", ...overrides };
}

describe("openBallots", () => {
  it("should open a ballot whose content matches the registered commitment", async () => {
    vi.mocked(openBallot).mockResolvedValue(ballot);

    expect(await openBallots([cast(0n)])).toEqual([
      { index: 0n, status: "opened", option: 1n, salt: ballot.salt },
    ]);
  });

  it("should reject a ballot whose content does not match the commitment", async () => {
    vi.mocked(openBallot).mockResolvedValue({ ...ballot, option: 0n });

    expect(await openBallots([cast(0n)])).toEqual([{ index: 0n, status: "invalid" }]);
  });

  it("should reject a malformed ciphertext", async () => {
    vi.mocked(openBallot).mockRejectedValue(new Error("invalid armor"));

    expect(await openBallots([cast(0n)])).toEqual([{ index: 0n, status: "invalid" }]);
  });

  it("should wait for a drand round that was not published yet", async () => {
    vi.mocked(openBallot).mockRejectedValue(
      new Error("It's too early to decrypt the ciphertext - decryptable at round 4242"),
    );
    vi.mocked(roundTimeMs).mockResolvedValue(1_700_000_000_000);

    expect(await openBallots([cast(0n)])).toEqual([
      { index: 0n, status: "too-early", availableAt: 1_700_000_000_000 },
    ]);
    expect(roundTimeMs).toHaveBeenCalledWith(4242, expect.anything());
  });

  it("should not decrypt ballots already revealed in the contract", async () => {
    expect(await openBallots([cast(0n, { revealedOption: 1n })])).toEqual([]);
    expect(openBallot).not.toHaveBeenCalled();
  });
});
