import { BaseError, UserRejectedRequestError } from "viem";
import { contractErrorMessage } from "@/contracts/errors";

function hasCode(error: unknown, code: number): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === code;
}

/** Erro com o código informado em qualquer nível da cadeia (o viem embrulha os erros do provider). */
export function hasErrorCode(error: unknown, code: number): boolean {
  if (error instanceof BaseError) {
    return error.walk((cause) => hasCode(cause, code)) !== null;
  }

  return hasCode(error, code);
}

/** O usuário recusou o pedido na carteira (EIP-1193, código 4001). Não é falha: não merece toast de erro. */
export function isUserRejection(error: unknown): boolean {
  return (
    error instanceof UserRejectedRequestError || hasErrorCode(error, UserRejectedRequestError.code)
  );
}

/** Mensagem curta e legível; o `shortMessage` do viem omite detalhes técnicos da chamada. */
export function errorMessage(error: unknown): string {
  const fromContract = contractErrorMessage(error);

  if (fromContract) {
    return fromContract;
  }

  if (error instanceof BaseError) {
    return error.shortMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
