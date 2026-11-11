import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import { network } from "hardhat";
import type { Hex } from "viem";
import {
  openBallot,
  quicknetClient,
  randomSalt,
  roundForTimestamp,
  sealBallot,
} from "../../../shared/index.js";
import {
  createElection,
  deployFactory,
  prepareVote,
  registerVoters,
  sendVote,
  terminateProver,
  type Election,
  type Semaphore,
  type Voter,
} from "./fixtures.js";

describe("Apuração com tlock (drand quicknet real)", async () => {
  const { viem, networkHelpers } = await network.create({ network: "integration" });
  const [, alice, bob, carol, teller1, teller2] = await viem.getWalletClients();
  const client = quicknetClient();

  after(terminateProver);

  // A rede "integration" começa ~2 h no passado, então a rodada de votingEnd já foi publicada
  // e openBallot funciona assim que a eleição termina.
  async function votingElection() {
    const { semaphore, factory } = await deployFactory(viem);
    const voters = await registerVoters(viem, factory, [alice, bob, carol]);
    const now = BigInt(await networkHelpers.time.latest());
    const election = await createElection(viem, factory, {
      start: now + 60n,
      end: now + 3600n,
    });
    await networkHelpers.time.increaseTo(await election.read.votingStart());

    return { semaphore, election, voters };
  }

  /** Voto como o frontend fará: cédula cifrada para a rodada de votingEnd. */
  async function castSealedVote(
    semaphore: Semaphore,
    election: Election,
    voter: Voter,
    option: bigint,
  ): Promise<void> {
    const ballot = { option, salt: randomSalt() };
    const round = await roundForTimestamp(await election.read.votingEnd(), client);
    const ciphertext = await sealBallot(ballot, round, client);
    const vote = await prepareVote(
      semaphore,
      election,
      voter.identity,
      option,
      ciphertext,
      ballot.salt,
    );

    await sendVote(election, vote, voter.wallet);
  }

  /** Apuração como qualquer pessoa fará: lê os VoteCast e decifra cada ciphertext. */
  async function openAll(
    election: Election,
  ): Promise<{ indexes: bigint[]; options: bigint[]; salts: Hex[] }> {
    const events = await election.getEvents.VoteCast({}, { fromBlock: 0n });
    const indexes: bigint[] = [];
    const options: bigint[] = [];
    const salts: Hex[] = [];

    for (const { args } of events) {
      const ballot = await openBallot(args.ciphertext!, client);
      indexes.push(args.index!);
      options.push(ballot.option);
      salts.push(ballot.salt);
    }

    return { indexes, options, salts };
  }

  async function endVoting(election: Election): Promise<void> {
    await networkHelpers.time.increaseTo(await election.read.votingEnd());
  }

  // 3 eleitores; lê election.getEvents.VoteCast, openBallot em cada ciphertext, revealBatch → results() bate com os votos
  it("should tally the decrypted votes end to end", async () => {
    const { semaphore, election, voters } = await networkHelpers.loadFixture(votingElection);
    const choices = [0n, 1n, 1n];

    for (const [i, voter] of voters.entries()) {
      await castSealedVote(semaphore, election, voter, choices[i]);
    }

    await endVoting(election);
    const { indexes, options, salts } = await openAll(election);
    await election.write.revealBatch([indexes, options, salts], { account: teller1.account });

    const [tally, nullVotes, unrevealed] = await election.read.results();
    assert.deepEqual(tally, [1n, 2n]);
    assert.equal(nullVotes, 0n);
    assert.equal(unrevealed, 0n);
  });

  // opção >= número de candidatos, cifrada e revelada → nullVotes == 1
  it("should count an out-of-range option as a null vote", async () => {
    const { semaphore, election, voters } = await networkHelpers.loadFixture(votingElection);

    await castSealedVote(semaphore, election, voters[0], 7n);
    await endVoting(election);
    const { indexes, options, salts } = await openAll(election);
    await election.write.revealBatch([indexes, options, salts], { account: teller1.account });

    const [tally, nullVotes] = await election.read.results();
    assert.deepEqual(tally, [0n, 0n]);
    assert.equal(nullVotes, 1n);
  });

  // apurador 1 revela [0, 1], apurador 2 revela [1, 2] → revealedCount == 3, nenhum voto contado duas vezes
  it("should not double count votes revealed by overlapping batches", async () => {
    const { semaphore, election, voters } = await networkHelpers.loadFixture(votingElection);

    for (const voter of voters) {
      await castSealedVote(semaphore, election, voter, 1n);
    }

    await endVoting(election);
    const { indexes, options, salts } = await openAll(election);
    await election.write.revealBatch(
      [indexes.slice(0, 2), options.slice(0, 2), salts.slice(0, 2)],
      { account: teller1.account },
    );
    await election.write.revealBatch(
      [indexes.slice(1), options.slice(1), salts.slice(1)],
      { account: teller2.account },
    );

    const [tally] = await election.read.results();
    assert.equal(await election.read.revealedCount(), 3n);
    assert.deepEqual(tally, [0n, 3n]);
  });

  // cifrar para uma rodada que ainda não foi publicada (amanhã, no relógio real): openBallot falha
  it("should not open a ballot before its round is published", async () => {
    const tomorrow = BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
    const round = await roundForTimestamp(tomorrow, client);
    const ciphertext = await sealBallot({ option: 1n, salt: randomSalt() }, round, client);

    await assert.rejects(openBallot(ciphertext, client));
  });
});
