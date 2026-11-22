import { beforeAll, describe, expect, it } from "vitest";
import { randomSalt } from "../ballot.js";
import {
  openBallot,
  quicknetClient,
  roundForTimestamp,
  sealBallot,
} from "../timelock.js";

describe("shared/timelock (drand quicknet real)", () => {
  const client = quicknetClient();
  const round = 1000;
  // instante (em segundos) em que a rodada `round` é publicada
  let roundTimestamp: bigint;

  beforeAll(async () => {
    const info = await client.chain().info();

    roundTimestamp = BigInt(info.genesis_time + (round - 1) * info.period);
  });

  // timestamp exatamente no instante de uma rodada → essa rodada
  it("should return the round published exactly at the timestamp", async () => {
    expect(await roundForTimestamp(roundTimestamp, client)).toBe(round);
  });

  // timestamp entre duas rodadas → a seguinte (nunca uma publicada antes de votingEnd)
  it("should return the next round when between rounds", async () => {
    expect(await roundForTimestamp(roundTimestamp + 1n, client)).toBe(round + 1);
  });

  // rodada já publicada: openBallot(await sealBallot(b, round, client), client) deepEqual b
  it("should round-trip sealBallot and openBallot for a past round", { timeout: 30_000 }, async () => {
    const oneHourAgo = BigInt(Math.floor(Date.now() / 1000) - 3600);
    const pastRound = await roundForTimestamp(oneHourAgo, client);
    const ballot = { option: 1n, salt: randomSalt() };

    const ciphertext = await sealBallot(ballot, pastRound, client);

    expect(await openBallot(ciphertext, client)).toEqual(ballot);
  });
});
