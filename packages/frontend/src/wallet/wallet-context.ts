import { createContext, useContext } from "react";
import type { Account, Address, Chain, Transport, WalletClient } from "viem";
import type { EIP6963ProviderDetail } from "./eip6963";

/**
 * - `disconnected`: nenhuma carteira escolhida, ou a carteira não autorizou nenhuma conta (inclusive bloqueada).
 * - `reconnecting`: a carteira lembrada está sendo consultada depois de recarregar a página.
 * - `connected`: há pelo menos uma conta autorizada.
 */
export type WalletStatus = "disconnected" | "reconnecting" | "connected";

export type ConnectedWalletClient = WalletClient<Transport, Chain, Account>;

export type WalletContextValue = {
  status: WalletStatus;
  /** Carteira em uso (EIP-6963). */
  wallet: EIP6963ProviderDetail | undefined;
  /** Todas as contas que o usuário autorizou para o site. */
  accounts: readonly Address[];
  /** Conta ativa no dApp: assina e envia as transações. */
  account: Address | undefined;
  chainId: number | undefined;
  /** A carteira está numa rede diferente da do app: transações falhariam. */
  isWrongChain: boolean;
  /** Client da conta ativa, pronto para `writeContract`/`signMessage`. */
  walletClient: ConnectedWalletClient | undefined;
  /** Troca a conta ativa entre as já autorizadas, sem abrir a carteira. */
  selectAccount: (account: Address) => void;
  /** Interno: usado pelas mutations de conectar e desconectar. */
  setWalletId: (rdns: string | null) => void;
};

export const WalletContext = createContext<WalletContextValue | null>(null);

export function useWalletContext(): WalletContextValue {
  const context = useContext(WalletContext);

  if (!context) {
    throw new Error("useWallet precisa estar dentro de <WalletProvider>");
  }

  return context;
}
