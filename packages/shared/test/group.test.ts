import { describe, expect, it } from "vitest";
import { Group } from "@semaphore-protocol/group";
import { buildGroup, type MemberEvent } from "../group.js";

describe("shared/group", () => {
  const commitments = [11n, 22n, 33n];
  const added: MemberEvent[] = commitments.map((identityCommitment, i) => ({
    kind: "added",
    index: BigInt(i),
    identityCommitment,
  }));

  // eventos "added" em ordem → mesma raiz de um Group com addMember na mesma ordem
  it("should build the same root as adding members in order", () => {
    const expected = new Group(commitments);

    expect(buildGroup(added).root).toBe(expected.root);
  });

  // "added" seguido de "removed" → mesma raiz de um Group com removeMember(índice)
  it("should apply removals by index", () => {
    const expected = new Group(commitments);
    expected.removeMember(1);

    const group = buildGroup([...added, { kind: "removed", index: 1n }]);

    expect(group.root).toBe(expected.root);
    expect(group.indexOf(22n)).toBe(-1);
  });

  // "added" com índice diferente de group.size → lança erro (eventos fora de ordem ou faltando)
  it("should throw on out-of-order MemberAdded events", () => {
    expect(() => buildGroup([added[0], added[2]])).toThrow(/MemberAdded fora de ordem/);
  });
});
