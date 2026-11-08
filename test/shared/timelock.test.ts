import { describe, it } from "node:test";

describe("shared/timelock (drand quicknet real)", () => {
  // timestamp exatamente no instante de uma rodada → essa rodada
  it.todo("should return the round published exactly at the timestamp");

  // timestamp entre duas rodadas → a seguinte (nunca uma publicada antes de votingEnd)
  it.todo("should return the next round when between rounds");

  // rodada já publicada: openBallot(await sealBallot(b, round, client), client) deepEqual b
  it.todo("should round-trip sealBallot and openBallot for a past round");
});
