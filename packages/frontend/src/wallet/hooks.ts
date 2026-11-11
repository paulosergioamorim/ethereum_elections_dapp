import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Address } from "viem";
import { appChain } from "@/lib/chain";
import { hasErrorCode } from "@/lib/errors";
import type { EIP6963ProviderDetail } from "./eip6963";
import { balanceQueryOptions, walletClientFor, walletKeys } from "./queries";
import { useWalletContext, type WalletContextValue } from "./wallet-context";

/** Código EIP-1193 de "rede desconhecida pela carteira": é preciso adicioná-la antes de trocar. */
const UNRECOGNIZED_CHAIN = 4902;

export type Wallet = Omit<WalletContextValue, "setWalletId">;

/** Estado da carteira e da conta ativa no dApp. */
export function useWallet(): Wallet {
  const { setWalletId: _internal, ...wallet } = useWalletContext();

  return wallet;
}

/** Pede à carteira as contas do usuário (abre a carteira) e passa a usá-la no dApp. */
export function useConnect() {
  const { setWalletId } = useWalletContext();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorTitle: "Não foi possível conectar a carteira" },
    mutationFn: async (wallet: EIP6963ProviderDetail) => ({
      wallet,
      accounts: await walletClientFor(wallet.provider).requestAddresses(),
    }),
    onSuccess: ({ wallet, accounts }) => {
      // o cache vem antes da carteira, para o WalletProvider já nascer conectado
      queryClient.setQueryData(walletKeys.accounts(wallet.info.rdns), accounts);
      setWalletId(wallet.info.rdns);
    },
  });
}

/**
 * Abre a seleção de contas da carteira para autorizar outras (na MetaMask, uma lista com caixas).
 * Depois disso, o usuário troca entre elas pelo dApp, sem abrir a carteira.
 */
export function useConnectMoreAccounts() {
  const { wallet } = useWalletContext();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorTitle: "Não foi possível autorizar outras contas" },
    mutationFn: async () => {
      if (!wallet) {
        throw new Error("Nenhuma carteira conectada");
      }

      const client = walletClientFor(wallet.provider);
      await client.requestPermissions({ eth_accounts: {} });

      return { rdns: wallet.info.rdns, accounts: await client.getAddresses() };
    },
    onSuccess: ({ rdns, accounts }) => {
      queryClient.setQueryData(walletKeys.accounts(rdns), accounts);
    },
  });
}

/** Revoga a permissão do site na carteira (quando ela suporta) e esquece a carteira escolhida. */
export function useDisconnect() {
  const { wallet, setWalletId } = useWalletContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      try {
        await wallet?.provider.request({
          method: "wallet_revokePermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch {
        // carteiras sem `wallet_revokePermissions`: basta esquecer a conexão deste lado
      }
    },
    onSettled: () => {
      setWalletId(null);
      queryClient.removeQueries({ queryKey: walletKeys.all });
    },
  });
}

/** Leva a carteira para a rede do app, adicionando a rede antes se a carteira não a conhecer. */
export function useSwitchChain() {
  const { wallet } = useWalletContext();
  const queryClient = useQueryClient();

  return useMutation({
    meta: { errorTitle: `Não foi possível trocar para ${appChain.name}` },
    mutationFn: async () => {
      if (!wallet) {
        throw new Error("Nenhuma carteira conectada");
      }

      const client = walletClientFor(wallet.provider);

      try {
        await client.switchChain({ id: appChain.id });
      } catch (error) {
        if (!hasErrorCode(error, UNRECOGNIZED_CHAIN)) {
          throw error;
        }

        await client.addChain({ chain: appChain });
      }

      return wallet.info.rdns;
    },
    onSuccess: (rdns) => {
      queryClient.setQueryData(walletKeys.chainId(rdns), appChain.id);
    },
  });
}

/** Saldo em ETH de uma conta, pela rede do app (útil para saber qual conta tem gás). */
export function useBalance(address: Address) {
  return useQuery(balanceQueryOptions(address));
}
