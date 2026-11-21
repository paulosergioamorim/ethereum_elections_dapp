import { getAddress, isAddress, zeroAddress, type Address } from "viem";
import type { CreateCandidateInput, CreatePartyInput } from "./hooks";

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

export type CreateCandidateValues = { candidate: string; name: string };
export type CreateCandidateErrors = Partial<Record<keyof CreateCandidateValues, string>>;

/** As regras do `createCandidate`: carteira válida (não zero) e nome com algum texto. */
export function validateCreateCandidateForm(values: CreateCandidateValues): {
  errors: CreateCandidateErrors;
  input?: CreateCandidateInput;
} {
  const errors: CreateCandidateErrors = {};
  const candidate = parseAddress(values.candidate);
  const name = values.name.trim();

  if ("error" in candidate) {
    errors.candidate = candidate.error;
  }

  if (name === "") {
    errors.name = "Informe o nome do candidato.";
  }

  if ("error" in candidate || name === "") {
    return { errors };
  }

  return { errors, input: { candidate: candidate.address, name } };
}
