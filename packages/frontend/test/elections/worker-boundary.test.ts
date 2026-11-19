import { buildGroup, importGroup } from "@elections/shared/group";
import { deriveIdentity, importIdentity } from "@elections/shared/identity";
import { describe, expect, it } from "vitest";

// o Worker do voto recebe identidade e árvore exportadas: remontadas, a prova tem de bater com o contrato
describe("vote worker boundary", () => {
  it("should rebuild the same identity from its export", () => {
    const identity = deriveIdentity(`0x${"ab".repeat(65)}`);

    expect(importIdentity(identity.export()).commitment).toBe(identity.commitment);
  });

  it("should rebuild the same tree, removed members included, from its export", () => {
    const group = buildGroup([
      { kind: "added", index: 0n, identityCommitment: 11n },
      { kind: "added", index: 1n, identityCommitment: 22n },
      { kind: "added", index: 2n, identityCommitment: 33n },
      { kind: "removed", index: 1n },
    ]);
    const rebuilt = importGroup(group.export());

    expect(rebuilt.root).toBe(group.root);
    expect(rebuilt.indexOf(33n)).toBe(2);
    expect(rebuilt.generateMerkleProof(2).siblings).toEqual(group.generateMerkleProof(2).siblings);
  });
});
