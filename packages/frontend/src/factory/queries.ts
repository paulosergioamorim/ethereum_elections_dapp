import { buildGroup, type MemberEvent } from "@elections/shared/group";
import { queryOptions, skipToken } from "@tanstack/react-query";
import { zeroAddress, type Address } from "viem";
import { electionFactoryAbi, factoryAddress, semaphoreAbi } from "@/contracts";
import { freshBlockNumber } from "@/lib/block-floor";
import { appChain, publicClient } from "@/lib/chain";
import { env } from "@/lib/env";
import { byChainOrder, fetchLogsInRanges } from "@/lib/logs";

/** Chaves das leituras da factory; incluem rede e endereço para não misturar implantações. */
export const factoryKeys = {
  all: ["factory", appChain.id, factoryAddress] as const,
  info: () => [...factoryKeys.all, "info"] as const,
  voters: () => [...factoryKeys.all, "voters"] as const,
  voter: (address: Address) => [...factoryKeys.all, "voter", address] as const,
};

export type FactoryInfo = {
  /** A autoridade eleitoral. */
  owner: Address;
  semaphore: Address;
  /** Grupo Semaphore global, com todos os eleitores registrados. */
  groupId: bigint;
};

export const factoryInfoQueryOptions = queryOptions({
  queryKey: factoryKeys.info(),
  queryFn: async (): Promise<FactoryInfo> => {
    const read = { address: factoryAddress, abi: electionFactoryAbi } as const;
    const [owner, semaphore, groupId] = await Promise.all([
      publicClient.readContract({ ...read, functionName: "owner" }),
      publicClient.readContract({ ...read, functionName: "sem" }),
      publicClient.readContract({ ...read, functionName: "groupId" }),
    ]);

    return { owner, semaphore, groupId };
  },
  // dono, Semaphore e grupo não mudam no uso normal
  staleTime: 5 * 60_000,
});

export type Voter = {
  address: Address;
  /** Identidade registrada; 0 enquanto o eleitor não se registrar. */
  commitment: bigint;
};

/**
 * Carteiras autorizadas hoje, com a identidade registrada.
 * Os eventos `VoterAuthorized` só servem para descobrir os endereços; o estado atual vem do contrato,
 * então quem foi removido depois não aparece.
 */
export const votersQueryOptions = queryOptions({
  queryKey: factoryKeys.voters(),
  queryFn: async (): Promise<Voter[]> => {
    // eventos e estado lidos no mesmo bloco, que inclui a última transação confirmada aqui
    const blockNumber = await freshBlockNumber();
    const events = await fetchLogsInRanges(
      { fromBlock: env.factoryDeployBlock, toBlock: blockNumber },
      (range) =>
        publicClient.getContractEvents({
          address: factoryAddress,
          abi: electionFactoryAbi,
          eventName: "VoterAuthorized",
          ...range,
        }),
    );

    const addresses = [
      ...new Set(
        events
          .sort(byChainOrder)
          .map((event) => event.args.voter)
          .filter((voter): voter is Address => voter !== undefined),
      ),
    ];

    const read = { address: factoryAddress, abi: electionFactoryAbi } as const;
    const voters = await Promise.all(
      addresses.map(async (address) => {
        const [isAuthorized, commitment] = await Promise.all([
          publicClient.readContract({
            ...read,
            functionName: "isAuthorized",
            args: [address],
            blockNumber,
          }),
          publicClient.readContract({
            ...read,
            functionName: "commitmentOf",
            args: [address],
            blockNumber,
          }),
        ]);

        return { address, isAuthorized, commitment };
      }),
    );

    return voters
      .filter((voter) => voter.isAuthorized)
      .map(({ address, commitment }) => ({ address, commitment }));
  },
});

export type VoterStatus = {
  isAuthorized: boolean;
  /** Identidade registrada; 0 enquanto a conta não se registrar. */
  commitment: bigint;
};

async function fetchVoterStatus(address: Address): Promise<VoterStatus> {
  const blockNumber = await freshBlockNumber();
  const read = {
    address: factoryAddress,
    abi: electionFactoryAbi,
    args: [address],
    blockNumber,
  } as const;
  const [isAuthorized, commitment] = await Promise.all([
    publicClient.readContract({ ...read, functionName: "isAuthorized" }),
    publicClient.readContract({ ...read, functionName: "commitmentOf" }),
  ]);

  return { isAuthorized, commitment };
}

/** Situação de uma conta na factory: autorizada pela autoridade e identidade registrada. */
export function voterStatusQueryOptions(address: Address | undefined) {
  return queryOptions({
    queryKey: factoryKeys.voter(address ?? zeroAddress),
    queryFn: address ? () => fetchVoterStatus(address) : skipToken,
  });
}

/** Foto da árvore num bloco passado, com a raiz que ela tinha (ex.: a congelada por uma eleição). */
export type GroupSnapshot = { blockNumber: bigint; root: bigint };

/**
 * Árvore do grupo de eleitores remontada a partir dos eventos do Semaphore e conferida contra a raiz.
 * - Sem `snapshot`: estado atual, conferido com a raiz on-chain no mesmo bloco (siblings de `removeVoter`).
 * - Com `snapshot`: a árvore até aquele bloco, conferida com a raiz informada (prova de voto de uma eleição).
 */
export async function fetchVoterGroup(
  { semaphore, groupId }: FactoryInfo,
  snapshot?: GroupSnapshot,
) {
  // eventos e raiz da mesma foto da árvore
  const blockNumber = snapshot?.blockNumber ?? (await freshBlockNumber());
  const blocks = { fromBlock: env.factoryDeployBlock, toBlock: blockNumber };
  const read = { address: semaphore, abi: semaphoreAbi, args: { groupId } } as const;
  const [added, removed] = await Promise.all([
    fetchLogsInRanges(blocks, (range) =>
      publicClient.getContractEvents({ ...read, eventName: "MemberAdded", ...range }),
    ),
    fetchLogsInRanges(blocks, (range) =>
      publicClient.getContractEvents({ ...read, eventName: "MemberRemoved", ...range }),
    ),
  ]);

  const events: MemberEvent[] = [
    ...added.map((log) => ({
      log,
      event: {
        kind: "added",
        index: log.args.index!,
        identityCommitment: log.args.identityCommitment!,
      } satisfies MemberEvent,
    })),
    ...removed.map((log) => ({
      log,
      event: { kind: "removed", index: log.args.index! } satisfies MemberEvent,
    })),
  ]
    .sort((a, b) => byChainOrder(a.log, b.log))
    .map(({ event }) => event);

  const group = buildGroup(events);
  const expectedRoot =
    snapshot?.root ??
    (await publicClient.readContract({
      address: semaphore,
      abi: semaphoreAbi,
      functionName: "getMerkleTreeRoot",
      args: [groupId],
      blockNumber,
    }));

  // o RPC pode ainda não ter indexado o último evento: melhor parar do que montar uma árvore errada
  if ((group.root ?? 0n) !== expectedRoot) {
    throw new Error(
      snapshot
        ? "Não foi possível reconstruir a lista de eleitores desta eleição a partir da rede."
        : "A lista de eleitores lida da rede ainda não bate com o contrato. Aguarde alguns segundos e tente de novo.",
    );
  }

  return group;
}
