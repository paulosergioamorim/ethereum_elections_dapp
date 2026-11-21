import { factoryAddress } from "@/contracts";
import { appChain } from "@/lib/chain";

/** Chaves das leituras de partidos; incluem rede e factory para não misturar implantações. */
export const partyKeys = {
  all: ["parties", appChain.id, factoryAddress] as const,
  list: () => [...partyKeys.all, "list"] as const,
  detail: (address: string) => [...partyKeys.all, "detail", address] as const,
  candidates: (party: string) => [...partyKeys.all, "candidates", party] as const,
  candidate: (address: string) => [...partyKeys.all, "candidate", address] as const,
  donated: (address: string, account: string) =>
    [...partyKeys.all, "donated", address, account] as const,
};
