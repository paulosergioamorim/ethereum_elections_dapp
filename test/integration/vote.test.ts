import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { network } from "hardhat";
import { stringToHex } from "viem";
import {
  createElection,
  deployFactory,
  prepareVote,
  registerVoters,
  sendVote,
  terminateProver,
} from "./fixtures.js";

describe("Election.vote (Semaphore real)", async () => {
  const { viem, networkHelpers } = await network.create({ network: "integration" });
  const [, alice, bob, relayer] = await viem.getWalletClients();

  after(terminateProver);

  async function votingElection() {
    const { semaphore, factory } = await deployFactory(viem);
    const voters = await registerVoters(viem, factory, [alice, bob]);
    const now = BigInt(await networkHelpers.time.latest());
    const election = await createElection(viem, factory, {
      start: now + 60n,
      end: now + 3600n,
    });
    await networkHelpers.time.increaseTo(await election.read.votingStart());

    return { semaphore, factory, election, voters };
  }

  // teste de fumaça do spike: identidade derivada da assinatura, grupo pelos eventos, prova real aceita
  it("should accept a real proof", async () => {
    const { semaphore, election, voters } = await networkHelpers.loadFixture(votingElection);
    const vote = await prepareVote(
      semaphore,
      election,
      voters[0].identity,
      1n,
      stringToHex("ciphertext"),
    );

    await sendVote(election, vote, voters[0].wallet);

    const [, , unrevealed] = await election.read.results();
    assert.equal(unrevealed, 1n);
  });

  // commitBallot e voteMessage do JS batem com o keccak256(abi.encode(...)) do contrato (sem InvalidMessage)
  it.todo("should accept the commitment and message computed in JS");

  // cadastrado depois de createElection: não está na árvore congelada → não há prova válida para a raiz da eleição
  it.todo("should reject a voter registered after the election was created");

  // removeVoter depois de createElection: a raiz congelada ainda contém o eleitor → o voto é aceito (comportamento do snapshot)
  it.todo("should accept a voter removed after the election was created");

  // relayer malicioso: troca o commitment e recalcula proof.message → Semaphore__InvalidProof
  it.todo("should reject a tampered message with Semaphore__InvalidProof");

  // enviado por `relayer`, conta que não fez o cadastro → aceito
  it.todo("should accept a vote sent by an account other than the voter");

  // mesma identidade votando duas vezes → Semaphore__YouAreUsingTheSameNullifierTwice
  it.todo("should reject the same identity voting twice");
});
