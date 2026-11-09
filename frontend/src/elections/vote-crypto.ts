// Carregado sob demanda (`import()` no momento do voto): a prova Semaphore (snarkjs) e o tlock são as
// partes mais pesadas do app e só servem a quem está votando.
import { commitBallot, randomSalt, voteMessage } from "@elections/shared/ballot";
import type { buildGroup } from "@elections/shared/group";
import { quicknetClient, roundForTimestamp, sealBallot } from "@elections/shared/timelock";
import { generateProof } from "@semaphore-protocol/proof";
import type { Hex } from "viem";
import type { VoterIdentity } from "@/identity/derive";
import type { ElectionDetails } from "./queries";

export type VoterGroup = ReturnType<typeof buildGroup>;

/** A prova no formato do struct `SemaphoreProof` do contrato. */
export type SolidityProof = {
  merkleTreeDepth: bigint;
  merkleTreeRoot: bigint;
  nullifier: bigint;
  message: bigint;
  scope: bigint;
  points: readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint];
};

export type PreparedVote = {
  proof: SolidityProof;
  commitment: Hex;
  ciphertext: Hex;
};

/**
 * Monta o voto inteiro no navegador:
 * 1. cédula `(opção, salt)` e o compromisso dela;
 * 2. cédula cifrada com tlock para a rodada do drand de `votingEnd`: ninguém a abre antes do fim;
 * 3. prova de que a identidade está na árvore congelada da eleição, com `scope` = endereço da eleição
 *    (o nullifier só vale nela) e `message` amarrando a prova a esta cédula.
 */
export async function prepareVote({
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
  const ballot = { option, salt: randomSalt() };
  const commitment = commitBallot(ballot);

  const drand = quicknetClient();
  const ciphertext = await sealBallot(
    ballot,
    await roundForTimestamp(election.votingEnd, drand),
    drand,
  );

  const proof = await generateProof(
    identity,
    group,
    voteMessage(commitment, ciphertext),
    BigInt(election.address),
  );

  return {
    proof: {
      merkleTreeDepth: BigInt(proof.merkleTreeDepth),
      merkleTreeRoot: BigInt(proof.merkleTreeRoot),
      nullifier: BigInt(proof.nullifier),
      message: BigInt(proof.message),
      scope: BigInt(proof.scope),
      points: proof.points.map(BigInt) as unknown as SolidityProof["points"],
    },
    commitment,
    ciphertext,
  };
}
