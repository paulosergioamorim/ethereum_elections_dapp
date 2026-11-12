/** Tamanho de cada faixa de blocos; RPCs públicos costumam limitar o intervalo de `eth_getLogs`. */
const RANGE_SIZE = 50_000n;

/**
 * Quantas vezes cada faixa é tentada e a espera entre as tentativas (cresce a cada falha).
 * RPCs públicos falham ao acaso: o balanceador manda a chamada para um nó que podou o histórico
 * ("pruned history unavailable") e a mesma chamada passa na vez seguinte. Os testes zeram a espera.
 */
export const logRetry = { attempts: 3, delayMs: 400 };

async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= logRetry.attempts) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, logRetry.delayMs * attempt));
    }
  }
}

/**
 * Busca eventos de `fromBlock` a `toBlock`, em faixas de blocos consecutivas.
 * As faixas vão uma de cada vez para não estourar o limite de requisições de RPCs gratuitos, e cada
 * uma é refeita se falhar, sem repetir as que já deram certo.
 * O `toBlock` vem de `freshBlockNumber()`, para incluir as transações que acabaram de ser confirmadas.
 */
export async function fetchLogsInRanges<T>(
  { fromBlock, toBlock }: { fromBlock: bigint; toBlock: bigint },
  fetchRange: (range: { fromBlock: bigint; toBlock: bigint }) => Promise<T[]>,
): Promise<T[]> {
  const logs: T[] = [];

  for (let start = fromBlock; start <= toBlock; start += RANGE_SIZE) {
    const end = start + RANGE_SIZE - 1n < toBlock ? start + RANGE_SIZE - 1n : toBlock;
    logs.push(...(await withRetry(() => fetchRange({ fromBlock: start, toBlock: end }))));
  }

  return logs;
}

/** Ordem em que os eventos aconteceram na chain. */
export function byChainOrder(
  a: { blockNumber: bigint | null; logIndex: number | null },
  b: { blockNumber: bigint | null; logIndex: number | null },
): number {
  const blockA = a.blockNumber ?? 0n;
  const blockB = b.blockNumber ?? 0n;

  if (blockA !== blockB) {
    return blockA < blockB ? -1 : 1;
  }

  return (a.logIndex ?? 0) - (b.logIndex ?? 0);
}
