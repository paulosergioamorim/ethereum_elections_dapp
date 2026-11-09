import type { ConnectedWalletClient } from "./wallet-context";

/** O client da conta ativa, ou um erro claro se não houver carteira conectada. */
export function requireWalletClient(
  walletClient: ConnectedWalletClient | undefined,
): ConnectedWalletClient {
  if (!walletClient) {
    throw new Error("Conecte a carteira para enviar a transação.");
  }

  return walletClient;
}
