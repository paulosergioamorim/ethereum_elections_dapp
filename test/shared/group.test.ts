import { describe, it } from "node:test";

describe("shared/group", () => {
  // eventos "added" em ordem → mesma raiz de um Group com addMember na mesma ordem
  it.todo("should build the same root as adding members in order");

  // "added" seguido de "removed" → mesma raiz de um Group com removeMember(índice)
  it.todo("should apply removals by index");

  // "added" com índice diferente de group.size → lança erro (eventos fora de ordem ou faltando)
  it.todo("should throw on out-of-order MemberAdded events");
});
