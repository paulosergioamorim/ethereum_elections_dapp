import { queryOptions, skipToken } from "@tanstack/react-query";
import type { Address } from "viem";
import { electionAbi, electionFactoryAbi, factoryAddress } from "@/contracts";
import { factoryInfoQueryOptions, fetchVoterGroup } from "@/factory";
import { freshBlockNumber } from "@/lib/block-floor";
import { publicClient } from "@/lib/chain";
import { electionKeys } from "./keys";

/** Endereços das eleições criadas pela factory, na ordem de criação. */
export const electionsQueryOptions = queryOptions({
  queryKey: electionKeys.list(),
  queryFn: async () =>
    publicClient.readContract({
      address: factoryAddress,
      abi: electionFactoryAbi,
      functionName: "elections",
      // inclui a eleição recém-criada, mesmo se o RPC responder de um nó atrasado
      blockNumber: await freshBlockNumber(),
    }),
});

/** Dados fixos de uma eleição: não mudam depois da criação. */
export type ElectionDetails = {
  address: Address;
  title: string;
  /** O índice de cada candidato é a opção de voto; um índice fora da lista é voto nulo. */
  candidates: readonly string[];
  /** Timestamps Unix em segundos. */
  votingStart: bigint;
  votingEnd: bigint;
  groupId: bigint;
  /** Raiz da árvore de eleitores congelada na criação: a prova de voto precisa ser contra ela. */
  merkleTreeRoot: bigint;
  createdAtBlock: bigint;
};

/** O endereço não é uma eleição criada por esta factory. */
export class ElectionNotFoundError extends Error {
  constructor(address: Address) {
    super(`O endereço ${address} não é uma eleição desta factory.`);
    this.name = "ElectionNotFoundError";
  }
}

async function fetchElection(address: Address): Promise<ElectionDetails> {
  const blockNumber = await freshBlockNumber();
  // só confia em contratos criados pela factory: qualquer um poderia implantar um "Election" falso
  const isElection = await publicClient.readContract({
    address: factoryAddress,
    abi: electionFactoryAbi,
    functionName: "isElection",
    args: [address],
    blockNumber,
  });

  if (!isElection) {
    throw new ElectionNotFoundError(address);
  }

  const read = { address, abi: electionAbi, blockNumber } as const;
  const [title, candidates, votingStart, votingEnd, groupId, merkleTreeRoot, createdAtBlock] =
    await Promise.all([
      publicClient.readContract({ ...read, functionName: "title" }),
      publicClient.readContract({ ...read, functionName: "candidates" }),
      publicClient.readContract({ ...read, functionName: "votingStart" }),
      publicClient.readContract({ ...read, functionName: "votingEnd" }),
      publicClient.readContract({ ...read, functionName: "groupId" }),
      publicClient.readContract({ ...read, functionName: "merkleTreeRoot" }),
      publicClient.readContract({ ...read, functionName: "createdAtBlock" }),
    ]);

  return {
    address,
    title,
    candidates,
    votingStart,
    votingEnd,
    groupId,
    merkleTreeRoot,
    createdAtBlock,
  };
}

export function electionQueryOptions(address: Address | undefined) {
  return queryOptions({
    queryKey: electionKeys.detail(address ?? "none"),
    queryFn: address ? () => fetchElection(address) : skipToken,
    // dados fixos depois da criação
    staleTime: Infinity,
    retry: (failures, error) => !(error instanceof ElectionNotFoundError) && failures < 3,
  });
}

export type ElectionResults = {
  /** Votos por candidato, na ordem de `candidates`. */
  tally: readonly bigint[];
  nullVotes: bigint;
  /** Cédulas registradas que ainda não foram abertas. */
  unrevealed: bigint;
  revealed: bigint;
  /** Todas as cédulas registradas. */
  total: bigint;
};

async function fetchResults(address: Address): Promise<ElectionResults> {
  const blockNumber = await freshBlockNumber();
  const read = { address, abi: electionAbi, blockNumber } as const;
  const [[tally, nullVotes, unrevealed], revealed] = await Promise.all([
    publicClient.readContract({ ...read, functionName: "results" }),
    publicClient.readContract({ ...read, functionName: "revealedCount" }),
  ]);

  return { tally, nullVotes, unrevealed, revealed, total: revealed + unrevealed };
}

export function electionResultsQueryOptions(address: Address | undefined) {
  return queryOptions({
    queryKey: electionKeys.results(address ?? "none"),
    queryFn: address ? () => fetchResults(address) : skipToken,
    refetchInterval: 15_000,
  });
}

/**
 * Árvore de eleitores congelada na criação da eleição: os eventos do grupo até `createdAtBlock`,
 * conferidos contra a `merkleTreeRoot` dela. É contra essa árvore que a prova de voto é gerada.
 */
export function electionGroupQueryOptions(election: ElectionDetails | undefined) {
  return queryOptions({
    queryKey: electionKeys.group(election?.address ?? "none"),
    queryFn: election
      ? async ({ client }) =>
          fetchVoterGroup(await client.query(factoryInfoQueryOptions), {
            blockNumber: election.createdAtBlock,
            root: election.merkleTreeRoot,
          })
      : skipToken,
    // a árvore de uma eleição nunca muda
    staleTime: Infinity,
  });
}
