import * as v from "valibot";
import { getAddress, isAddress, zeroAddress, type Address } from "viem";
import { parseForm, parsedField, requiredText } from "@/lib/schema";

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

/** Campo de endereço: válido e não zero, saindo com checksum. */
export const addressField = parsedField((text) => {
  const parsed = parseAddress(text);

  return "error" in parsed ? parsed : { value: parsed.address };
});

/** As regras do `createParty`: presidente válido (não zero) e nome com algum texto. */
export const createPartySchema = v.object({
  president: addressField,
  name: requiredText("Informe o nome do partido."),
});

export type CreatePartyValues = v.InferInput<typeof createPartySchema>;

export function validateCreatePartyForm(values: CreatePartyValues) {
  return parseForm(createPartySchema, values);
}

/** As regras do `createCandidate`: carteira válida (não zero) e nome com algum texto. */
export const createCandidateSchema = v.object({
  candidate: addressField,
  name: requiredText("Informe o nome do candidato."),
});

export type CreateCandidateValues = v.InferInput<typeof createCandidateSchema>;

export function validateCreateCandidateForm(values: CreateCandidateValues) {
  return parseForm(createCandidateSchema, values);
}
