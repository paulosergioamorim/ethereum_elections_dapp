import { runInWorker } from "@/lib/worker";
import type { CastBallot, OpenedBallot } from "./ballots";

/**
 * Abre as cédulas com o tlock num Web Worker, para a página não travar enquanto decifra
 * (cada cédula é um pareamento BLS12-381 em JavaScript). A lógica está em `crypto/open-ballots.ts`.
 */
export function openBallots(ballots: readonly CastBallot[]): Promise<OpenedBallot[]> {
  return runInWorker(
    () => new Worker(new URL("./crypto/tally.worker.ts", import.meta.url), { type: "module" }),
    ballots,
  );
}
