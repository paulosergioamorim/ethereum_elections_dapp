import type { Address } from "viem";
import { parseEthAmount } from "./amount";
import { parseAddress } from "./forms";

export type WithdrawValues = { to: string; amount: string };
export type WithdrawErrors = Partial<Record<keyof WithdrawValues, string>>;

/**
 * As regras do `withdraw` que dá para conferir antes da carteira: destino válido e não zero, valor
 * positivo e no máximo o saldo (`balance`, em wei). Saque de zero não é oferecido. `holder` é quem
 * guarda o saldo, para a mensagem ("partido" ou "candidato").
 */
export function validateWithdrawForm(
  values: WithdrawValues,
  balance: bigint,
  holder: "partido" | "candidato" = "partido",
): { errors: WithdrawErrors; input?: { to: Address; amount: bigint } } {
  const errors: WithdrawErrors = {};
  const to = parseAddress(values.to);
  const amount = parseEthAmount(values.amount);

  if ("error" in to) {
    errors.to = to.error;
  }

  if ("error" in amount) {
    errors.amount = amount.error;
  } else if (amount.wei > balance) {
    errors.amount = `O valor é maior que o saldo do ${holder}.`;
  }

  if (errors.to || errors.amount || "error" in to || "error" in amount) {
    return { errors };
  }

  return { errors, input: { to: to.address, amount: amount.wei } };
}
