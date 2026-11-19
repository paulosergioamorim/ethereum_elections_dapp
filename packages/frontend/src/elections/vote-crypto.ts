import { runInWorker } from "@/lib/worker";
import type { PreparedVote, VoteTask, VoterGroup } from "./crypto/prepare-vote";
import type { VoterIdentity } from "@/identity/derive";
import type { ElectionDetails } from "./queries";

/**
 * Monta o voto (cédula selada com tlock + prova Semaphore) num Web Worker, para a página não travar
 * durante os segundos da prova. A lógica está em `crypto/prepare-vote.ts`.
 */
export function prepareVote({
  identity,
  group,
  election,
  option,
}: {
  identity: VoterIdentity;
  group: VoterGroup;
  election: ElectionDetails;
  option: bigint;
}): Promise<PreparedVote> {
  return runInWorker<VoteTask, PreparedVote>(
    () => new Worker(new URL("./crypto/vote.worker.ts", import.meta.url), { type: "module" }),
    {
      identity: identity.export(),
      group: group.export(),
      election: { address: election.address, votingEnd: election.votingEnd },
      option,
    },
  );
}
