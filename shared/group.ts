import { Group } from "@semaphore-protocol/group";

/** Campos usados dos eventos `MemberAdded` e `MemberRemoved` do Semaphore. */
export type MemberAdded = {
  kind: "added";
  index: bigint;
  identityCommitment: bigint;
};

export type MemberRemoved = {
  kind: "removed";
  index: bigint;
};

export type MemberEvent = MemberAdded | MemberRemoved;

/**
 * Remonta off-chain a árvore do grupo a partir dos eventos, na ordem em que foram emitidos.
 * A remoção zera a folha (igual ao LeanIMT on-chain), então os índices continuam valendo.
 */
export function buildGroup(events: readonly MemberEvent[]): Group {
  const group = new Group();

  for (const event of events) {
    if (event.kind === "added") {
      if (BigInt(group.size) !== event.index) {
        throw new Error(
          `MemberAdded fora de ordem: índice ${event.index}, esperado ${group.size}`,
        );
      }

      group.addMember(event.identityCommitment);
    } else {
      group.removeMember(Number(event.index));
    }
  }

  return group;
}
