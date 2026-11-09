import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { createWalletClient, custom, getAddress, hexToNumber, type Address, type Hex } from "viem";
import { appChain } from "@/lib/chain";
import { usePersistentState } from "@/lib/use-persistent-state";
import { useWalletProviders } from "./eip6963";
import { accountsQueryOptions, chainIdQueryOptions, walletKeys } from "./queries";
import { WalletContext, type WalletStatus } from "./wallet-context";

const WALLET_KEY = "elections:wallet";
const ACCOUNT_KEY = "elections:account";

/** Compara sem lançar erro: a conta lembrada vem do localStorage e pode estar corrompida. */
function sameAddress(a: string | null | undefined, b: string | null | undefined): boolean {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

/**
 * Guarda qual carteira e qual conta o dApp usa, e mantém o cache do React Query em dia
 * com os eventos da carteira.
 *
 * Troca de conta dentro do dApp: o usuário autoriza várias contas de uma vez (na MetaMask, "Conectar
 * outras contas" abre a lista com caixas de seleção). Depois disso, `eth_accounts` devolve todas, e
 * o dApp escolhe qual assina, passando a conta como `from`. A carteira não precisa ser aberta para
 * trocar, só para aprovar cada assinatura ou transação.
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const wallets = useWalletProviders();
  const [walletId, setWalletId] = usePersistentState<string | null>(WALLET_KEY, null);
  const [preferredAccount, setPreferredAccount] = usePersistentState<Address | null>(
    ACCOUNT_KEY,
    null,
  );

  const wallet = wallets.find((candidate) => candidate.info.rdns === walletId);
  const accountsQuery = useQuery(accountsQueryOptions(wallet));
  const chainIdQuery = useQuery(chainIdQueryOptions(wallet));

  const accounts = accountsQuery.data ?? [];
  const account =
    accounts.find((candidate) => sameAddress(candidate, preferredAccount)) ?? accounts[0];
  const chainId = chainIdQuery.data;

  useEffect(() => {
    if (!wallet) {
      return;
    }

    const { provider } = wallet;
    const rdns = wallet.info.rdns;

    function onAccountsChanged(changed: readonly Address[]) {
      const next = changed.map((address) => getAddress(address));
      const previous = queryClient.getQueryData<Address[]>(walletKeys.accounts(rdns));
      queryClient.setQueryData<Address[]>(walletKeys.accounts(rdns), next);

      // A carteira lista primeiro a conta selecionada nela. Se o usuário trocou de conta
      // dentro da carteira, o dApp acompanha; reordenações que não mudam a primeira são ignoradas.
      if (next[0] && !sameAddress(next[0], previous?.[0])) {
        setPreferredAccount(next[0]);
      }
    }

    function onChainChanged(changed: string) {
      queryClient.setQueryData<number>(walletKeys.chainId(rdns), hexToNumber(changed as Hex));
    }

    provider.on("accountsChanged", onAccountsChanged);
    provider.on("chainChanged", onChainChanged);

    return () => {
      provider.removeListener("accountsChanged", onAccountsChanged);
      provider.removeListener("chainChanged", onChainChanged);
    };
  }, [wallet, queryClient, setPreferredAccount]);

  let status: WalletStatus = "connected";

  if (!wallet) {
    status = "disconnected";
  } else if (accountsQuery.isPending) {
    status = "reconnecting";
  } else if (accounts.length === 0) {
    status = "disconnected";
  }

  const walletClient =
    wallet && account
      ? createWalletClient({ account, chain: appChain, transport: custom(wallet.provider) })
      : undefined;

  function selectAccount(next: Address) {
    if (!accounts.some((candidate) => sameAddress(candidate, next))) {
      throw new Error(`A conta ${next} não está autorizada na carteira`);
    }

    setPreferredAccount(next);
  }

  return (
    <WalletContext
      value={{
        status,
        wallet: status === "disconnected" ? undefined : wallet,
        accounts,
        account: status === "connected" ? account : undefined,
        chainId,
        isWrongChain: status === "connected" && chainId !== undefined && chainId !== appChain.id,
        walletClient: status === "connected" ? walletClient : undefined,
        selectAccount,
        setWalletId,
      }}
    >
      {children}
    </WalletContext>
  );
}
