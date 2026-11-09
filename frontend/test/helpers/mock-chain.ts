import { buildGroup } from "@elections/shared/group";
import { encodeEventTopics, type Address } from "viem";
import { vi } from "vitest";
import { electionFactoryAbi, factoryAddress } from "@/contracts";
import { publicClient } from "@/lib/chain";

export type MockVoter = {
  address: Address;
  /** Padrão: autorizado. `false` simula um eleitor removido depois de autorizado. */
  authorized?: boolean;
  /** Identidade cadastrada; sem ela, o eleitor ainda não se cadastrou. */
  commitment?: bigint;
  /** Bloco do cadastro (evento `MemberAdded`). Padrão: 2. */
  registeredAtBlock?: bigint;
};

export type MockElection = {
  address: Address;
  title?: string;
  candidates?: string[];
  /** Timestamps Unix em segundos. */
  votingStart: bigint;
  votingEnd: bigint;
  /** Bloco da criação: a árvore da eleição tem só quem se cadastrou até ele. Padrão: 10. */
  createdAtBlock?: bigint;
  tally?: bigint[];
  nullVotes?: bigint;
  unrevealed?: bigint;
  revealed?: bigint;
};

const groupId = 1n;
const semaphore: Address = "0x0000000000000000000000000000000000005e3a";

function sameAddress(value: unknown, address: Address) {
  return typeof value === "string" && value.toLowerCase() === address.toLowerCase();
}

/** Segundos Unix de agora, deslocados em `seconds`. */
export function secondsFromNow(seconds: number): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + seconds);
}

/**
 * Estado on-chain simulado: factory com dono, eleitores e eleições, o grupo do Semaphore (com os
 * cadastros na ordem dos blocos) e, opcionalmente, uma eleição com a árvore congelada na criação.
 * Devolve o grupo atual, para os testes calcularem siblings.
 */
export function mockChain({
  owner,
  voters = [],
  elections = [],
  election,
}: {
  owner: Address;
  voters?: MockVoter[];
  elections?: Address[];
  election?: MockElection;
}) {
  // cadastros em ordem de bloco (e de lista, no mesmo bloco); o índice na árvore segue essa ordem
  const members = voters
    .flatMap((voter, order) =>
      voter.commitment ? [{ commitment: voter.commitment, block: voter.registeredAtBlock ?? 2n, order }] : [],
    )
    .sort((a, b) => (a.block === b.block ? a.order - b.order : a.block < b.block ? -1 : 1))
    .map((member, index) => ({ ...member, index: BigInt(index) }));

  function groupUntil(block: bigint) {
    return buildGroup(
      members
        .filter((member) => member.block <= block)
        .map((member) => ({
          kind: "added" as const,
          index: member.index,
          identityCommitment: member.commitment,
        })),
    );
  }

  const group = groupUntil(2n ** 64n);
  const createdAtBlock = election?.createdAtBlock ?? 10n;
  const electionRoot = election ? (groupUntil(createdAtBlock).root ?? 0n) : 0n;

  vi.mocked(publicClient.readContract).mockImplementation((async ({
    functionName,
    args,
  }: {
    functionName: string;
    args?: readonly unknown[];
  }) => {
    const voter = voters.find((candidate) => sameAddress(args?.[0], candidate.address));

    switch (functionName) {
      // factory
      case "owner":
        return owner;
      case "sem":
        return semaphore;
      case "groupId":
        return groupId;
      case "elections":
        return elections;
      case "isElection":
        return (
          (election !== undefined && sameAddress(args?.[0], election.address)) ||
          elections.some((address) => sameAddress(args?.[0], address))
        );
      case "isAuthorized":
        return voter ? (voter.authorized ?? true) : false;
      case "commitmentOf":
        return voter?.commitment ?? 0n;
      // semaphore
      case "getMerkleTreeRoot":
        return group.root ?? 0n;
      // election
      case "title":
        return election?.title ?? "Representante da turma";
      case "candidates":
        return election?.candidates ?? ["Ana", "Bruno"];
      case "votingStart":
        return election?.votingStart;
      case "votingEnd":
        return election?.votingEnd;
      case "merkleTreeRoot":
        return electionRoot;
      case "createdAtBlock":
        return createdAtBlock;
      case "results":
        return [
          election?.tally ?? (election?.candidates ?? ["Ana", "Bruno"]).map(() => 0n),
          election?.nullVotes ?? 0n,
          election?.unrevealed ?? 0n,
        ];
      case "revealedCount":
        return election?.revealed ?? 0n;
      default:
        throw new Error(`Leitura não simulada nos testes: ${functionName}`);
    }
  }) as never);

  const events = [
    ...voters.map((voter, index) => ({
      eventName: "VoterAuthorized",
      args: { voter: voter.address },
      blockNumber: 1n,
      logIndex: index,
    })),
    ...members.map((member) => ({
      eventName: "MemberAdded",
      args: {
        groupId,
        index: member.index,
        identityCommitment: member.commitment,
        merkleTreeRoot: 0n,
      },
      blockNumber: member.block,
      logIndex: Number(member.index),
    })),
  ];

  // como um RPC de verdade: só os eventos do tipo e da faixa de blocos pedidos
  vi.mocked(publicClient.getContractEvents).mockImplementation((async ({
    eventName,
    fromBlock,
    toBlock,
  }: {
    eventName: string;
    fromBlock: bigint;
    toBlock: bigint;
  }) =>
    events.filter(
      (event) =>
        event.eventName === eventName &&
        event.blockNumber >= fromBlock &&
        event.blockNumber <= toBlock,
    )) as never);

  return { group };
}

/** Recibo de `createElection` com o evento `ElectionCreated` da nova eleição. */
export function mockElectionCreatedReceipt(election: Address) {
  const topics = encodeEventTopics({
    abi: electionFactoryAbi,
    eventName: "ElectionCreated",
    args: { election },
  });

  vi.mocked(publicClient.waitForTransactionReceipt).mockImplementation((async ({
    hash,
  }: {
    hash: string;
  }) => ({
    status: "success",
    transactionHash: hash,
    logs: [{ address: factoryAddress, topics, data: "0x", blockNumber: 3n, logIndex: 0 }],
  })) as never);
}
