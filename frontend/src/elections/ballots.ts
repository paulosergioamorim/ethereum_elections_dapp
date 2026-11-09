import type { Hex } from "viem";

/** Cédula registrada por um `VoteCast`, com a opção se um `VoteRevealed` já a apurou. */
export type CastBallot = {
  index: bigint;
  commitment: Hex;
  /** Cédula cifrada com tlock: `abi.encode(opção, salt)`. */
  ciphertext: Hex;
  /** Opção apurada on-chain; sem ela, a cédula ainda está fechada no contrato. */
  revealedOption?: bigint;
};

/** Resultado de abrir no navegador uma cédula ainda fechada no contrato. */
export type OpenedBallot =
  | { index: bigint; status: "opened"; option: bigint; salt: Hex }
  | { index: bigint; status: "invalid" }
  /** `availableAt`: quando a rodada do drand sai (ms desde a época Unix). */
  | { index: bigint; status: "too-early"; availableAt: number };

/** Máximo de cédulas por `revealBatch`: cada uma custa ~45 mil de gás, ~2,3 milhões por lote. */
export const REVEAL_BATCH_SIZE = 50;

/** Cédulas abertas aqui e ainda não apuradas no contrato: o que vai para o `revealBatch`. */
export function pendingReveals(
  ballots: readonly CastBallot[],
  opened: readonly OpenedBallot[],
): Extract<OpenedBallot, { status: "opened" }>[] {
  const revealed = new Set(
    ballots.filter((ballot) => ballot.revealedOption !== undefined).map((ballot) => ballot.index),
  );

  return opened.filter(
    (ballot): ballot is Extract<OpenedBallot, { status: "opened" }> =>
      ballot.status === "opened" && !revealed.has(ballot.index),
  );
}

export type ProvisionalTally = {
  /** Votos por candidato, na ordem de `candidates`. */
  tally: bigint[];
  nullVotes: bigint;
  /** Cédulas com opção conhecida: apuradas no contrato ou abertas aqui. */
  counted: bigint;
  /** Abertas aqui e ainda não publicadas no contrato. */
  unpublished: bigint;
  invalid: bigint;
  tooEarly: bigint;
};

/**
 * Resultado que o contrato terá depois de publicar as cédulas abertas aqui: o que já foi apurado
 * on-chain somado às cédulas decifradas no navegador. Opção fora da lista é voto nulo, como no contrato.
 */
export function provisionalTally(
  candidates: number,
  ballots: readonly CastBallot[],
  opened: readonly OpenedBallot[],
): ProvisionalTally {
  const result: ProvisionalTally = {
    tally: Array.from({ length: candidates }, () => 0n),
    nullVotes: 0n,
    counted: 0n,
    unpublished: 0n,
    invalid: 0n,
    tooEarly: 0n,
  };
  const openedByIndex = new Map(opened.map((ballot) => [ballot.index, ballot]));

  function count(option: bigint) {
    result.counted++;

    if (option < BigInt(candidates)) {
      result.tally[Number(option)]++;
    } else {
      result.nullVotes++;
    }
  }

  for (const ballot of ballots) {
    if (ballot.revealedOption !== undefined) {
      count(ballot.revealedOption);
      continue;
    }

    const local = openedByIndex.get(ballot.index);

    if (local?.status === "opened") {
      count(local.option);
      result.unpublished++;
    } else if (local?.status === "invalid") {
      result.invalid++;
    } else if (local?.status === "too-early") {
      result.tooEarly++;
    }
  }

  return result;
}

/** Divide `items` em lotes de até `size`. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const batches: T[][] = [];

  for (let start = 0; start < items.length; start += size) {
    batches.push(items.slice(start, start + size));
  }

  return batches;
}
