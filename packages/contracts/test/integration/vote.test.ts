import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { network } from "hardhat";
import { stringToHex } from "viem";
import { commitBallot, randomSalt, voteMessage } from "../../../shared/index.js";
import {
  createElection,
  currentGroup,
  deployFactory,
  prepareVote,
  registerVoters,
  removeVoter,
  sendVote,
  terminateProver,
} from "./fixtures.js";

describe("Election.vote (Semaphore real)", async () => {
  const { viem, networkHelpers } = await network.create({ network: "integration" });
  const [, alice, bob, carol, relayer] = await viem.getWalletClients();
  const ciphertext = stringToHex("ciphertext");

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
    const vote = await prepareVote(semaphore, election, voters[0].identity, 1n, ciphertext);

    await sendVote(election, vote, voters[0].wallet);

    const [, , unrevealed] = await election.read.results();
    assert.equal(unrevealed, 1n);
  });

  // commitBallot e voteMessage do JS batem com o keccak256(abi.encode(...)) do contrato:
  // vote aceita a message (sem InvalidMessage) e revealBatch aceita a cédula (sem InvalidReveal)
  it("should accept the commitment and message computed in JS", async () => {
    const { semaphore, election, voters } = await networkHelpers.loadFixture(votingElection);
    const vote = await prepareVote(semaphore, election, voters[0].identity, 1n, ciphertext);

    await sendVote(election, vote, voters[0].wallet);
    await networkHelpers.time.increaseTo(await election.read.votingEnd());
    await election.write.revealBatch([[0n], [vote.ballot.option], [vote.ballot.salt]]);

    const [tally] = await election.read.results();
    assert.deepEqual(tally, [0n, 1n]);
  });

  // cadastrado depois de createElection: não está na árvore congelada → a prova só pode ser contra a raiz atual → MerkleRootMismatch
  it("should reject a voter registered after the election was created", async () => {
    const { semaphore, factory, election } = await networkHelpers.loadFixture(votingElection);
    const [late] = await registerVoters(viem, factory, [carol]);
    const vote = await prepareVote(
      semaphore,
      election,
      late.identity,
      1n,
      ciphertext,
      randomSalt(),
      await currentGroup(semaphore, factory),
    );

    await viem.assertions.revertWithCustomError(
      sendVote(election, vote, late.wallet),
      election,
      "MerkleRootMismatch",
    );
  });

  // removeVoter depois de createElection: a raiz congelada ainda contém o eleitor → o voto é aceito (comportamento do snapshot)
  it("should accept a voter removed after the election was created", async () => {
    const { semaphore, factory, election, voters } =
      await networkHelpers.loadFixture(votingElection);
    await removeVoter(semaphore, factory, voters[0]);
    const vote = await prepareVote(semaphore, election, voters[0].identity, 1n, ciphertext);

    await sendVote(election, vote, voters[0].wallet);

    const [, , unrevealed] = await election.read.results();
    assert.equal(unrevealed, 1n);
  });

  // relayer malicioso: troca o commitment e recalcula proof.message → passa pelo Election, mas a prova não confere → Semaphore__InvalidProof
  it("should reject a tampered message with Semaphore__InvalidProof", async () => {
    const { semaphore, election, voters } = await networkHelpers.loadFixture(votingElection);
    const vote = await prepareVote(semaphore, election, voters[0].identity, 1n, ciphertext);
    const forgedCommitment = commitBallot({ option: 0n, salt: randomSalt() });
    const forged = {
      ...vote,
      commitment: forgedCommitment,
      proof: { ...vote.proof, message: voteMessage(forgedCommitment, ciphertext) },
    };

    await viem.assertions.revertWithCustomError(
      sendVote(election, forged, relayer),
      semaphore,
      "Semaphore__InvalidProof",
    );
  });

  // enviado por `relayer`, conta que não fez o cadastro → aceito
  it("should accept a vote sent by an account other than the voter", async () => {
    const { semaphore, election, voters } = await networkHelpers.loadFixture(votingElection);
    const vote = await prepareVote(semaphore, election, voters[0].identity, 1n, ciphertext);

    await sendVote(election, vote, relayer);

    const [, , unrevealed] = await election.read.results();
    assert.equal(unrevealed, 1n);
  });

  // mesma identidade votando duas vezes, mesmo com outra cédula → Semaphore__YouAreUsingTheSameNullifierTwice
  it("should reject the same identity voting twice", async () => {
    const { semaphore, election, voters } = await networkHelpers.loadFixture(votingElection);
    const first = await prepareVote(semaphore, election, voters[0].identity, 1n, ciphertext);
    const second = await prepareVote(semaphore, election, voters[0].identity, 0n, ciphertext);

    await sendVote(election, first, voters[0].wallet);

    await viem.assertions.revertWithCustomError(
      sendVote(election, second, voters[0].wallet),
      semaphore,
      "Semaphore__YouAreUsingTheSameNullifierTwice",
    );
  });
});
