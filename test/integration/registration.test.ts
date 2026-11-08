import { describe, it } from "node:test";
import { network } from "hardhat";

describe("ElectionFactory cadastro (Semaphore real)", async () => {
  const { viem, networkHelpers } = await network.create({ network: "integration" });

  // Preparação comum: deployFactory(viem) e registerVoters(viem, factory, carteiras) de ./fixtures.ts.
  // O grupo off-chain vem de buildGroup(await groupEvents(semaphore, groupId)).

  // depois de cadastros e de um removeVoter: semaphore.read.getMerkleTreeRoot([groupId]) == buildGroup(eventos).root
  it.todo("should match the on-chain root with the group rebuilt from events");

  // siblings = group.generateMerkleProof(índice).siblings → hasMember == false, commitmentOf == 0 e a raiz muda
  it.todo("should remove the member from the group with real siblings");

  // siblings de outra folha → reverte (erro do LeanIMT), e o eleitor continua autorizado (atomicidade)
  it.todo("should revert removeVoter with wrong siblings");

  // único membro removido → raiz 0 no LeanIMT real → createElection reverte com InvalidMerkleRoot
  it.todo("should revert createElection with InvalidMerkleRoot after removing the only member");
});
