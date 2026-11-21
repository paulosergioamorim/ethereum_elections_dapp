import type { Address } from "viem";

export type SearchableParty = {
  address: Address;
  /** Ainda não lido: a busca só o encontra pelo endereço. */
  name?: string;
  owner?: Address;
};

/** Partidos cujo nome, endereço ou presidente contém o texto, sem diferenciar maiúsculas. */
export function filterParties<Party extends SearchableParty>(
  parties: readonly Party[],
  query: string,
): Party[] {
  const term = query.trim().toLowerCase();

  if (term === "") {
    return [...parties];
  }

  return parties.filter((party) =>
    [party.name, party.address, party.owner].some((field) => field?.toLowerCase().includes(term)),
  );
}
