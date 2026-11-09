import { queryOptions, skipToken } from "@tanstack/react-query";
import { createWalletClient, custom, type Address, type EIP1193Provider } from "viem";
import { appChain, publicClient } from "@/lib/chain";
import type { EIP6963ProviderDetail } from "./eip6963";

/**
 * O estado da carteira (contas autorizadas e rede) vive no cache do React Query:
 * a primeira leitura vem de `eth_accounts`/`eth_chainId`, e as mudanças chegam pelos eventos
 * do provider, que o `WalletProvider` grava no cache com `setQueryData`.
 */
export const walletKeys = {
  all: ["wallet"] as const,
  accounts: (rdns: string) => ["wallet", rdns, "accounts"] as const,
  chainId: (rdns: string) => ["wallet", rdns, "chainId"] as const,
};

export const chainKeys = {
  balance: (address: Address) => ["chain", appChain.id, "balance", address] as const,
};

/** Client sem conta fixa, para pedidos à carteira (contas, permissões, troca de rede). */
export function walletClientFor(provider: EIP1193Provider) {
  return createWalletClient({ chain: appChain, transport: custom(provider) });
}

/** Contas que o usuário autorizou para o site (`eth_accounts`): não abre a carteira. */
export function accountsQueryOptions(wallet: EIP6963ProviderDetail | undefined) {
  return queryOptions({
    queryKey: walletKeys.accounts(wallet?.info.rdns ?? "none"),
    queryFn: wallet ? () => walletClientFor(wallet.provider).getAddresses() : skipToken,
    // atualizado pelo evento `accountsChanged`; nunca fica velho
    staleTime: Infinity,
    retry: false,
  });
}

export function chainIdQueryOptions(wallet: EIP6963ProviderDetail | undefined) {
  return queryOptions({
    queryKey: walletKeys.chainId(wallet?.info.rdns ?? "none"),
    queryFn: wallet ? () => walletClientFor(wallet.provider).getChainId() : skipToken,
    // atualizado pelo evento `chainChanged`
    staleTime: Infinity,
    retry: false,
  });
}

/** Saldo lido pelo RPC do app, não pela carteira. */
export function balanceQueryOptions(address: Address) {
  return queryOptions({
    queryKey: chainKeys.balance(address),
    queryFn: () => publicClient.getBalance({ address }),
    refetchInterval: 30_000,
  });
}
