import { formatEther, type Address } from "viem";

/** `0x1234…abcd` */
export function shortAddress(address: Address): string {
  return shortHex(address);
}

/** Qualquer hex longo encurtado: `0x1234…abcd`. */
export function shortHex(hex: string): string {
  return `${hex.slice(0, 6)}…${hex.slice(-4)}`;
}

/** Saldo em ETH com até 4 casas, sem zeros à direita. */
export function formatEth(wei: bigint): string {
  const [integer, fraction = ""] = formatEther(wei).split(".");
  const trimmed = fraction.slice(0, 4).replace(/0+$/, "");

  return `${integer}${trimmed ? `,${trimmed}` : ""} ETH`;
}

/** Inteiro com separador de milhar (`7.123.456`). */
export function formatInteger(value: bigint | number): string {
  return value.toLocaleString("pt-BR");
}
