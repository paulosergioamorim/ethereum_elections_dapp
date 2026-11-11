import { describe, expect, it } from "vitest";
import {
  chunk,
  pendingReveals,
  provisionalTally,
  type CastBallot,
  type OpenedBallot,
} from "@/elections/ballots";

const salt = `0x${"00".repeat(31)}01` as const;

function cast(index: bigint, revealedOption?: bigint): CastBallot {
  return { index, commitment: `0x${"aa".repeat(32)}`, ciphertext: "0xc1", revealedOption };
}

describe("pendingReveals", () => {
  it("should keep only ballots opened here and still sealed in the contract", () => {
    const ballots = [cast(0n, 1n), cast(1n), cast(2n)];
    const opened: OpenedBallot[] = [
      { index: 0n, status: "opened", option: 1n, salt },
      { index: 1n, status: "opened", option: 0n, salt },
      { index: 2n, status: "invalid" },
    ];

    expect(pendingReveals(ballots, opened).map((ballot) => ballot.index)).toEqual([1n]);
  });
});

describe("provisionalTally", () => {
  it("should add the ballots opened here to the ones already revealed", () => {
    const ballots = [cast(0n, 1n), cast(1n), cast(2n), cast(3n), cast(4n)];
    const opened: OpenedBallot[] = [
      { index: 1n, status: "opened", option: 0n, salt },
      { index: 2n, status: "opened", option: 9n, salt },
      { index: 3n, status: "invalid" },
      { index: 4n, status: "too-early", availableAt: 0 },
    ];

    expect(provisionalTally(2, ballots, opened)).toEqual({
      tally: [1n, 1n],
      // opção fora da lista é nulo, como no contrato
      nullVotes: 1n,
      counted: 3n,
      unpublished: 2n,
      invalid: 1n,
      tooEarly: 1n,
    });
  });

  it("should count a revealed out-of-range option as null", () => {
    expect(provisionalTally(2, [cast(0n, 2n)], [])).toMatchObject({ tally: [0n, 0n], nullVotes: 1n });
  });
});

describe("chunk", () => {
  it("should split into batches of at most the given size", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 2)).toEqual([]);
  });
});
