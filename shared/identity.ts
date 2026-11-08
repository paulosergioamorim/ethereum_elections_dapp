import { Identity } from "@semaphore-protocol/identity";
import type { Address, Hex } from "viem";

/**
 * Mensagem fixa que a carteira assina para derivar a identidade Semaphore.
 * Inclui a rede e a factory para que a mesma carteira tenha identidades diferentes em cada implantação.
 * Mudar este texto muda a identidade de todos os eleitores já cadastrados.
 */
export function identityMessage(chainId: number, factory: Address): string {
  return [
    "Eleições dApp: derivar identidade de eleitor.",
    "Assine apenas neste site. Esta assinatura é a sua chave de voto anônimo.",
    `Rede: ${chainId}`,
    `Factory: ${factory.toLowerCase()}`,
  ].join("\n");
}

/**
 * Identidade Semaphore determinística a partir da assinatura de `identityMessage`.
 * A mesma carteira gera sempre a mesma identidade, então nada precisa ser guardado no navegador.
 */
export function deriveIdentity(signature: Hex): Identity {
  return new Identity(signature);
}
