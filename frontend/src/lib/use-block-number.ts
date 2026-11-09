import { queryOptions, useQuery } from "@tanstack/react-query";
import { appChain, publicClient } from "@/lib/chain";

export const blockNumberQueryOptions = queryOptions({
  queryKey: ["chain", appChain.id, "blockNumber"],
  queryFn: () => publicClient.getBlockNumber(),
  // a Sepolia produz um bloco a cada ~12 s
  refetchInterval: 12_000,
});

/** Último bloco da rede do app. Também serve de termômetro: se falhar, o RPC está fora do ar. */
export function useBlockNumber() {
  return useQuery(blockNumberQueryOptions);
}
