import type { Address } from "viem";

/** A conta é o endereço indicado (comparação sem diferenciar maiúsculas), e há uma conta. */
export function isSameAccount(account: Address | undefined, other: Address | undefined): boolean {
  return !!account && !!other && account.toLowerCase() === other.toLowerCase();
}
