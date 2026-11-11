import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { randomSalt } from "../../../shared/ballot.js";
import {
  openBallot,
  quicknetClient,
  roundForTimestamp,
  sealBallot,
} from "../../../shared/timelock.js";

describe("shared/timelock (drand quicknet real)", async () => {
  const client = quicknetClient();
  const info = await client.chain().info();
  const round = 1000;
  // instante (em segundos) em que a rodada `round` é publicada
  const roundTimestamp = BigInt(info.genesis_time + (round - 1) * info.period);

  // timestamp exatamente no instante de uma rodada → essa rodada
  it("should return the round published exactly at the timestamp", async () => {
    assert.equal(await roundForTimestamp(roundTimestamp, client), round);
  });

  // timestamp entre duas rodadas → a seguinte (nunca uma publicada antes de votingEnd)
  it("should return the next round when between rounds", async () => {
    assert.equal(await roundForTimestamp(roundTimestamp + 1n, client), round + 1);
  });

  // rodada já publicada: openBallot(await sealBallot(b, round, client), client) deepEqual b
  it("should round-trip sealBallot and openBallot for a past round", async () => {
    const oneHourAgo = BigInt(Math.floor(Date.now() / 1000) - 3600);
    const pastRound = await roundForTimestamp(oneHourAgo, client);
    const ballot = { option: 1n, salt: randomSalt() };

    const ciphertext = await sealBallot(ballot, pastRound, client);

    assert.deepEqual(await openBallot(ciphertext, client), ballot);
  });
});
