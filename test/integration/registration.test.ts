import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { zeroAddress } from "viem";
import {
  createElection,
  currentGroup,
  deployFactory,
  registerVoters,
  removeVoter,
  siblingsOf,
} from "./fixtures.js";

describe("ElectionFactory cadastro (Semaphore real)", async () => {
  const { viem, networkHelpers } = await network.create({ network: "integration" });
  const [, alice, bob, carol] = await viem.getWalletClients();

  async function threeVoters() {
    const { semaphore, factory } = await deployFactory(viem);
    const voters = await registerVoters(viem, factory, [alice, bob, carol]);
    const groupId = await factory.read.groupId();

    return { semaphore, factory, voters, groupId };
  }

  async function oneVoter() {
    const { semaphore, factory } = await deployFactory(viem);
    const voters = await registerVoters(viem, factory, [alice]);

    return { semaphore, factory, voters };
  }

  // depois de cadastros e de um removeVoter: semaphore.read.getMerkleTreeRoot([groupId]) == buildGroup(eventos).root
  it("should match the on-chain root with the group rebuilt from events", async () => {
    const { semaphore, factory, voters, groupId } =
      await networkHelpers.loadFixture(threeVoters);

    await removeVoter(semaphore, factory, voters[1]);

    const group = await currentGroup(semaphore, factory);
    assert.equal(await semaphore.read.getMerkleTreeRoot([groupId]), group.root);
  });

  // siblings = group.generateMerkleProof(índice).siblings → hasMember == false, commitmentOf == 0 e a raiz muda
  it("should remove the member from the group with real siblings", async () => {
    const { semaphore, factory, voters, groupId } =
      await networkHelpers.loadFixture(threeVoters);
    const bobVoter = voters[1];
    const rootBefore = await semaphore.read.getMerkleTreeRoot([groupId]);

    await removeVoter(semaphore, factory, bobVoter);

    assert.equal(
      await semaphore.read.hasMember([groupId, bobVoter.identity.commitment]),
      false,
    );
    assert.equal(await factory.read.commitmentOf([bobVoter.wallet.account.address]), 0n);
    assert.notEqual(await semaphore.read.getMerkleTreeRoot([groupId]), rootBefore);
  });

  // siblings de outra folha com o mesmo tamanho → WrongSiblingNodes, e o eleitor continua autorizado (atomicidade).
  // Obs.: siblings de tamanho errado (ex.: os da última folha, que tem um nível a menos) dão panic 0x32,
  // porque o LeanIMT não confere o tamanho do array antes de percorrê-lo.
  it("should revert removeVoter with wrong siblings", async () => {
    const { semaphore, factory, voters } = await networkHelpers.loadFixture(threeVoters);
    const [aliceVoter, bobVoter] = voters;
    const wrongSiblings = await siblingsOf(semaphore, factory, bobVoter);

    await viem.assertions.revertWithCustomError(
      factory.write.removeVoter([aliceVoter.wallet.account.address, wrongSiblings]),
      semaphore,
      "WrongSiblingNodes",
    );

    assert.equal(await factory.read.isAuthorized([aliceVoter.wallet.account.address]), true);
  });

  // único membro removido → raiz 0 no LeanIMT real → createElection reverte com InvalidMerkleRoot
  it("should revert createElection with InvalidMerkleRoot after removing the only member", async () => {
    const { semaphore, factory, voters } = await networkHelpers.loadFixture(oneVoter);
    // só para ter o ABI do Election, onde o erro está declarado
    const electionAbi = await viem.getContractAt("Election", zeroAddress);
    const now = BigInt(await networkHelpers.time.latest());

    await removeVoter(semaphore, factory, voters[0]);

    await viem.assertions.revertWithCustomError(
      createElection(viem, factory, { start: now + 60n, end: now + 3600n }),
      electionAbi,
      "InvalidMerkleRoot",
    );
  });
});
