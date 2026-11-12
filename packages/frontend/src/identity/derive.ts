import { deriveIdentity, identityMessage } from "@elections/shared/identity";
import { factoryAddress } from "@/contracts";
import { appChain } from "@/lib/chain";
import type { ConnectedWalletClient } from "@/wallet";

export type VoterIdentity = ReturnType<typeof deriveIdentity>;

/**
 * Pede à carteira a assinatura da mensagem fixa (rede + factory) e deriva dela a identidade Semaphore.
 * Nada é salvo: assinaturas de contas comuns são determinísticas, então a mesma carteira gera sempre
 * a mesma identidade, no registro e na hora de votar, em qualquer computador.
 */
export async function deriveVoterIdentity(
  walletClient: ConnectedWalletClient,
): Promise<VoterIdentity> {
  const signature = await walletClient.signMessage({
    message: identityMessage(appChain.id, factoryAddress),
  });

  return deriveIdentity(signature);
}
