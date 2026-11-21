import { queryOptions, skipToken } from "@tanstack/react-query";
import type { Address } from "viem";
import { electionFactoryAbi, factoryAddress, partyAbi } from "@/contracts";
import { freshBlockNumber } from "@/lib/block-floor";
import { publicClient } from "@/lib/chain";
import { partyKeys } from "./keys";

/** Endereços dos partidos criados pela factory, na ordem de criação. */
export const partiesQueryOptions = queryOptions({
  queryKey: partyKeys.list(),
  queryFn: async () =>
    publicClient.readContract({
      address: factoryAddress,
      abi: electionFactoryAbi,
      functionName: "parties",
      // inclui o partido recém-criado, mesmo se o RPC responder de um nó atrasado
      blockNumber: await freshBlockNumber(),
    }),
});

type PartyDetails = {
  address: Address;
  name: string;
  /** O presidente. */
  owner: Address;
  /** Quem foi indicado para suceder o presidente e ainda não aceitou; zero se ninguém. */
  pendingOwner: Address;
  /** Saldo em wei. */
  balance: bigint;
};

/** O endereço não é um partido criado por esta factory. */
export class PartyNotFoundError extends Error {
  constructor(address: Address) {
    super(`O endereço ${address} não é um partido desta factory.`);
    this.name = "PartyNotFoundError";
  }
}

async function fetchParty(address: Address): Promise<PartyDetails> {
  const blockNumber = await freshBlockNumber();
  // só confia em contratos criados pela factory: qualquer um poderia implantar um "Party" falso
  const isParty = await publicClient.readContract({
    address: factoryAddress,
    abi: electionFactoryAbi,
    functionName: "isParty",
    args: [address],
    blockNumber,
  });

  if (!isParty) {
    throw new PartyNotFoundError(address);
  }

  const read = { address, abi: partyAbi, blockNumber } as const;
  const [name, owner, pendingOwner, balance] = await Promise.all([
    publicClient.readContract({ ...read, functionName: "name" }),
    publicClient.readContract({ ...read, functionName: "owner" }),
    publicClient.readContract({ ...read, functionName: "pendingOwner" }),
    publicClient.getBalance({ address, blockNumber }),
  ]);

  return { address, name, owner, pendingOwner, balance };
}

/** Dados de um partido da factory; sem endereço, não consulta. */
export function partyQueryOptions(address: Address | undefined) {
  return queryOptions({
    queryKey: partyKeys.detail(address ?? ""),
    queryFn: address ? () => fetchParty(address) : skipToken,
    // "não é um partido da factory" é definitivo: tentar de novo só atrasa a tela
    retry: (failures: number, error: Error) => !(error instanceof PartyNotFoundError) && failures < 3,
  });
}

/** Quanto uma conta já doou ao partido (em wei); sem conta, não consulta. */
export function donatedQueryOptions(address: Address | undefined, account: Address | undefined) {
  return queryOptions({
    queryKey: partyKeys.donated(address ?? "", account ?? ""),
    queryFn:
      address && account
        ? async () =>
            publicClient.readContract({
              address,
              abi: partyAbi,
              functionName: "donatedBy",
              args: [account],
              blockNumber: await freshBlockNumber(),
            })
        : skipToken,
  });
}
