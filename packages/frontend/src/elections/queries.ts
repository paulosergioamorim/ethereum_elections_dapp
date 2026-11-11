import { queryOptions, skipToken } from "@tanstack/react-query";
import type { Address } from "viem";
import { electionAbi, electionFactoryAbi, factoryAddress } from "@/contracts";
import { factoryInfoQueryOptions, fetchVoterGroup } from "@/factory";
import { freshBlockNumber } from "@/lib/block-floor";
import { publicClient } from "@/lib/chain";
import { byChainOrder, fetchLogsInRanges } from "@/lib/logs";
import type { CastBallot, OpenedBallot } from "./ballots";
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
    // sem polling: os eventos da eleição (useElectionEvents) e as próprias transações invalidam
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

/**
 * Cédulas registradas (`VoteCast`) e as já apuradas (`VoteRevealed`), lidas no mesmo bloco, desde a
 * criação da eleição. Os ciphertexts só existem nos eventos: o storage guarda só os commitments.
 */
async function fetchBallots(election: ElectionDetails): Promise<CastBallot[]> {
  const blocks = { fromBlock: election.createdAtBlock, toBlock: await freshBlockNumber() };
  const read = { address: election.address, abi: electionAbi } as const;
  const [cast, revealed] = await Promise.all([
    fetchLogsInRanges(blocks, (range) =>
      publicClient.getContractEvents({ ...read, eventName: "VoteCast", ...range }),
    ),
    fetchLogsInRanges(blocks, (range) =>
      publicClient.getContractEvents({ ...read, eventName: "VoteRevealed", ...range }),
    ),
  ]);

  const revealedOptions = new Map(
    revealed.map((log) => [log.args.index!, log.args.option!] as const),
  );
  // um `VoteCast` por índice; o Map descarta repetições de um RPC que devolva o mesmo log duas vezes
  const ballots = new Map<bigint, CastBallot>();

  for (const log of cast.sort(byChainOrder)) {
    const index = log.args.index!;

    ballots.set(index, {
      index,
      commitment: log.args.commitment!,
      ciphertext: log.args.ciphertext!,
      revealedOption: revealedOptions.get(index),
    });
  }

  return [...ballots.values()].sort((a, b) => (a.index < b.index ? -1 : 1));
}

export function electionBallotsQueryOptions(election: ElectionDetails | undefined) {
  return queryOptions({
    queryKey: electionKeys.ballots(election?.address ?? "none"),
    queryFn: election ? () => fetchBallots(election) : skipToken,
  });
}

async function openInBrowser(ballots: readonly CastBallot[]): Promise<OpenedBallot[]> {
  const { openBallots } = await import("./tally-crypto");

  return openBallots(ballots);
}

/**
 * Cédulas abertas no navegador com o tlock. Decifrar é determinístico, então o resultado não fica
 * velho; a chave muda só se aparecerem cédulas novas. Sem `ballots` (ou fora da apuração), não abre.
 */
export function openedBallotsQueryOptions(
  election: ElectionDetails | undefined,
  ballots: readonly CastBallot[] | undefined,
) {
  return queryOptions({
    queryKey: [...electionKeys.opened(election?.address ?? "none"), ballots?.length ?? 0],
    queryFn: ballots ? () => openInBrowser(ballots) : skipToken,
    staleTime: Infinity,
  });
}
