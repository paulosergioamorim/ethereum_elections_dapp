import { createPublicClient, fallback, http, webSocket, type Chain, type Hash } from "viem";
import { hardhat, sepolia } from "viem/chains";
import { env } from "@/lib/env";

const supportedChains: Record<number, Chain> = {
  [sepolia.id]: sepolia,
  [hardhat.id]: hardhat,
};

function chainFor(chainId: number): Chain {
  const chain = supportedChains[chainId];

  if (!chain) {
    throw new Error(
      `VITE_CHAIN_ID ${chainId} não é suportado. Use ${sepolia.id} (Sepolia) ou ${hardhat.id} (nó local).`,
    );
  }

  return chain;
}

/** A única rede do app. Leituras e transações sempre usam esta rede, nunca a que a carteira estiver usando. */
export const appChain = chainFor(env.chainId);

// sem URL, o `http` usa o RPC público padrão da rede
const httpTransport = http(env.rpcHttpUrl);

/**
 * Client de leitura, independente da carteira: qualquer pessoa acompanha eleições e apuração sem conectar nada.
 * Com WebSocket configurado, ele vem primeiro: os eventos ao vivo chegam por `eth_subscribe`, sem polling.
 * O HTTP fica de reserva se o WebSocket cair.
 */
export const publicClient = createPublicClient({
  chain: appChain,
  transport: env.rpcWsUrl ? fallback([webSocket(env.rpcWsUrl), httpTransport]) : httpTransport,
  // leituras simultâneas viram uma só chamada ao Multicall3 (na rede local, sem Multicall3, seguem uma a uma)
  batch: { multicall: true },
});

/**
 * Eventos ao vivo só por WebSocket (`eth_subscribe`). Só com HTTP, o `watchContractEvent` do viem faria
 * polling; sem WebSocket, o app relê depois das próprias transações e pelo botão de atualizar.
 */
export const liveEvents = Boolean(env.rpcWsUrl);

/** Link do explorador de blocos para um endereço (a rede local não tem explorador). */
export function explorerAddressUrl(address: string): string | undefined {
  const explorer = appChain.blockExplorers?.default.url;

  return explorer ? `${explorer}/address/${address}` : undefined;
}

/** Link do explorador de blocos para uma transação. */
export function explorerTxUrl(hash: Hash): string | undefined {
  const explorer = appChain.blockExplorers?.default.url;

  return explorer ? `${explorer}/tx/${hash}` : undefined;
}
