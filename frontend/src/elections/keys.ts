import { factoryAddress } from "@/contracts";
import { appChain } from "@/lib/chain";

/** Chaves das leituras de eleições; incluem rede e factory para não misturar implantações. */
export const electionKeys = {
  all: ["elections", appChain.id, factoryAddress] as const,
  list: () => [...electionKeys.all, "list"] as const,
  detail: (address: string) => [...electionKeys.all, "detail", address] as const,
  results: (address: string) => [...electionKeys.all, "results", address] as const,
  group: (address: string) => [...electionKeys.all, "group", address] as const,
};
