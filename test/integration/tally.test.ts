import { after, describe, it } from "node:test";
import { network } from "hardhat";
import { terminateProver } from "./fixtures.js";

describe("Apuração com tlock (drand quicknet real)", async () => {
  const { viem, networkHelpers } = await network.create({ network: "integration" });

  after(terminateProver);

  // Preparação comum:
  // - deployFactory, registerVoters e createElection de ./fixtures.ts;
  // - round = await roundForTimestamp(votingEnd, quicknetClient()) e ciphertext = await sealBallot(ballot, round, client);
  // - prepareVote(..., ciphertext, ballot.salt) e sendVote; depois networkHelpers.time.increaseTo(votingEnd).
  // A rede "integration" começa ~2 h no passado, então a rodada de votingEnd já foi publicada e openBallot funciona na hora.

  // 3 eleitores; lê election.getEvents.VoteCast, openBallot em cada ciphertext, revealBatch → results() bate com os votos
  it.todo("should tally the decrypted votes end to end");

  // opção >= número de candidatos, cifrada e revelada → nullVotes == 1
  it.todo("should count an out-of-range option as a null vote");

  // apurador 1 revela [0, 1], apurador 2 revela [1, 2] → revealedCount == 3, nenhum voto contado duas vezes
  it.todo("should not double count votes revealed by overlapping batches");

  // cifrar para a rodada de votingEnd: antes dela ser publicada, openBallot falha
  it.todo("should not open a ballot before the votingEnd round is published");
});
