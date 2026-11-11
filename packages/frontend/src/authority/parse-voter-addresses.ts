import { getAddress, isAddress, zeroAddress, type Address } from "viem";

export type ParsedVoterAddresses = {
  /** Novos, sem repetição e com checksum: são os que vão para a transação. */
  toAuthorize: Address[];
  alreadyAuthorized: Address[];
  /** Trechos que não são endereços (ou o endereço zero, que o contrato recusa). */
  invalid: string[];
};

/**
 * Lê endereços separados por linha, vírgula, ponto e vírgula ou espaço.
 * Aceita endereços em minúsculas (comuns ao copiar); com maiúsculas, o checksum precisa bater.
 */
export function parseVoterAddresses(
  text: string,
  authorized: readonly Address[],
): ParsedVoterAddresses {
  const known = new Set(authorized.map((address) => address.toLowerCase()));
  const seen = new Set<string>();
  const parsed: ParsedVoterAddresses = { toAuthorize: [], alreadyAuthorized: [], invalid: [] };

  for (const token of text.split(/[\s,;]+/)) {
    if (!token) {
      continue;
    }

    if (!isAddress(token) || token.toLowerCase() === zeroAddress) {
      parsed.invalid.push(token);
      continue;
    }

    const address = getAddress(token);
    const key = address.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    if (known.has(key)) {
      parsed.alreadyAuthorized.push(address);
    } else {
      parsed.toAuthorize.push(address);
    }
  }

  return parsed;
}
