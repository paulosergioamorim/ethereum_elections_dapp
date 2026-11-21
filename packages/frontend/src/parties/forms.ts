import { getAddress, isAddress, zeroAddress, type Address } from "viem";
import type { CreatePartyInput } from "./hooks";

/** Endereço digitado: válido e diferente do endereço zero, ou o erro em uma frase. */
export function parseAddress(text: string): { address: Address } | { error: string } {
  const value = text.trim();

  if (!isAddress(value, { strict: false })) {
    return { error: "Informe um endereço válido." };
  }

  if (value.toLowerCase() === zeroAddress) {
    return { error: "O endereço zero não é permitido." };
  }

  return { address: getAddress(value.toLowerCase()) };
}

export type CreatePartyValues = { president: string; name: string };
export type CreatePartyErrors = Partial<Record<keyof CreatePartyValues, string>>;

/** As regras do `createParty`: presidente válido (não zero) e nome com algum texto. */
export function validateCreatePartyForm(values: CreatePartyValues): {
  errors: CreatePartyErrors;
  input?: CreatePartyInput;
} {
  const errors: CreatePartyErrors = {};
  const president = parseAddress(values.president);
  const name = values.name.trim();

  if ("error" in president) {
    errors.president = president.error;
  }

  if (name === "") {
    errors.name = "Informe o nome do partido.";
  }

  if ("error" in president || name === "") {
    return { errors };
  }

  return { errors, input: { president: president.address, name } };
}
