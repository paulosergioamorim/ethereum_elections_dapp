import { publicClient } from "@/lib/chain";

/**
 * Leituras consistentes depois de uma escrita. O viem guarda o número do último bloco em cache por
 * alguns segundos, e RPCs públicos têm vários nós atrás de um balanceador, alguns um bloco atrás.
 * Sem isto, a lista recarregada logo depois de uma transação pode vir de um bloco anterior a ela.
 *
 * Toda transação confirmada aqui sobe o piso; as leituras usam um bloco igual ou posterior a ele.
 */
let floor = 0n;

const ATTEMPTS = 10;
const RETRY_DELAY_MS = 1_000;

export function raiseBlockFloor(block: bigint | undefined): void {
  if (block !== undefined && block > floor) {
    floor = block;
  }
}

/** Último bloco do RPC, sem cache, e nunca anterior à última transação confirmada neste navegador. */
export async function freshBlockNumber(): Promise<bigint> {
  for (let attempt = 1; ; attempt++) {
    const head = await publicClient.getBlockNumber({ cacheTime: 0 });

    if (head >= floor) {
      return head;
    }

    if (attempt === ATTEMPTS) {
      throw new Error("A rede ainda não alcançou a última transação. Tente de novo em instantes.");
    }

    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  }
}
