// Carregado sob demanda (`import()` na fase de apuração): o tlock só serve a quem abre as cédulas.
import { commitBallot } from "@elections/shared/ballot";
import { openBallot, quicknetClient, roundTimeMs } from "@elections/shared/timelock";
import type { CastBallot, OpenedBallot } from "./ballots";

/** Mensagem do tlock-js quando a rodada do drand ainda não saiu. */
const TOO_EARLY = /too early to decrypt.*round (\d+)/i;

/**
 * Abre no navegador as cédulas ainda não reveladas: decifra o ciphertext do `VoteCast` com a rodada
 * do drand e confere que `(opção, salt)` bate com o commitment registrado no contrato.
 * - `opened`: pronta para o `revealBatch`;
 * - `invalid`: ciphertext malformado ou commitment diferente. Fica fora do lote, porque o contrato
 *   reverte o lote inteiro com `InvalidReveal`;
 * - `too-early`: a rodada ainda não foi publicada (logo depois do fim, ou cifrada para depois dele).
 *
 * As cédulas vão uma de cada vez, para não disparar dezenas de pedidos simultâneos ao drand.
 */
export async function openBallots(ballots: readonly CastBallot[]): Promise<OpenedBallot[]> {
  const drand = quicknetClient();
  const opened: OpenedBallot[] = [];

  for (const ballot of ballots) {
    if (ballot.revealedOption !== undefined) {
      continue;
    }

    try {
      const { option, salt } = await openBallot(ballot.ciphertext, drand);

      opened.push(
        commitBallot({ option, salt }) === ballot.commitment
          ? { index: ballot.index, status: "opened", option, salt }
          : { index: ballot.index, status: "invalid" },
      );
    } catch (error) {
      const round = error instanceof Error ? TOO_EARLY.exec(error.message)?.[1] : undefined;

      opened.push(
        round === undefined
          ? { index: ballot.index, status: "invalid" }
          : {
              index: ballot.index,
              status: "too-early",
              availableAt: await roundTimeMs(Number(round), drand),
            },
      );
    }
  }

  return opened;
}
